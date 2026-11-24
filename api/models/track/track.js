/* eslint-disable no-unused-expressions */
/* eslint-disable no-loop-func */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/**
 * @module track
 */
const _ = require('lodash');
const { logger, fileManager, createZip, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, Utils, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { Track: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const modelHistory = require('../../libs/modelHistory');
const contractTerritoryValidation = require('../../libs/contractTerritoryValidation');
const Client = require('../client');
const Contract = require('../contract');
const Composer = require('../composer');
const Publisher = require('../publisher');
const UnmappedTrack = require('../unmappedTrack');
const Notification = require('../notification');
const config = require('../../config.json');
const fixEncoding = require('../../libs/fixEncoding');

const trackSchema = schema;

trackSchema.plugin(modelHistory, { mongoose, name: 'trackPatches', useArchive: true, removePatches: false });
trackSchema.plugin(mongoosePaginate);

/**
  * Check if one of the passed contract IDs is associated with the Track.
  *
  * Calls callback(containsId) with [containsId] set to true if one of the passedcontract IDs is associated with the Track.
  *
  * @method
  * @param {string} passedContractIds - Contract IDs to check against.
  * @param {function(boolean)} callback - The callback that handles the response.
  */

trackSchema.methods.containsContractIds = function (passedContractIds, callback) {
  if (passedContractIds) {
    this.contractIds((trackContractIds) => {
      let value = false;
      passedContractIds.forEach((passedContractId) => {
        if (trackContractIds.indexOf(passedContractId) !== -1) {
          value = true;
        }
        if (passedContractId === passedContractIds[passedContractIds.length - 1]) {
          callback(value);
        }
      });
    });
  } else {
    callback(false);
  }
};

/**
  * Returns an array of contract IDs associated with the Track.
  *
  * Calls callback(array) with an [array] of contract IDs associated with the Track.
  *
  * @method
  * @param {function(string[])} callback - The callback that handles the response.
  */

trackSchema.methods.contractIds = function (callback) {
  callback(Track.extractContractIds(this));
};

/**
 * Extracts the contract IDs from the track.
 * @param {*} track - The track to extract the contract IDs from.
 * @returns {string[]} - The contract IDs.
 */
trackSchema.statics.extractContractIds = function (track) {
  const array = [];
  track.salesReturnsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  track.costsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  return array;
};

/**
  * Validates the contracts associated to the Track.
  *
  * Sets track.contractValidation to "No Contracts" if no contracts are associated to the Track
  *
  * Sets track.contractValidation to "Territories Missing" if the contract's territories are missing
  *
  * Sets track.contractValidation to "" othewrwise
  *
  * Calls callback() after checking the contracts.
  *
  * @method
  * @param {function()} callback - The callback that handles the response.
  */

trackSchema.methods.trackContractValidation = function (callback) {
  const self = this;
  this.contractIds((array) => {
    if (array.length === 0) {
      self.contractValidation = 'No Contracts';
      return callback ? callback() : true;
    }
    Contract.find({ _id: { $in: array } })
      .then((contracts) => {
        let verify = true;
        contracts.forEach((contract) => {
          verify = verify && contractTerritoryValidation.checkContract(contract);
        });
        if (!verify) {
          self.contractValidation = 'Territories Missing';
        } else {
          self.contractValidation = '';
        }
        return callback ? callback() : true;
      });
  });
};

/**
  * Sends an export of the Track data by email.
  *
  * @method
  * @param {object} filter - The Track filter object.
  * @param {object} curveUser - The User sending the export.
  * @param {object} exportTemplateVersion - The export template version.
  */
trackSchema.statics.sendExport = function (filter, curveUser, exportTemplateVersion) {
  let client;
  async.waterfall([
    function (cb) {
      Track.countDocuments(filter)
        .then((count) => {
          cb(null, count);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (count, cb) {
      Client.findById(curveUser.clientId)
        .then((foundClient) => {
          client = foundClient;
          const { paymentTier } = client;
          if (count < 2000) {
            Track.createExportXlsx(filter, exportTemplateVersion, curveUser.clientId, paymentTier, cb);
          } else if (exportTemplateVersion !== 'v2') {
            Track.createExportCsv(filter, count, cb);
          } else {
            Track.createExportCsvV2(filter, count, paymentTier, cb);
          }
        })
        .catch((err) => {
          logger.error(`Error finding client for senfExport with clientId '${curveUser.clientId}': ${err}`);
          cb(err);
        });
    },
    function (filePath, cb) {
      fileManager.uploadToS3(`exports/${client.name} Track Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
    },
    function (key, cb) {
      fileManager.publicLink24Hours(key, cb);
    },
    function (link, cb) {
      const generateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Track Export for ${client.name} is Ready to Download`,
        link,
      };
      Notification.generate('Track Export Ready', `Your Track Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
        cb(err);
      });
    },
  ], (error) => {
    if (error) {
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Track Export Has Errored',
        error: error.message,
      };
      Notification.generate('Your Track Export Has Errored', error.message, null, curveUser, generateOptions);
    }
  });
};

/**
  * Exports the Track data to an Excel file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the excel file.
  *
  * @method
  * @param {object} filter - The Track filter object.
  * @param {string} exportTemplateVersion - The export template version.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

trackSchema.statics.createExportXlsx = function (filter, exportTemplateVersion, clientId, paymentTier, callback) {
  async.waterfall([
    function (cb) {
      Track.find(filter)
        .then((tracks) => {
          cb(null, tracks);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (tracks, cb) {
      if (exportTemplateVersion !== 'v2') {
        Track.convertTracksForXlsx(tracks, cb);
      } else {
        Track.convertTracksForXlsxV2(tracks, paymentTier, cb);
      }
    },
    function (data, cb) {
      // Data is array of
      if (paymentTier === 'Lite') {
        Exports.getTemplate({ Client, templateName: 'track', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      } else if (exportTemplateVersion !== 'v2') {
        Exports.getTemplate({ Client, templateName: 'trackCombined', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      } else {
        Exports.getTemplate({ Client, templateName: 'trackSeparated', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      }
    },
  ], callback);
};

/**
  * Exports the Track data to a CSV file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} filter - The Track filter object.
  * @param {number} count - The number of Track to process per round.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

trackSchema.statics.createExportCsv = function (filter, count, callback) {
  const limit = 1000;
  const standardOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')}.csv`;
  const mechanicalOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')} - mechanicals.csv`;
  const releaseSpecificRightsOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')} - releaseSpecificRights.csv`;
  const writer = new WriteCsv({
    headers: [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'ISRC', 'Label', 'P Line', 'Duration', 'Mechanical Rate Basis', 'US Statutory Mechanical Rate',
      'Canadian Statutory Mechanical Rate', 'Report Mechanicals', 'Catalogue Groups', 'Default Release Distribution Channel', 'Default Release Cat No',
      'Aliases', 'Sales Contract Name', 'Sales Contract Percentage', 'Costs Contract Name', 'Costs Contract Percentage',
    ],
    outputLocation: standardOutput,
  });
  const mechanicalWriter = new WriteCsv({
    headers: ['ISRC', 'Composer Name', 'Composer CAE Number', 'Publisher Name', 'Publisher CAE Number', 'Contract Name', 'License No', 'Rate', 'Share'],
    outputLocation: mechanicalOutput,
  });
  const releaseSpecificRightsWriter = new WriteCsv({
    headers: [
      'ISRC', 'Release Distribution Channel', 'Release Cat No', 'Contract', 'Percentage',
    ],
    outputLocation: releaseSpecificRightsOutput,
  });
  const rounds = listFromNumber(Math.floor(count / limit));
  async.eachLimit(rounds, 3, (round, loopCb) => {
    logger.info(`Track Export: Running Round ${round} of ${rounds.length}`);
    async.waterfall([
      function (cb) {
        Track.find(filter)
          .limit(limit)
          .skip(round * limit)
          .sort({ _id: 1 })
          .then((tracks) => {
            cb(null, tracks);
          })
          .catch(cb);
      },
      function (tracks, cb) {
        Track.convertTracksForXlsx(tracks, cb);
      },
      function (data, cb) {
        writer.addData(data[0], (err) => {
          cb(err, data);
        });
      },
      function (data, cb) {
        mechanicalWriter.addData(data[1], (err) => {
          cb(err, data);
        });
      },
      function (data, cb) {
        releaseSpecificRightsWriter.addData(data[2], cb);
      },
    ], loopCb);
  }, () => {
    async.series([
      function (cb) {
        writer.write((err) => {
          cb(err);
        });
      },
      function (cb) {
        mechanicalWriter.write((err) => {
          cb(err);
        });
      },
      function (cb) {
        releaseSpecificRightsWriter.write((err) => {
          cb(err);
        });
      },
    ], (err) => {
      if (err) {
        callback(err);
      } else {
        createZip.localFiles([standardOutput, mechanicalOutput, releaseSpecificRightsOutput], `${appRootDir}/tmp/Track Export ${moment().format('X')}.zip`, callback);
      }
    });
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
  * Exports the Track data to a CSV file (V2).
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} filter - The Track filter object.
  * @param {number} count - The number of Track to process per round.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

trackSchema.statics.createExportCsvV2 = function (filter, count, paymentTier, callback) {
  const limit = 10000;
  const standardOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')}.csv`;
  const contractOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')} - contracts.csv`;
  const mechanicalOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')} - mechanicals.csv`;
  const releaseSpecificRightsOutput = `${appRootDir}/tmp/Track Export - ${moment().format('X')} - releaseSpecificRights.csv`;

  const headers = paymentTier === 'Lite'
    ? [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'ISRC', 'Label', 'P Line', 'Duration', 'Catalogue Groups', 'Default Release Distribution Channel',
      'Default Release Cat No', 'Aliases']
    : [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'ISRC', 'Label', 'P Line', 'Duration', 'Mechanical Rate Basis', 'US Statutory Mechanical Rate',
      'Canadian Statutory Mechanical Rate', 'Report Mechanicals', 'Catalogue Groups', 'Default Release Distribution Channel',
      'Default Release Cat No', 'Aliases'];

  const writer = new WriteCsv({
    headers,
    outputLocation: standardOutput,
  });
  const contractWriter = new WriteCsv({
    headers: [
      'ISRC', 'Sales Contract Name', 'Sales Contract Percentage', 'Costs Contract Name', 'Costs Contract Percentage',
    ],
    outputLocation: contractOutput,
  });
  const mechanicalWriter = new WriteCsv({
    headers: [
      'ISRC', 'Composer Name', 'Composer CAE Number', 'Publisher Name', 'Publisher CAE Number', 'Contract Name', 'License No', 'Rate', 'Share',
    ],
    outputLocation: mechanicalOutput,
  });
  const releaseSpecificRightsWriter = new WriteCsv({
    headers: [
      'ISRC', 'Release Distribution Channel', 'Release Cat No', 'Contract', 'Percentage',
    ],
    outputLocation: releaseSpecificRightsOutput,
  });
  const rounds = listFromNumber(Math.floor(count / limit));
  async.eachSeries(rounds, (round, loopCb) => {
    async.waterfall([
      function (cb) {
        Track.find(filter)
          .limit(limit)
          .skip(round * limit)
          .sort({ _id: 1 })
          .then((tracks) => {
            cb(null, tracks);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (tracks, cb) {
        Track.convertTracksForXlsxV2(tracks, paymentTier, cb);
      },
      function (data, cb) {
        writer.addData(data[0], (err) => {
          cb(err, data);
        });
      },
      function (data, cb) {
        contractWriter.addData(data[1], (err) => {
          cb(err, data);
        });
      },
      function (data, cb) {
        if (paymentTier === 'Lite') {
          cb(null, data);
        } else {
          mechanicalWriter.addData(data[2], (err) => {
            cb(err, data);
          });
        }
      },
      function (data, cb) {
        if (paymentTier === 'Lite') {
          cb();
        } else {
          releaseSpecificRightsWriter.addData(data[3], cb);
        }
      },
    ], loopCb);
  }, () => {
    async.series([
      function (cb) {
        writer.write((err) => {
          cb(err);
        });
      },
      function (cb) {
        contractWriter.write((err) => {
          cb(err);
        });
      },
      function (cb) {
        if (paymentTier === 'Lite') {
          cb();
        } else {
          mechanicalWriter.write((err) => {
            cb(err);
          });
        }
      },
      function (cb) {
        if (paymentTier === 'Lite') {
          cb();
        } else {
          releaseSpecificRightsWriter.write((err) => {
            cb(err);
          });
        }
      },
    ], (err) => {
      if (err) {
        callback(err);
      } else {
        createZip.localFiles(paymentTier === 'Lite' ? [standardOutput, contractOutput] : [standardOutput, contractOutput, mechanicalOutput, releaseSpecificRightsOutput], `${appRootDir}/tmp/Track Export ${moment().format('X')}.zip`, callback);
      }
    });
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
  * Fromats the Tracks data for a Release export.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} tracks - The Tracks to convert.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

trackSchema.statics.convertTracksForXlsx = function (tracks, callback) {
  const Contract = require('../contract');
  const Release = require('../release');
  if (tracks instanceof Array) {
    const convertedTracks = [];
    const mechanicals = [];
    const releaseSpecificRights = [];
    async.eachLimit(tracks, 10, (track, cb) => {
      const aliases = track.aliases.map((alias) => alias).join(';');
      const defaultRelease = {
        catNo: '',
        distributionChannel: '',
      };
      async.series(
        [
          function (callback) {
            if (!track.defaultReleaseId) return callback();
            Release.findById(track.defaultReleaseId)
              .then((release) => {
                if (release) {
                  defaultRelease.catNo = release.catNo;
                  defaultRelease.distributionChannel = release.distributionChannel;
                }
                callback();
              })
              .catch((err) => {
                logger.error(`Error finding release for convertTrackForXlsx with defaultReleaseId ${track.defaultReleaseId}: ${err}`);
                callback();
              });
          },
          function (callback) {
            if (track.salesReturnsRights.length > 0) {
              async.each(track.salesReturnsRights, (salesReturn, salesReturnCb) => {
                Contract.findById(salesReturn.contractId)
                  .then((contract) => {
                    const contractName = contract ? contract.name : '';
                    convertedTracks.push(track.exportData(defaultRelease, aliases, { contractName, _id: salesReturn.contractId, type: 'salesReturnRights' }, salesReturn.percentage));
                    salesReturnCb();
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract for convertTrackForXlsx with contractId ${salesReturn.contractId}: ${err}`);
                    salesReturnCb();
                  });
              }, callback);
            } else {
              callback();
            }
          },
          function (callback) {
            if (track.costsRights.length > 0) {
              async.each(track.costsRights, (costsReturn, costsReturnCb) => {
                Contract.findById(costsReturn.contractId)
                  .then((contract) => {
                    const contractName = contract ? contract.name : '';
                    convertedTracks.push(track.exportData(defaultRelease, aliases, { contractName, _id: costsReturn.contractId, type: 'costsRights' }, costsReturn.percentage));
                    costsReturnCb();
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract for convertTrackForXlsx with contractId ${costsReturn.contractId}: ${err}`);
                    costsReturnCb();
                  });
              }, callback);
            } else {
              callback();
            }
          },
          function (callback) {
            if (track.salesReturnsRights.length === 0 && track.costsRights.length === 0) {
              convertedTracks.push(track.exportData(defaultRelease, aliases, null, null));
            }
            callback();
          },
          function (callback) {
            if (track?.releaseSpecificSalesReturnsRights?.length > 0) {
              async.each(track.releaseSpecificSalesReturnsRights, (releaseRight, releaseRightCb) => {
                if (releaseRight) {
                  async.parallel({
                    contractName(paraCb) {
                      Contract.findById(releaseRight.contractId)
                        .then((contract) => {
                          const contractName = contract ? contract.name : '';
                          paraCb(null, contractName);
                        })
                        .catch((err) => {
                          logger.error(`Error finding contract for convertTrackForXlsx with releaseRight.contractId '${releaseRight.contractId}': ${err}`);
                          // When refactoring the callback here, this error is not being passed to maintain original functionality.
                          // It is possible this should be changed to pass the error.
                          paraCb(null, '');
                        });
                    },
                    release(paraCb) {
                      Release.findById(releaseRight.releaseId)
                        .then((release) => {
                          const releaseDistributionChannel = release ? release.distributionChannel : '';
                          const releaseCatNo = release ? release.catNo : '';
                          const releaseConfig = { catNo: releaseCatNo, distributionChannel: releaseDistributionChannel };
                          paraCb(null, releaseConfig);
                        })
                        .catch((err) => {
                          logger.error(`Error finding release for convertTrackForXlsx with releaseRight.releaseId '${releaseRight.releaseId}': ${err}`);
                          // When refactoring the callback here, this error is not being passed to maintain original functionality.
                          // It is possible this should be changed to pass the error.
                          paraCb(null, { catNo: '', distributionChannel: '' });
                        });
                    },
                  }, (err, result) => {
                    if (track?.isrc !== '') {
                      releaseSpecificRights.push([track.isrc, result.release.distributionChannel, result.release.catNo, result.contractName, releaseRight.percentage]);
                    } else {
                      releaseSpecificRights.push([track._id.toString(), result.release.distributionChannel, result.release.catNo, result.contractName, releaseRight.percentage]);
                    }
                    releaseRightCb();
                  });
                } else {
                  releaseRightCb();
                }
              }, callback);
            } else {
              callback();
            }
          },
          function (callback) {
            if (track.mechanicalLicenses.length > 0) {
              async.each(track.mechanicalLicenses, (license, mechanicalCb) => {
                if (license) {
                  async.parallel({
                    contractName(paraCb) {
                      Contract.findById(license.contractId)
                        .then((contract) => {
                          const contractName = contract ? contract.name : '';
                          paraCb(null, contractName);
                        })
                        .catch((err) => {
                          logger.error(`Error finding contract for convertTrackForXlsx with license.contractId '${license.contractId}': ${err}`);
                          // When refactoring the callback here, this error is not being passed to maintain original functionality.
                          // It is possible this should be changed to pass the error.
                          paraCb(null, '');
                        });
                    },
                    composer(paraCb) {
                      Composer.findById(license.composerId)
                        .then((composer) => {
                          paraCb(null, composer);
                        })
                        .catch((err) => {
                          logger.error(`Error finding composer for convertTrackForXlsx with license.composerId '${license.composerId}': ${err}`);
                          // Calling back with undefined to continue original functionality
                          // This definitely reeks of a bug, but it is not clear what the correct behavior should be
                          paraCb(null, undefined);
                        });
                    },
                    publisher(paraCb) {
                      Publisher.findById(license.publisherId)
                        .then((publisher) => {
                          paraCb(null, publisher);
                        })
                        .catch((err) => {
                          logger.error(`Error finding publisher for convertTrackForXlsx with license.publisherId '${license.publisherId}': ${err}`);
                          // Calling back with undefined to continue original functionality
                          // This definitely reeks of a bug, but it is not clear what the correct behavior should be
                          paraCb(null, undefined);
                        });
                    },
                  }, (err, result) => {
                    const composerName = result.composer ? result.composer.name : '';
                    const composerCae = result.composer && result.composer?.cae ? result.composer.cae : '';
                    const publisherName = result.publisher ? result.publisher.name : '';
                    const publisherCae = result.publisher && result.publisher?.cae ? result.publisher.cae : '';
                    if (track.isrc && track.isrc !== '') {
                      mechanicals.push([track.isrc, composerName, composerCae, publisherName, publisherCae, result.contractName, license.licenseNo, license.rate, license.share]);
                    } else {
                      mechanicals.push([track._id.toString(), composerName, composerCae, publisherName, publisherCae, result.contractName, license.licenseNo, license.rate, license.share]);
                    }
                    mechanicalCb();
                  });
                } else {
                  mechanicalCb();
                }
              }, callback);
            } else {
              callback();
            }
          },
        ],
        () => {
          cb();
        },
      );
    }, () => {
      callback(null, [mergeSalesLines(convertedTracks), mechanicals, releaseSpecificRights]);
    });
  } else {
    callback(new Error('Must be passed an Array of Tracks'), null);
  }
};

/**
  * Fromats the Tracks data for a Release export (V2).
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} tracks - The Tracks to convert.
  * @param {function(string, string)} callback - The callback that handles the response.
  */

trackSchema.statics.convertTracksForXlsxV2 = function (tracks, paymentTier, callback) {
  const Contract = require('../contract');
  const Release = require('../release');
  if (tracks instanceof Array) {
    const convertedTracks = [];
    const contracts = [];
    let mechanicals = [];
    const releaseSpecificRights = [];
    async.eachLimit(tracks, 10, (track, cb) => {
      const defaultRelease = {
        catNo: '',
        distributionChannel: '',
      };
      async.series([
        function (callback) {
          if (!track.defaultReleaseId) return callback();
          Release.findById(track.defaultReleaseId)
            .then((release) => {
              if (release) {
                defaultRelease.catNo = release.catNo;
                defaultRelease.distributionChannel = release.distributionChannel;
              }
              callback();
            })
            .catch((err) => {
              logger.error(`Error finding release for convertTrackForXlsxV2 with defaultReleaseId ${track.defaultReleaseId}: ${err}`);
              callback();
            });
        },
        function (seriesCallback) {
          convertedTracks.push(track.exportTrackRow(defaultRelease, paymentTier));
          seriesCallback();
        },
        function (seriesCallback) {
          if (track.salesReturnsRights.length > 0) {
            async.each(track.salesReturnsRights, (salesReturn, salesReturnCb) => {
              Contract.findById(salesReturn.contractId)
                .then((contract) => {
                  if (contract) {
                    const contractName = contract ? contract.name : '';
                    contracts.push(track.exportContractRow({ contractName, _id: salesReturn.contractId, type: 'salesReturnRights' }, salesReturn.percentage));
                    salesReturnCb();
                  } else {
                    salesReturnCb();
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding contract for convertTrackForXlsxV2 with salesReturn.contractId '${salesReturn.contractId}': ${err}`);
                  salesReturnCb();
                });
            }, seriesCallback);
          } else {
            seriesCallback();
          }
        },
        function (seriesCallback) {
          if (track.costsRights.length > 0) {
            async.each(track.costsRights, (costsReturn, costsReturnCb) => {
              Contract.findById(costsReturn.contractId)
                .then((contract) => {
                  if (contract) {
                    const contractName = contract ? contract.name : '';
                    contracts.push(track.exportContractRow({ contractName, _id: costsReturn.contractId, type: 'costsRights' }, costsReturn.percentage));
                    costsReturnCb();
                  } else {
                    costsReturnCb();
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding contract for convertTrackForXlsxV2 with costsReturn.contractId '${costsReturn.contractId}': ${err}`);
                  costsReturnCb();
                });
            }, seriesCallback);
          } else {
            seriesCallback();
          }
        },
        function (callback) {
          if (track?.releaseSpecificSalesReturnsRights?.length > 0 && paymentTier !== 'Lite') {
            async.each(track.releaseSpecificSalesReturnsRights, (releaseRight, releaseRightCb) => {
              if (releaseRight) {
                async.parallel({
                  contractName(paraCb) {
                    Contract.findById(releaseRight.contractId)
                      .then((contract) => {
                        const contractName = contract ? contract.name : '';
                        paraCb(null, contractName);
                      })
                      .catch((err) => {
                        logger.error(`Error finding contract for convertTrackForXlsxV2 with releaseRight.contractId '${releaseRight.contractId}': ${err}`);
                        paraCb(null, '');
                      });
                  },
                  release(paraCb) {
                    Release.findById(releaseRight.releaseId)
                      .then((release) => {
                        const releaseDistributionChannel = release ? release.distributionChannel : '';
                        const releaseCatNo = release ? release.catNo : '';
                        const releaseConfig = { catNo: releaseCatNo, distributionChannel: releaseDistributionChannel };
                        paraCb(null, releaseConfig);
                      })
                      .catch((err) => {
                        logger.error(`Error finding release for convertTrackForXlsxV2 with releaseRight.releaseId '${releaseRight.releaseId}': ${err}`);
                        paraCb(null, { catNo: '', distributionChannel: '' });
                      });
                  },
                }, (err, result) => {
                  if (track?.isrc !== '') {
                    releaseSpecificRights.push([track.isrc, result.release.distributionChannel, result.release.catNo, result.contractName, releaseRight.percentage]);
                  } else {
                    releaseSpecificRights.push([track._id.toString(), result.release.distributionChannel, result.release.catNo, result.contractName, releaseRight.percentage]);
                  }
                  releaseRightCb();
                });
              } else {
                releaseRightCb();
              }
            }, callback);
          } else {
            callback();
          }
        },
        function (seriesCallback) {
          if (track.mechanicalLicenses.length > 0 && paymentTier !== 'Lite') {
            async.each(track.mechanicalLicenses, (license, mechanicalCb) => {
              if (license) {
                async.parallel({
                  contractName(paraCb) {
                    Contract.findById(license.contractId)
                      .then((contract) => {
                        const contractName = contract ? contract.name : '';
                        paraCb(null, contractName);
                      })
                      .catch((err) => {
                        logger.error(`Error finding contract for convertTrackForXlsxV2 with license.contractId '${license.contractId}': ${err}`);
                        paraCb(null, '');
                      });
                  },
                  composer(paraCb) {
                    Composer.findById(license.composerId)
                      .then((composer) => {
                        paraCb(null, composer);
                      })
                      .catch((err) => {
                        logger.error(`Error finding composer for convertTrackForXlsxV2 with license.composerId '${license.composerId}': ${err}`);
                        paraCb(null, undefined);
                      });
                  },
                  publisher(paraCb) {
                    Publisher.findById(license.publisherId)
                      .then((publisher) => {
                        paraCb(null, publisher);
                      })
                      .catch((err) => {
                        logger.error(`Error finding publisher for convertTrackForXlsxV2 with license.publisherId '${license.publisherId}': ${err}`);
                        paraCb(null, undefined);
                      });
                  },
                }, (err, result) => {
                  const composerName = result.composer ? result.composer.name : '';
                  const composerCae = result.composer && result.composer?.cae ? result.composer.cae : '';
                  const publisherName = result.publisher ? result.publisher.name : '';
                  const publisherCae = result.publisher && result.publisher?.cae ? result.publisher.cae : '';
                  if (track.isrc && track.isrc !== '') {
                    mechanicals.push([track.isrc, composerName, composerCae, publisherName, publisherCae, result.contractName, license.licenseNo, license.rate, license.share]);
                  } else {
                    mechanicals.push([track._id.toString(), composerName, composerCae, publisherName, publisherCae, result.contractName, license.licenseNo, license.rate, license.share]);
                  }
                  mechanicalCb();
                });
              } else {
                mechanicalCb();
              }
            }, (err) => {
              // Sort Mechanical Licenses by ISRC
              mechanicals = mechanicals.sort((a, b) => {
                if (a[0] > b[0]) {
                  return 1;
                } if (a[0] < b[0]) {
                  return -1;
                }
                return 0;
              });
              seriesCallback(err);
            });
          } else {
            seriesCallback();
          }
        },
      ], cb);
    }, (err) => {
      callback(err, paymentTier === 'Lite' ? [convertedTracks, mergeContractLines(contracts)] : [convertedTracks, mergeContractLines(contracts), mechanicals, releaseSpecificRights]);
    });
  } else {
    callback(new Error('Must be passed an Array of Tracks'), null);
  }
};

/**
  * Merges sales lines for each of the converted Tracks.
  *
  * Calls callback(err, mergedSalesLines) with an [err] if an error occurs and the [mergedSalesLines].
  *
  * @method
  * @param {object[]} convertedReleases - The converted Releases to merge.
  * @returns {object[]} mergedSalesLines - Returns the merged sales lines.
  */

function mergeSalesLines(convertedTracks) {
  const mergedSalesLines = [];

  for (let i = 0; i < convertedTracks.length; i += 1) {
    for (let j = i + 1; j < convertedTracks.length; j += 1) {
      if (convertedTracks[i].indexOf('merged') === -1) {
        // track id same, and contract name is same
        if (convertedTracks[i][0] === convertedTracks[j][0] && (convertedTracks[i][18] === convertedTracks[j][18])) {
          if (convertedTracks[i].indexOf('salesReturnRights') > -1) {
            convertedTracks[i][20] = convertedTracks[j][18];
            convertedTracks[i][21] = convertedTracks[j][19];
            convertedTracks[i].push('merged');
            convertedTracks[j].push('toDelete');
          } else if (convertedTracks[i].indexOf('costsRights') > -1) {
            convertedTracks[i][20] = convertedTracks[i][18];
            convertedTracks[i][21] = convertedTracks[i][19];
            convertedTracks[i][18] = convertedTracks[j][18];
            convertedTracks[i][19] = convertedTracks[j][19];
            convertedTracks[i].push('merged');
            convertedTracks[j].push('toDelete');
          }
        }
      }
    }
  }

  // Delete Duplicate Lines
  for (let i = 0; i < convertedTracks.length; i += 1) {
    if (convertedTracks[i].indexOf('toDelete') === -1) {
      mergedSalesLines.push(convertedTracks[i]);
    }
  }

  // Clean arrays from "merged" and reorder values based on rights type
  for (let i = 0; i < mergedSalesLines.length; i += 1) {
    if (mergedSalesLines[i].indexOf('merged') > -1) {
      mergedSalesLines[i] = mergedSalesLines[i].splice(0, mergedSalesLines[i].length - 1);
    } else if (mergedSalesLines[i].indexOf('salesReturnRights') > -1) {
      mergedSalesLines[i] = mergedSalesLines[i].splice(0, mergedSalesLines[i].length - 2);
    } else if (mergedSalesLines[i].indexOf('costsRights') > -1) {
      mergedSalesLines[i][20] = mergedSalesLines[i][18];
      mergedSalesLines[i][21] = mergedSalesLines[i][19];
      mergedSalesLines[i][18] = '';
      mergedSalesLines[i][19] = '';
    }
  }

  return mergedSalesLines;
}

/**
  * Merges duplicate contract lines.
  *
  * @method
  * @param {object[]} contracts - The Contract lines to merge.
  * @returns {object[]} mergedContractLines - The merged contract lines.
  */

function mergeContractLines(contracts) {
  const mergedContractLines = [];

  for (let i = 0; i < contracts.length; i += 1) {
    for (let j = i + 1; j < contracts.length; j += 1) {
      if (contracts[i].indexOf('merged') === -1) {
        // isrc and contract name is same
        if (contracts[i][0] === contracts[j][0] && (contracts[i][1] === contracts[j][1])) {
          if (contracts[i].indexOf('salesReturnRights') > -1) {
            contracts[i][3] = contracts[j][1];
            contracts[i][4] = contracts[j][2];
            contracts[i].push('merged');
            contracts[j].push('toDelete');
          } else if (contracts[i].indexOf('costsRights') > -1) {
            contracts[i][3] = contracts[i][1];
            contracts[i][4] = contracts[i][2];
            contracts[i][1] = contracts[j][1];
            contracts[i][2] = contracts[j][2];
            contracts[i].push('merged');
            contracts[j].push('toDelete');
          }
        }
      }
    }
  }

  // Delete Duplicate Lines
  for (let i = 0; i < contracts.length; i += 1) {
    if (contracts[i].indexOf('toDelete') === -1) {
      mergedContractLines.push(contracts[i]);
    }
  }

  // Clean arrays from "merged" and reorder values based on rights type
  for (let i = 0; i < mergedContractLines.length; i += 1) {
    if (mergedContractLines[i].indexOf('merged') > -1) {
      mergedContractLines[i] = mergedContractLines[i].splice(0, mergedContractLines[i].length - 1);
    } else if (mergedContractLines[i].indexOf('salesReturnRights') > -1) {
      mergedContractLines[i] = mergedContractLines[i].splice(0, mergedContractLines[i].length - 2);
    } else if (mergedContractLines[i].indexOf('costsRights') > -1) {
      mergedContractLines[i][3] = mergedContractLines[i][1];
      mergedContractLines[i][4] = mergedContractLines[i][2];
      mergedContractLines[i][1] = '';
      mergedContractLines[i][2] = '';
    }
  }

  // Sort by ISRC
  mergedContractLines.sort((a, b) => {
    if (a[0] > b[0]) {
      return 1;
    } if (a[0] < b[0]) {
      return -1;
    }
    return 0;
  });

  return mergedContractLines;
}

/**
 * Returns an array of the Tracks to export.
 *
  * @method
  * @param {object} defaultRelease - The default Release object.
  * @param {string[]} aliases - Array of Release aliases.
  * @param {object} contract - The contract to include in the export
  * @param {number} contractPercentage - The percentage of the contract to include in the export
  * @returns {array} result - The export data
  */

trackSchema.methods.exportData = function (defaultRelease, aliases, contract, contractPercentage) {
  const array = [
    this._id.toString(),
    fixEncoding(this.title),
    fixEncoding(this.version),
    fixEncoding(this.artist),
    this.foreignId,
    this.projectId,
    this.isrc,
    fixEncoding(this.label),
    fixEncoding(this.pLine),
    this.duration,
    this.mechanicalCalculationBasis,
    this.statutoryRate,
    this.canadianStatutoryRate,
    this.reportMechanicals,
    this.catalogueGroups.join(';'),
    defaultRelease.distributionChannel,
    defaultRelease.catNo,
    aliases,
  ];
  if (contract) {
    array.push(contract.contractName);
    array.push(contractPercentage);
    array.push(contract._id);
    array.push(contract.type);
  }
  return array;
};

/**
 * Returns an array of the Track to export.
 *
  * @method
  * @param {object} defaultRelease - Default Release linked to the Track.
  * @returns {array} result - The export data
  */
trackSchema.methods.exportTrackRow = function (defaultRelease, paymentTier) {
  const track = this;

  const proData = [
    track._id.toString(),
    fixEncoding(track.title),
    fixEncoding(track.version),
    fixEncoding(track.artist),
    track.foreignId,
    track.projectId,
    track.isrc,
    fixEncoding(track.label),
    fixEncoding(track.pLine),
    track.duration,
    track.mechanicalCalculationBasis,
    track.statutoryRate,
    track.canadianStatutoryRate,
    track.reportMechanicals,
    track.catalogueGroups.join(';'),
    defaultRelease.distributionChannel,
    defaultRelease.catNo,
    track.aliases.join(';'),
  ];

  const liteData = [
    track._id.toString(),
    fixEncoding(track.title),
    fixEncoding(track.version),
    fixEncoding(track.artist),
    track.foreignId,
    track.projectId,
    track.isrc,
    fixEncoding(track.label),
    fixEncoding(track.pLine),
    track.duration,
    track.catalogueGroups.join(';'),
    defaultRelease.distributionChannel,
    defaultRelease.catNo,
    track.aliases.join(';'),
  ];

  return paymentTier === 'Lite' ? liteData : proData;
};

/**
 * Returns an array of the Contract data to export.
 *
  * @method
  * @param {object} contract - The Contract to export.
  * @param {number} contractPercentage - The Contract sales/costs return percentage.
  * @returns {array} result - The export data
  */

trackSchema.methods.exportContractRow = function (contract, contractPercentage) {
  const array = this.isrc && this.isrc !== '' ? [this.isrc] : [this._id.toString()];

  if (contract) {
    array.push(contract.contractName);
    array.push(contractPercentage);
    array.push(contract._id);
    array.push(contract.type);
  }

  return array;
};

/**
  * Imports Tracks from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Track.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

trackSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  logger.debug(file);
  logger.debug(curveUser);
  const ImportXlsx = require('../../libs/importXlsx');
  const trackData = {};
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        async.parallel([
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.track, 0, 2, dateFormat, (err, data) => {
              if (err) {
                ImportXlsx.getDataByTemplate(file.path, config.importTemplates.oldTrack, 0, 2, dateFormat, (err, data) => {
                  if (err) {
                    logger.error("Doesn't match old template");
                    logger.error(err);
                    cb(err);
                  } else {
                    trackData.tracks = data;
                    cb();
                  }
                });
              } else {
                trackData.tracks = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.trackMechanicals, 1, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                trackData.mechanicals = [];
                cb(err);
              } else {
                trackData.mechanicals = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.trackReleaseSpecificRights, 2, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                trackData.releaseSpecificRights = [];
                cb(err);
              } else {
                trackData.releaseSpecificRights = data;
                cb();
              }
            });
          },
        ], (error) => {
          if (error) {
            if (error === 'Template does not match') { error = 'It appears the template does not match'; }
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Track Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Track Import Has Errored', error, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            Track.importTracks(trackData.tracks, trackData.mechanicals, trackData.releaseSpecificRights, curveUser.clientId, client, overwriteBlanks, (errors, count, importedTracks) => {
              if (errors && errors.length > 0) {
                logger.error('Errored importing tracks');
                logger.error(errors);
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Track Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Track Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                    callback(err);
                  });
              } else {
              // Didn't error, save.
                const partialImportErrors = [];
                async.eachSeries(Object.keys(importedTracks), (isrc, importCb) => {
                  const importedTrack = importedTracks[isrc];
                  importedTrack.createdBy = curveUser.id;
                  importedTrack.lastModifiedBy = curveUser.id;
                  importedTrack.save()
                    .then(() => {
                      importCb();
                    })
                    .catch((err) => {
                      if (err) {
                        partialImportErrors.push(`Track ${importedTrack.isrc} did not save - ${err.message || err}`);
                      }
                      importCb();
                    });
                }, () => {
                // Send success email
                  Client.findById(curveUser.clientId)
                    .then((client) => {
                      if (partialImportErrors.length > 0) {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Track Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };

                        Notification.generate(
                          'Your Track Import Was Partially Successful',
                          `${partialImportErrors.length} errors in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (err, result) => {
                            if (callback) { callback(err, result); }
                          },
                        );
                      } else {
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Track Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Track Import Has Completed', `${count} Tracks imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      }
                    })
                    .catch((err) => {
                      logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                      // Even if we do everything else successfully, let's keep returning with err here
                      // An error of finding Client should be considered a critical error
                      callback(err);
                    });
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Track Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Track Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports an array of Tracks.
  *
  * Calls callback(errors, count, importedTracks) with an array of [errors] if they occur, the [count] of Releases imported and an object containing the [importedTracks].
  *
  * @method
  * @param {object[]} tracks - Tracks to import.
  * @param {object} mechanicals - An object of Mechanicals.
  * @param {string} clientId - ID of the client importing the Tracks.
  * @param {object} client - Client importing the Tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object)} callback - The callback that handles the response.
  */

trackSchema.statics.importTracks = function (tracks, mechanicals, releaseSpecificRights, clientId, client, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(tracks) !== '[object Array]') {
    callback(new Error('Data must be an Array'), null);
  } else if (!clientId) {
    callback(new Error('A Client ID must be passed'), null);
  } else {
    let count = 0;
    const importedTracks = {};
    let errors = [];

    async.eachOfSeries(tracks, (track, index, cb) => {
      logger.debug(index + 1, 'of', tracks.length);
      if (isObjectPopulated(track)) {
        Track.importTrack(track, mechanicals, releaseSpecificRights, clientId, client, importedTracks, overwriteBlanks, (err, importedTrack) => {
          if (err && err.message.includes('Mechanical')) {
            errors.push(err.message);
          } else if (err) {
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (importedTrack) {
            // Add to count if not imported
            if (!importedTracks[importedTrack._id.toString()]) {
              count += 1;
            }
            // Replace track on imported tracks
            importedTracks[importedTrack._id.toString()] = importedTrack;
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err);
      } else {
        // Unique errors
        errors = errors.filter((value, index, self) => self.indexOf(value) === index);
        callback(errors, count, importedTracks);
      }
    });
  }
};

function isNumeric(n) {
  return !Number.isNaN(parseFloat(n)) && Number.isFinite(n);
}

/**
  * Imports a single Track.
  *
  * Calls callback(error, importedRelease, tracksErrors, importedTrack) with an [error] if an errror occurs, the [importedRelease] object, an array of [tracksErrors] if they occur and the [importedTrack].
  *
  * @method
  * @param {object} data - The Release to import.
  * @param {object} mechanicals - An object of Mechanicals.
  * @param {object} releaseSpecificRights - An object of track releaseSpecificRights.
  * @param {string} clientId - ID of the client importing the Tracks.
  * @param {object} client - Client importing the Tracks.
  * @param {object} importedTracks - An object of imported Tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.statics.importTrack = function (data, mechanicals, releaseSpecificRights, clientId, client, importedTracks, overwriteBlanks, callback) {
  try {
    let query = null;
    if (!data) {
      return callback(new Error('Track must be passed'), null);
    }
    if (!data.isrc && !data.title) {
      // No data on line, so skip
      return callback();
    }

    if (ObjectId.isValid(data._id) && !data.importingFromRelease) {
      query = { _id: new ObjectId(data._id), clientId };
    } else if (ObjectId.isValid(data.track_id) && data.importingFromRelease) {
      query = { _id: new ObjectId(data.track_id), clientId };
    } else if (data.track_isrc) {
      query = { clientId, isrc: data.track_isrc };
    } else if (data.isrc) {
      query = { clientId, isrc: data.isrc };
    }

    // Check that the cat group matches the client's list]
    if (data.track_catalogueGroups || data.catalogueGroups) {
      const catGroups = data.importingFromRelease ? data.track_catalogueGroups : data.catalogueGroups;
      const errorMessage = data.importingFromRelease ? 'Track Catalogue Groups don\'t match list' : 'Catalogue Groups don\'t match list';
      let catGroupNotInList = false;
      catGroups.forEach((catGroup) => {
        if (!client.catalogueGroups.includes(catGroup)) {
          catGroupNotInList = true;
        }
      });
      if (catGroupNotInList) {
        return callback(new Error(errorMessage));
      }
    }

    if (data.track_mechanicalCalculationBasis || data.mechanicalCalculationBasis) {
      const mechanicalCalculationBasis = data.importingFromRelease ? data.track_mechanicalCalculationBasis : data.mechanicalCalculationBasis;
      const errorMessage = data.importingFromRelease ? 'Track Mechanical Calculation Basis doesn\'t match list' : 'Mechanical Calculation Basis doesn\'t match list';
      if (!['Sale Date', 'Custom'].includes(mechanicalCalculationBasis)) {
        return callback(new Error(errorMessage));
      }
    }

    // Get sales/costs contracts based on import source
    data.salesReturnsRightsContractImportName = data.importingFromRelease ? data.track_salesReturnsRightsContractName : data.salesReturnsRightsContractName;
    data.salesReturnsRightsImportPercentage = data.importingFromRelease ? data.track_salesReturnsRightsPercentage : data.salesReturnsRightsPercentage;

    data.costsReturnsContractImportName = data.importingFromRelease ? data.track_costsRightsContractName : data.costsRightsContractName;
    data.costsReturnsImportPercentage = data.importingFromRelease ? data.track_costsRightsPercentage : data.costsRightsPercentage;

    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if ((data.salesReturnsRightsContractImportName && (data.salesReturnsRightsImportPercentage !== 0 && !data.salesReturnsRightsImportPercentage))
    || ((data.salesReturnsRightsImportPercentage || data.salesReturnsRightsImportPercentage === 0) && !data.salesReturnsRightsContractImportName)) {
      return callback(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
    } if (data.salesReturnsRightsContractImportName && isNumeric(data.salesReturnsRightsImportPercentage)) {
      // eslint-disable-next-line max-len
      data.track_salesReturnsRightsImport = [{ name: data.salesReturnsRightsContractImportName, percentage: data.salesReturnsRightsImportPercentage }];
    } else if (data.salesReturnsRightsContractImportName && !isNumeric(data.salesReturnsRightsImportPercentage)) {
      return callback(new Error('Contract Percentage Must be a number'));
    }
    // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
    if ((data.costsReturnsContractImportName && (data.costsReturnsImportPercentage !== 0 && !data.costsReturnsImportPercentage))
    || ((data.costsReturnsImportPercentage || data.costsReturnsImportPercentage === 0) && !data.costsReturnsContractImportName)) {
      return callback(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
    } if (data.costsReturnsContractImportName && isNumeric(data.costsReturnsImportPercentage)) {
      // eslint-disable-next-line max-len
      data.track_costsRightsImport = [{ name: data.costsReturnsContractImportName, percentage: data.costsReturnsImportPercentage }];
    } else if (data.costsReturnsContractImportName && !isNumeric(data.costsReturnsImportPercentage)) {
      return callback(new Error('Contract Percentage Must be a number'));
    }

    let previouslyImported = false;
    async.waterfall([
      function (waterfallCb) {
        // Check if track exists in previously imported
        const id = data.importingFromRelease ? data.track_id : data._id;
        const isrc = data.importingFromRelease ? data.track_isrc : data.isrc;
        if (id && importedTracks[id]) {
          waterfallCb(null, importedTracks[id]);
        } else if (isrc) {
          // see if a track with the same isrc has already been imported (only relevant for imports with no id supplied for tracks)
          const tracksMatchingIsrc = Object.values(importedTracks).filter((track) => (track.isrc === isrc.toString()));
          if (tracksMatchingIsrc.length > 0) {
            waterfallCb(null, tracksMatchingIsrc[0]);
          } else {
            waterfallCb(null, null);
          }
        } else {
          waterfallCb(null, null);
        }
      },
      function (foundTrack, waterfallCb) {
        // If not found from previously imported, find in DB
        if (foundTrack) {
          previouslyImported = true;
          waterfallCb(null, foundTrack);
        } else if (query) {
          Track.findOne(query)
            .then((track) => {
              waterfallCb(null, track);
            })
            .catch((err) => {
              waterfallCb(err);
            });
        } else {
          waterfallCb(null, null);
        }
      },
      function (foundTrack, waterfallCb) {
        // If not found from previously imported or in DB, create new
        if (foundTrack) {
          waterfallCb(null, foundTrack);
        } else {
          const track = new Track({
            clientId,
            mechanicalCalculationBasis: client.defaultMechanicalBasis,
            reportMechanicals: client.defaultReportMechanicals,
          });
          if (data.track_isrc || data.isrc || overwriteBlanks) { track.isrc = data.importingFromRelease ? data.track_isrc : data.isrc; }
          waterfallCb(null, track);
        }
      },
      function (track, waterfallCb) {
        // Set values
        if (data.track_title || data.title || overwriteBlanks) { track.title = (data.importingFromRelease ? data.track_title : data.title); }
        if (data.track_version || data.version || overwriteBlanks) { track.version = (data.importingFromRelease ? data.track_version : data.version); }
        if (data.track_artist || data.artist || overwriteBlanks) { track.artist = (data.importingFromRelease ? data.track_artist : data.artist); }
        if (data.track_foreignId || data.foreignId || overwriteBlanks) { track.foreignId = (data.importingFromRelease ? data.track_foreignId : data.foreignId); }
        if (data.track_projectId || data.projectId || overwriteBlanks) { track.projectId = (data.importingFromRelease ? data.track_projectId : data.projectId); }
        if (data.track_label || data.label || overwriteBlanks) { track.label = (data.importingFromRelease ? data.track_label : data.label); }
        if (data.track_pLine || data.pLine || overwriteBlanks) { track.pLine = (data.importingFromRelease ? data.track_pLine : data.pLine); }
        if (data.track_duration || data.duration || overwriteBlanks) { track.duration = (data.importingFromRelease ? data.track_duration : data.duration); }
        if (data.track_mechanicalCalculationBasis || data.mechanicalCalculationBasis || overwriteBlanks) { track.mechanicalCalculationBasis = (data.importingFromRelease ? data.track_mechanicalCalculationBasis : data.mechanicalCalculationBasis); }
        if (data.track_statutoryRate || data.statutoryRate || overwriteBlanks) { track.statutoryRate = (data.importingFromRelease ? data.track_statutoryRate : data.statutoryRate); }
        if (data.track_canadianStatutoryRate || data.canadianStatutoryRate || overwriteBlanks) { track.canadianStatutoryRate = (data.importingFromRelease ? data.track_canadianStatutoryRate : data.canadianStatutoryRate); }
        // eslint-disable-next-line max-len
        if (data.track_reportMechanicals || data.track_reportMechanicals === false || data.reportMechanicals || data.reportMechanicals === false || overwriteBlanks) {
          let reportMechanicals = (data.importingFromRelease ? data.track_reportMechanicals : data.reportMechanicals);
          if (reportMechanicals === undefined) {
            reportMechanicals = false;
          }
          track.reportMechanicals = reportMechanicals;
        }
        if ((data.track_aliases && data.track_aliases.length > 0) || (data.aliases && data.aliases.length > 0) || overwriteBlanks) {
          track.aliases = (data.importingFromRelease ? data.track_aliases : data.aliases);
          track.aliases = track.aliases || [];
        }
        // Clear rights when release is first found and there are rights to import
        // Or when release is first found, and clear blanks is enabled
        if ((!previouslyImported && data.track_salesReturnsRightsImport) || (!previouslyImported && overwriteBlanks)) {
          track.salesReturnsRights = [];
          track.costsRights = [];
        }

        // Strip any blank aliases
        if (track.aliases && track.aliases.length !== 0) {
          track.aliases = track.aliases.map((alias) => {
            if (alias && alias !== '') { return alias; }
          }).filter(Boolean);
        }

        async.parallel([
          function (cb) {
            if (data.track_salesReturnsRightsImport && data.track_salesReturnsRightsImport.length !== 0) {
              // Set Sales Rights
              async.each(data.track_salesReturnsRightsImport, (right, callback) => {
                track.mapRights(right.name, right.percentage, 'salesReturnsRights', { importingFromRelease: data.importingFromRelease }, callback);
              }, (err) => {
                cb(err);
              });
            } else {
              cb();
            }
          },
          function (cb) {
            if (data.track_costsRightsImport && data.track_costsRightsImport.length !== 0) {
              // Set Costs Rights
              async.each(data.track_costsRightsImport, (right, callback) => {
                track.mapRights(right.name, right.percentage, 'costsRights', { importingFromRelease: data.importingFromRelease }, callback);
              }, (err) => {
                cb(err);
              });
            } else {
              cb();
            }
          },
          function (cb) {
            if (data.track_catalogueGroups || data.catalogueGroups || overwriteBlanks) {
              // Set catalogue groups
              track.catalogueGroups = [];
              const catGroups = data.track_catalogueGroups ? data.track_catalogueGroups : data.catalogueGroups;
              if (client && catGroups && catGroups.length > 0) {
                catGroups.forEach((catGroup) => {
                  if (typeof catGroup === 'string') { catGroup = catGroup.trim(); }
                  // Check it exists in client catalogue groups
                  if (client.catalogueGroups.indexOf(catGroup) !== -1) { track.catalogueGroups.push(catGroup); }
                });
                cb(null, track);
              } else {
                cb(null, track);
              }
            } else {
              cb();
            }
          },
          function (cb) {
            const Release = require('../release');
            if (data.defaultReleaseCatNo && !data.importingFromRelease) {
              // Set default release
              const defaultReleaseCatNo = data.defaultReleaseCatNo || '';
              const defaultReleaseDistributionChannel = data.defaultReleaseDistributionChannel || '';
              Release.findOne({ clientId, catNo: defaultReleaseCatNo, distributionChannel: { $in: [defaultReleaseDistributionChannel, null] } })
                .then((release) => {
                  if (release) {
                    track.defaultReleaseId = release._id.toString();
                    cb(null, track);
                  } else {
                    cb(new Error('Default release not found for Cat No and Distribution Channel supplied'));
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding default release in import track: ${err}`);
                  cb(new Error('Default release not found for Cat No and Distribution Channel supplied'));
                });
            } else if (overwriteBlanks) {
              track.defaultReleaseId = '';
              cb(null, track);
            } else {
              cb();
            }
          },
          function (cb) {
            track.addReleaseSpecificRights(releaseSpecificRights, overwriteBlanks, cb);
          },
          function (cb) {
            track.addMechanicals(mechanicals, overwriteBlanks, cb);
          },
        ], (err) => {
          waterfallCb(err, track);
        });
      },
      function (track, waterfallCb) {
        track.checkMultipleContracts((err) => {
          waterfallCb(err, track);
        });
      },
      function (track, waterfallCb) {
        track.validate()
          .then(() => {
            waterfallCb(null, track);
          })
          .catch((error) => {
            waterfallCb(error, track);
          });
      },
    ], callback);
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this track. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Imports Tracks from Excel (New Version).
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Track.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {string} importTemplateVersion - The import template version.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

trackSchema.statics.importFromExcelNew = function (file, curveUser, overwriteBlanks, importTemplateVersion, callback) {
  logger.debug({ file }, { curveUser });
  const ImportXlsx = require('../../libs/importXlsx');
  const trackData = {};
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        const { paymentTier } = client;

        const trackImportConfig = paymentTier === 'Lite' ? config.importTemplates.versions.lite.track : config.importTemplates.versions[importTemplateVersion].track;
        async.parallel([
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, trackImportConfig.tracks.columns, trackImportConfig.tracks.tab, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                trackData.tracks = [];
                cb(err);
              } else {
                trackData.tracks = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, trackImportConfig.contracts.columns, trackImportConfig.contracts.tab, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                trackData.contracts = [];
                cb(err);
              } else {
                trackData.contracts = data;
                cb();
              }
            });
          },
          function (cb) {
            if (paymentTier === 'Lite') {
              cb();
            } else {
              ImportXlsx.getDataByTemplate(file.path, trackImportConfig.mechanicals.columns, trackImportConfig.mechanicals.tab, 2, dateFormat, (err, data) => {
                if (err) {
                  logger.error(err);
                  trackData.mechanicals = [];
                  cb(err);
                } else {
                  trackData.mechanicals = data;
                  cb();
                }
              });
            }
          },
          function (cb) {
            if (paymentTier === 'Lite') {
              cb();
            } else {
              ImportXlsx.getDataByTemplate(file.path, trackImportConfig.releaseSpecificRights.columns, trackImportConfig.releaseSpecificRights.tab, 2, dateFormat, (err, data) => {
                if (err) {
                  logger.error(err);
                  trackData.releaseSpecificRights = [];
                  cb(err);
                } else {
                  trackData.releaseSpecificRights = data;
                  cb();
                }
              });
            }
          },
        ], (error) => {
          if (error) {
            if (error === 'Template does not match') { error = 'It appears the template does not match'; }
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Track Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Track Import Has Errored', error, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            Track.importTracksNew(trackData, curveUser.clientId, client, overwriteBlanks, (errors, count, importedTracks) => {
              if (errors && errors.length > 0) {
                logger.error('Errored importing tracks');
                logger.error(errors);
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Track Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Track Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                    callback(err);
                  });
              } else {
              // Didn't error, save.
                const partialImportErrors = [];
                async.eachSeries(Object.keys(importedTracks), (isrc, importCb) => {
                  const importedTrack = importedTracks[isrc];
                  importedTrack.createdBy = curveUser.id;
                  importedTrack.lastModifiedBy = curveUser.id;
                  importedTrack.save()
                    .then(() => {
                      importCb();
                    })
                    .catch((err) => {
                      if (err) {
                        partialImportErrors.push(`Track ${importedTrack.isrc} did not save - ${err.message || err}`);
                      }
                      importCb();
                    });
                }, () => {
                // Send success email
                  Client.findById(curveUser.clientId)
                    .then((client) => {
                      if (partialImportErrors.length > 0) {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Track Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };

                        Notification.generate(
                          'Your Track Import Was Partially Successful',
                          `${partialImportErrors.length} errors in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (err, result) => {
                            if (callback) { callback(err, result); }
                          },
                        );
                      } else {
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Track Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Track Import Has Completed', `${count} Tracks imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      }
                    })
                    .catch((err) => {
                      logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
                      callback(err);
                    });
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Track Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Track Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client for importFromExcel with curveUser.clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports an array of Tracks (New Version).
  *
  * Calls callback(errors, count, importedTracks) with an array of [errors] if they occur, the [count] of Releases imported and an object containing the [importedTracks].
  *
  * @method
  * @param {object} importData - Import data object.
  * @param {object[]} importData.tracks - Tracks to import.
  * @param {string} clientId - ID of the client importing the Tracks.
  * @param {object} client - Client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object)} callback - The callback that handles the response.
  */

trackSchema.statics.importTracksNew = function (importData, clientId, client, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(importData.tracks) !== '[object Array]') {
    callback(new Error('Data must be an Array'), null);
  } else if (!clientId) {
    callback(new Error('A Client ID must be passed'), null);
  } else {
    let count = 0;
    const importedTracks = {};
    let errors = [];
    const { tracks } = importData;

    async.eachOfSeries(tracks, (track, index, cb) => {
      logger.debug(index + 1, 'of', tracks.length);
      if (isObjectPopulated(track)) {
        Track.importTrackNew(track, importData, clientId, client, importedTracks, overwriteBlanks, (err, importedTrack) => {
          if (err && err.message.includes('Mechanical')) {
            errors.push(err.message);
          } else if (err) {
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (importedTrack) {
            // Add to count if not imported
            if (!importedTracks[importedTrack._id.toString()]) {
              count += 1;
            }
            // Replace track on imported tracks
            importedTracks[importedTrack._id.toString()] = importedTrack;
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err);
      } else {
        // Unique errors
        errors = errors.filter((value, index, self) => self.indexOf(value) === index);
        callback(errors, count, importedTracks);
      }
    });
  }
};

/**
  * Imports a single Track (New Version).
  *
  * Calls callback(error) with an [error] if an errror occurs.
  *
  * @method
  * @param {object} data - The Track to import.
  * @param {object} importData - Import data object.
  * @param {object[]} importData.contracts - Contracts data.
  * @param {object[]} importData.mechanicals - Mechanicals data.
  * @param {string} clientId - ID of the client importing the Track.
  * @param {object} client - Client importing the Track.
  * @param {object} importedTracks - An object of imported Tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.statics.importTrackNew = function (data, importData, clientId, client, importedTracks, overwriteBlanks, callback) {
  try {
    let query = null;
    if (!data) {
      return callback(new Error('Track must be passed'), null);
    }
    if (!data.isrc && !data.title) {
      // No data on line, so skip
      return callback();
    }

    if (ObjectId.isValid(data._id)) {
      query = { _id: new ObjectId(data._id), clientId };
    } else if (data.isrc) {
      query = { clientId, isrc: data.isrc };
    }

    // Check that the cat group matches the client's list]
    if (data.catalogueGroups) {
      let catGroupNotInList = false;
      data.catalogueGroups.forEach((catGroup) => {
        if (!client.catalogueGroups.includes(catGroup)) {
          catGroupNotInList = true;
        }
      });
      if (catGroupNotInList) {
        return callback(new Error('Catalogue Groups don\'t match list'));
      }
    }

    if (data.mechanicalCalculationBasis) {
      const errorMessage = 'Mechanical Calculation Basis doesn\'t match list';
      if (!['Sale Date', 'Custom'].includes(data.mechanicalCalculationBasis)) {
        return callback(new Error(errorMessage));
      }
    }

    let previouslyImported = false;

    async.waterfall([
      function (waterfallCb) {
        // Check if track exists in previously imported
        if (data._id && importedTracks[data._id]) {
          previouslyImported = true;
          waterfallCb(null, importedTracks[data._id]);
        } else {
          waterfallCb(null, null);
        }
      },
      function (foundTrack, waterfallCb) {
        // If not found from previously imported, find in DB
        if (foundTrack) {
          waterfallCb(null, foundTrack);
        } else if (query) {
          Track.findOne(query)
            .then((track) => {
              waterfallCb(null, track);
            })
            .catch((err) => {
              waterfallCb(err);
            });
        } else {
          waterfallCb(null, null);
        }
      },
      function (foundTrack, waterfallCb) {
        // If not found from previously imported or in DB, create new
        if (foundTrack) {
          waterfallCb(null, foundTrack);
        } else {
          const track = new Track({
            clientId,
            mechanicalCalculationBasis: client.defaultMechanicalBasis,
            reportMechanicals: client.defaultReportMechanicals,
          });
          if (data.isrc || overwriteBlanks) { track.isrc = data.isrc; }
          waterfallCb(null, track);
        }
      },
      function (track, waterfallCb) {
        // Set values
        if (data.title || overwriteBlanks) { track.title = data.title; }
        if (data.version || overwriteBlanks) { track.version = data.version; }
        if (data.artist || overwriteBlanks) { track.artist = data.artist; }
        if (data.foreignId || overwriteBlanks) { track.foreignId = data.foreignId; }
        if (data.projectId || overwriteBlanks) { track.projectId = data.projectId; }
        if (data.label || overwriteBlanks) { track.label = data.label; }
        if (data.pLine || overwriteBlanks) { track.pLine = data.pLine; }
        if (data.duration || overwriteBlanks) { track.duration = data.duration; }
        if (data.mechanicalCalculationBasis || overwriteBlanks) { track.mechanicalCalculationBasis = data.mechanicalCalculationBasis; }
        if (data.statutoryRate || overwriteBlanks) { track.statutoryRate = data.statutoryRate; }
        if (data.canadianStatutoryRate || overwriteBlanks) { track.canadianStatutoryRate = data.canadianStatutoryRate; }
        if (data.reportMechanicals || data.reportMechanicals === false || overwriteBlanks) {
          track.reportMechanicals = data.reportMechanicals || false;
        }
        if ((data.aliases && data.aliases.length > 0) || overwriteBlanks) { track.aliases = data.aliases; }

        // Strip any blank aliases
        if (track.aliases && track.aliases.length !== 0) {
          track.aliases = track.aliases.map((alias) => {
            if (alias && alias !== '') { return alias; }
          }).filter(Boolean);
        }

        async.parallel([
          function (cb) {
            if ((data.catalogueGroups && data.catalogueGroups.length !== 0) || overwriteBlanks) {
              track.catalogueGroups = [];
              if (client && data.catalogueGroups && data.catalogueGroups.length > 0) {
                data.catalogueGroups.forEach((catGroup) => {
                  if (typeof catGroup === 'string') { catGroup = catGroup.trim(); }
                  if (client.catalogueGroups.indexOf(catGroup) !== -1) { track.catalogueGroups.push(catGroup); }
                });
                cb();
              } else {
                cb();
              }
            } else {
              cb();
            }
          },
          function (cb) {
            const Release = require('../release');
            if (data.track_defaultReleaseCatNo || data.defaultReleaseCatNo) {
              // Set default release
              const defaultReleaseCatNo = data.importingFromRelease ? data.track_defaultReleaseCatNo : data.defaultReleaseCatNo;
              const defaultReleaseDistributionChannel = data.importingFromRelease ? data.track_defaultReleaseDistributionChannel : data.defaultReleaseDistributionChannel;
              Release.findOne({ clientId, catNo: defaultReleaseCatNo, distributionChannel: { $in: [defaultReleaseDistributionChannel, null] } })
                .then((release) => {
                  if (release) {
                    track.defaultReleaseId = release._id.toString();
                    cb(null, track);
                  } else {
                    cb(new Error('Default release not found for Cat No and Distribution Channel supplied'), null);
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding release in imporTrackNew with client id '${clientId}': ${err}`);
                  cb(new Error('Default release not found for Cat No and Distribution Channel supplied'), null);
                });
            } else if (overwriteBlanks) {
              track.defaultReleaseId = '';
              cb(null, track);
            } else {
              cb();
            }
          },
          function (cb) {
            if (!previouslyImported) {
              track.addContracts(importData.contracts, overwriteBlanks, cb);
            } else {
              cb();
            }
          },
          function (cb) {
            if (!previouslyImported) {
              track.addReleaseSpecificRights(importData.releaseSpecificRights, overwriteBlanks, cb);
            } else {
              cb();
            }
          },
          function (cb) {
            if (!previouslyImported) {
              track.addMechanicals(importData.mechanicals, overwriteBlanks, cb);
            } else {
              cb();
            }
          },
        ], (err) => {
          waterfallCb(err, track);
        });
      },
      function (track, waterfallCb) {
        track.checkMultipleContracts((err) => {
          waterfallCb(err, track);
        });
      },
      function (track, waterfallCb) {
        track.validate()
          .then(() => {
            waterfallCb(null, track);
          })
          .catch((error) => {
            waterfallCb(error, track);
          });
      },
    ], callback);
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this track. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Adds aliases to a Track.
  *
  * Calls callback(errors, count) with an array of [errors] if any occur and the [count] of aliases added.
  *
  * @method
  * @param {object[]} data - An array of  aliases to import.
  * @param {string} clientId - ID of the client importing the aliases.
  * @param {function(string[], number)} callback - The callback that handles the response.
  */

trackSchema.statics.importAliases = async function (data, curveUser) {
  const { clientId, id } = curveUser;
  let count = 0;
  const errors = [];

  logger.info(`Importing Track Aliases for Client: ${clientId}`);

  await async.eachLimit(data, 100, async (line) => {
    if (!line.alias || !line.identifier || line.alias === '' || line.identifier === '') {
      logger.error('No Identifier or alias found in file');
      return;
    }

    const aliasExists = await Track.countDocuments({ clientId, isrc: line.identifier, aliases: line.alias });
    const duplicateAliasExists = await Track.countDocuments({ clientId, aliases: line.alias });

    if (duplicateAliasExists > aliasExists) { errors.push(`Line ${data.indexOf(line) + 3}: Aliases are required to be unique across Tracks: ${line.alias}`); }
    if (aliasExists) { logger.debug(`Line ${data.indexOf(line) + 3}: Alias already exists within same track (${aliasExists}): ${line.alias}`); }

    if (!aliasExists && !duplicateAliasExists) {
      const track = await Track.findOne({ clientId, isrc: line.identifier }, '_id');

      if (!track) {
        logger.debug(`Track does not exist: ${line.identifier}`);
        return;
      }

      count += 1;
      await Track.findByIdAndUpdate(track._id, { $push: { aliases: line.alias }, lastModifiedBy: id }).catch((err) => {
        errors.push(`Line ${data.indexOf(line) + 3}: ${err.message}`);
      });
    }
  });

  return { errors, count };
};

trackSchema.methods.addReleaseSpecificRights = function (releaseSpecificRights, overwriteBlanks, callback) {
  const Release = require('../release');
  const Contract = require('../contract');
  const track = this;
  let resetReleaseSpecificSalesReturnsRights = false;
  // Clear releaseSpecificSalesReturnsRights if overwrite blanks is true - else wait for first instance
  if (overwriteBlanks) {
    resetReleaseSpecificSalesReturnsRights = true;
    track.releaseSpecificSalesReturnsRights = [];
  }
  if (releaseSpecificRights) {
    async.forEachOf(releaseSpecificRights, (releaseRight, index, loopCb) => {
      let releaseId; let contractId;
      if (releaseRight.isrc && (String(releaseRight.isrc) === String(track.isrc) || String(releaseRight.isrc) === track._id.toString())) {
        // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
        if ((releaseRight.contract && (releaseRight.contractPercentage !== 0 && !releaseRight.contractPercentage))
        || ((releaseRight.contractPercentage === 0 || releaseRight.contractPercentage) && !releaseRight.contract)) {
          return loopCb(new Error('A Contract needs to be linked to a Percentage when a Release Specific Sales/Returns Right is assigned'));
        }
        if (!resetReleaseSpecificSalesReturnsRights) {
          track.releaseSpecificSalesReturnsRights = [];
          // Only reset chain on finding first releaseSpecificSalesReturnsRights element
          resetReleaseSpecificSalesReturnsRights = true;
        }
        async.waterfall([
          function (cb) {
            if (releaseRight?.releaseDistributionChannel && releaseRight?.releaseCatNo) {
              Release.findOne({ clientId: track.clientId, catNo: releaseRight?.releaseCatNo, distributionChannel: releaseRight?.releaseDistributionChannel })
                .then((release) => {
                  if (release) {
                    releaseId = release._id.toString();
                    cb();
                  } else {
                    cb();
                  }
                })
                .catch((err) => {
                  cb();
                });
            } else {
              cb();
            }
          },
          function (cb) {
            if (!releaseRight.releaseDistributionChannel && releaseRight?.releaseCatNo) {
              Release.findOne({ clientId: track.clientId, catNo: releaseRight?.releaseCatNo })
                .then((release) => {
                  if (release) {
                    releaseId = release._id.toString();
                    cb();
                  } else {
                    cb();
                  }
                })
                .catch((err) => {
                  cb();
                });
            } else {
              cb();
            }
          },
          function (cb) {
            if (releaseRight?.contract) {
              Contract.findOne({ clientId: track.clientId, name: releaseRight.contract, contractType: { $ne: 'Mechanical' } })
                .then((contract) => {
                  if (contract) {
                    contractId = contract._id.toString();
                    cb();
                  } else {
                    cb();
                  }
                })
                .catch((err) => {
                  cb();
                });
            } else {
              cb();
            }
          },
          function (cb) {
            if (!contractId && !releaseId) {
              cb(new Error(`Release Specific Rights: Line ${index + 3} - Release: ${releaseRight.releaseCatNo} & Contract: ${releaseRight.contract} not found`));
            } else if (!releaseId) {
              cb(new Error(`Release Specific Rights: Line ${index + 3} - Release not found with Catalogue Number: ${releaseRight.releaseCatNo} and Distribution Channel: ${releaseRight.releaseDistributionChannel}`));
            } else if (!contractId) {
              cb(new Error(`Release Specific Rights: Line ${index + 3} - Contract not found or is a mechanical contract: ${releaseRight.contract}`));
            } else {
              track.releaseSpecificSalesReturnsRights.push({
                releaseId, contractId, percentage: releaseRight.contractPercentage,
              });
              cb();
            }
          },
        ], loopCb);
      } else {
        loopCb();
      }
    }, callback);
  } else {
    callback();
  }
};

/**
  * Adds mechanicals to a Track.
  *
  * Calls callback(error) with an [error] if any error occurs.
  *
  * @method
  * @param {object[]} mechanicals - An array of  mechanicals to import.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.methods.addMechanicals = async function (mechanicals, overwriteBlanks, callback) {
  const track = this;
  let error;
  let resetMechanicals = false;
  // Clear mechanicals if overwrite blanks is true - else wait for first instance
  if (overwriteBlanks) {
    resetMechanicals = true;
    track.mechanicalLicenses = [];
  }
  if (mechanicals) {
    // each series to ensure duplicates are not created
    await async.eachSeries(mechanicals, async (mechanical) => {
      const index = mechanicals.indexOf(mechanical);
      if (mechanical && mechanical.isrc && (String(mechanical.isrc) === String(track.isrc) || String(mechanical.isrc) === track._id.toString())) {
        if (!resetMechanicals) {
          track.mechanicalLicenses = [];
          // Only reset chain on finding first mechanical element
          resetMechanicals = true;
        }

        const composerId = await getComposerId(track, mechanical);
        const { publisherId, publisherLinkedContractId } = await getPublisherId(track, mechanical);
        const contractId = publisherLinkedContractId || await getContractId(track, mechanical);

        if (contractId) {
          track.mechanicalLicenses.push({ composerId, publisherId, contractId, licenseNo: mechanical.licenseNo, rate: mechanical.rate, share: mechanical.share });
        } else {
          error = new Error(`Mechanicals: Line ${index + 3} - Contract not found with name ${mechanical.contractName}`);
        }
      }
    });
  }
  callback(error);
};

/**
  * Helper function: Used for stripping zeros from CAE's across Composers and Publishers.
  */
function removeLeadingZeros(value) {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

/**
  * Helper function: Finds or creates a composerId based on incoming data from excel import
  */
async function getComposerId(track, mechanical) {
  const cae = mechanical.composerCae ? mechanical.composerCae?.toString() : null;

  if (mechanical.composerCae && mechanical.composerCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros(cae);
    const composer = await Composer.findOne({ clientId: track.clientId, $or: [{ cae }, { caeWithoutLeadingZeros }] });
    if (composer) {
      return composer._id.toString();
    }
  }

  // we should only match to Composer by name if the CAE is null/zeros
  if (mechanical.composerName && (!mechanical.composerCae || mechanical.composerCae === '00000000000')) {
    const composer = await Composer.findOne({ clientId: track.clientId, lowerCaseName: mechanical.composerName.toLowerCase(), $or: [{ cae: null }, { cae: '00000000000' }] });
    if (composer) {
      return composer._id.toString();
    }
  }

  if (!mechanical.composerName) {
    return null;
  }

  const newComposerData = {
    clientId: track.clientId,
    name: mechanical.composerName,
    cae,
  };

  const composerToReturn = await new Composer(newComposerData).save();
  return composerToReturn._id.toString();
}

/**
  * Helper function: Finds or creates a publisherId based on incoming data from excel import
  * Also returns contractId if found Publisher has linked contracts
  */
async function getPublisherId(track, mechanical) {
  const cae = mechanical.publisherCae ? mechanical.publisherCae?.toString() : null;

  if (mechanical.publisherCae && mechanical.publisherCae !== '00000000000') {
    const caeWithoutLeadingZeros = removeLeadingZeros(cae);
    const publisher = await Publisher.findOne({ clientId: track.clientId, $or: [{ cae }, { caeWithoutLeadingZeros }] });
    if (publisher) {
      return { publisherId: publisher._id.toString(), publisherLinkedContractId: publisher?.linkedContracts[0]?.contractId };
    }
  }
  if (!mechanical.publisherName) {
    return { publisherId: null, publisherLinkedContractId: null };
  }

  const lowerCaseName = mechanical.publisherName.toLowerCase();
  const publisher = await Publisher.findOne({ clientId: track.clientId, lowerCaseName });

  if (publisher) {
    return { publisherId: publisher._id.toString(), publisherLinkedContractId: publisher.linkedContracts[0]?.contractId || null };
  }

  const newPublisherData = {
    clientId: track.clientId,
    name: mechanical.publisherName,
    cae,
  };

  const savedPublisher = await new Publisher(newPublisherData).save();
  return { publisherId: savedPublisher._id.toString(), publisherLinkedContractId: null };
}

/**
  * Helper function: Finds contract - the key component for adding mechanicals via excel import
  */
async function getContractId(track, mechanical) {
  const Contract = require('../contract');
  let contractId = null;
  const contract = await Contract.findOne({ clientId: track.clientId, name: mechanical.contractName, contractType: 'Mechanical' });
  if (contract) {
    contractId = contract._id.toString();
  } else {
    contractId = undefined;
  }
  return contractId;
}

/**
  * Adds contracts to a Track.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {object} contracts - An array of  contracts to import.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.methods.addContracts = function (contracts, overwriteBlanks, callback) {
  const track = this;
  // Reset when overwrite blanks is true - else wait for the first instance on the tab before clearing
  if (overwriteBlanks) {
    track.salesReturnsRights = [];
    track.costsRights = [];
  }
  const salesReturnsRightsImport = [];
  const costsRightsImport = [];

  async.waterfall([
    function (waterfallCb) {
      async.each(contracts, (contract, cb) => {
        // Check contract is linked with current track
        if (contract && contract.isrc && (String(contract.isrc) === String(track.isrc) || String(contract.isrc) === track._id.toString())) {
          // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
          if ((contract.salesReturnsRightsContractName && (contract.salesReturnsRightsPercentage !== 0 && !contract.salesReturnsRightsPercentage))
          || ((contract.salesReturnsRightsPercentage || contract.salesReturnsRightsPercentage === 0) && !contract.salesReturnsRightsContractName)) {
            return cb(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
          } if (contract.salesReturnsRightsContractName && isNumeric(contract.salesReturnsRightsPercentage)) {
            salesReturnsRightsImport.push({ name: contract.salesReturnsRightsContractName, percentage: contract.salesReturnsRightsPercentage });
          } else if (contract.salesReturnsRightsContractName && !isNumeric(contract.salesReturnsRightsPercentage)) {
            return cb(new Error('Contract Percentage Must be a number'));
          }
          // check both Percentage and Contract name are present. 0 is a valid percentage confirmed by CM.
          if ((contract.costsRightsContractName && (contract.costsRightsPercentage !== 0 && !contract.costsRightsPercentage))
          || ((contract.costsRightsPercentage || contract.costsRightsPercentage === 0) && !contract.costsRightsContractName)) {
            return cb(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
          } if (contract.costsRightsContractName && isNumeric(contract.costsRightsPercentage)) {
            costsRightsImport.push({ name: contract.costsRightsContractName, percentage: contract.costsRightsPercentage });
          } else if (contract.costsRightsContractName && !isNumeric(contract.costsRightsPercentage)) {
            return cb(new Error('Contract Percentage Must be a number'));
          }
        }
        cb();
      }, (err) => {
        waterfallCb(err);
      });
    },
    function (waterfallCb) {
      if (salesReturnsRightsImport && salesReturnsRightsImport.length !== 0) {
        track.salesReturnsRights = [];
        track.costsRights = [];
        async.each(salesReturnsRightsImport, (right, cb) => {
          track.mapRights(right.name, right.percentage, 'salesReturnsRights', {}, cb);
        }, (err) => {
          waterfallCb(err);
        });
      } else {
        waterfallCb();
      }
    },
    function (waterfallCb) {
      if (costsRightsImport && costsRightsImport.length !== 0) {
        async.each(costsRightsImport, (right, cb) => {
          track.mapRights(right.name, right.percentage, 'costsRights', {}, cb);
        }, (err) => {
          waterfallCb(err);
        });
      } else {
        waterfallCb();
      }
    },
  ], callback);
};

/**
  * Maps contract fields to a Track.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {string} contractName - The contract name.
  * @param {number} percentage - Rights percentage value.
  * @param {string} field - Field to map to.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.methods.mapRights = function (contractName, percentage, field, options, callback) {
  const track = this;
  const Contract = require('../contract');
  if (contractName && isNumeric(percentage)) {
    Contract.findOne({ clientId: track.clientId, name: contractName, contractType: { $ne: 'Mechanical' } })
      .then((contract) => {
        if (contract) {
          // track[field] = [];
          // When importing from combined release importer, it should clear the previous usage, as this needs to allow multiple versions of a track on different releases
          if (options.importingFromRelease) {
            track[field] = track[field].map((item) => {
              // Check if contractId matches incoming contract
              if (item && item.contractId && item.contractId.toString() === contract._id.toString()) {
                // Do not return item when it has been used before
                item = null;
              }
              return item;
            }).filter(Boolean);
          }
          // Add new field onto item
          track[field].push({ contractId: contract._id, percentage });
          callback();
        } else {
          callback(new Error(`Could not find contract with the name ${contractName}`));
        }
      })
      .catch((err) => {
        callback(new Error(`Could not find contract with the name ${contractName}`));
      });
  } else {
    callback();
  }
};

/**
  * Copies catalogue data to other associated clients.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.methods.updateCopyToCatalogueClients = function (callback) {
  const track = this;
  async.waterfall([
    function (cb) {
      Client.find({ 'inheritCatalogueFrom.clientId': track.clientId })
        .then((clients) => {
          cb(null, clients);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (clients, cb) {
      clients = clients.map((client) => {
        // Check client has either catalogue group or no catalogue group
        let clientMatches = false;
        client.inheritCatalogueFrom.forEach((inheritance) => {
          // Check for transferTracks boolean
          if (inheritance && inheritance.transferTracks) {
            if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
              // Test against track catalogue groups
              if (track.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
                clientMatches = true;
              }
            } else {
              clientMatches = true;
            }
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
        async.eachSeries(clients, (client, clientCb) => {
          track.updateCopyToCatalogueByClient(client, clientCb);
        }, cb);
      } else {
        cb(null, track);
      }
    },
  ], callback);
};

/**
  * Copies catalogue data to a single client.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {object} client - The client to copy data to.
  * @param {function(string)} callback - The callback that handles the response.
  */

trackSchema.methods.updateCopyToCatalogueByClient = function (client, callback) {
  const thisTrack = this;
  async.waterfall([
    function (cb) {
      // Find any previously created track
      Track.findOne({ clientId: client._id.toString(), duplicatedFrom: thisTrack._id.toString() })
        .then((track) => {
          cb(null, track);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (track, cb) {
      // Create if no track found
      if (!track) {
        const newTrack = new Track();
        cb(null, newTrack);
      } else {
        cb(null, track);
      }
    },
    function (track, cb) {
      // Update values
      track.copyValues(thisTrack, client._id, () => {
        cb(null, track);
      });
    },
    function (track, cb) {
      track.save()
        .then(() => {
          cb(null, track);
        })
        .catch((err) => {
          thisTrack.validationErrors.push(`Failed syncing to ${client.name}: ${err.message}`);
          Track.updateOne({ _id: thisTrack._id }, { $set: { validationErrors: thisTrack.validationErrors } })
            .then(() => {
              cb(null, track);
            })
            .catch((err) => {
              cb(err);
            });
        });
    },
  ], callback);
};

/**
 * Copies a single Release to a client.
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @param {object} trackToCopy - The Track to copy data from.
 * @param {string} clientId - The ID of the client to copy data to.
 * @param {function(string)} callback - The callback that handles the response.
 */

trackSchema.methods.copyValues = function (trackToCopy, clientId, callback) {
  if (!trackToCopy) {
    return callback('Track not found');
  }
  this.clientId = clientId;
  this.title = trackToCopy.title;
  this.version = trackToCopy.version;
  this.isrc = trackToCopy.isrc;
  this.artist = trackToCopy.artist;
  this.label = trackToCopy.label;
  this.pLine = trackToCopy.pLine;
  this.duration = trackToCopy.duration;
  const aliasesToAdd = trackToCopy.aliases.filter((alias) => !this.aliases.includes(alias));
  this.aliases = [...this.aliases, ...aliasesToAdd];
  this.projectId = trackToCopy.projectId;
  this.duplicatedFrom = trackToCopy._id;
  callback(null, this);
};

/**
 * Returns the Track's delivery data.
 *
 * Calls callback(error) with an [error] if an error occurs and a [result] of the delivery data.
 *
 * @method
 * @param {function(string, object)} callback - The callback that handles the response.
 */
trackSchema.methods.deliveryData = function (callback) {
  const Release = require('../release');
  const track = this;
  const result = {
    title: track.title,
    version: track.version,
    artist: track.artist,
    isrc: track.isrc,
    duration: track.duration,
    trackLabel: track.label,
  };
  Release.findOne({ clientId: track.clientId, trackIds: track._id.toString() }).sort('createdAt')
    .then((release) => {
      if (release) {
        result.releaseTitle = release.title;
        result.label = release.label;
        result.catNo = release.catNo;
        result.barcode = release.barcode;
      }
      callback(null, result);
    })
    .catch((err) => {
      callback(null, result);
    });
};

/**
 * Returns a list of unique aliases.
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @return {array} aliases - An array of the Tracks's unique aliases.
 */

trackSchema.methods.uniqueAliases = function () {
  if (this.aliases) {
    this.aliases = this.aliases.filter((value, index, self) => self.indexOf(value) === index);
  }
};

/**
 * Returns a list of unique catalogue groups.
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @return {array} catalogueGroups - An array of the Track's unique catalogue groups.
 */

trackSchema.methods.uniqueCatGroups = function () {
  if (this.catalogueGroups) {
    this.catalogueGroups = this.catalogueGroups.filter((value, index, self) => self.indexOf(value) === index);
  }
};

/**
 * Sums all salesReturnsRights and adds them to track.totalParticipation
 *
 * @method
 */
trackSchema.methods.calculateTotalParticipation = function () {
  const track = this;
  // Reset participation to 0
  track.totalParticipation = 0;
  if (track.salesReturnsRights) {
    // Loop through rights
    track.salesReturnsRights.forEach((line) => {
      let percentage = 0;
      if (line.percentage) {
        // Round to 4 decimal places
        percentage = Math.round((line.percentage + Number.EPSILON) * 10000) / 10000;
      }
      track.totalParticipation += percentage;
    });
  }
  // Round final number to 4 decimal places
  track.totalParticipation = Math.round((track.totalParticipation + Number.EPSILON) * 100) / 100;
  return track.totalParticipation;
};

/**
 * Check if a Release has Costs and if they are valid (Contract and Percentage both required). 0 is a valid percentage - confirmed by CM.
 */
trackSchema.methods.validateCosts = function (callback) {
  const track = this;
  let validationErrorFound = false;
  if (track.costsRights) {
    track.costsRights.forEach((costRight) => {
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

/**
 * Check if a Release has Sales/Returns rate(s) and if they are valid (Contract and Percentage both required). 0 is a valid percentage - confirmed by CM.
 */
trackSchema.methods.validateSalesReturns = function (callback) {
  const track = this;
  let validationErrorFound = false;
  let releaseSpecificValidationErrorFound = false;

  if (track.salesReturnsRights) {
    track.salesReturnsRights.forEach((salesReturnsRight) => {
      if (!salesReturnsRight.contractId || (salesReturnsRight.percentage !== 0 && !salesReturnsRight.percentage)) {
        validationErrorFound = true;
      }
    });
  }
  if (track.releaseSpecificSalesReturnsRights) {
    track.releaseSpecificSalesReturnsRights.forEach((salesReturnsRight) => {
      if (!salesReturnsRight.contractId || (!salesReturnsRight.releaseId) || (salesReturnsRight.percentage !== 0 && !salesReturnsRight.percentage)) {
        releaseSpecificValidationErrorFound = true;
      }
    });
  }
  if (validationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
  } if (releaseSpecificValidationErrorFound) {
    callback(new Error('A Contract needs to be linked to a Percentage and a Release when a Release Specific Sales/Returns Rate is assigned'));
  } else {
    callback();
  }
};

/**
 * Checks if a Track has more than one instance of the same contract attached to it.
 *
 * Calls callback(error) with an [error] if multiple instances of the same contract are attached to the Track.
 *
 * @method
 * @param {function(string)} callback - The callback that handles the response.
 */

trackSchema.methods.checkMultipleContracts = function (callback) {
  // Test both sales and costs rights
  if (runCheckOnArray(this.salesReturnsRights) || runCheckOnArray(this.costsRights) || runCheckOnArray(this.mechanicalLicenses)) {
    // Return error if either one has more than 1 of the same contract
    callback(new Error('A track can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
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
};

trackSchema.methods.checkMultipleReleaseSpecificRightsReturns = function (callback) {
  if (runCheckOnArray(this.releaseSpecificSalesReturnsRights)) {
    callback(new Error('Release Specific Sales Returns rows are required to be unique.'));
  } else {
    callback();
  }

  function runCheckOnArray(array) {
    if (array?.length > 0) {
      const sanitisedReleaseRights = array.reduce((accumulator, current) => {
        if (checkIfAlreadyExist(current)) {
          return accumulator;
        }
        return [...accumulator, current];

        function checkIfAlreadyExist(currentVal) {
          return accumulator.some((item) => (item.contractId === currentVal.contractId && item.releaseId === currentVal.releaseId));
        }
      }, []);

      if (sanitisedReleaseRights.length < array.length) {
        return true;
      }
    }
  }
};

/**
 * Calculates the Track's mechanical statutory rate.
 *
 * @method
 * @return {number} rate - Mechanical statutory rate.
 */

trackSchema.methods.calculateMechanicalStatutoryRate = async function (durationChanged) {
  const track = this;
  // load client stat rate settings only if calculation required
  if (durationChanged || ((!track.statutoryRate && track.statutoryRate !== 0) || track.statutoryRate === '') || ((!track.canadianStatutoryRate && track.canadianStatutoryRate !== 0) || track.canadianStatutoryRate === '')) {
    const client = await Client.findById(track.clientId);
    if (!client) {
      throw new Error('Client not found');
    }
    if (durationChanged || ((!track.statutoryRate && track.statutoryRate !== 0) || track.statutoryRate === '')) {
      track.statutoryRate = calculateStatRate(client.usStatRates, track.duration);
    }
    if ((!track.canadianStatutoryRate && track.canadianStatutoryRate !== 0) || track.canadianStatutoryRate === '') {
      track.canadianStatutoryRate = calculateStatRate(client.caStatRates, track.duration);
    }
  }

  // helper function for calculateMechanicalStatutoryRate method
  function calculateStatRate(statRatesForCountry, duration) {
    let statRates = {};
    if (statRatesForCountry) {
      statRatesForCountry.forEach((ratesRow) => {
        if ((!statRates.startDate || statRates.startDate < ratesRow.startDate) && ratesRow.startDate < Date.now()) {
          statRates = ratesRow;
        }
      });
      if (Object.keys(statRates).length > 0) {
        if (duration) {
          const minutes = duration / 60;
          if (minutes > 5) {
            // if more than 5 minutes return rate based on per minute rate
            return parseFloat(Math.ceil(minutes) * statRates.perMinuteRate).toFixed(5);
          }
        }
        // if no duration or 5 minutes or less return the base rate (or 0 if this is not set)
        return statRates.minAmount || 0;
      }
    }
    return 0;
  }
};

/**
 * Returns the IDs of the mechanical contracts associated to the Track.
 *
 * Sets the mechanical contract IDs to track.mechanicalContractIds
 *
 * @method
 */
trackSchema.methods.setMechanicalIds = function () {
  const track = this;
  // Setup array
  track.mechanicalContractIds = [];
  track.mechanicalLicenses.forEach((license) => {
    // Check if contractId already exists
    if (license.contractId?.toString() && !track.mechanicalContractIds.includes(license.contractId?.toString())) {
      // Add to array
      track.mechanicalContractIds.push(license.contractId.toString());
    }
  });
};

/**
 * Formats an error message to a human readable format.
 *
 * Calls callback(null, newMessages) with the formatted error [newMessages].
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */

function errorMessages(err, callback) {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('isrc: Path `isrc` is required')) {
        return 'An ISRC is required';
      } if (message.includes('title: Path `title` is required')) {
        return 'A Title is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

/**
 * Returns a list of Releases the Track is associated with.
 *
 * Calls callback(null, output) with the formatted error and an [output] containing the list of Releases.
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string, object[])} callback - The callback that handles the response.
 */
trackSchema.methods.getReleases = function (callback) {
  const Release = require('../release');
  const track = this;
  Release.find({ clientId: track.clientId, $or: [{ trackIds: { $elemMatch: { $eq: track._id } } }, { trackIds: { $elemMatch: { $eq: track._id.toString() } } }] })
    .sort('createdAt')
    .then((releases) => {
      const output = [];
      releases.forEach((release) => {
        output.push(release);
      });
      callback(null, output);
    })
    .catch((err) => {
      callback(err);
    });
};

/**
  * Shifts the populated contractIds to a new field to keep the original contractId field unmodified.
  *
  * @method
  * @param {object} track - The track to update.
  */
trackSchema.statics.formatPopulatedRights = async function (track) {
  // Populate fields
  const populatedTrack = await Track.populate(
    track,
    [
      { path: 'salesReturnsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'costsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'releaseSpecificSalesReturnsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'mechanicalLicenses.contractId', model: 'Contract', select: 'name' },
      { path: 'mechanicalLicenses.composerId', model: 'Composer', select: 'name' },
      { path: 'mechanicalLicenses.publisherId', model: 'Publisher', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );

  track = JSON.parse(JSON.stringify(populatedTrack));
  if (track.salesReturnsRights) {
    track.salesReturnsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  if (track.costsRights) {
    track.costsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  if (track.releaseSpecificSalesReturnsRights) {
    track.releaseSpecificSalesReturnsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  if (track.mechanicalLicenses) {
    track.mechanicalLicenses.forEach((license) => {
      if (license && license.contractId) {
        license.contract = license.contractId;
        license.contractId = license.contractId._id.toString();
      }

      if (license && license.composerId) {
        license.composer = license.composerId;
        license.composerId = license.composerId._id.toString();
      }
      if (license && license.publisherId) {
        license.publisher = license.publisherId;
        license.publisherId = license.publisherId._id.toString();
      }
    });
  }

  return track;
};

trackSchema.statics.createTracks = async function (clientId, createdBy, lastModifiedBy, tracks) {
  const created = [];
  const failed = [];

  for (const track of tracks) {
    const { title, version, artist, isrc } = track;

    const newTrack = new Track({ title, version, artist, clientId, createdBy, lastModifiedBy, isrc });

    const savedTrack = await newTrack.save().catch(logger.error);

    if (!savedTrack) {
      failed.push(track.id);
      continue;
    }

    await UnmappedTrack
      .findByIdAndUpdate(track.id, { $set: { trackId: savedTrack._id.toString(), complete: true } })
      .then(() => {
        created.push(track.id);
      })
      .catch((error) => {
        logger.error(`Error updating unmapped track ${track.id} after creating track ${savedTrack._id}`);
        logger.error(error);
      });
  }

  return { created, failed };
};

trackSchema.methods.checkValidationErrors = async function () {
  const track = this;
  // Reset track validations errors array
  track.validationErrors = [];
  // ISRC required
  if (track.useAlternativeId && !track.alternativeId) {
    track.validationErrors.push('An Alternative ID is required');
  } else if (!track.useAlternativeId && !track.isrc) {
    track.validationErrors.push('An ISRC is required');
  }
  // Title required
  if (!track.title) {
    track.validationErrors.push('A Title is required');
  }
  // Check sales/return is included and has a contract for non Publishing client
  const client = await Client.findById(track.clientId, 'clientType');
  if (client?.clientType !== 'Publisher') {
    if (!track.salesReturnsRights?.length > 0) {
      track.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
    } else {
      let salesReturnsRightContractIdFound = true;
      track.salesReturnsRights?.forEach((salesReturnsRight) => {
        if (!salesReturnsRight.contractId) {
          salesReturnsRightContractIdFound = false;
        }
      });
      if (!salesReturnsRightContractIdFound) {
        track.validationErrors.push('At least one Contract needs to be assigned in Sales/Returns Rights');
      }
    }
  }
  // Check costs is included and has a contract
  // Commented out as part of CUR-1091 UAT Additional Requests - Hotfix
  /* if (!track?.costsRights?.length > 0) {
    track.validationErrors.push('At least one Contract needs to be assigned in Costs Rights');
  } else {
    let costsRightContractIdFound = true;
    track?.costsRights?.forEach((costsRight) => {
      if (!costsRight.contractId) {
        costsRightContractIdFound = false;
      }
    });
    if (!costsRightContractIdFound) {
      track.validationErrors.push('At least one Contract needs to be assigned in Costs Rights');
    }
  } */
  track.valid = track.validationErrors.length === 0;
};

function validateMechanicalLicenses(track) {
  if (!Array.isArray(track.mechanicalLicenses)) { return true; }

  const invalidValues = track.mechanicalLicenses.filter((license) => Utils.validateMechanicalLicense(license));
  return invalidValues.length === 0;
}

trackSchema.methods.validateSubclientRestrictions = function (existingTrack) {
  if (!existingTrack) {
    return [];
  }
  const track = this.toObject();
  const existingTrackObject = existingTrack.toObject();
  const errors = [];
  const isFieldModified = (fieldName) => {
    if (!existingTrack) return false;
    if (fieldName === 'salesReturnsRights') {
      // Lodash considers two arrays equal if they have the same elements in the same order, hence the sort
      // Remove the _ids as we only care about the percentage and the contractId
      const clean = (arr) => _.sortBy(
        arr.map(({ _id, id, ...rest }) => rest),
        'contractId',
      );
      const areEqual = _.isEqual(
        clean(track.salesReturnsRights),
        clean(existingTrackObject.salesReturnsRights),
      );
      return !areEqual;
    }
    return !_.isEqual(track[fieldName], existingTrackObject[fieldName]);
  };

  const restrictedFields = [
    { field: 'salesReturnsRights', message: 'This participation rate was created as part of an automation and cannot be edited.' },
  ];

  restrictedFields.forEach((field) => {
    if (isFieldModified(field.field)) {
      errors.push(field.message);
    }
  });

  return errors;
};

trackSchema.pre('save', async function (next) {
  const Contract = require('../contract');
  const track = this;
  try {
    const oldTrack = await Track.findById(track._id);
    const contractIds = Track.extractContractIds(track);
    const contracts = await Contract.find({ _id: { $in: contractIds } });

    // TEMPORARILY DISABLED - subclient validation
    // Check if track is linked to a subclient
    // const isTrackLinkedToSubclient = contracts.some((contract) => contract.subClientId);

    // For there to be a subclientId, it has to be coming from the subclient route
    // new or old is irrelevant

    // if (!track.fromLBAroute && isTrackLinkedToSubclient) {
    //   const errors = track.validateSubclientRestrictions(oldTrack);
    //   if (errors.length > 0) {
    //     return next(new Error(errors.join(', ')));
    //   }
    // }
    track.fromLBAroute = undefined;

    if (track?.duration) {
      track.duration = Math.round(track.duration);
    }

    const client = await Client.findById(track.clientId);
    if (!client) {
      logger.error(`Error finding client in pre-save with clientId '${track.clientId}'`);
      return next(new Error('Could not find client'));
    }

    if (!oldTrack && client.defaultMechanicalBasis) {
      track.mechanicalCalculationBasis = client.defaultMechanicalBasis;
      track.reportMechanicals = client.defaultReportMechanicals;
    }
    const durationChanged = !(track.duration === oldTrack?.duration);
    await track.checkValidationErrors();
    track.uniqueAliases();
    track.uniqueCatGroups();
    track.calculateTotalParticipation();
    Utils.clearBlankStrings(track, ['salesReturnsRights', 'costsRights', 'releaseSpecificSalesReturnsRights', 'mechanicalLicenses']);
    track.setMechanicalIds();

    if (!validateMechanicalLicenses(track)) {
      return next(new Error('Mechanical License fields: Rates and/or Shares contain invalid numbers or there is no Contract'));
    }
    await track.calculateMechanicalStatutoryRate(durationChanged);

    const errors = [];
    const asyncArray = [];

    if (track.useAlternativeId) {
      track.isrc = null;
      if (!client.features.useAlternativeId) {
        errors.push('Alternative ID cannot be used for this client.');
      }
      if (track.alternativeId) {
        const duplicateTrack = await Track.findOne({ _id: { $ne: track._id }, clientId: track.clientId, alternativeId: track.alternativeId }, '_id');
        if (duplicateTrack) {
          errors.push(`The Alternative ID '${track.alternativeId}' matches the Alternative ID on track: ${duplicateTrack._id}`);
        }
      } else {
        // Always store it as null if it has no real value set
        track.alternativeId = null;
      }
    } else {
      track.alternativeId = null;
      track.linkedIsrc = null;
      if (track.isrc) {
        track.isrc = track.isrc.replace(/[^a-zA-Z0-9]/ig, '');
        // Check if the isrc exists as another track's isrc.
        asyncArray.push((callback) => {
          Track.findOne({ _id: { $ne: track._id }, clientId: track.clientId, isrc: track.isrc })
            .then((duplicateTrack) => {
              callback(null, { isrc: track.isrc, duplicateId: duplicateTrack?._id, duplicateReason: 'isrc' });
            })
            .catch(callback);
        });
        // Check if the isrc exists within another track's aliases.
        asyncArray.push((callback) => {
          Track.findOne({ _id: { $ne: track._id }, clientId: track.clientId, aliases: track.isrc })
            .then((duplicateTrack) => {
              callback(null, { alias: track.isrc, duplicateId: duplicateTrack?._id, duplicateReason: 'isrcAsAlias' });
            })
            .catch(callback);
        });
      }
    }
    track.aliases.forEach((alias) => {
      // Check if the alias exists within another track's aliases.
      asyncArray.push((callback) => {
        Track.findOne({ _id: { $ne: track._id }, clientId: track.clientId, aliases: alias })
          .then((duplicateTrack) => {
            callback(null, { alias, duplicateId: duplicateTrack?._id, duplicateReason: 'alias' });
          })
          .catch(callback);
      });
      // Check if the alias exists as another track's isrc.
      asyncArray.push((callback) => {
        Track.findOne({ _id: { $ne: track._id }, clientId: track.clientId, isrc: alias })
          .then((duplicateTrack) => {
            callback(null, { alias, duplicateId: duplicateTrack?._id, duplicateReason: 'aliasAsIsrc' });
          })
          .catch(callback);
      });
    });

    const result = await async.parallel(asyncArray);

    // Check if share is a valid number, with valid decimal places.
    if (Array.isArray(track.mechanicalLicenses)) {
      track.mechanicalLicenses.forEach((mechanicalLicense) => {
        if (parseFloat(mechanicalLicense.share) != mechanicalLicense.share) {
          errors.push(`Share percentage contains an invalid number ${mechanicalLicense.share}`);
        }
      });
    }
    result.forEach((resultArray) => {
      if (resultArray.duplicateId) {
        const duplicateTrackId = resultArray.duplicateId;
        const duplicateAlias = resultArray.alias;
        const duplicateIsrc = resultArray.isrc;

        if (resultArray.duplicateReason === 'isrc') {
          errors.push(`The ISRC '${duplicateIsrc}' matches the ISRC on track: ${duplicateTrackId}`);
        }
        if (resultArray.duplicateReason === 'alias') {
          errors.push(`The alias '${duplicateAlias}' matches an existing alias on track: ${duplicateTrackId}`);
        }
        if (resultArray.duplicateReason === 'isrcAsAlias') {
          errors.push(`The ISRC '${duplicateAlias}' matches an existing alias on track: ${duplicateTrackId}`);
        }
        if (resultArray.duplicateReason === 'aliasAsIsrc') {
          errors.push(`The alias '${duplicateAlias}' matches the ISRC on track: ${duplicateTrackId}`);
        }
      }
    });
    if (errors.length) {
      return next(new Error(errors.join(', ')));
    }
    track.checkMultipleContracts((err) => {
      if (err) {
        return next(err);
      }
      track.validateSalesReturns((err) => {
        if (err) {
          return next(err);
        }
        track.validateCosts((err) => {
          if (err) {
            return next(err);
          }
          track.checkMultipleReleaseSpecificRightsReturns((err) => {
            next(err);
          });
        });
      });
    });
  } catch (err) {
    logger.error(`Error in pre-save with clientId '${track.clientId}', trackId '${track._id}': ${err}`);
    next(new Error('Internal error, please try again or contact support'));
  }
});

trackSchema.post('save', (err, savedTrack, next) => {
  // const track = this;
  // Handle error messages
  if (err) {
    logger.error(err);
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

trackSchema.post('save', function (savedTrack, next) {
  const track = this;
  try {
    track.updateCopyToCatalogueClients((err) => {
      if (err) {
        logger.error('Copying track across catalogues error:');
        logger.error(err);
      }
    });
    next();
  } catch (e) {
    logger.error(e);
    next();
  }
});

// trackSchema.pre('remove', function (next) {
//   const track = this;
//   const salesFiles = [];
//   const cbErr = {
//     err: null,
//     data: null,
//   };
//   Client.findById(track.clientId, (err, client) => {
//     if (err) {
//       cbErr.err = err;
//       return next(cbErr);
//     }
//     if (client && client.bigQuerySalesTable) {
//       const column = 'salesFileId';
//       const bigQuery = new BigQuery({
//         datasetName: client.bigQueryDataset,
//         inputTable: client.bigQuerySalesTable,
//       });
//       const filter = {
//         trackId: track._id.toString(),
//       };
//       bigQuery.getDistinct(bigQuery.inputTable, column, filter, (err, results) => {
//         if (err) {
//           logger.error(err);
//           cbErr.err = err;
//           next(cbErr);
//         } else {
//           logger.debug('BQ results');
//           logger.debug(results);
//           logger.debug(track._id.toString());
//           // SalesFile Ids - For Debbuging without allowing deletion of any records
//           // results = ['5d9f43021759eb58962dca9b','5e57be1ba87ad10b4ab366c1'];

//           const count = results.length;
//           logger.debug({ total: count });

//           if (count) {
//             async.each(results, (result, callback) => {
//               SalesFile.findById(result, (err, file) => {
//                 if (file) {
//                   salesFiles.push({
//                     name: file.name,
//                     link: `sales/${file._id}/edit`,
//                   });
//                 }
//                 callback(err);
//               });
//             }, (err) => {
//               if (err) cbErr.err = err;
//               cbErr.data = salesFiles;
//               next(cbErr);
//             });
//           } else {
//             next();
//           }
//         }
//       });
//     } else {
//       cbErr.err = new Error('Internal error, please try again or contact support');
//       next(cbErr);
//     }
//   });
// });

function isObjectPopulated(obj) {
  let objectPopulated = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') objectPopulated = true;
    }
  }

  return objectPopulated;
}

const Track = mongoose.model(name, trackSchema);

module.exports = Track;
