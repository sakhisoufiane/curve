const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const moment = require('moment');

const Work = require('../../models/work');
const Client = require('../../models/client');
const Notification = require('../../models/notification');
const DeliveredWork = require('../../models/deliveredWork');
const DeliveryLog = require('../../models/deliveryLog');
const DeliveryPartner = require('../../models/deliveryPartner');
const societyCodes = require('./societyCodes');
const { notifyISWCConflicts } = require('../iswc/iswcHelper');

const cwrAcknowledgementObject = function (params) {
  const CwrAcknowledgementIngest = this;

  CwrAcknowledgementIngest.acknowledgements = {};
  CwrAcknowledgementIngest.acknowledgementDetailsById = {};

  CwrAcknowledgementIngest.ingestFile = function (cwrAcknowledgement, email, callback) {
    try {
      if (cwrAcknowledgement.file) {
        // Download File
        fileManager.downloadFromS3(cwrAcknowledgement.file, process.env.S3_bucket, (err, localFile) => {
          if (localFile) {
            logger.info('Reading ACK File:', localFile);
            CwrAcknowledgementIngest.readFile(localFile, (err) => {
              if (err) {
                cwrAcknowledgement.ingestionError = err;
                cwrAcknowledgement.status = 'Errored';
                cwrAcknowledgement.save()
                  .then(() => {
                    callback(err);
                  })
                  .catch((saveErr) => {
                    logger.error('Error saving cwrAcknowledgement after error:', saveErr);
                    callback(err);
                  });
              } else if (!CwrAcknowledgementIngest.receivingParty && !cwrAcknowledgement.deliveryPartnerId?.receivingParty) {
                cwrAcknowledgement.ingestionError = 'Couldn\'t retrieve the PRO from the acknowledgement file.';
                cwrAcknowledgement.status = 'Errored';
                cwrAcknowledgement.save()
                  .then(() => {
                    callback();
                  })
                  .catch((saveErr) => {
                    logger.error('Error saving cwrAcknowledgement after error:', saveErr);
                    // Project Bongo: This seems wrong, we know we don't have err here
                    callback(err);
                  });
              } else {
                // Use deliveryPartner's receivingParty as fallback if not found in file
                if (!CwrAcknowledgementIngest.receivingParty) {
                  CwrAcknowledgementIngest.receivingParty = cwrAcknowledgement.deliveryPartnerId?.receivingParty;
                }
                DeliveryPartner.countDocuments({ clientId: cwrAcknowledgement.clientId, receivingParty: CwrAcknowledgementIngest.receivingParty })
                  .then((count) => {
                    // set the source here as we have it. This is used to filter the delivery partners only to the matching receiving party
                    cwrAcknowledgement.source = CwrAcknowledgementIngest.receivingParty;
                    if (count > 1 && !cwrAcknowledgement.deliveryPartnerId) {
                      cwrAcknowledgement.ingestionError = 'More than one Partner found associated with this file - please select a Partner from the Delivery Partner field below and click re-ingest';
                      cwrAcknowledgement.status = 'Errored';
                      cwrAcknowledgement.save()
                        .finally(() => {
                          callback('More than one Partner found associated with this file - please select a Partner from the Delivery Partner field below and click re-ingest');
                        });
                    } else {
                      const deliveryPartnerFilter = cwrAcknowledgement.deliveryPartnerId ? { _id: cwrAcknowledgement.deliveryPartnerId } : { clientId: cwrAcknowledgement.clientId, receivingParty: CwrAcknowledgementIngest.receivingParty };
                      DeliveryPartner.findOne(deliveryPartnerFilter)
                        .then((deliveryPartner) => {
                          if (!deliveryPartner) {
                            cwrAcknowledgement.ingestionError = `${CwrAcknowledgementIngest.receivingParty} PRO does not exist in your account. Please create a Delivery Partner for this PRO`;
                            cwrAcknowledgement.status = 'Errored';
                            cwrAcknowledgement.save()
                              .finally(() => {
                                callback(`${CwrAcknowledgementIngest.receivingParty} does not exist in your account. Please create a Delivery Partner for this PRO`);
                              });
                          } else {
                            // Add responses to works
                            logger.info(CwrAcknowledgementIngest.acknowledgements);
                            const accumulatedErrors = [];
                            async.eachLimit(Object.keys(CwrAcknowledgementIngest.acknowledgements), 10, (partyNo, cb) => {
                              // Find work
                              async.waterfall(
                                [
                                  function (waterfallCb) {
                                    const filter = { clientId: cwrAcknowledgement.clientId };
                                    let regex;
                                    try {
                                      regex = new RegExp(`^${partyNo}$`, 'i');
                                      filter.identifier = regex;
                                      logger.info(filter);
                                      Work.findOne(filter)
                                        .then((work) => {
                                          if (!work && (partyNo.startsWith('CU') && extractNumberFromString(partyNo))) {
                                            // if no work is found try again filtering by CURVE party no
                                            delete filter.identifier; // remove identifier from filter
                                            const replacedPartyNo = extractNumberFromString(partyNo);
                                            if (replacedPartyNo) {
                                              // Convert party no to number for filtering
                                              filter.partyNo = Number(replacedPartyNo);
                                              logger.debug(filter);
                                              return Work.findOne(filter);
                                            }
                                          }
                                          return work;
                                        })
                                        .then((work) => {
                                          waterfallCb(null, work);
                                        })
                                        .catch((err) => {
                                          logger.error('Error finding work in CwrAcknowledgementIngest ingestFile:', err);
                                          waterfallCb(err);
                                        });
                                    } catch (err) {
                                      const newError = err.message.includes('Invalid regular expression') ? new Error(`The file could not be ingested due to an incorrect identifier found: ${partyNo} is not a valid identifier, the file must be reviewed before trying again`) : err;
                                      waterfallCb(newError);
                                    }
                                  },
                                ],
                                (err, work) => {
                                  if (err) {
                                    cb(err);
                                  } else if (work) {
                                    // Add work to acknowledgements
                                    cwrAcknowledgement.workIds.push(work._id.toString());
                                    // Update delivery to include response
                                    work.updateWithAcknowledgement(cwrAcknowledgement.clientId, CwrAcknowledgementIngest.acknowledgements[partyNo], CwrAcknowledgementIngest.receivingParty, (error) => {
                                      if (error) {
                                        accumulatedErrors.push(error);
                                        cb();
                                      } else {
                                        CwrAcknowledgementIngest.updateDeliveredWorkStatus({ clientId: work.clientId, workId: work._id, cwrAcknowledgement, partyNo, deliveryPartner }).then(cb).catch(cb);
                                      }
                                    });
                                  } else {
                                    logger.info(`No work found with identifier or partyNo ${partyNo}`);
                                    cb();
                                  }
                                },
                              );
                            }, (err) => {
                              if (accumulatedErrors.length > 0) {
                                notifyISWCConflicts(
                                  cwrAcknowledgement,
                                  accumulatedErrors.flat(),
                                  CwrAcknowledgementIngest.receivingParty,
                                  email,
                                );
                              }
                              if (err) {
                                cwrAcknowledgement.ingestionError = err;
                                cwrAcknowledgement.status = 'Errored';
                                cwrAcknowledgement.save()
                                  .finally(() => {
                                    callback(err);
                                  });
                              } else {
                                // Store all the ACK delivery statuses here.
                                const ackDeliveryStatuses = {
                                  Accepted: ['Accepted', 'Registration Accepted', 'Transaction Accepted', 'Registration Accepted with Changes'],
                                  Rejected: ['Rejected', 'Claim Rejected', 'Conflict'],
                                  Duplicate: ['Duplicate'],
                                  'No Participation': ['No Participation'],
                                };
                                  // calculate totals
                                const statusTotals = [];
                                // Just get the status
                                const statuses = Object.values(CwrAcknowledgementIngest.acknowledgements).map((item) => item.status);
                                const uniqueStatuses = [...new Set(statuses)];
                                // count the occurance of each unique status returned in the acknowledgement file
                                uniqueStatuses.forEach((status) => {
                                  statusTotals.push({ status, total: statuses.filter((s) => s === status).length });
                                });
                                // filter out accepted and rejected to count 'Other' statuses
                                const otherTotal = statusTotals
                                  .filter((item) => !ackDeliveryStatuses.Accepted.includes(item.status) && !ackDeliveryStatuses.Rejected.includes(item.status))
                                  .reduce((acc, item) => acc + item.total, 0);

                                // Sum the total where status is mapped to Accepted
                                const acceptedTotal = statusTotals.reduce((acc, status) => {
                                  if (ackDeliveryStatuses.Accepted.includes(status.status)) {
                                    acc += status.total;
                                  }
                                  return acc;
                                }, 0);
                                  // Sum the total where status is mapped to Rejected
                                const rejectedTotal = statusTotals.reduce((acc, status) => {
                                  if (ackDeliveryStatuses.Rejected.includes(status.status)) {
                                    acc += status.total;
                                  }
                                  return acc;
                                }, 0);

                                cwrAcknowledgement.deliveryPartnerId = deliveryPartner._id;
                                cwrAcknowledgement.acceptedTotal = (acceptedTotal || 0);
                                cwrAcknowledgement.rejectedTotal = (rejectedTotal || 0);
                                cwrAcknowledgement.otherTotal = (otherTotal || 0);
                                cwrAcknowledgement.statusTotals = (statusTotals || []);
                                logger.info(cwrAcknowledgement.statusTotals);

                                // Save acknowledgement
                                cwrAcknowledgement.status = 'Complete';
                                cwrAcknowledgement.save()
                                  .then((cwrAcknowledgement) => {
                                    callback(null, cwrAcknowledgement);
                                  })
                                  .catch((err) => {
                                    logger.error('Error saving cwrAcknowledgement after ingest:', err);
                                    callback(err);
                                  });
                              }
                            });
                          }
                        })
                        .catch((err) => {
                          logger.error('Error finding delivery partner in CwrAcknowledgementIngest ingestFile:', err);
                          cwrAcknowledgement.ingestionError = `${CwrAcknowledgementIngest.receivingParty} PRO does not exist in your account. Please create a Delivery Partner for this PRO`;
                          cwrAcknowledgement.status = 'Errored';
                          cwrAcknowledgement.save()
                            .finally(() => {
                              callback(`${CwrAcknowledgementIngest.receivingParty} does not exist in your account. Please create a Delivery Partner for this PRO`);
                            });
                        });
                    }
                  })
                  .catch((err) => {
                    logger.error('Error counting delivery partners in CwrAcknowledgementIngest ingestFile:', err);
                    callback(err);
                  });
              }
            });
          } else {
            const error = 'cwrAcknowledgementIngest: Couldn\'t download the file';
            cwrAcknowledgement.ingestionError = error;
            cwrAcknowledgement.status = 'Errored';
            cwrAcknowledgement.save()
              .finally(() => {
                callback(error);
              });
          }
        });
      } else {
        callback();
      }
    } catch (err) {
      cwrAcknowledgement.ingestionError = err;
      cwrAcknowledgement.status = 'Errored';
      cwrAcknowledgement.save()
        .finally(() => {
          callback(err);
        });
    }
  };

  CwrAcknowledgementIngest.updateDeliveredWorkStatus = async ({ clientId, workId, cwrAcknowledgement, partyNo, deliveryPartner }) => {
    const filter = { clientId, workId, deliveryPartnerId: deliveryPartner._id };

    let deliveredWork = await DeliveredWork.findOne(filter);
    if (!deliveredWork) {
      deliveredWork = new DeliveredWork({
        clientId,
        workId,
        deliveryPartnerId: deliveryPartner._id,
        cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId,
        cwrAcknowledgementId: cwrAcknowledgement._id,
        receivingParty: cwrAcknowledgement.source,
        deliveryDate: new Date(),
      });
    }
    deliveredWork.cwrAcknowledgementId = cwrAcknowledgement._id;
    deliveredWork.status = CwrAcknowledgementIngest.acknowledgements[partyNo].status;
    deliveredWork.partnerId = CwrAcknowledgementIngest.acknowledgements[partyNo].partnerId;
    deliveredWork.title = CwrAcknowledgementIngest.acknowledgements[partyNo].title;
    deliveredWork.iswc = CwrAcknowledgementIngest.acknowledgements[partyNo].iswc;
    deliveredWork.messages = CwrAcknowledgementIngest.acknowledgements[partyNo].messages;

    await DeliveryLog.updateOne(
      { clientId, deliveryPartnerId: deliveryPartner._id, workId },
      {
        $push: {
          log: {
            deliveredWorkId: deliveredWork._id,
            acknowledgementId: cwrAcknowledgement._id,
            cwrDeliveryId: cwrAcknowledgement.cwrDeliveryId,
            partnerId: CwrAcknowledgementIngest.acknowledgements[partyNo].partnerId,
            status: deliveredWork.status,
            action: 'Acknowledgment',
            messages: deliveredWork.messages,
            date: moment().format(),
          },
        },
        $setOnInsert: { clientId, deliveryPartnerId: deliveryPartner._id, workId },
      },
      { upsert: true },
    );

    await deliveredWork.save();
  };

  CwrAcknowledgementIngest.readFile = function (filePath, callback) {
    CwrAcknowledgementIngest.openFileFromPath(filePath, (err, data) => {
      if (err) {
        callback(err);
      } else {
        CwrAcknowledgementIngest.readData(data, callback);
      }
    });
  };

  CwrAcknowledgementIngest.openFileFromPath = function (filePath, callback) {
    if (!fs.existsSync(filePath)) {
      callback(new Error(`File does not exist at location: ${filePath}`));
    } else {
      fs.readFile(filePath, 'utf8', callback);
    }
  };

  CwrAcknowledgementIngest.readData = function (data, callback) {
    const lines = data.indexOf('\r\n') !== -1 ? data.split('\r\n') : data.split('\n');
    logger.debug(lines);
    async.waterfall([
      function (cb) {
        CwrAcknowledgementIngest.organiseLines(lines, cb);
      },
      function (cb) {
        CwrAcknowledgementIngest.linesToObjects(cb);
      },
      function (cb) {
        CwrAcknowledgementIngest.changeAcceptedWithMessagesToRejected(cb);
      },
    ], callback);
  };

  CwrAcknowledgementIngest.organiseLines = function (lines, callback) {
    let id;
    let header;
    async.eachSeries(lines, (line, lineCb) => {
      let skipWork = false;
      if (line.substring(0, 3) === 'HDR') {
        // File header
        header = line;
        let societyCode = Number(header.substring(5, 14).replace(/^0+/, '')); // may need to amend to 10, 14 when a society has a code > 999
        if (!societyCode && header.substring(14, 39) === 'BACKOFFICE MUSIC SERVICES') { // edgecase - not an official society so no code on ACK
          societyCode = 592;
        }
        const societyName = societyCodes.mapCodeToSociety(societyCode);
        CwrAcknowledgementIngest.receivingParty = societyName;
      } else if (line.substring(0, 3) === 'GRH') {
        // Group header
      } else if (line.substring(0, 3) === 'GRT') {
        // Group trailer
      } else if (line.substring(0, 3) === 'TRL') {
        // File trailer
      } else if (line.substring(0, 3) === 'ACK') {
        skipWork = false;
        // New Acknowledgement
        id = line.substring(109, 129).trim();
        CwrAcknowledgementIngest.acknowledgementDetailsById[id] = CwrAcknowledgementIngest.acknowledgementDetailsById[id] || [];
        CwrAcknowledgementIngest.acknowledgementDetailsById[id].push(line);
      } else if (line.substring(0, 3) === 'ISW') {
        id = line.substring(81, 95).trim();
        CwrAcknowledgementIngest.acknowledgementDetailsById[id] = CwrAcknowledgementIngest.acknowledgementDetailsById[id] || [];
        CwrAcknowledgementIngest.acknowledgementDetailsById[id].push(line);
      } else if (id) {
        // Handle edge case where ACK line is missing from certain societies
        // This needs resolving but for now we need to handle this gracefully by skipping the work with the missing ACK line
        if (line.substring(0, 3) === 'REV') {
          const identifier = line.substring(81, 95).trim();
          if (identifier && identifier !== id) {
            skipWork = true;
          }
        }
        // Detail line
        if (!skipWork) CwrAcknowledgementIngest.acknowledgementDetailsById[id].push(line);
      }
      lineCb(null, line);
    }, (eachErr) => {
      if (eachErr) {
        return callback(eachErr);
      }
      if (!header && Object.keys(CwrAcknowledgementIngest.acknowledgementDetailsById).length === 0) {
        return callback('File is not a valid fixed-width ACK file');
      }
      callback();
    });
  };

  CwrAcknowledgementIngest.linesToObjects = function (callback) {
    const ids = Object.keys(CwrAcknowledgementIngest.acknowledgementDetailsById);
    async.each(ids, (id, cb) => {
      CwrAcknowledgementIngest.readLinesById(id, cb);
    }, callback);
  };

  CwrAcknowledgementIngest.readLinesById = function (id, callback) {
    if (CwrAcknowledgementIngest.acknowledgementDetailsById[id]) {
      CwrAcknowledgementIngest.acknowledgements[id] = {};
      async.forEachOf(CwrAcknowledgementIngest.acknowledgementDetailsById[id], (line, index, cb) => {
        if (line.substring(0, 3) === 'ACK') {
          // Acknowledgement line
          CwrAcknowledgementIngest.acknowledgements[id].status = CwrAcknowledgementIngest.mapStatus(line.substring(157, 159));
          CwrAcknowledgementIngest.acknowledgements[id].partnerId = line.substring(129, 149).trim();
        } else if (line.substring(0, 3) === 'ISW') {
          // ISWC Reported Line
          CwrAcknowledgementIngest.acknowledgements[id].status = 'Registration Accepted';
          CwrAcknowledgementIngest.acknowledgements[id].iswc = line.substring(95, 106).trim();
        } else if (line.substring(0, 3) === 'REV' || line.substring(0, 3) === 'NWR') {
          // Main work
          CwrAcknowledgementIngest.acknowledgements[id].title = line.substring(19, 60).trim();
          CwrAcknowledgementIngest.acknowledgements[id].iswc = line.substring(95, 106).trim();
        } else if (line.substring(0, 3) === 'MSG') {
          const message = line.substring(35, 185).trim();
          CwrAcknowledgementIngest.acknowledgements[id].messages = CwrAcknowledgementIngest.acknowledgements[id].messages || [];
          let previousRow;
          if (message.includes('Agreement number missing in PWR')) {
            previousRow = findReferenceRow(CwrAcknowledgementIngest.acknowledgementDetailsById[id], ['SWR', 'PWR'], index, -1);
            CwrAcknowledgementIngest.acknowledgements[id].messages.push(structureMessage(previousRow, line));
          } else if (message.includes('Writer CAE/IPI')) {
            previousRow = findReferenceRow(CwrAcknowledgementIngest.acknowledgementDetailsById[id], ['SWR', 'OWR'], index, 1);
            CwrAcknowledgementIngest.acknowledgements[id].messages.push(structureMessage(previousRow, line));
          } else if (!message.includes('Duplicates are discarded')) {
            CwrAcknowledgementIngest.acknowledgements[id].messages.push(line.substring(35, 185).trim());
          }
          CwrAcknowledgementIngest.acknowledgements[id].messageTypes = CwrAcknowledgementIngest.acknowledgements[id].messageTypes || [];
          CwrAcknowledgementIngest.acknowledgements[id].messageTypes.push(line[31]);
        } else if (line.substring(0, 3) === 'XRF') {
          const xrf = CwrAcknowledgementIngest.readLineXRF(line);
          if (CwrAcknowledgementIngest.acknowledgements[id].societyIdentifiers) {
            CwrAcknowledgementIngest.acknowledgements[id].societyIdentifiers.push(xrf);
          } else {
            CwrAcknowledgementIngest.acknowledgements[id].societyIdentifiers = [xrf];
          }
        }
        cb();
      }, callback);
    } else {
      callback();
    }
  };

  CwrAcknowledgementIngest.mapStatus = function (status) {
    switch (status) {
      case 'CO':
        return 'Conflict';
      case 'DU':
        return 'Duplicate';
      case 'RA':
        return 'Transaction Accepted';
      case 'AS':
        return 'Registration Accepted';
      case 'AC':
        return 'Registration Accepted with Changes';
      case 'RJ':
        return 'Rejected';
      case 'NP':
        return 'No Participation';
      case 'RC':
        return 'Claim Rejected';
      default:
        return 'Unknown';
    }
  };

  CwrAcknowledgementIngest.changeAcceptedWithMessagesToRejected = function (callback) {
    if (CwrAcknowledgementIngest.acknowledgements) {
      Object.values(CwrAcknowledgementIngest.acknowledgements).forEach((ack) => {
        if (ack?.status === 'Transaction Accepted' && ack?.messageTypes?.indexOf('T') > -1
          && (!ack.partnerId || ack.partnerId.match(/^0+$/))) {
          ack.status = 'Rejected';
        }
      });
    }
    callback();
  };

  CwrAcknowledgementIngest.readLineXRF = function (line) {
    const societyCode = removeLeadingZeros(line.substring(19, 22).trim());
    const workIdentifier = line.substring(22, 36).trim();
    const fullIdentifier = line.substring(19, 36).trim();
    const identifierType = line.substring(36, 37).trim();
    const validity = line.substring(37, 38);
    return {
      societyCode,
      workIdentifier,
      fullIdentifier,
      identifierType,
      validity,
    };
  };

  const findReferenceRow = (array, values, index, change) => {
    if (array[index] && values.includes(array[index].substring(0, 3))) {
      return array[index];
    } if (array[index]) {
      return findReferenceRow(array, values, index + change, change);
    }
    return null;
  };

  const structureMessage = (previousRow, line) => {
    let name;
    if (previousRow && ['SWR', 'OWR'].includes(previousRow.substring(0, 3))) {
      name = `${previousRow.substring(73, 104).trim()} ${previousRow.substring(28, 73).trim()}`;
    } else if (previousRow && previousRow.substring(0, 3) === 'PWR') {
      name = previousRow.substring(28, 73).trim();
    }
    return name ? `${name}: ${line.substring(35, 150).trim()}` : line.substring(35, 150).trim();
  };

  const extractNumberFromString = (value) => {
    const matches = value.match(/\d+/);
    if (matches && matches.length > 0) {
      return parseInt(matches[0], 10);
    }
    return null;
  };

  const removeLeadingZeros = (str) => String(Number(str));
};

module.exports = cwrAcknowledgementObject;
