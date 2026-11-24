const async = require('async');
const { ObjectId } = require('mongodb');
const { logger, utils } = require('@curveroyaltysystems/platform-shared-utils');

const postSaveLogic = async ({ next, release }) => {
  const Release = require('../models/release');

  if (release.skipPostSaveHook) {
    await Release.findByIdAndUpdate(release._id, { $set: {
      skipPostSaveHook: false,
    } });
    next();
    return;
  }

  try {
    updateCopyToCatalogueClients({ release }, (err) => {
      if (err) {
        logger.error('Copying release across catalogues error:');
        logger.error(err);
      }
    });
    next();
  } catch (e) {
    logger.error(e);
    next(e);
  }
};

const postSaveErrorHandling = ({ err, next }) => {
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
};

const preSaveLogic = async ({ next, release, client, updateRunFugaSync }) => {
  const Release = require('../models/release');

  if (release.skipPreSaveHook) {
    await Release.findByIdAndUpdate(release._id, { $set: {
      skipPreSaveHook: false,
    } });
    next();
    return;
  }

  const asyncArray = [];
  checkValidationErrors({ release, client }, () => {
    sanitizeSpecificDealerPrice(release);
    uniqueAliases(release);
    uniqueCatGroups(release);
    uniqueTrackIds(release);
    calculateTotalParticipation(release);
    utils.clearBlankStrings(release, ['salesReturnsRights', 'costsRights']);
    calculateMechanicalRate(release);
    setMechanicalIds(release);
    if (updateRunFugaSync) {
      mechanicalLicenseValidation(release);
    }
    setMechanicalBreakdown(release, () => {
      // Check validations
      if (release.distributionChannel) {
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: release.catNo,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: release.catNo,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: release.catNo,
        }));
      } else {
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: release.barcode,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: release.catNo,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: release.catNo,
        }));
        asyncArray.push(Release.countDocuments({
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: release.catNo,
        }));
      }
      release.aliases.forEach((alias) => {
        if (release.distributionChannel) {
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: alias,
          }));
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: alias,
          }));
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: alias,
          }));
        } else {
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: alias,
          }));
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: alias,
          }));
          asyncArray.push(Release.countDocuments({
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: alias,
          }));
        }
      });
      Promise.all(asyncArray)
        .then((result) => {
          const errors = [];
          result.forEach((resultArray, index) => {
            if (index < 3 && resultArray > 0 && release.barcode && release.barcode !== '' && errors.indexOf('Barcode is required to be unique under each Distribution Channel') === -1) {
              errors.push('Barcode is required to be unique under each Distribution Channel');
            }
            if (index >= 3 && index < 6 && resultArray > 0 && release.catNo && release.catNo !== '' && errors.indexOf('Cat No is required to be unique under each Distribution Channel') === -1) {
              errors.push('Cat No is required to be unique under each Distribution Channel');
            }
            if (index >= 6 && resultArray > 0 && errors.indexOf('Aliases are required to be unique under each Distribution Channel') === -1) {
              errors.push('Aliases are required to be unique under each Distribution Channel');
            }
          });
          if (errors.length) {
            return next(new Error(errors.join(', ')));
          }
          // Test multiple contracts and check if a release has a Sales/Return rate with no Contract associated to it
          checkMultipleContracts(release, (err) => {
            if (err) {
              next(err);
            } else {
              validateSalesReturns(release, (err) => {
                if (err) {
                  next(err);
                } else {
                  validateCosts(release, (err) => {
                    next(err);
                  });
                }
              });
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          next(new Error('Internal error, please try again or contact support'));
        });
    });
  });
};

const checkValidationErrors = async ({ release, client }, callback) => {
  const Client = require('../models/client');
  // Reset release validations errors array
  release.validationErrors = [];
  // Title required
  if (!release.title) {
    release.validationErrors.push('A Title is required');
  }
  // Title required
  if (!release.catNo) {
    release.validationErrors.push('A Cat No is required');
  }
  // Check sales/return is included and has a contract for non Publishing client
  if (!client) {
    client = await Client.findById(release.clientId, 'clientType');
  }
  if (client?.clientType !== 'Publisher') {
    if (!release?.salesReturnsRights?.length > 0) {
      release.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
    } else {
      let salesReturnsRightContractIdFound = true;
      release?.salesReturnsRights?.forEach((salesReturnsRight) => {
        if (!salesReturnsRight.contractId) {
          salesReturnsRightContractIdFound = false;
        }
      });
      if (!salesReturnsRightContractIdFound) {
        release.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
      }
    }
  }
  release.valid = release.validationErrors.length === 0;
  callback();
};

const sanitizeSpecificDealerPrice = (release) => {
  if (Array.isArray(release.priceCategoryDealerPrices)) {
    release.priceCategoryDealerPrices.forEach((priceCategoryDealerPrice) => {
      priceCategoryDealerPrice.dealerPrice = parseFloat(priceCategoryDealerPrice.dealerPrice);
    });
  }
};

const uniqueAliases = (release) => {
  // Force Aliases to Strings
  release.aliases = release.aliases.map((value) => String(value));
  // Filter out any duplicate aliases
  release.aliases = release.aliases.filter((value, index, self) => self.indexOf(value) === index);
};

const uniqueCatGroups = (release) => {
  release.catalogueGroups = release.catalogueGroups.filter((value, index, self) => self.indexOf(value) === index);
};

const uniqueTrackIds = (release) => {
  // Convert all to strings
  release.trackIds = release.trackIds?.map((id) => { if (id) { return id.toString(); } }).filter(Boolean);
  // Remove any duplicate strings
  release.trackIds = release.trackIds?.filter((value, index, self) => self.indexOf(value) === index).filter(Boolean);
};

const calculateTotalParticipation = (release) => {
  // Reset participation to 0
  release.totalParticipation = 0;
  if (release.salesReturnsRights) {
    // Loop through rights
    release.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      release.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  release.totalParticipation = Math.round((release.totalParticipation + Number.EPSILON) * 100) / 100;
  return release.totalParticipation;
};

const calculateMechanicalRate = (release) => {
  if (release.mechanicalTrackCap && release.mechanicalTrackCap !== '' && release.trackIds && release.trackIds.length > 0 && release.mechanicalTrackCap < release.trackIds.length) {
    release.mechanicalBasisPercentage = parseFloat(release.mechanicalTrackCap / (release.trackIds.length * 100)).toFixed(5);
  } else {
    release.mechanicalBasisPercentage = 100;
  }
};

const setMechanicalIds = (release) => {
  // Setup array
  release.mechanicalContractIds = [];
  release.mechanicalComposerIds = [];
  release.mechanicalPublisherIds = [];
  if (release.mechanicalLicenses) {
    // Loop through tracks
    Object.keys(release.mechanicalLicenses).forEach((trackId) => {
      // Check if license exists
      if (release.mechanicalLicenses[trackId] && release.mechanicalLicenses[trackId].licenses) {
        // Loop through licenses
        release.mechanicalLicenses[trackId].licenses.forEach((license) => {
          // Check if contractId already exists
          if (license.contractId && release.mechanicalContractIds.indexOf(license.contractId) === -1) {
            // Add to array
            release.mechanicalContractIds.push(license.contractId);
          }
          // Check if composerId already exists
          if (license.composerId && release.mechanicalComposerIds.indexOf(license.composerId) === -1) {
            // Add to array
            release.mechanicalComposerIds.push(license.composerId);
          }
          // Check if publisherId already exists
          if (license.publisherId && release.mechanicalPublisherIds.indexOf(license.publisherId) === -1) {
            // Add to array
            release.mechanicalPublisherIds.push(license.publisherId);
          }
        });
      }
    });
  }
};

const mechanicalLicenseValidation = (release) => {
  if (release?.trackIds?.length > 0) {
    const currentMechanicalLicenses = {};
    release.trackIds.forEach((trackId) => {
      if (release?.mechanicalLicenses?.[trackId]) {
        currentMechanicalLicenses[trackId] = release.mechanicalLicenses?.[trackId];
      }
    });
    release.mechanicalLicenses = currentMechanicalLicenses;
  } else {
    release.mechanicalLicenses = {};
  }
};

const setMechanicalBreakdown = (release, callback) => {
  const Track = require('../models/track');
  if (release.tracks && release.tracks.length > 0 && release.mechanicalLicenses) {
    const trackIds = release.trackIds.map((trackId) => { if (trackId) { return new ObjectId(trackId); } }).filter(Boolean);
    Track.find({ _id: { $in: trackIds } }, 'statutoryRate')
      .then((tracks) => {
        release.totalMechanicalAmount = 0;
        release.mechanicalBreakdown = [];
        tracks.forEach((track) => {
          if (release.mechanicalLicenses[track._id.toString()] && release.mechanicalLicenses[track._id.toString()].reportMechanicals) {
            release.totalMechanicalAmount += track.statutoryRate;
            release.mechanicalBreakdown.push({ trackId: track._id.toString(), amount: track.statutoryRate });
          }
        });
        callback();
      })
      .catch((err) => {
        logger.error(err);
        // Stick with the old way of not passing error here, it seems important to not break the flow
        callback();
      });
  } else {
    callback();
  }
};

const checkMultipleContracts = (release, callback) => {
  // Test both sales and costs rights
  if (runCheckOnArray(release.salesReturnsRights) || runCheckOnArray(release.costsRights) || runCheckOnMechanicalLicenses(release.mechanicalLicenses)) {
    // Return error if either one has more than 1 of the same contract
    callback(new Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
  } else {
    callback();
  }

  function runCheckOnArray(array) {
    const counts = {};
    const contractIds = array.map((right) => right.contractId);
    contractIds.forEach((id) => {
      if (counts[id]) {
        counts[id] += 1;
      } else {
        counts[id] = 1;
      }
    });
    let returnError = false;
    Object.keys(counts).forEach((key) => {
      if (counts[key] > 1) { returnError = true; }
    });
    return returnError;
  }

  function runCheckOnMechanicalLicenses(mechanicalLicenses) {
    let multipleContractsUsed = false;

    if (mechanicalLicenses) {
      Object.keys(mechanicalLicenses).forEach((key) => {
        if (mechanicalLicenses[key].licenses) {
          const contractIds = [];
          mechanicalLicenses[key].licenses.forEach((license) => {
            if (contractIds.indexOf(license.contractId) === -1) {
              contractIds.push(license.contractId);
            } else {
              multipleContractsUsed = true;
            }
          });
        }
      });
    }

    return multipleContractsUsed;
  }
};

const validateSalesReturns = (release, callback) => {
  let validationErrorFound = false;
  if (release.salesReturnsRights) {
    release.salesReturnsRights.forEach((salesReturnsRight) => {
      if (!salesReturnsRight.contractId || (salesReturnsRight.percentage !== 0 && !salesReturnsRight.percentage)) {
        validationErrorFound = true;
      }
    });
  } if (validationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
  } else {
    callback();
  }
};

const validateCosts = (release, callback) => {
  let validationErrorFound = false;
  if (release.costsRights) {
    release.costsRights.forEach((costRight) => {
      if (!costRight.contractId || (costRight.percentage !== 0 && !costRight.percentage)) {
        validationErrorFound = true;
      }
    });
  }
  if (validationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
  } else {
    callback();
  }
};

const errorMessages = (err, callback) => {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('catNo: Path `catNo` is required')) {
        return 'A Cat No is required';
      } if (message.includes('title: Path `title` is required')) {
        return 'A Title is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
};

const updateCopyToCatalogueClients = ({ release, clients = null }, callback) => {
  const Client = require('../models/client');
  async.waterfall([
    function (cb) {
      if (!clients) {
        Client.find({ 'inheritCatalogueFrom.clientId': release.clientId })
          .then((clients) => {
            cb(null, clients);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        cb(null, clients);
      }
    },
    function (clients, cb) {
      clients = clients.map((client) => {
        // Check client has either catalogue group or no catalogue group
        let clientMatches = false;
        client?.inheritCatalogueFrom?.forEach((inheritance) => {
          if (inheritance && inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
            // Test against release catalogue groups
            if (release.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
              clientMatches = true;
            }
          } else {
            clientMatches = true;
          }
        });
        if (clientMatches) {
          return client;
        }
      }).filter(Boolean);
      cb(null, clients);
    },
    function (clients, cb) {
      if (clients.length > 0) {
        async.eachSeries(clients, (clientToCopyTo, clientCb) => {
          updateCopyToCatalogueByClient({ client: clientToCopyTo, release }, clientCb);
        }, cb);
      } else {
        cb();
      }
    },
  ], callback);
};

const updateCopyToCatalogueByClient = function ({ client, release }, callback) {
  const Release = require('../models/release');

  const thisRelease = release;
  async.waterfall([
    function (cb) {
      // Find any previously created release
      Release.findOne({ clientId: client._id.toString(), duplicatedFrom: thisRelease._id.toString() })
        .then((release) => {
          cb(null, release);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (release, cb) {
      // Create if no release found
      if (!release) {
        const newRelease = new Release();
        cb(null, newRelease);
      } else {
        cb(null, release);
      }
    },
    function (release, cb) {
      // Update values
      copyValues({ release, releaseToCopy: thisRelease, clientId: client._id }, () => {
        cb(null, release);
      });
    },
    function (release, cb) {
      release.save()
        .then((release) => {
          cb(null, release);
        })
        .catch((err) => {
          thisRelease.validationErrors.push(`Failed syncing to ${client.name}: ${err.message}`);
          Release.updateOne({ _id: thisRelease._id }, { $set: { validationErrors: thisRelease.validationErrors } })
            .then(() => {
              cb(null, release);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        });
    },
  ], callback);
};

const copyValues = function ({ release, releaseToCopy, clientId }, callback) {
  release.clientId = clientId;
  release.title = releaseToCopy.title;
  release.version = releaseToCopy.version;
  release.artist = releaseToCopy.artist;
  release.catNo = releaseToCopy.catNo;
  release.barcode = releaseToCopy.barcode;
  release.label = releaseToCopy.label;
  release.releaseDate = releaseToCopy.releaseDate;
  release.distributionChannel = releaseToCopy.distributionChannel;
  release.format = releaseToCopy.format;
  release.priceCategory = releaseToCopy.priceCategory;
  release.dealerPrice = releaseToCopy.dealerPrice;
  release.mcpsId = releaseToCopy.mcpsId;
  release.exemptFromMechanicals = releaseToCopy.exemptFromMechanicals;
  const aliasesToAdd = releaseToCopy.aliases.filter((alias) => !release.aliases.includes(alias));
  release.aliases = [...release.aliases, ...aliasesToAdd];
  release.projectId = releaseToCopy.projectId;
  release.duplicatedFrom = releaseToCopy._id;
  // Get tracks by their ISRCs from other account
  const trackIds = releaseToCopy.trackIds.map((trackId) => {
    if (trackId) {
      return new ObjectId(trackId);
    }
  }).filter(Boolean);
  const Track = require('../models/track');
  Track.find({ clientId: releaseToCopy.clientId, _id: { $in: trackIds } })
    .then((tracks) => {
      const isrcs = tracks.map((track) => {
        if (track.isrc) {
          return track.isrc;
        }
      }).filter(Boolean);
      Track.find({ clientId, isrc: { $in: isrcs } })
        .then((newTracks) => {
          release.trackIds = newTracks.map((track) => track._id.toString());
          callback(null, release);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

module.exports = {
  preSaveLogic,
  postSaveErrorHandling,
  postSaveLogic,
  updateCopyToCatalogueClients,
};
