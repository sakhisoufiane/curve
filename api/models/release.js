/* eslint-disable max-len */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-loop-func */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/**
 * @module release
 */
const { logger, fileManager, createZip, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, Utils, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { Release: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Track = require('./track');
const contractTerritoryValidation = require('../libs/contractTerritoryValidation');
const Client = require('./client');
const Composer = require('./composer/composer');
const Notification = require('./notification');
const Publisher = require('./publisher/publisher');
const UnmappedRelease = require('./unmappedRelease');
const config = require('../config.json');
const fixEncoding = require('../libs/fixEncoding');

const { ObjectId } = mongoose.Types;

const releaseSchema = schema;

releaseSchema.plugin(modelHistory, { mongoose, name: 'releasePatches', useArchive: true, removePatches: false });
releaseSchema.plugin(mongoosePaginate);

/**
  * Check if one of the passed contract IDs is associated with the Release.
  *
  * Calls callback(containsId) with [containsId] set to true if one of the passedcontract IDs is associated with the Release.
  *
  * @method
  * @param {string} passedContractIds - Contract IDs to check against.
  * @param {function(boolean)} callback - The callback that handles the response.
  */
releaseSchema.methods.containsContractIds = function (passedContractIds, callback) {
  if (passedContractIds) {
    this.contractIds((releaseContractIds) => {
      let containsId = false;
      passedContractIds.forEach((passedContractId) => {
        if (releaseContractIds.indexOf(passedContractId) !== -1) {
          containsId = true;
        }
        if (passedContractId === passedContractIds[passedContractIds.length - 1]) {
          callback(containsId);
        }
      });
    });
  } else {
    callback(false);
  }
};

/**
  * Returns an array of contract IDs associated with the Release.
  *
  * Calls callback(array) with an [array] of contract IDs associated with the Release.
  *
  * @method
  * @param {function(string[])} callback - The callback that handles the response.
  */
releaseSchema.methods.contractIds = function (callback) {
  const array = [];
  this.salesReturnsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  this.costsRights.forEach((contractId) => {
    array.push(contractId.contractId);
  });
  callback(array);
};

/**
  * Validates the contracts associated to the Release.
  *
  * Sets release.contractValidation to "No Contracts" if no contracts are associated to the Release
  *
  * Sets release.contractValidation to "Territories Missing" if the contract's territories are missing
  *
  * Sets release.contractValidation to "" othewrwise
  *
  * Calls callback() after checking the contracts.
  *
  * @method
  * @param {function()} callback - The callback that handles the response.
  */
// TODO: Not used anywhere else.
releaseSchema.methods.releaseContractValidation = function (callback) {
  const Contract = require('./contract');
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
  * Sends an export of the Release data by email.
  *
  * @method
  * @param {object} filter - The Release filter object.
  * @param {object} curveUser - The User sending the export.
  * @param {object} exportTemplateVersion - The export template version.
  */
releaseSchema.statics.sendExport = function (filter, curveUser, exportTemplateVersion) {
  const Client = require('./client');
  try {
    async.waterfall([
      function (cb) {
        Release.countDocuments(filter)
          .then((count) => {
            cb(null, count);
          })
          .catch((err) => {
            logger.error(`Error counting releases in sendExport: ${err}`);
            cb(err);
          });
      },
      function (count, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            // get date format from client settings
            const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
            const { paymentTier } = client;
            if (count < 1000) {
              Release.createExportXlsx(filter, exportTemplateVersion, dateFormat, curveUser.clientId, paymentTier, cb);
            } else if (exportTemplateVersion !== 'v2') {
              Release.createExportCsv(filter, count, dateFormat, cb);
            } else {
              Release.createExportCsvV2(filter, count, dateFormat, paymentTier, cb);
            }
          })
          .catch((err) => {
            logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
            cb(err);
          });
      },
      function (filePath, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            fileManager.uploadToS3(`exports/${client.name} Release Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
          })
          .catch((err) => {
            logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
            cb(err);
          });
      },
      function (key, cb) {
        fileManager.publicLink24Hours(key, cb);
      },
      function (link, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportDownload',
              curveUser,
              client,
              subject: `Your Releases Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Release Export Ready', `Your Release Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
            cb(err);
          });
      },
    ], (err) => {
      if (err) {
        logger.error(err);
        // Return error via email
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'exportError',
              curveUser,
              client,
              subject: `Your Release Export for ${client.name}  Has Errored`,
              error: err.message,
            };
            Notification.generate(`Your Release Export for ${client.name}  Has Errored`, err.message, null, curveUser, generateOptions);
          })
          // Maybe we shouldn't catch here, but let the error bubble to the catch below
          .catch((err) => {
            logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
          });
      }
    });
  } catch (e) {
    logger.error(e);
    // Return error via email
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'exportError',
          curveUser,
          client,
          subject: 'Your release Export Has Errored',
          error: 'Your release export has errored. Please try again, or contact support',
        };
        Notification.generate('Your release Export Has Errored', 'Your release export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(`Error finding client in sendExport with clientId '${curveUser.clientId}': ${err}`);
      });
  }
};

/**
  * Exports the Release data to an Excel file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the excel file.
  *
  * @method
  * @param {object} filter - The Release filter object.
  * @param {string} exportTemplateVersion - The export template version.
  * @param {string} dateFormat - The date format when writing to the excel file.
  * @param {function(string, string)} callback - The callback that handles the response.
  */
releaseSchema.statics.createExportXlsx = function (filter, exportTemplateVersion, dateFormat, clientId, paymentTier, callback) {
  async.waterfall([
    function (cb) {
      Release.find(filter)
        .then((releases) => {
          cb(null, releases);
        })
        .catch((err) => {
          cb(err);
        });
    },
    function (releases, cb) {
      if (exportTemplateVersion !== 'v2') {
        Release.multipleReleasesForXlsx(releases, dateFormat, cb);
      } else {
        Release.multipleReleasesForXlsxV2(releases, dateFormat, paymentTier, cb);
      }
    },
    function (data, cb) {
      if (paymentTier === 'Lite') {
        Exports.getTemplate({ Client, templateName: 'release', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      } else if (exportTemplateVersion !== 'v2') {
        Exports.getTemplate({ Client, templateName: 'releaseCombined', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      } else {
        Exports.getTemplate({ Client, templateName: 'releaseSeparated', clientId }).then((template) => {
          createXlsx.createInTemplate(data, template, cb);
        });
      }
    },
  ], callback);
};

/**
  * Exports the Release data to a CSV file.
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} filter - The Release filter object.
  * @param {number} count - The number of Releases to process per round.
  * @param {string} dateFormat - The date format when writing to the csv file.
  * @param {function(string, string)} callback - The callback that handles the response.
  */
releaseSchema.statics.createExportCsv = function (filter, count, dateFormat, callback) {
  const limit = 500;
  const standardOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')}.csv`;
  const mechanicalOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')} - mechanicals.csv`;
  const releaseSpecificRightsOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')} - releaseSpecificRights.csv`;
  const writer = new WriteCsv({
    headers: [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'Cat No', 'Barcode', 'Label', 'Release Date', 'Distribution Channel', 'Format', 'Price Category',
      'Dealer Price', 'MCPS ID', 'MCPS TV Advertised', 'Mechanical Track Cap', 'Controlled Composition Clause', 'Catalogue Groups', 'Release Aliases', 'Sales Contract Name',
      'Sales Contract Percentage', 'Costs Contract Name', 'Costs Contract Percentage', 'Track ID', 'Track Title', 'Track Version', 'Track Artist',
      'Track Foreign ID', 'Track Project ID', 'ISRC', 'Label', 'P Line', 'Duration', 'Mechanical Rate Basis', 'US Mechanical Statutory Rate', 'Canadian Mechanical Statutory Rate', 'Report Mechanicals',
      'Catalogue Groups', 'Default Release Distribution Channel', 'Default Release Cat No', 'Track Aliases', 'Track Sales Contract Name', 'Track Sales Contract Percentage',
      'Track Costs Contract Name', 'Track Costs Contract Percentage',
    ],
    outputLocation: standardOutput,
  });
  const mechanicalWriter = new WriteCsv({ headers: ['Release Cat No', 'Distribution Channel', 'ISRC', 'Report Mechanicals', 'Composer Name', 'Publisher Name', 'Contract Name', 'Controlled', 'License No', 'Rate', 'Share', 'Track Cap Override'], outputLocation: mechanicalOutput });
  const releaseSpecificRightsWriter = new WriteCsv({
    headers: [
      'ISRC', 'Release Distribution Channel', 'Release Cat No', 'Contract', 'Percentage',
    ],
    outputLocation: releaseSpecificRightsOutput,
  });

  const rounds = listFromNumber(Math.floor(count / limit));
  async.eachLimit(rounds, 3, (round, loopCb) => {
    logger.info(`Release Export: Running Round ${round} of ${rounds.length}`);
    async.waterfall([
      function (cb) {
        Release.find(filter)
          .limit(limit)
          .skip(round * limit)
          .sort({ _id: 1 })
          .then((releases) => {
            cb(null, releases);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (releases, cb) {
        Release.multipleReleasesForXlsx(releases, dateFormat, cb);
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
  }, (err) => {
    if (err) {
      callback(err);
    } else {
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
          createZip.localFiles([standardOutput, mechanicalOutput, releaseSpecificRightsOutput], `${appRootDir}/tmp/Release Export ${moment().format('X')}.zip`, callback);
        }
      });
    }
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
  * Exports the Release data to a CSV file (V2).
  *
  * Calls callback(err, output) with an [err] if an error occurs and the [output] path of the csv file.
  *
  * @method
  * @param {object} filter - The Release filter object.
  * @param {number} count - The number of Releases to process per round.
  * @param {string} dateFormat - The date format when writing to the csv file.
  * @param {function(string, string)} callback - The callback that handles the response.
  */
releaseSchema.statics.createExportCsvV2 = function (filter, count, dateFormat, paymentTier, callback) {
  const limit = 500;
  const standardOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')}.csv`;
  const contractOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')} - contracts.csv`;
  const trackOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')} - tracks.csv`;
  const mechanicalOutput = `${appRootDir}/tmp/Release Export - ${moment().format('X')} - mechanicals.csv`;
  const headers = paymentTier === 'Lite'
    ? [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'Cat No', 'Barcode', 'Label', 'Release Date', 'Distribution Channel', 'Format', 'Price Category', 'Dealer Price', 'Catalogue Groups', 'Release Aliases']
    : [
      'ID', 'Title', 'Version', 'Artist', 'Foreign ID', 'Project ID', 'Cat No', 'Barcode', 'Label', 'Release Date', 'Distribution Channel', 'Format', 'Price Category', 'Dealer Price',
      'MCPS ID', 'MCPS TV Advertised', 'Mechanical Track Cap', 'Controlled Composition Clause', 'Catalogue Groups', 'Release Aliases'];
  const writer = new WriteCsv({
    headers,
    outputLocation: standardOutput,
  });
  const contractWriter = new WriteCsv({ headers: ['Cat No', 'Distribution Channel', 'Sales Contract Name', 'Sales Contract Percentage', 'Costs Contract Name', 'Costs Contract Percentage'], outputLocation: contractOutput });
  const trackWriter = new WriteCsv({ headers: ['Cat No', 'Distribution Channel', 'ISRC'], outputLocation: trackOutput });
  const mechanicalWriter = new WriteCsv({
    headers: [
      'Release Cat No', 'Distribution Channel', 'ISRC', 'Report Mechanicals', 'Composer Name',
      'Publisher Name', 'Contract Name', 'Controlled', 'License No', 'Rate', 'Share', 'Track Cap Override',
    ],
    // result.contractName, license.controlled, license.licenseNo
    outputLocation: mechanicalOutput,
  });
  const rounds = listFromNumber(Math.floor(count / limit));
  async.eachSeries(rounds, (round, loopCb) => {
    async.waterfall([
      function (cb) {
        Release.find(filter)
          .limit(limit)
          .skip(round * limit)
          .sort({ _id: 1 })
          .then((releases) => {
            cb(null, releases);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (releases, cb) {
        Release.multipleReleasesForXlsxV2(releases, dateFormat, paymentTier, cb);
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
        trackWriter.addData(data[2], (err) => {
          cb(err, data);
        });
      },
      function (data, cb) {
        if (paymentTier === 'Lite') {
          cb();
        } else {
          mechanicalWriter.addData(data[3], cb);
        }
      },
    ], loopCb);
  }, (err) => {
    if (err) {
      callback(err);
    } else {
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
          trackWriter.write((err) => {
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
      ], (err) => {
        if (err) {
          callback(err);
        } else {
          createZip.localFiles(paymentTier === 'Lite' ? [standardOutput, contractOutput, trackOutput] : [standardOutput, contractOutput, trackOutput, mechanicalOutput], `${appRootDir}/tmp/Release Export ${moment().format('X')}.zip`, callback);
        }
      });
    }
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
  * Formats mulitple Releases for the Excel export.
  *
  * Calls callback(err, data) with an [err] if an error occurs and the release [data].
  *
  * @method
  * @param {object[]} releases - The Releases to format.
  * @param {string} dateFormat - The date format for the excel file.
  * @param {function(string, array[])} callback - The callback that handles the response.
  */
releaseSchema.statics.multipleReleasesForXlsx = function (releases, dateFormat, callback) {
  try {
    const Contract = require('./contract');
    if (releases instanceof Array) {
      const convertedReleases = [];
      const mechanicals = [];
      const releaseSpecificRights = [];
      async.eachLimit(releases, 5, (release, cb) => {
        const aliases = release.aliases.map((alias) => alias).join(';');

        const salesReturnRights = [];
        const costsRights = [];

        async.series([
          function (seriesCallback) {
            if (release.salesReturnsRights) {
              async.each(release.salesReturnsRights, (salesReturn, salesReturnCb) => {
                Contract.findById(salesReturn.contractId)
                  .then((contract) => {
                    const contractName = contract ? contract.name : '';
                    salesReturnRights.push({ contractName, _id: salesReturn.contractId, percentage: salesReturn.percentage });
                    salesReturnCb();
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract in multipleReleasesForXlsx with salesReturn.contractId '${salesReturn.contractId}': ${err}`);
                    // It seems strange to do this but this is how it worked originally.
                    // May need to be fixed in the future.
                    salesReturnRights.push({ contractName: '', _id: salesReturn.contractId, percentage: salesReturn.percentage });
                    salesReturnCb();
                  });
              }, seriesCallback);
            } else {
              seriesCallback();
            }
          },
          function (seriesCallback) {
            if (release.costsRights) {
              async.each(release.costsRights, (costsReturn, costsReturnCb) => {
                Contract.findById(costsReturn.contractId)
                  .then((contract) => {
                    const contractName = contract ? contract.name : '';
                    costsRights.push({ contractName, _id: costsReturn.contractId, percentage: costsReturn.percentage });
                    costsReturnCb();
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract in multipleReleasesForXlsx with costsReturn.contractId '${costsReturn.contractId}': ${err}`);
                    // It seems strange to do this but this is how it worked originally.
                    // May need to be fixed in the future.
                    costsRights.push({ contractName: '', _id: costsReturn.contractId, percentage: costsReturn.percentage });
                    costsReturnCb();
                  });
              }, seriesCallback);
            } else {
              seriesCallback();
            }
          },
          function (seriesCallback) {
            if (release?.trackIds?.length > 0) {
              async.each(release.trackIds, (trackId, trackIdCb) => {
                Track.findById(trackId)
                  .then((track) => {
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
                                  logger.error(`Error finding contract in multipleReleasesForXlsx with releaseRight.contractId '${releaseRight.contractId}': ${err}`);
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
                                  logger.error(`Error finding release in multipleReleasesForXlsx with releaseRight.releaseId '${releaseRight.releaseId}': ${err}`);
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
                      }, trackIdCb);
                    } else {
                      trackIdCb();
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding track in multipleReleasesForXlsx with trackId '${trackId}': ${err}`);
                    trackIdCb();
                  });
              }, () => {
                // Sort by Track ISRC
                releaseSpecificRights.sort((a, b) => {
                  if (a[0] > b[0]) {
                    return 1;
                  } if (a[0] < b[0]) {
                    return -1;
                  }
                  return 0;
                });
                seriesCallback();
              });
            } else {
              seriesCallback();
            }
          },
          function (seriesCallback) {
            if (release.mechanicalLicenses) {
              const trackIds = Object.keys(release.mechanicalLicenses);
              async.eachLimit(trackIds, 10, (trackId, trackCb) => {
                Track.findById(trackId, { isrc: 1 })
                  .then((track) => {
                    if (track && release.mechanicalLicenses[trackId]) {
                      async.each(release.mechanicalLicenses[trackId].licenses, (license, licenseCb) => {
                        if (license) {
                          async.parallel({
                            contractName(paraCb) {
                              Contract.findById(license.contractId)
                                .then((contract) => {
                                  const contractName = contract ? contract.name : '';
                                  paraCb(null, contractName);
                                })
                                .catch((err) => {
                                  logger.error(`Error finding contract in multipleReleasesForXlsx with license.contractId '${license.contractId}': ${err}`);
                                  paraCb(null, '');
                                });
                            },
                            composerName(paraCb) {
                              Composer.findById(license.composerId)
                                .then((composer) => {
                                  const composerName = composer ? composer.name : '';
                                  paraCb(null, composerName);
                                })
                                .catch((err) => {
                                  logger.error(`Error finding composer in multipleReleasesForXlsx with license.composerId '${license.composerId}': ${err}`);
                                  paraCb(null, '');
                                });
                            },
                            publisherName(paraCb) {
                              Publisher.findById(license.publisherId)
                                .then((publisher) => {
                                  const publisherName = publisher ? publisher.name : '';
                                  paraCb(null, publisherName);
                                })
                                .catch((err) => {
                                  logger.error(`Error finding publisher in multipleReleasesForXlsx with license.publisherId '${license.publisherId}': ${err}`);
                                  paraCb(null, '');
                                });
                            },
                          }, (err, result) => {
                            mechanicals.push([
                              release.catNo, release.distributionChannel, track.isrc, release.mechanicalLicenses[trackId].reportMechanicals, result.composerName,
                              result.publisherName, result.contractName, license.controlled, license.licenseNo, license.rate, license.share, license.trackCapOverride,
                            ]);
                            licenseCb();
                          });
                        } else {
                          licenseCb();
                        }
                      }, trackCb);
                    } else {
                      trackCb();
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding track in multipleReleasesForXlsx with trackId '${trackId}': ${err}`);
                    trackCb();
                  });
              }, () => {
                // Sort by Cat No
                mechanicals.sort((a, b) => {
                  if (a[0] > b[0]) {
                    return 1;
                  } if (a[0] < b[0]) {
                    return -1;
                  }
                  return 0;
                });
                seriesCallback();
              });
            } else {
              seriesCallback();
            }
          },
        ], () => {
          salesReturnRights.sort((a, b) => a.contractName.localeCompare(b.contractName));
          costsRights.sort((a, b) => a.contractName.localeCompare(b.contractName));
          convertedReleases.push(release.exportData(aliases, salesReturnRights, costsRights, release.trackIds, dateFormat));
          cb();
        });
      }, () => {
        mergeSalesLines(convertedReleases, (err, returnedReleases) => {
          callback(err, [returnedReleases, mechanicals, releaseSpecificRights]);
        });
      });
    } else {
      callback(new Error('Must be passed an Array of Releases'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
  * Formats mulitple Releases for the Excel export (V2).
  *
  * Calls callback(err, data) with an [err] if an error occurs and the release [data].
  *
  * @method
  * @param {object[]} releases - The Releases to format.
  * @param {string} dateFormat - The date format for the excel file.
  * @param {function(string, array[])} callback - The callback that handles the response.
  */
releaseSchema.statics.multipleReleasesForXlsxV2 = function (releases, dateFormat, paymentTier, callback) {
  try {
    const Contract = require('./contract');
    if (releases instanceof Array) {
      const convertedReleases = [];
      const contracts = [];
      const tracks = [];
      const mechanicals = [];
      async.eachLimit(releases, 5, (release, cb) => {
        async.series([
          function (seriesCallback) {
            convertedReleases.push(release.exportReleaseRow(dateFormat, paymentTier));
            seriesCallback();
          },
          function (seriesCallback) {
            if (release.salesReturnsRights) {
              async.each(release.salesReturnsRights, (salesReturn, salesReturnCb) => {
                Contract.findById(salesReturn.contractId)
                  .then((contract) => {
                    if (contract) {
                      const contractName = contract ? contract.name : '';
                      contracts.push(release.exportContractRow({ contractName, _id: salesReturn.contractId, type: 'salesReturnRights' }, salesReturn.percentage));
                      salesReturnCb();
                    } else {
                      salesReturnCb();
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract in multipleReleasesForXlsxV2 with salesReturn.contractId '${salesReturn.contractId}': ${err}`);
                    salesReturnCb();
                  });
              }, seriesCallback);
            } else {
              seriesCallback();
            }
          },
          function (seriesCallback) {
            if (release.costsRights) {
              async.each(release.costsRights, (costsReturn, costsReturnCb) => {
                Contract.findById(costsReturn.contractId)
                  .then((contract) => {
                    if (contract) {
                      const contractName = contract ? contract.name : '';
                      contracts.push(release.exportContractRow({ contractName, _id: costsReturn.contractId, type: 'costsRights' }, costsReturn.percentage));
                      costsReturnCb();
                    } else {
                      costsReturnCb();
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding contract in multipleReleasesForXlsxV2 with costsReturn.contractId '${costsReturn.contractId}': ${err}`);
                    costsReturnCb();
                  });
              }, seriesCallback);
            } else {
              seriesCallback();
            }
          },
          function (seriesCallback) {
            if (release.trackIds) {
              async.each(release.trackIds, (trackId, tracksReturnCb) => {
                Track.findById(trackId, { isrc: 1 })
                  .then((track) => {
                    if (track) {
                      tracks.push(release.exportTrackRow(track));
                    }
                    tracksReturnCb();
                  })
                  .catch((err) => {
                    logger.error(`Error finding track in multipleReleasesForXlsxV2 with trackId '${trackId}': ${err}`);
                    tracksReturnCb();
                  });
              }, (err) => {
                // Sort by Cat No
                tracks.sort((a, b) => {
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
          function (seriesCallback) {
            if (release.mechanicalLicenses && paymentTier !== 'Lite') {
              const trackIds = Object.keys(release.mechanicalLicenses);
              async.each(trackIds, (trackId, trackCb) => {
                Track.findById(trackId, { isrc: 1 })
                  .then((track) => {
                    if (track && release.mechanicalLicenses[trackId]) {
                      if (release.mechanicalLicenses[trackId].licenses && release.mechanicalLicenses[trackId].licenses.length > 0) {
                        async.each(release.mechanicalLicenses[trackId].licenses, (license, licenseCb) => {
                          if (license) {
                            async.parallel({
                              contractName(paraCb) {
                                Contract.findById(license.contractId)
                                  .then((contract) => {
                                    const contractName = contract ? contract.name : '';
                                    paraCb(null, contractName);
                                  })
                                  .catch((err) => {
                                    logger.error(`Error finding contract in multipleReleasesForXlsxV2 with license.contractId '${license.contractId}': ${err}`);
                                    paraCb(null, '');
                                  });
                              },
                              composerName(paraCb) {
                                Composer.findById(license.composerId)
                                  .then((composer) => {
                                    const composerName = composer ? composer.name : '';
                                    paraCb(null, composerName);
                                  })
                                  .catch((err) => {
                                    logger.error(`Error finding composer in multipleReleasesForXlsxV2 with license.composerId '${license.composerId}': ${err}`);
                                    paraCb(null, '');
                                  });
                              },
                              publisherName(paraCb) {
                                Publisher.findById(license.publisherId)
                                  .then((publisher) => {
                                    const publisherName = publisher ? publisher.name : '';
                                    paraCb(null, publisherName);
                                  })
                                  .catch((err) => {
                                    logger.error(`Error finding publisher in multipleReleasesForXlsxV2 with license.publisherId '${license.publisherId}': ${err}`);
                                    paraCb(null, '');
                                  });
                              },
                            }, (err, result) => {
                              mechanicals.push([
                                release.catNo, release.distributionChannel, track.isrc, release.mechanicalLicenses[trackId].reportMechanicals, result.composerName,
                                result.publisherName, result.contractName, license.controlled, license.licenseNo, license.rate, license.share, license.trackCapOverride,
                              ]);
                              licenseCb();
                            });
                          } else {
                            licenseCb();
                          }
                        }, trackCb);
                      } else {
                        mechanicals.push([release.catNo, release.distributionChannel, track.isrc, release.mechanicalLicenses[trackId].reportMechanicals, null, null, null, null, null, null, null, null]);
                        trackCb();
                      }
                    } else {
                      trackCb();
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding track in multipleReleasesForXlsxV2 with trackId '${trackId}': ${err}`);
                    trackCb();
                  });
              }, (err) => {
                mechanicals.sort((a, b) => {
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
        ], () => {
          cb();
        });
      }, () => {
        callback(null, paymentTier === 'Lite' ? [convertedReleases, mergeContractLines(contracts), tracks] : [convertedReleases, mergeContractLines(contracts), tracks, mechanicals]);
      });
    } else {
      callback(new Error('Must be passed an Array of Releases'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
  * Merges sales lines for each of the converted Reelases.
  *
  * Calls callback(err, mergedSalesLines) with an [err] if an error occurs and the [mergedSalesLines].
  *
  * @method
  * @param {object[]} convertedReleases - The converted Releases to merge.
  * @param {function(string, object[])} callback - The callback that handles the response.
  */
function mergeSalesLines(convertedReleases, callback) {
  const mergedSalesLines = [];

  async.eachLimit(convertedReleases, 10, (release, cb) => {
    let trackIds = release[0];
    release = release.splice(1, release.length);
    console.log(release);
    const salesReturnRights = release[20] ? release[20] : [];
    const costsRights = release[21] ? release[21] : [];

    release = release.splice(0, release.length - 2);

    let nOfLines = 1;
    if (salesReturnRights && costsRights && salesReturnRights.length > 0 && salesReturnRights.length >= costsRights.length) {
      nOfLines = salesReturnRights.length;
    } else if (salesReturnRights && costsRights && costsRights.length > 0 && costsRights.length >= salesReturnRights.length) {
      nOfLines = costsRights.length;
    }

    trackIds = trackIds.map((id) => {
      if (id && id !== '' && ObjectId.isValid(id)) {
        return new ObjectId(id);
      }
    }).filter(Boolean);
    Track.find({ _id: { $in: trackIds } })
      .then((tracks) => {
        if (tracks) {
          let mergedTracks = [];
          Track.convertTracksForXlsx(tracks, (err, foundMergedTracks) => {
            mergedTracks = foundMergedTracks[0];

            // Set No of lines to the greater of
            if (nOfLines < mergedTracks.length) {
              nOfLines = mergedTracks.length;
            }

            // Add sales and costs contracts and tracks

            for (let i = 0; i < nOfLines; i += 1) {
              let mergedRelease = Object.assign([], release);

              if (salesReturnRights[i]) {
                mergedRelease.push(salesReturnRights[i].contractName);
                mergedRelease.push(salesReturnRights[i].percentage);
              } else {
                mergedRelease.push('');
                mergedRelease.push('');
              }

              if (costsRights[i]) {
                mergedRelease.push(costsRights[i].contractName);
                mergedRelease.push(costsRights[i].percentage);
              } else {
                mergedRelease.push('');
                mergedRelease.push('');
              }

              if (mergedTracks[i]) {
                mergedRelease = mergedRelease.concat(mergedTracks[i]);
              } else {
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
                mergedRelease.push('');
              }

              mergedSalesLines.push(mergedRelease);
            }
            cb();
          });
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }, () => {
    callback(null, mergedSalesLines);
  });
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
        // catNo, Distribution Channel and Contract Name is same
        if ((contracts[i][0] === contracts[j][0]) && (contracts[i][1] === contracts[j][1]) && (contracts[i][2] === contracts[j][2])) {
          if (contracts[i].indexOf('salesReturnRights') > -1) {
            contracts[i][4] = contracts[j][2];
            contracts[i][5] = contracts[j][3];
            contracts[i].push('merged');
            contracts[j].push('toDelete');
          } else if (contracts[i].indexOf('costsRights') > -1) {
            contracts[i][4] = contracts[i][2];
            contracts[i][5] = contracts[i][3];
            contracts[i][2] = contracts[j][2];
            contracts[i][3] = contracts[j][3];
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
      mergedContractLines[i][4] = mergedContractLines[i][2];
      mergedContractLines[i][5] = mergedContractLines[i][3];
      mergedContractLines[i][2] = '';
      mergedContractLines[i][3] = '';
    }
  }

  return mergedContractLines;
}

/**
 * Returns an array of the Release data to export.
 *
  * @method
  * @param {string[]} aliases - Array of Release aliases.
  * @param {object[]} salesReturnRights - An array of sales returns rights.
  * @param {object[]} costsRights - An array of costs rights.
  * @param {string[]} trackIds - An array of track IDs.
  * @param {string} dateFormat - The date format for the export.
  * @returns {array} result - The export data
  */
releaseSchema.methods.exportData = function (aliases, salesReturnRights, costsRights, trackIds, dateFormat) {
  return [
    trackIds,
    this._id.toString(),
    fixEncoding(this.title),
    fixEncoding(this.version),
    fixEncoding(this.artist),
    this.foreignId,
    this.projectId,
    this.catNo,
    this.barcode,
    fixEncoding(this.label),
    this.releaseDate ? moment(this.releaseDate).format(dateFormat) : null,
    this.distributionChannel,
    this.format,
    this.priceCategory,
    this.dealerPrice,
    this.mcpsId,
    this.mcpsTvAdvertised,
    this.mechanicalTrackCap,
    this.controlledCompositionClause,
    this.catalogueGroups.join(';'),
    aliases,
    salesReturnRights,
    costsRights,
  ];
};

/**
 * Returns an array of the Release data to export.
 *
  * @method
  * @param {string} dateFormat - The date format for the export.
  * @returns {array} result - The export data
  */
releaseSchema.methods.exportReleaseRow = function (dateFormat, paymentTier) {
  const release = this;
  const proData = [
    release._id.toString(),
    fixEncoding(release.title),
    fixEncoding(release.version),
    fixEncoding(release.artist),
    release.foreignId,
    release.projectId,
    release.catNo,
    release.barcode,
    fixEncoding(release.label),
    release.releaseDate ? moment(release.releaseDate).format(dateFormat) : null,
    release.distributionChannel,
    release.format,
    release.priceCategory,
    release.dealerPrice,
    release.mcpsId,
    release.mcpsTvAdvertised,
    release.mechanicalTrackCap,
    release.controlledCompositionClause,
    release.catalogueGroups.join(';'),
    release.aliases.join(';'),
  ];

  const liteData = [
    release._id.toString(),
    fixEncoding(release.title),
    fixEncoding(release.version),
    fixEncoding(release.artist),
    release.foreignId,
    release.projectId,
    release.catNo,
    release.barcode,
    fixEncoding(release.label),
    release.releaseDate ? moment(release.releaseDate).format(dateFormat) : null,
    release.distributionChannel,
    release.format,
    release.priceCategory,
    release.dealerPrice,
    release.catalogueGroups.join(';'),
    release.aliases.join(';'),
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
releaseSchema.methods.exportContractRow = function (contract, contractPercentage) {
  const array = [
    this.catNo,
    this.distributionChannel,
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
 * Returns an array of the Track data to export.
 *
  * @method
  * @param {object} track - The Track to export.
  * @returns {array} result - The export data
  */
releaseSchema.methods.exportTrackRow = function (track) {
  return [
    this.catNo,
    this.distributionChannel,
    track.isrc,
  ];
};

/**
  * Imports Releases from Excel Combined Template.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Release.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
releaseSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('./client');
  const ImportXlsx = require('../libs/importXlsx');
  const releaseData = {};
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        async.parallel([
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.release, 0, 2, dateFormat, (err, data) => {
              if (err) {
                ImportXlsx.getDataByTemplate(file.path, config.importTemplates.oldRelease, 0, 2, dateFormat, (err, data) => {
                  if (err) {
                    logger.error(err);
                    cb(err);
                  } else {
                    releaseData.releases = data;
                    cb();
                  }
                });
              } else {
                releaseData.releases = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.releaseMechanicals, 1, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                releaseData.mechanicals = [];
                cb(err);
              } else {
                releaseData.mechanicals = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.releaseReleaseSpecificRights, 2, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                releaseData.releaseSpecificRights = [];
                cb(err);
              } else {
                releaseData.releaseSpecificRights = data;
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
                  subject: 'Your Release Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Release Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            Release.importReleases(releaseData.releases, releaseData.mechanicals, releaseData.releaseSpecificRights, curveUser.clientId, client, overwriteBlanks, (errors, count, importedReleases, importedTracks, defaultReleaseTracks) => {
              if (errors && errors.length > 0) {
                logger.error(errors);
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Release Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Release Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                    callback(err);
                  });
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                async.waterfall([
                  function (waterfall1Cb) {
                    async.eachSeries(Object.keys(importedReleases), (catNo, catNoCb) => {
                      async.eachSeries(importedReleases[catNo], (importedRelease, importCb) => {
                        importedRelease.createdBy = curveUser.id;
                        importedRelease.lastModifiedBy = curveUser.id;
                        importedRelease.save()
                          .then(() => {
                            importCb();
                          })
                          .catch((err) => {
                            partialImportErrors.push(`Release ${importedRelease.catNo} did not save - ${err.message || err}`);
                            importCb();
                          });
                      }, catNoCb);
                    }, (err) => {
                      waterfall1Cb(err);
                    });
                  },
                  function (waterfall1Cb) {
                    async.eachSeries(Object.keys(importedTracks), (isrc, importCb) => {
                      const importedTrack = importedTracks[isrc];
                      async.waterfall([
                        function (waterfall2Cb) {
                          // Check if default release has been assigned
                          const defaultRelease = defaultReleaseTracks[isrc];
                          if (defaultRelease && defaultRelease.catNo) {
                            // Set default release
                            Release.findOne({ clientId: importedTrack.clientId, catNo: defaultRelease.catNo, distributionChannel: { $in: [defaultRelease.distributionChannel, null] } })
                              .then((release) => {
                                if (release) {
                                  importedTrack.defaultReleaseId = release._id.toString();
                                  waterfall2Cb();
                                } else {
                                  waterfall2Cb(new Error('Default release not found for Cat No and Distribution Channel supplied'));
                                }
                              })
                              .catch((err) => {
                                waterfall2Cb(err);
                              });
                          } else if (overwriteBlanks) {
                            importedTrack.defaultReleaseId = '';
                            waterfall2Cb();
                          } else {
                            waterfall2Cb();
                          }
                        },
                        function (waterfall2Cb) {
                          importedTrack.createdBy = curveUser.id;
                          importedTrack.lastModifiedBy = curveUser.id;
                          importedTrack.save()
                            .then(() => {
                              waterfall2Cb();
                            })
                            .catch((err) => {
                              logger.error(err);
                              waterfall2Cb(err);
                            });
                        },
                      ], (err) => {
                        if (err) {
                          const error = err.message && err.message.includes('Aliases are required to be unique') ? 'Aliases are required to be unique' : 'Default release not found for Cat No and Distribution Channel supplied';
                          partialImportErrors.push(`Track ${importedTrack.isrc} did not save - ${error}`);
                        }
                        importCb();
                      });
                    }, (err) => {
                      waterfall1Cb();
                    });
                  },
                ], () => {
                  if (partialImportErrors.length > 0) {
                    logger.error(partialImportErrors);
                    // Send error email
                    Client.findById(curveUser.clientId)
                      .then((client) => {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Release Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };
                        Notification.generate(
                          'Your Release Import Was Partially Successful',
                          `${partialImportErrors.length} errors in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (notificationErr, result) => {
                            if (callback) { callback(notificationErr, result); }
                          },
                        );
                      })
                      .catch((err) => {
                        logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                        callback(err);
                      });
                  } else {
                    // Send success notification
                    Client.findById(curveUser.clientId)
                      .then((client) => {
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Release Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Release Import Has Completed', `${count} Releases imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      })
                      .catch((err) => {
                        logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                        callback(err);
                      });
                  }
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Release Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Release Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in importFromExcel with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports an array of Releases.
  *
  * Calls callback(errors, count, importedReleases, importedTracks, defaultReleaseTracks) with an array of [errors] if they occur, the [count] of Releases imported, an object containing the [importedReleases], an object containing the [importedTracks] and an object containing the [defaultReleaseTracks].
  *
  * @method
  * @param {object[]} releases - Releases to import.
  * @param {object} mechanicals - An object of Mechanicals.
  * @param {object} releaseSpecificRights - An object of track releaseSpecificRights.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {object} client - Client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object, object, object)} callback - The callback that handles the response.
  */
releaseSchema.statics.importReleases = function (releases, mechanicals, releaseSpecificRights, clientId, client, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(releases) !== '[object Array]') {
    callback('Release : Data must be an Array', null);
  } else if (!clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedReleases = {};
    const importedTracks = {};
    const defaultReleaseTracks = {};
    let errors = [];

    async.eachSeries(releases, (release, cb) => {
      const index = releases.indexOf(release);
      logger.info(`${index + 1} of ${releases.length}`);

      if (isObjectPopulated(release)) {
        Release.importRelease(release, mechanicals, releaseSpecificRights, clientId, client, importedReleases, importedTracks, overwriteBlanks, (err, importedRelease, tracksErrors, importedTrack) => {
          if (err && err.message && err.message.includes('Mechanical')) {
            errors.push(err.message);
          } else if (err) {
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (tracksErrors) { errors = errors.concat(tracksErrors); }

          // Track level data
          if (importedTrack) {
            importedTracks[importedTrack._id.toString()] = importedTrack;
            if (release.track_defaultReleaseCatNo) {
              defaultReleaseTracks[importedTrack._id.toString()] = {
                distributionChannel: release.track_defaultReleaseDistributionChannel,
                catNo: release.track_defaultReleaseCatNo,
              };
            }
            // Add track to release - this needs to be the one from the array, which is going to be saved
            if (importedTrack._id.toString()) {
              importedRelease.trackIds.push(importedTrack._id.toString());
            }
          } else if (importedRelease && release.track_title && release.track_id && importedTracks[release.track_id]) {
            // if a track was previosuly imported for another release during this import and also included in this release we still need to add it
            importedRelease.trackIds.push(importedTracks[release.track_id]._id.toString());
          }

          if (importedRelease) {
            let isAlreadyImported = false;
            if ((importedRelease.barcode && importedRelease.barcode !== '') || (importedRelease.catNo && importedRelease.catNo !== '')) {
              importedReleases[importedRelease.catNo] = importedReleases[importedRelease.catNo] || [];

              // Loop through imported releases
              importedReleases[importedRelease.catNo].forEach((storedRelease, index) => {
                // Check if release matches imported one
                // eslint-disable-next-line max-len
                if (storedRelease && importedRelease.distributionChannel === storedRelease.distributionChannel && ((importedRelease._id && importedRelease._id === storedRelease._id) || (importedRelease.barcode && importedRelease.barcode !== '' && importedRelease.barcode === storedRelease.barcode) || (importedRelease.catNo && importedRelease.catNo !== '' && importedRelease.catNo === storedRelease.catNo))) {
                  // Replace release in array
                  isAlreadyImported = true;
                  importedReleases[importedRelease.catNo][index] = importedRelease;
                }
              });
            }

            if (!isAlreadyImported) {
              count += 1;
              // Add to array if not already imported
              importedReleases[importedRelease.catNo] = importedReleases[importedRelease.catNo] || [];
              importedReleases[importedRelease.catNo].push(importedRelease);
            }
          }

          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err, null, null);
      } else {
        // Unique errors
        errors = errors.filter((value, index, self) => self.indexOf(value) === index);
        callback(errors, count, importedReleases, importedTracks, defaultReleaseTracks);
      }
    });
  }
};

/**
  * Imports a single Release.
  *
  * Calls callback(error, importedRelease, tracksErrors, importedTrack) with an [error] if an errror occurs, the [importedRelease] object, an array of [tracksErrors] if they occur and the [importedTrack].
  *
  * @method
  * @param {object} data - The Release to import.
  * @param {object} mechanicals - An object of Mechanicals.
  * @param {object} releaseSpecificRights - An object of track releaseSpecificRights.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {object} client - Client importing the Releases.
  * @param {object} importedReleases - An object of imported Releases.
  * @param {object} importedTracks - An object of imported Tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */
releaseSchema.statics.importRelease = function (data, mechanicals, releaseSpecificRights, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback) {
  let query = null;
  const Track = require('./track');
  if (!data) {
    return callback(new Error("Data doesn't match template"), null);
  }
  if (!data.catNo && !data.barcode && !data.title) {
    // No data on line, so skip
    return callback();
  }
  if (ObjectId.isValid(data._id)) {
    query = { _id: new ObjectId(data._id), clientId };
  } else if (data.catNo) {
    query = { clientId, catNo: data.catNo };
    if (data.distributionChannel && data.distributionChannel !== '') {
      query.distributionChannel = data.distributionChannel;
    } else {
      query.$or = [{ distributionChannel: null }, { distributionChannel: '' }];
    }
  } else {
    return callback(new Error('Cat No must be passed'), null);
  }

  // Check that the distribution channel matches the client's list
  if (data.distributionChannel && !client.distributionChannels.includes(data.distributionChannel)) {
    return callback(new Error('Distribution Channel doesn\'t match list'));
  }

  // Check that the format matches the client's list
  if (data.format && !client.configurations.includes(data.format)) {
    return callback(new Error('Format doesn\'t match list'));
  }

  // Check that the cat group matches the client's list
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
  // check both Percentage and Contract name are present. 0 is a valid percentage as confirmed by CM.
  if ((data.salesReturnsRightsContractName && (data.salesReturnsRightsPercentage !== 0 && !data.salesReturnsRightsPercentage))
  || ((data.salesReturnsRightsPercentage || data.salesReturnsRightsPercentage === 0) && !data.salesReturnsRightsContractName)) {
    return callback(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
  }
  if ((data.salesReturnsRightsContractName && (data.salesReturnsRightsPercentage || data.salesReturnsRightsPercentage === 0)) || overwriteBlanks) {
    data.salesReturnsRightsImport = [{ name: data.salesReturnsRightsContractName, percentage: data.salesReturnsRightsPercentage }];
  }
  // check both Percentage and Contract name are present. 0 is a valid percentage as confirmed by CM.
  if ((data.costsRightsContractName && (data.costsRightsPercentage !== 0 && !data.costsRightsPercentage))
  || ((data.costsRightsPercentage || data.costsRightsPercentage === 0) && !data.costsRightsContractName)) {
    return callback(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
  }
  if ((data.costsRightsContractName && (data.costsRightsPercentage || data.costsRightsPercentage === 0)) || overwriteBlanks) {
    data.costsRightsImport = [{ name: data.costsRightsContractName, percentage: data.costsRightsPercentage }];
  }

  let previouslyImported = false;

  async.waterfall([
    function (waterfallCb) {
      // Check if release exists in previously imported - also check for zero padded cat no
      const previouslyImportedRelease = importedReleases[data.catNo] || importedReleases[`0${String(data.catNo)}`];
      if (previouslyImportedRelease) {
        let foundRelease;
        previouslyImportedRelease.forEach((storedRelease) => {
          // eslint-disable-next-line max-len
          if (storedRelease && (data.distributionChannel === storedRelease.distributionChannel || (!data.distributionChannel && !storedRelease.distributionChannel)) && ((data._id && data._id === storedRelease._id.toString()) || (data.barcode && data.barcode !== '' && String(data.barcode) === String(storedRelease.barcode)) || (data.catNo && data.catNo !== '' && String(data.catNo) === String(storedRelease.catNo)))) {
            foundRelease = storedRelease;
          }
        });
        if (foundRelease) {
          previouslyImported = true;
        }
        waterfallCb(null, foundRelease);
      } else {
        waterfallCb(null, null);
      }
    },
    function (foundRelease, waterfallCb) {
      // If not found from previously imported, find in DB
      if (foundRelease) {
        waterfallCb(null, foundRelease);
      } else {
        Release.findOne(query)
          .then((release) => {
            waterfallCb(null, release);
          })
          .catch((err) => {
            waterfallCb(err);
          });
      }
    },
    function (foundRelease, waterfallCb) {
      // If not found from previously imported or in DB, create new
      if (foundRelease) {
        waterfallCb(null, foundRelease);
      } else {
        const release = new Release({
          clientId,
        });
        if (data.catNo || overwriteBlanks) { release.catNo = data.catNo; }
        waterfallCb(null, release);
      }
    },
    function (release, waterfallCb) {
      // Set initial values
      if (data.title || overwriteBlanks) { release.title = data.title; }
      if (data.version || overwriteBlanks) { release.version = data.version; }
      if (data.artist || overwriteBlanks) { release.artist = data.artist; }
      if (data.foreignId || overwriteBlanks) { release.foreignId = data.foreignId; }
      if (data.projectId || overwriteBlanks) { release.projectId = data.projectId; }
      if (data.label || overwriteBlanks) { release.label = data.label; }
      if (data.distributionChannel || overwriteBlanks) { release.distributionChannel = data.distributionChannel; }
      if (data.format || overwriteBlanks) { release.format = data.format; }
      if (data.priceCategory || overwriteBlanks) { release.priceCategory = data.priceCategory; }
      if (data.releaseDate || overwriteBlanks) { release.releaseDate = data.releaseDate; }
      if (data.dealerPrice || overwriteBlanks) { release.dealerPrice = data.dealerPrice; }
      if (data.mcpsId || overwriteBlanks) { release.mcpsId = data.mcpsId; }
      if (data.mcpsTvAdvertised || data.mcpsTvAdvertised === false || overwriteBlanks) { release.mcpsTvAdvertised = data.mcpsTvAdvertised; }
      if (data.mechanicalTrackCap || overwriteBlanks) { release.mechanicalTrackCap = data.mechanicalTrackCap; }
      if (data.controlledCompositionClause || data.controlledCompositionClause === false || overwriteBlanks) { release.controlledCompositionClause = data.controlledCompositionClause; }
      if ((data.aliases && data.aliases.length > 0) || overwriteBlanks) { release.aliases = data.aliases; }

      if (data.barcode || overwriteBlanks) {
        if (!Utils.isBarcodeCorrupt(data.barcode)) {
          release.barcode = data.barcode;
        } else {
          return callback(new Error('The barcode has been converted into scientific notation. If you exported into CSV and copied into excel, you will need to update these values.'));
        }
      }

      // Clear rights when release is first found and there are rights to import
      // Or when release is first found, and clear blanks is enabled
      if ((!previouslyImported && data.salesReturnsRightsImport) || (!previouslyImported && overwriteBlanks)) {
        release.salesReturnsRights = [];
        release.costsRights = [];
      }

      if (release.aliases && release.aliases.length !== 0) {
        release.aliases = release.aliases.filter(Boolean);
      }

      const tracksErrors = [];
      let callbackTrack;
      async.parallel([
        function (cb) {
          if (data.salesReturnsRightsImport && data.salesReturnsRightsImport.length !== 0) {
            async.each(data.salesReturnsRightsImport, (right, callback) => {
              release.mapRights(right.name, right.percentage, 'salesReturnsRights', callback);
            }, (err) => {
              cb(err);
            });
          } else {
            cb();
          }
        },
        function (cb) {
          if (data.costsRightsImport && data.costsRightsImport.length !== 0) {
            async.each(data.costsRightsImport, (right, callback) => {
              release.mapRights(right.name, right.percentage, 'costsRights', callback);
            }, (err) => {
              cb(err);
            });
          } else {
            cb();
          }
        },
        function (cb) {
          if ((data.catalogueGroups && data.catalogueGroups.length !== 0) || overwriteBlanks) {
            release.catalogueGroups = [];
            if (client && data.catalogueGroups && data.catalogueGroups.length > 0) {
              data.catalogueGroups.forEach((catGroup) => {
                if (typeof catGroup === 'string') { catGroup = catGroup.trim(); }
                if (client.catalogueGroups.indexOf(catGroup) !== -1) { release.catalogueGroups.push(catGroup); }
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
          if (releaseSpecificRights) {
            async.each(releaseSpecificRights, (releaseSpecificRight, eachCb) => {
              if (releaseSpecificRight.isrc && (String(releaseSpecificRight.isrc) === String(data.track_isrc) || String(releaseSpecificRight.isrc) === data._id?.toString())) {
                if ((releaseSpecificRight.contract && (releaseSpecificRight.contractPercentage !== 0 && !releaseSpecificRight.contractPercentage))
                || ((releaseSpecificRight.contractPercentage || releaseSpecificRight.contractPercentage === 0) && !releaseSpecificRight.contract)) {
                  eachCb(new Error('A Contract needs to be linked to a Percentage when a Release Specific Right is assigned'));
                } else {
                  eachCb();
                }
              } else {
                eachCb();
              }
            }, (err) => {
              if (err) {
                return cb(err);
              }
              data.importingFromRelease = true;
              // Checks if releaseRights from template are related to any tracks within the first tab.
              const relatedReleaseRights = releaseSpecificRights.filter((releaseSpecificRight) => releaseSpecificRight.isrc === data.track_isrc);
              if (data.track_title) {
                Track.importTrack(data, [], relatedReleaseRights, clientId, client, importedTracks, overwriteBlanks, (err, importedTrack) => {
                  if (err) {
                    cb(err);
                  } else {
                    callbackTrack = importedTrack;
                    cb();
                  }
                });
              } else {
                cb();
              }
            });
          }
        },
        function (cb) {
          release.addMechanicals(mechanicals, overwriteBlanks, cb);
        },
      ], (err) => {
        waterfallCb(err, release, tracksErrors, callbackTrack);
      });
    },
    function (release, tracksErrors, callbackTrack, waterfallCb) {
      release.checkMultipleContracts({ salesReturnsRightsContractName: data.salesReturnsRightsContractName, costsRightsContractName: data.costsRightsContractName }, (err) => {
        waterfallCb(err, release, tracksErrors, callbackTrack);
      });
    },
    function (release, tracksErrors, callbackTrack, waterfallCb) {
      // Unique Track IDs
      release.trackIds = release.trackIds.filter((value, index, self) => self.indexOf(value) === index);
      release.validate()
        .then(() => {
          waterfallCb(null, release, tracksErrors, callbackTrack);
        })
        .catch((err) => {
          waterfallCb(err);
        });
    },
  ], callback);
};

/**
  * Imports Releases from Excel Separated Template (v2).
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Release.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {string} importTemplateVersion - The import template version.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
releaseSchema.statics.importFromExcelNew = function (file, curveUser, overwriteBlanks, importTemplateVersion, callback) {
  const Client = require('./client');
  const ImportXlsx = require('../libs/importXlsx');
  const releaseData = {};
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client.dateFormat.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        const { paymentTier } = client;

        const releaseImportConfig = paymentTier === 'Lite' ? config.importTemplates.versions.lite.release : config.importTemplates.versions[importTemplateVersion].release;
        async.parallel([
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, releaseImportConfig.releases.columns, releaseImportConfig.releases.tab, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                releaseData.releases = [];
                cb(err);
              } else {
                releaseData.releases = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, releaseImportConfig.contracts.columns, releaseImportConfig.contracts.tab, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                releaseData.contracts = [];
                cb(err);
              } else {
                releaseData.contracts = data;
                cb();
              }
            });
          },
          function (cb) {
            ImportXlsx.getDataByTemplate(file.path, releaseImportConfig.tracks.columns, releaseImportConfig.tracks.tab, 2, dateFormat, (err, data) => {
              if (err) {
                logger.error(err);
                releaseData.tracks = [];
                cb(err);
              } else {
                releaseData.tracks = data;
                cb();
              }
            });
          },
          function (cb) {
            if (paymentTier === 'Lite') {
              cb();
            } else {
              ImportXlsx.getDataByTemplate(file.path, releaseImportConfig.mechanicals.columns, releaseImportConfig.mechanicals.tab, 2, dateFormat, (err, data) => {
                if (err) {
                  logger.error(err);
                  releaseData.mechanicals = [];
                  cb(err);
                } else {
                  releaseData.mechanicals = data;
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
                  subject: 'Your Release Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Release Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            Release.importReleasesNew(releaseData, curveUser.clientId, client, overwriteBlanks, (errors, count, importedReleases, importedTracks) => {
              if (errors && errors.length > 0) {
                logger.error(errors);
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Release Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Release Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
                    callback(err);
                  });
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                async.series([
                  function (paraCb) {
                    async.eachSeries(Object.keys(importedReleases), (catNo, catNoCb) => {
                      async.eachSeries(importedReleases[catNo], (importedRelease, importCb) => {
                        importedRelease.createdBy = curveUser.id;
                        importedRelease.lastModifiedBy = curveUser.id;
                        // Required for updated mechanical licenses to save as they're an object
                        importedRelease.markModified('mechanicalLicenses');
                        importedRelease.save()
                          .then(() => {
                            logger.info(`Saved ${Object.keys(importedReleases).indexOf(catNo)} of ${Object.keys(importedReleases).length}`);
                            importCb();
                          })
                          .catch((err) => {
                            partialImportErrors.push(`Release ${importedRelease.catNo} did not save - ${err.message || err}`);
                            importCb();
                          });
                      }, catNoCb);
                    }, (err) => {
                      if (err) { logger.error(err); }
                      paraCb();
                    });
                  },
                  function (paraCb) {
                    async.eachSeries(Object.keys(importedTracks), (isrc, importCb) => {
                      const importedTrack = importedTracks[isrc];
                      importedTrack.createdBy = curveUser.id;
                      importedTrack.lastModifiedBy = curveUser.id;
                      importedTrack.save()
                        .then(() => {
                          importCb();
                        })
                        .catch((err) => {
                          partialImportErrors.push(`Track ${importedTrack.isrc} did not save - ${err.message || err}`);
                          importCb();
                        });
                    }, (err) => {
                      if (err) { logger.error(err); }
                      paraCb();
                    });
                  },
                ], () => {
                  if (partialImportErrors.length > 0) {
                    logger.error(partialImportErrors);
                    // Send error email
                    Client.findById(curveUser.clientId)
                      .then((client) => {
                        const generateOptions = {
                          identifier: 'partialImportError',
                          curveUser,
                          client,
                          subject: 'Your Release Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };
                        Notification.generate(
                          'Your Release Import Was Partially Successful',
                          `${partialImportErrors.length} errors in file ${file.originalname}`,
                          null,
                          curveUser,
                          generateOptions,
                          (notificationErr, result) => {
                            if (callback) { callback(notificationErr, result); }
                          },
                        );
                      })
                      .catch((err) => {
                        logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
                        callback(err);
                      });
                  } else {
                    // Send success notification
                    Client.findById(curveUser.clientId)
                      .then((client) => {
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Release Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Release Import Has Completed', `${count} Releases imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      })
                      .catch((err) => {
                        logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
                        callback(err);
                      });
                  }
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Release Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Release Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in importFromExcelNew with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports an array of Releases (New Version).
  *
  * Calls callback(errors, count, importedReleases, importedTracks) with an array of [errors] if they occur, the [count] of Releases imported, an object containing the [importedReleases] and an object containing the [importedTracks].
  *
  * @method
  * @param {object} importData - Import data object.
  * @param {object[]} importData.releases - Releases to import.
  * @param {object[]} importData.tracks - Tracks data.
  * @param {object[]} importData.contracts - Contracts data.
  * @param {object[]} importData.mechanicals - Mechanicals data.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {object} client - Client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object, object)} callback - The callback that handles the response.
  */
releaseSchema.statics.importReleasesNew = function (importData, clientId, client, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(importData.releases) !== '[object Array]') {
    callback('Release : Data must be an Array', null);
  } else if (!clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedReleases = {};
    const importedTracks = {};
    let errors = [];
    const { releases } = importData;

    async.eachSeries(releases, (release, cb) => {
      const index = releases.indexOf(release);
      logger.info(`${index + 1} of ${releases.length}`);

      if (isObjectPopulated(release)) {
        Release.importReleaseNew(release, importData, clientId, client, importedReleases, importedTracks, overwriteBlanks, (err, importedRelease, tracksErrors, importedReleaseTracks) => {
          if (err && err.message && err.message.includes('Mechanical')) {
            errors.push(err.message);
          } else if (err) {
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (tracksErrors) { errors = errors.concat(tracksErrors); }

          // Track level data
          if (importedReleaseTracks && importedReleaseTracks.length !== 0) {
            // Loop through imported releases
            importedReleaseTracks.forEach((importedTrack) => {
              if (importedTrack) {
                // Replace track on imported tracks
                importedTracks[importedTrack._id.toString()] = importedTrack;
              }

              // Add track to release - this needs to be the one from the array, which is going to be saved
              if (importedTrack && importedTrack._id && importedTracks[importedTrack._id.toString()] && importedTracks[importedTrack._id.toString()]._id) {
                importedRelease.trackIds.push(importedTracks[importedTrack._id.toString()]._id.toString());
              }
            });
          }

          if (importedRelease) {
            let isAlreadyImported = false;
            if ((importedRelease.barcode && importedRelease.barcode !== '') || (importedRelease.catNo && importedRelease.catNo !== '')) {
              importedReleases[importedRelease.catNo] = importedReleases[importedRelease.catNo] || [];

              // Loop through imported releases
              importedReleases[importedRelease.catNo].forEach((storedRelease, index) => {
                // Check if release matches imported one
                // eslint-disable-next-line max-len
                if (storedRelease && importedRelease.distributionChannel === storedRelease.distributionChannel && ((importedRelease._id && importedRelease._id === storedRelease._id) || (importedRelease.barcode && importedRelease.barcode !== '' && importedRelease.barcode === storedRelease.barcode) || (importedRelease.catNo && importedRelease.catNo !== '' && importedRelease.catNo === storedRelease.catNo))) {
                  // Replace release in array
                  isAlreadyImported = true;
                  importedReleases[importedRelease.catNo][index] = importedRelease;
                }
              });
            }

            if (!isAlreadyImported) {
              count += 1;
              // Add to array if not already imported
              importedReleases[importedRelease.catNo] = importedReleases[importedRelease.catNo] || [];
              importedReleases[importedRelease.catNo].push(importedRelease);
            }
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err, null, null);
      } else {
        // Unique errors
        errors = errors.filter((value, index, self) => self.indexOf(value) === index);
        callback(errors, count, importedReleases, importedTracks);
      }
    });
  }
};

/**
  * Imports a single Release (New Version).
  *
  * Calls callback(error, importedRelease, tracksErrors, importedTracks) with an [error] if an errror occurs, the [importedRelease] object, an array of [tracksErrors] if they occur and the [newImportedTracks].
  *
  * @method
  * @param {object} data - The Release to import.
  * @param {object} importData - Import data object.
  * @param {object[]} importData.releases - Releases to import.
  * @param {object[]} importData.tracks - Tracks data.
  * @param {object[]} importData.contracts - Contracts data.
  * @param {object[]} importData.mechanicals - Mechanicals data.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {object} client - Client importing the Releases.
  * @param {object} importedReleases - An object of imported Releases.
  * @param {object} importedTracks - An object of imported Tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object[])} callback - The callback that handles the response.
  */
releaseSchema.statics.importReleaseNew = function (data, importData, clientId, client, importedReleases, importedTracks, overwriteBlanks, callback) {
  let query = null;
  if (!data) {
    return callback(new Error("Data doesn't match template"), null);
  }
  if (!data.catNo && !data.barcode && !data.title) {
    // No data on line, so skip
    return callback();
  }
  if (ObjectId.isValid(data._id)) {
    query = { _id: new ObjectId(data._id), clientId };
  } else if (data.catNo) {
    query = { clientId, catNo: data.catNo };
    if (data.distributionChannel && data.distributionChannel !== '') {
      query.distributionChannel = data.distributionChannel;
    } else {
      query.$or = [{ distributionChannel: null }, { distributionChannel: '' }];
    }
  } else {
    return callback(new Error('Cat No must be passed'), null);
  }

  // Check that the distribution channel matches the client's list
  if (data.distributionChannel && !client.distributionChannels.includes(data.distributionChannel)) {
    return callback(new Error('Distribution Channel doesn\'t match list'));
  }

  // Check that the format matches the client's list
  if (data.format && !client.configurations.includes(data.format)) {
    return callback(new Error('Format doesn\'t match list'));
  }
  // Check that the cat group matches the client's list
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

  let previouslyImported = false;

  async.waterfall([
    function (waterfallCb) {
      // Check if release exists in previously imported
      const previouslyImportedRelease = importedReleases[data.catNo] || importedReleases[`0${String(data.catNo)}`];
      if (previouslyImportedRelease) {
        let foundRelease;
        previouslyImportedRelease.forEach((storedRelease) => {
          // eslint-disable-next-line max-len
          if (storedRelease && data.distributionChannel === storedRelease.distributionChannel && ((data._id && data._id === storedRelease._id.toString()) || (data.barcode && data.barcode !== '' && String(data.barcode) === String(storedRelease.barcode)) || (data.catNo && data.catNo !== '' && String(data.catNo) === String(storedRelease.catNo)))) {
            foundRelease = storedRelease;
          }
        });
        if (foundRelease) {
          previouslyImported = true;
        }
        waterfallCb(null, foundRelease);
      } else {
        waterfallCb(null, null);
      }
    },
    function (foundRelease, waterfallCb) {
      // If not found from previously imported, find in DB
      if (foundRelease) {
        waterfallCb(null, foundRelease);
      } else {
        Release.findOne(query)
          .then((release) => {
            waterfallCb(null, release);
          })
          .catch((err) => {
            waterfallCb(err);
          });
      }
    },
    function (foundRelease, waterfallCb) {
      // If not found from previously imported or in DB, create new
      if (foundRelease) {
        waterfallCb(null, foundRelease);
      } else {
        const release = new Release({
          clientId,
        });
        if (data.catNo || overwriteBlanks) { release.catNo = data.catNo; }
        waterfallCb(null, release);
      }
    },
    function (release, waterfallCb) {
      // Set initial values
      if (data.title || overwriteBlanks) { release.title = data.title; }
      if (data.version || overwriteBlanks) { release.version = data.version; }
      if (data.artist || overwriteBlanks) { release.artist = data.artist; }
      if (data.foreignId || overwriteBlanks) { release.foreignId = data.foreignId; }
      if (data.projectId || overwriteBlanks) { release.projectId = data.projectId; }
      if (data.label || overwriteBlanks) { release.label = data.label; }
      if (data.distributionChannel || overwriteBlanks) { release.distributionChannel = data.distributionChannel; }
      if (data.format || overwriteBlanks) { release.format = data.format; }
      if (data.priceCategory || overwriteBlanks) { release.priceCategory = data.priceCategory; }
      if (data.releaseDate || overwriteBlanks) { release.releaseDate = data.releaseDate; }
      if (data.dealerPrice || overwriteBlanks) { release.dealerPrice = data.dealerPrice; }
      if (data.mcpsId || overwriteBlanks) { release.mcpsId = data.mcpsId; }
      if (data.mcpsTvAdvertised || data.mcpsTvAdvertised === false || overwriteBlanks) { release.mcpsTvAdvertised = data.mcpsTvAdvertised; }
      if (data.mechanicalTrackCap || overwriteBlanks) { release.mechanicalTrackCap = data.mechanicalTrackCap; }
      if (data.controlledCompositionClause || data.controlledCompositionClause === false || overwriteBlanks) { release.controlledCompositionClause = data.controlledCompositionClause; }
      if ((data.aliases && data.aliases.length > 0) || overwriteBlanks) { release.aliases = data.aliases; }

      if (data.barcode || overwriteBlanks) {
        if (!Utils.isBarcodeCorrupt(data.barcode)) {
          release.barcode = data.barcode;
        } else {
          return callback(new Error('The barcode has been converted into scientific notation. If you exported into CSV and copied into excel, you will need to update these values.'));
        }
      }

      if (release.aliases && release.aliases.length !== 0) {
        release.aliases = release.aliases.filter(Boolean);
      }

      let tracksErrors = [];
      let newImportedTracks;
      async.parallel([
        function (cb) {
          if ((data.catalogueGroups && data.catalogueGroups.length !== 0) || overwriteBlanks) {
            release.catalogueGroups = [];
            if (client && data.catalogueGroups && data.catalogueGroups.length > 0) {
              data.catalogueGroups.forEach((catGroup) => {
                if (typeof catGroup === 'string') { catGroup = catGroup.trim(); }
                if (client.catalogueGroups.indexOf(catGroup) !== -1) { release.catalogueGroups.push(catGroup); }
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
          if (!previouslyImported) {
            release.addContracts(importData.contracts, overwriteBlanks, cb);
          } else {
            cb();
          }
        },
        function (cb) {
          if (!previouslyImported) {
            release.addTracks(importData.tracks, clientId, overwriteBlanks, (tracks, errors) => {
              newImportedTracks = tracks;
              tracksErrors = errors;
              cb();
            });
          } else {
            cb();
          }
        },
        function (cb) {
          if (!previouslyImported) {
            release.addMechanicals(importData.mechanicals, overwriteBlanks, cb);
          } else {
            cb();
          }
        },
      ], (err) => {
        waterfallCb(err, release, tracksErrors, newImportedTracks);
      });
    },
    function (release, tracksErrors, newImportedTracks, waterfallCb) {
      release.checkMultipleContracts({}, (err) => {
        waterfallCb(err, release, tracksErrors, newImportedTracks);
      });
    },
    function (release, tracksErrors, newImportedTracks, waterfallCb) {
      // Unique Track IDs
      release.trackIds = release.trackIds.filter((value, index, self) => self.indexOf(value) === index);
      release.validate()
        .then(() => {
          waterfallCb(null, release, tracksErrors, newImportedTracks);
        })
        .catch((err) => {
          waterfallCb(err);
        });
    },
  ], callback);
};

/**
  * Adds aliases to a Release.
  *
  * Calls callback(errors, count) with an array of [errors] if any occur and the [count] of aliases added.
  *
  * @method
  * @param {object[]} data - An array of  aliases to import.
  * @param {string} clientId - ID of the client importing the aliases.
  * @param {function(string[], number)} callback - The callback that handles the response.
  */
releaseSchema.statics.importAliases = function (data, curveUser, callback) {
  const { clientId, id } = curveUser;
  let count = 0;
  const errors = [];
  async.eachSeries(data, (line, cb) => {
    async.waterfall([
      function (waterfallCb) {
        // Find by Cat No
        Release.findOne({ clientId, catNo: line.identifier })
          .then((release) => {
            waterfallCb(null, release);
          })
          .catch((err) => {
            waterfallCb(err);
          });
      },
      function (release, waterfallCb) {
        // If no release, find by barcode
        if (!release) {
          Release.findOne({ clientId, barcode: line.identifier })
            .then((release) => {
              waterfallCb(null, release);
            })
            .catch((err) => {
              waterfallCb(err);
            });
        } else {
          waterfallCb(null, release);
        }
      },
      function (release, waterfallCb) {
        if (release && line.alias && line.alias !== '') {
          release.aliases.push(line.alias);
          // Only unique aliases
          release.aliases = release.aliases.filter((value, index, self) => self.indexOf(value) === index);
          count += 1;
          release.lastModifiedBy = id;
          release.save()
            .then(() => {
              cb();
            })
            .catch((err) => {
              errors.push(`Line ${data.indexOf(line) + 3}: ${err.message}`);
              cb();
            });
        } else {
          waterfallCb();
        }
      },
    ], cb);
  }, (err) => {
    if (err) {
      callback([err], count);
    } else {
      callback(errors, count);
    }
  });
};
/**
  * Adds mechanicals to a Release.
  *
  * Calls callback(error) with an [error] if any error occurs.
  *
  * @method
  * @param {object[]} mechanicals - An array of  mechanicals to import.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */
releaseSchema.methods.addMechanicals = function (mechanicals, overwriteBlanks, callback) {
  const Contract = require('./contract');
  const release = this;
  let resetMechanicals = false;

  // Reset chain if overwrite blanks selected
  if (overwriteBlanks) {
    release.mechanicalLicenses = {};
    resetMechanicals = true;
  }

  async.eachOfSeries(mechanicals, (mechanical, index, eachCb) => {
    // eslint-disable-next-line max-len
    if (mechanical && mechanical.catNo && String(mechanical.catNo) === String(release.catNo) && ((mechanical.distributionChannel && String(mechanical.distributionChannel) === String(release.distributionChannel)) || (!mechanical.distributionChannel && !release.distributionChannel) || (String(mechanical.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
      if (!resetMechanicals) {
        release.mechanicalLicenses = {};
        // Reset chain on finding first mechanical element
        resetMechanicals = true;
      }
      let composerId; let publisherId; let contractId = null;
      async.waterfall([
        function (waterfallCb) {
          Composer.findOne({ clientId: release.clientId, name: mechanical.composerName })
            .then((composer) => {
              if (composer) {
                composerId = composer._id.toString();
                ({ publisherId } = composer);
                waterfallCb();
              } else if (mechanical.composerName) {
                const composer = new Composer({ clientId: release.clientId, name: mechanical.composerName });
                composer.save()
                  .then(() => {
                    // TODO: Compose would always exist, why do we need this?
                    if (composer) {
                      composerId = composer._id.toString();
                    }
                    waterfallCb();
                  })
                  .catch((err) => {
                    logger.error(`Error saving composer with release.clientId '${release.clientId}': ${err}`);
                    waterfallCb();
                  });
              } else {
                waterfallCb();
              }
            });
        },
        function (waterfallCb) {
          if (mechanical.publisherName && mechanical.publisherName !== '') {
            Publisher.findOne({ clientId: release.clientId, name: mechanical.publisherName })
              .then((publisher) => {
                if (publisher) {
                  publisherId = publisher._id.toString();
                  contractId = publisher.linkedContracts[0];
                  waterfallCb();
                } else if (mechanical.publisherName) {
                  const publisher = new Publisher({ clientId: release.clientId, name: mechanical.publisherName });
                  publisher.save()
                    .then(() => {
                      if (publisher) {
                        publisherId = publisher._id.toString();
                      }
                      waterfallCb();
                    })
                    .catch((err) => {
                      logger.error(`Error saving publisher with release.clientId '${release.clientId}': ${err}`);
                      waterfallCb();
                    });
                } else {
                  waterfallCb();
                }
              })
              .catch((err) => {
                logger.error(`Error finding publisher with release.clientId in addMechanicals'${release.clientId}': ${err}`);
                waterfallCb();
              });
          } else {
            waterfallCb();
          }
        },
        function (waterfallCb) {
          if (mechanical.contractName && mechanical.contractName !== '') {
            Contract.findOne({ clientId: release.clientId, name: mechanical.contractName, contractType: 'Mechanical' })
              .then((contract) => {
                if (contract) {
                  contractId = contract._id.toString();
                } else {
                  contractId = undefined;
                }
                waterfallCb();
              })
              .catch((err) => {
                logger.error(`Error finding contract in addMechanicals with release.clientId '${release.clientId}': ${err}`);
                waterfallCb();
              });
          } else {
            waterfallCb();
          }
        },
        function (waterfallCb) {
          if (mechanical.isrc) {
            Track.findOne({ clientId: release.clientId, isrc: mechanical.isrc })
              .then((track) => {
                waterfallCb(null, track);
              })
              .catch((err) => {
                logger.error(`Error finding track in addMechanicals with release.clientId '${release.clientId}': ${err}`);
                waterfallCb(err);
              });
          } else {
            waterfallCb(new Error(`Mechanicals: Line ${index + 3} - Track ISRC is required`));
          }
        },
      ], (err, track) => {
        if (err) {
          eachCb(err);
        } else if (!contractId && mechanical.contractName && mechanical.contractName !== '') {
          eachCb(new Error(`Mechanicals: Line ${index + 3} - Contract not found with name ${mechanical.contractName}`));
        } else if (!track) {
          eachCb(new Error(`Mechanicals: Line ${index + 3} - Track not found with isrc ${mechanical.isrc}`));
        } else {
          release.mechanicalLicenses[track._id.toString()] = release.mechanicalLicenses[track._id.toString()] || { licenses: [] };
          if (mechanical.reportMechanicals || mechanical.reportMechanicals === false || overwriteBlanks) {
            release.mechanicalLicenses[track._id.toString()].reportMechanicals = mechanical.reportMechanicals || false;
          }
          if (contractId || publisherId || composerId || (mechanical.rate && mechanical.rate !== '') || (mechanical.controlled || mechanical.controlled === false)) {
            release.mechanicalLicenses[track._id.toString()].licenses.push({
              contractId, publisherId, composerId, rate: mechanical.rate, share: mechanical.share, trackCapOverride: mechanical.trackCapOverride, licenseNo: mechanical.licenseNo, controlled: mechanical.controlled || false,
            });
          }
          eachCb(null, release);
        }
      });
    } else {
      eachCb();
    }
  }, callback);
};

/**
  * Adds tracks to a Release.
  *
  * Calls callback(importedReleaseTracks, trackErrors) with an array of [importedReleaseTracks] and an array of [trackErrors] if any occur.
  *
  * @method
  * @param {object} tracks - An array of  tracks to import.
  * @param {string} clientId - ID of the client importing the tracks.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(object[], string[])} callback - The callback that handles the response.
  */
releaseSchema.methods.addTracks = function (tracks, clientId, overwriteBlanks, callback) {
  const release = this;
  const trackImport = [];
  const importedReleaseTracks = [];
  const trackErrors = [];

  if (overwriteBlanks) {
    release.trackIds = [];
  }

  async.waterfall([
    function (waterfallCb) {
      async.eachSeries(tracks, (track, cb) => {
        // Check contract is linked with current release
        // eslint-disable-next-line max-len
        if (track && track.catNo && String(track.catNo) === String(release.catNo) && ((track.distributionChannel && String(track.distributionChannel) === String(release.distributionChannel)) || (!track.distributionChannel && !release.distributionChannel) || (String(track.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
          if (track.isrc) {
            trackImport.push(track);
          }
        }
        cb();
      }, waterfallCb);
    },
    function (waterfallCb) {
      if (trackImport && trackImport.length !== 0) {
        async.eachSeries(trackImport, (track, cb) => {
          if (track.isrc) {
            let filter;
            if (track.isrc.length === 24 && ObjectId.isValid(track.isrc)) {
              filter = { clientId, _id: track.isrc };
            } else {
              filter = { clientId, isrc: track.isrc };
            }

            Track.findOne(filter)
              .then((foundTrack) => {
                importedReleaseTracks.push(foundTrack);
                cb();
              })
              .catch((err) => {
                trackErrors.push(err);
                cb();
              });
          } else {
            cb();
          }
        }, waterfallCb);
      } else {
        waterfallCb();
      }
    },
  ], () => {
    callback(importedReleaseTracks, trackErrors);
  });
};

/**
  * Adds contracts to a Release.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {object} contracts - An array of  contracts to import.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string)} callback - The callback that handles the response.
  */
releaseSchema.methods.addContracts = function (contracts, overwriteBlanks, callback) {
  const release = this;
  const salesReturnsRightsImport = [];
  const costsRightsImport = [];

  if (overwriteBlanks) {
    release.salesReturnsRights = [];
    release.costsRights = [];
  }

  async.waterfall([
    function (waterfallCb) {
      async.each(contracts, (contract, cb) => {
        if ((contract.costsRightsContractName && (contract.costsRightsPercentage !== 0 && !contract.costsRightsPercentage))
        || ((contract.costsRightsPercentage || contract.costsRightsPercentage === 0) && !contract.costsRightsContractName)) {
          return cb(new Error('A Contract needs to be linked to a Percentage when a Cost Right is assigned'));
        }
        if ((contract.salesReturnsRightsContractName && (contract.salesReturnsRightsPercentage !== 0 && !contract.salesReturnsRightsPercentage))
        || ((contract.salesReturnsRightsPercentage || contract.salesReturnsRightsPercentage === 0) && !contract.salesReturnsRightsContractName)) {
          return cb(new Error('A Contract needs to be linked to a Percentage when a Sales/Returns Right is assigned'));
        }
        if (contract && contract.catNo && String(contract.catNo) === String(release.catNo) && ((contract.distributionChannel && String(contract.distributionChannel) === String(release.distributionChannel)) || (!contract.distributionChannel && !release.distributionChannel) || (String(contract.distributionChannel) === '' && String(release.distributionChannel) === ''))) {
          if ((contract.salesReturnsRightsContractName && (contract.salesReturnsRightsPercentage || contract.salesReturnsRightsPercentage === 0))) {
            salesReturnsRightsImport.push({ name: contract.salesReturnsRightsContractName, percentage: contract.salesReturnsRightsPercentage });
          }
          if ((contract.costsRightsContractName && (contract.costsRightsPercentage || contract.costsRightsPercentage === 0))) {
            costsRightsImport.push({ name: contract.costsRightsContractName, percentage: contract.costsRightsPercentage });
          }
        }
        cb();
      }, (err) => {
        waterfallCb(err);
      });
    },
    // Clear sales/costs contracts from the release if any are in the template
    function (waterfallCb) {
      if ((salesReturnsRightsImport && salesReturnsRightsImport.length !== 0) || (costsRightsImport && costsRightsImport.length !== 0)) {
        release.salesReturnsRights = [];
        release.costsRights = [];
      }

      waterfallCb();
    },
    function (waterfallCb) {
      if (salesReturnsRightsImport && salesReturnsRightsImport.length !== 0) {
        async.each(salesReturnsRightsImport, (right, cb) => {
          release.mapRights(right.name, right.percentage, 'salesReturnsRights', cb);
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
          release.mapRights(right.name, right.percentage, 'costsRights', cb);
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
  * Maps contract fields to a Release.
  *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @param {string} contractName - The contract name.
  * @param {number} percentage - Rights percentage value.
  * @param {string} field - Field to map to.
  * @param {function(string)} callback - The callback that handles the response.
  */
releaseSchema.methods.mapRights = function (contractName, percentage, field, callback) {
  const release = this;
  const Contract = require('./contract');
  if (contractName && (percentage || percentage === 0)) {
    Contract.findOne({ clientId: release.clientId, name: contractName, contractType: { $ne: 'Mechanical' } })
      .then((contract) => {
        if (contract) {
          // Have removed resetting value to allow for multiple releases to be assigned to multiple contracts by placing on muliple lines in the sheet
          // Add value
          release[field].push({ contractId: contract._id, percentage });
          callback();
        } else {
          callback(new Error(`Could not find contract with the name ${contractName}`));
        }
      })
      .catch((err) => {
        logger.error(`Error finding contract in mapRights with release.clientId '${release.clientId}': ${err}`);
        callback(new Error(`Error finding contract with the name ${contractName}`));
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
releaseSchema.methods.updateCopyToCatalogueClients = function (callback) {
  const Client = require('./client');
  const release = this;
  async.waterfall([
    function (cb) {
      Client.find({ 'inheritCatalogueFrom.clientId': release.clientId })
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
          // Check for transferReleases boolean
          if (inheritance && inheritance.transferReleases) {
            if (inheritance.catalogueGroup && inheritance.catalogueGroup !== '') {
              // Test against release catalogue groups
              if (release.catalogueGroups.indexOf(inheritance.catalogueGroup) !== -1) {
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
        async.eachSeries(clients, (clientToCopyTo, clientCb) => {
          release.updateCopyToCatalogueByClient(clientToCopyTo, clientCb);
        }, cb);
      } else {
        cb();
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
releaseSchema.methods.updateCopyToCatalogueByClient = function (client, callback) {
  const thisRelease = this;
  async.waterfall([
    function (cb) {
      // Find any previously created release
      Release.findOne({ clientId: client._id.toString(), duplicatedFrom: thisRelease._id.toString() })
        .then((release) => {
          cb(null, release);
        })
        .catch((err) => {
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
      release.copyValues(thisRelease, client._id, () => {
        cb(null, release);
      });
    },
    function (release, cb) {
      release.save()
        .then(() => {
          cb(null, release);
        })
        .catch((err) => {
          thisRelease.validationErrors.push(`Failed syncing to ${client.name}: ${err.message}`);
          Release.updateOne({ _id: thisRelease._id }, { $set: { validationErrors: thisRelease.validationErrors } })
            .then(() => {
              cb(null, release);
            })
            .catch(() => {
              cb(null, release);
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
  * @param {object} releaseToCopy - The ID of the client to copy data to.
  * @param {string} clientId - The ID of the client to copy data to.
  * @param {function(string)} callback - The callback that handles the response.
  */
releaseSchema.methods.copyValues = function (releaseToCopy, clientId, callback) {
  const release = this;
  this.clientId = clientId;
  this.title = releaseToCopy.title;
  this.version = releaseToCopy.version;
  this.artist = releaseToCopy.artist;
  this.catNo = releaseToCopy.catNo;
  this.barcode = releaseToCopy.barcode;
  this.label = releaseToCopy.label;
  this.releaseDate = releaseToCopy.releaseDate;
  this.distributionChannel = releaseToCopy.distributionChannel;
  this.format = releaseToCopy.format;
  this.priceCategory = releaseToCopy.priceCategory;
  this.dealerPrice = releaseToCopy.dealerPrice;
  this.mcpsId = releaseToCopy.mcpsId;
  this.exemptFromMechanicals = releaseToCopy.exemptFromMechanicals;
  const aliasesToAdd = releaseToCopy.aliases.filter((alias) => !this.aliases.includes(alias));
  this.aliases = [...this.aliases, ...aliasesToAdd];
  this.projectId = releaseToCopy.projectId;
  this.duplicatedFrom = releaseToCopy._id;
  // Get tracks by their ISRCs from other account
  const trackIds = releaseToCopy.trackIds.map((trackId) => {
    if (trackId) {
      return new ObjectId(trackId);
    }
  }).filter(Boolean);
  const Track = require('./track');
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
          callback(null, this);
        })
        .catch((err) => {
          logger.error(`Error finding tracks in copyValues with clientId '${clientId}': ${err}`);
          callback(null, this);
        });
    })
    .catch((err) => {
      logger.error(`Error finding tracks in copyValues with clientId '${releaseToCopy.clientId}': ${err}`);
      callback(null, this);
    });
};

/**
 * Returns a list of unique aliases.
 *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @return {array} aliases - An array of the Release's unique aliases.
  */
releaseSchema.methods.uniqueAliases = function () {
  // Force Aliases to Strings
  this.aliases = this.aliases.map((value) => String(value));
  // Filter out any duplicate aliases
  this.aliases = this.aliases.filter((value, index, self) => self.indexOf(value) === index);
};

/**
 * Returns a list of unique catalogue groups.
 *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @return {array} catalogueGroups - An array of the Release's unique catalogue groups.
  */
releaseSchema.methods.uniqueCatGroups = function () {
  this.catalogueGroups = this.catalogueGroups.filter((value, index, self) => self.indexOf(value) === index);
};

/**
 * Returns a list of unique track IDs.
 *
  * Calls callback(error) with an [error] if an error occurs.
  *
  * @method
  * @return {array} trackIds - An array of the Release's track IDs.
  */
releaseSchema.methods.uniqueTrackIds = function () {
  // Convert all to strings
  this.trackIds = this.trackIds.map((id) => { if (id) { return id.toString(); } }).filter(Boolean);
  // Remove any duplicate strings
  this.trackIds = this.trackIds.filter((value, index, self) => self.indexOf(value) === index).filter(Boolean);
};

/**
 * Sums all salesReturnsRights and adds them to release.totalParticipation
 *
 * @method
 */
releaseSchema.methods.calculateTotalParticipation = function () {
  const release = this;
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

/**
 * Converts all dealer prices within Specific Dealer Prices Array (priceCategoryDealerPrices) to numbers
 *
 * @method
 */
releaseSchema.methods.sanitizeSpecificDealerPrice = function () {
  const release = this;

  if (Array.isArray(release.priceCategoryDealerPrices)) {
    release.priceCategoryDealerPrices.forEach((priceCategoryDealerPrice) => {
      priceCategoryDealerPrice.dealerPrice = parseFloat(priceCategoryDealerPrice.dealerPrice);
    });
  }
};
/**
 * Check if a Release has Costs and if they are valid (Contract and Percentage both required). 0 is a valid percentage - confirmed by CM.
 */
releaseSchema.methods.validateCosts = function (callback) {
  const release = this;
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

/**
 * Check if a Release has Sales/Returns rate(s) and if they are valid (Contract and Percentage both required). 0 is a valid percentage - confirmed by CM.
 */
releaseSchema.methods.validateSalesReturns = function (callback) {
  const release = this;
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

/**
 * Checks if a release has more than one instance of the same contract attached to it.
 *
  * Calls callback(error) with an [error] if multiple instances of the same contract are attached to the release.
  *
  * @method
  * @param {function(string)} callback - The callback that handles the response.
  */
releaseSchema.methods.checkMultipleContracts = function (checks, callback) {
  // Test both sales and costs rights if available in import(old)
  if (Object.keys(checks).length !== 0) {
    if (checks.salesReturnsRightsContractName) {
      if (runCheckOnArray(this.salesReturnsRights)) {
        // Return error if one has more than 1 of the same contract
        return callback(new Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
      }
    }
    if (checks.costsRightsContractName) {
      if (runCheckOnArray(this.costsRights)) {
        // Return error if one has more than 1 of the same contract
        return callback(new Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
      }
    }
    if (runCheckOnMechanicalLicenses(this.mechanicalLicenses)) {
      // Return error if one has more than 1 of the same contract
      return callback(new Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
    }
    return callback();
  }
  // if we dont define what to test, test all.
  if (runCheckOnArray(this.salesReturnsRights) || runCheckOnArray(this.costsRights) || runCheckOnMechanicalLicenses(this.mechanicalLicenses)) {
    // Return error if either one has more than 1 of the same contract
    return callback(new Error('A release can only have one instance of a contract attached to it. Please ensure a contract is only included once within sales, costs and mechanical licenses.'));
  }
  return callback();

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

/**
 * Calculates the Release's mechanical rate.
 *
 * Sets the calculated mechanical rate to release.mechanicalBasisPercentage
 *
 * @method
 */
releaseSchema.methods.calculateMechanicalRate = function () {
  const release = this;
  if (release.mechanicalTrackCap && release.mechanicalTrackCap !== '' && release.trackIds && release.trackIds.length > 0 && release.mechanicalTrackCap < release.trackIds.length) {
    release.mechanicalBasisPercentage = parseFloat(release.mechanicalTrackCap / (release.trackIds.length * 100)).toFixed(5);
  } else {
    release.mechanicalBasisPercentage = 100;
  }
};

/**
 * Returns the IDs of the mechanical contracts associated to the Release.
 *
 * Sets the mechanical contract IDs to release.mechanicalContractIds
 * Sets the mechanical composer IDs to release.mechanicalComposerIds
 * Sets the mechanical publisher IDs to release.mechanicalPublisherIds
 *
 * @method
 */
releaseSchema.methods.setMechanicalIds = function () {
  const release = this;
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
          if (license.contractId && release.mechanicalContractIds.indexOf(license.contractId.toString()) === -1) {
            // Add to array
            release.mechanicalContractIds.push(license.contractId.toString());
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

/**
 * Returns a breakdown of the mechanical contracts associated to the Release.
 *
 * Sets the result of this breakdown to release.mechanicalBreakdown
 *
 * @method
 */
releaseSchema.methods.setMechanicalBreakdown = function (callback) {
  const release = this;
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
        logger.error(`Error finding tracks in setMechanicalBreakdown with clientId '${release.clientId}': ${err}`);
        callback();
      });
  } else {
    callback();
  }
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
}

/**
 * Validates the Release and reports any errors via 'validationErrors'.
 *
 * Sets the state of the model via 'valid'
 *
 * @method
 */
releaseSchema.methods.checkValidationErrors = function (callback) {
  const release = this;
  const Client = require('./client');
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
  Client.findById(release.clientId, 'clientType')
    .then((client) => {
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
      // Check costs is included and has a contract
      // Commented out as part of CUR-1091 UAT Additional Requests - Hotfix
      /* if (!release?.costsRights?.length > 0) {
        release.validationErrors.push('At least one Contract needs to be assigned in Costs Rights');
      } else {
        let costsRightContractIdFound = true;
        release?.costsRights?.forEach((costsRight) => {
          if (!costsRight.contractId) {
            costsRightContractIdFound = false;
          }
        });
        if (!costsRightContractIdFound) {
          release.validationErrors.push('At least one Contract needs to be assigned in Costs Rights');
        }
      } */
      release.valid = release.validationErrors.length === 0;
      callback();
    }).catch((err) => {
      release.valid = release.validationErrors.length === 0;
      callback();
    });
};

function validateMechanicalLicenseValues(release) {
  if (!release.mechanicalLicenses || !Object.keys(release.mechanicalLicenses).length) { return true; }

  let count = 0;
  for (const mechanicalLicense in release.mechanicalLicenses) {
    if (release.mechanicalLicenses[mechanicalLicense] && release.mechanicalLicenses[mechanicalLicense].licenses?.length) {
      const obj = release.mechanicalLicenses[mechanicalLicense];

      const invalidValues = obj.licenses.filter((license) => Utils.validateMechanicalLicense(license));
      count += invalidValues.length;
    }
  }

  return count === 0;
}

releaseSchema.pre('save', function (next) {
  const asyncArray = [];
  const release = this;
  release.checkValidationErrors(() => {
    release.sanitizeSpecificDealerPrice();
    release.uniqueAliases();
    release.uniqueCatGroups();
    release.uniqueTrackIds();
    release.calculateTotalParticipation();
    Utils.clearBlankStrings(release, ['salesReturnsRights', 'costsRights']);
    release.calculateMechanicalRate();
    release.setMechanicalIds();
    release.mechanicalLicenseValidation();

    if (!validateMechanicalLicenseValues(release)) { return next(new Error('Mechanical License fields: Rates and/or Shares contain invalid numbers')); }

    release.setMechanicalBreakdown(() => {
      // Check validations
      if (release.distributionChannel) {
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: release.catNo,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: release.catNo,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: release.catNo,
        }));
      } else {
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: release.barcode,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: release.catNo,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: release.catNo,
        }));
        asyncArray.push(Release.countDocuments.call(Release, {
          _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: release.catNo,
        }));
      }
      release.aliases.forEach((alias) => {
        if (release.distributionChannel) {
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, aliases: alias,
          }));
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, catNo: alias,
          }));
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: release.distributionChannel, barcode: alias,
          }));
        } else {
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: alias,
          }));
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, catNo: alias,
          }));
          asyncArray.push(Release.countDocuments.call(Release, {
            _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, barcode: alias,
          }));
        }
      });

      Promise.all(asyncArray).then((result) => {
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
        release.checkMultipleContracts({}, (err) => {
          if (err) {
            next(err);
          } else {
            release.validateSalesReturns((err) => {
              if (err) {
                next(err);
              } else {
                release.validateCosts((err) => {
                  next(err);
                });
              }
            });
          }
        });
      }).catch((err) => {
        logger.error(err);
        next(err);
      });
    });
  });
});

// Checks if current trackIds correlate to current mechanialLicenses.
// Removes any licenses which do not exist in trackIds array.
releaseSchema.methods.mechanicalLicenseValidation = function () {
  const release = this;
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

/**
 * Returns a list of Tracks associted to the Release .
 *
 * Calls callback(error, output) with an [error] if an error occurs and the [ouput] array containing the Tracks.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */
releaseSchema.methods.getTracks = function (callback) {
  const release = this;
  const trackIds = release.trackIds.map((id) => { if (id && ObjectId.isValid(id)) { return new ObjectId(id); } }).filter(Boolean);
  Track
    .find({ _id: { $in: trackIds } })
    .select({ title: 1, version: 1, artist: 1, isrc: 1, salesReturnsRights: 1, releaseSpecificSalesReturnsRights: 1 })
    .populate({ path: 'salesReturnsRights.contractId', model: 'Contract', select: 'name' })
    .populate({ path: 'releaseSpecificSalesReturnsRights.contractId', model: 'Contract', select: 'name' })
    .then((tracks) => {
      const output = [];
      tracks.forEach((track) => {
        // Override rights with any release specific rights that match this release.
        track.releaseSpecificSalesReturnsRights.forEach((specificRight) => {
          if (specificRight?.releaseId === release._id.toString()) {
            track.salesReturnsRights.forEach((right) => {
              if (specificRight.contractId?._id?.toString() === right?.contractId?.id?.toString()) {
                right.percentage = specificRight.percentage;
              }
            });
          }
        });

        const index = release.trackIds.indexOf(track._id.toString()) !== -1 ? release.trackIds.indexOf(track._id.toString()) : release.trackIds.indexOf(track._id);
        output[index] = track;
      });
      callback(null, output);
    })
    .catch((err) => {
      callback(err);
    });
};

/**
 * Calls methods to Pro Rata sales and costs from Tracks for each Release.
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @param {object} filter - filter for the Releases to process.
 * @param {object} curveUser - User importing the Release.
 * @param {function(string)} callback - The callback that handles the response.
 */
releaseSchema.statics.proRataContractsFromTracks = function (filter, curveUser, callback) {
  // Processes releases matching the provided filter
  // calls methods to Pro Rata sales and costs from tracks for each release
  // updates each release

  const errors = [];
  let count = 0;

  async.series([
    (cb) => {
      // Get count of releases matching the filter
      Release.countDocuments(filter)
        .then((total) => {
          count = total;
          cb();
        })
        .catch((err) => {
          cb(err);
        });
    },
    (cb) => {
      logger.info(`Releases to Pro Rata: ${count}`);
      // Set bacthes
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      let releaseIndex = 0;

      async.eachSeries(rounds, (round, loopCb) => {
        logger.info(`Release to Pro Rata -  batch ${round + 1}/${rounds.length}`);
        async.waterfall([
          function (wcb) {
            Release.find(filter)
              .limit(limit)
              .skip(round * limit)
              .then((releases) => {
                wcb(null, releases);
              })
              .catch((err) => {
                wcb(err);
              });
          },
          function (releases, wcb) {
            async.eachLimit(releases, 5, (release, ecb) => {
              releaseIndex += 1;
              // call proRataTrackContracts for each release
              logger.info(`Pro Rata From Tracks Release ${releaseIndex}/${count}`);
              release.proRataTrackContracts((err, output) => {
                // handle errors
                if (err) {
                  // add error to errors array
                  errors.push(`Release ${release.catNo} failed to update`);
                }
                // assign output to salesReturnsRights for storage in release document
                release.salesReturnsRights = output;
                // call proRataTrackCostContracts for each release
                release.proRataTrackCostContracts((err, costOutput) => {
                  // handle errors
                  if (err) {
                    // add error to errors array
                    errors.push(`Release ${release.catNo} failed to update`);
                  }
                  // assign output to costsRights for storage in release document
                  release.costsRights = costOutput;
                  // Flush through total partiticipation as this doesn't save
                  release.calculateTotalParticipation();
                  // Do the validation of Release and update the valid status and validationErrors array
                  release.checkValidationErrors(() => {
                    // update the release document
                    Release.updateOne({ _id: release._id }, { $set: { salesReturnsRights: release.salesReturnsRights, costsRights: release.costsRights, totalParticipation: release.totalParticipation, valid: release.valid, validationErrors: release.validationErrors } })
                      .then(() => {
                        ecb();
                      })
                      .catch((err) => {
                        logger.error(`Error updating release in proRataContractsFromTracks with id ${release._id}: ${err}`);
                        errors.push(`Release ${release.catNo} failed to update`);
                        ecb();
                      });
                  });
                });
              });
            }, wcb);
          },
        ], loopCb);
      }, cb);
    },
  ], (err) => {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // handle errors
        if (err || errors.length > 0) {
          logger.error('Errored Inheriting mechanicals');
          logger.error(err || errors);
          // generate options for error notification
          const generateOptions = {
            identifier: 'genericError',
            curveUser,
            client,
            subject: 'Your Pro Rata Contracts Process Has Errored',
            mainText: "We're sorry, but your Pro Rata Contracts Process has errored.<br><br>The issues with the process are:",
            closingText: 'Releases that are not included above have been processed successfully.<br>'
              + 'Any errors raised here should be fixed and then try to process again.',
            error: err ? [err.message] : errors,
          };
          // send error notifcation to user
          Notification.generate(generateOptions.subject, null, null, curveUser, generateOptions);
        } else {
          logger.info(`Done Inheriting mechanicals. Total ${count}`);
          // generate releases count string, plural for more then 1 release
          const countReleases = `${count} release${(count > 1) ? 's' : ''}`;
          // generate options for completion notification
          const generateOptions = {
            identifier: 'genericComplete',
            curveUser,
            client,
            subject: 'Your Pro Rata Contracts Process Has Completed',
            mainText: `Your Pro Rata Contracts process has completed, processing ${countReleases}`,
            count,
          };
            // send notifcation to user
          Notification.generate(generateOptions.subject, `${countReleases} processed`, null, curveUser, generateOptions);
        }
        callback(err);
      })
      .catch((err) => {
        logger.error(`Error finding client in proRataContractsFromTracks with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  });
  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
 * Calls method to inherit Mechanicals from Tracks for each Release
 *
 * Calls callback(error) with an [error] if an error occurs.
 *
 * @method
 * @param {object} filter - filter for the Releases to process.
 * @param {object} curveUser - User importing the Release.
 * @param {function(string)} callback - The callback that handles the response.
 */
releaseSchema.statics.inheritMechanicalsFromTracks = function (filter, curveUser, callback) {
  // Processes releases matching the provided filter
  // calls method to inherit Mechanicals from tracks for each release
  // updates each release
  const errors = [];
  let count = 0;
  async.series([
    (cb) => {
      // Get count of releases matching the filter
      Release.countDocuments(filter)
        .then((total) => {
          count = total;
          cb();
        })
        .catch((err) => {
          cb(err);
        });
    },
    (cb) => {
      logger.info(`Releases to inherit mechanicals: ${count}`);
      // Set bacthes
      const limit = 10000;
      const rounds = listFromNumber(Math.floor(count / limit));
      let releaseIndex = 0;

      async.eachSeries(rounds, (round, loopCb) => {
        logger.info(`Inheriting mechanicals for batch ${round + 1}/${rounds.length}`);
        async.waterfall([
          function (wcb) {
            Release.find(filter)
              .limit(limit)
              .skip(round * limit)
              .then((releases) => {
                wcb(null, releases);
              })
              .catch((err) => {
                wcb(err);
              });
          },
          function (releases, wcb) {
            async.eachLimit(releases, 5, (release, ecb) => {
              releaseIndex += 1;
              // call inheritTrackMechanicals for each release, which modifies the release document directly
              logger.info(`Inherit Mechanicals From Tracks Release ${releaseIndex}/${count}`);
              release.inheritTrackMechanicals((err) => {
                // handle errors
                if (err) {
                  // add error to errors array
                  errors.push(`Release ${release.catNo} failed to update`);
                }
                ecb();
              });
            }, wcb);
          },
        ], loopCb);
      }, cb);
    },
  ], (err) => {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // handle errors
        if (err || errors.length > 0) {
          logger.error('Errored Inheriting mechanicals');
          logger.error(err || errors);
          // generate options for error notification
          const generateOptions = {
            identifier: 'genericError',
            curveUser,
            client,
            subject: 'Your Inherit Mechanicals Process Has Errored',
            mainText: "We're sorry, but your Inherit Mechanicals Process has errored.<br><br>The issues with the process are:",
            closingText: 'Releases that are not included above have been processed successfully.<br>'
              + 'Any errors raised here should be fixed and then try to process again.',
            error: err ? [err.message] : errors,
          };
          // send error notifcation to user
          Notification.generate(generateOptions.subject, null, null, curveUser, generateOptions);
        } else {
          logger.info(`Done Inheriting mechanicals. Total ${count}`);
          // generate releases count string, plural for more then 1 release
          const countReleases = `${count} release${(count > 1) ? 's' : ''}`;
          // generate options for completion notification
          const generateOptions = {
            identifier: 'genericComplete',
            curveUser,
            client,
            subject: 'Your Inherit Mechanicals Process Has Completed',
            mainText: `Your Inherit Mechanicals process has completed, processing ${countReleases}`,
            count,
          };
          // send notifcation to user
          Notification.generate(generateOptions.subject, `${countReleases} processed`, null, curveUser, generateOptions);
        }
        callback(err);
      })
      .catch((err) => {
        logger.error(`Error finding client in inheritMechanicalsFromTracks with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

/**
 * Returns Pro Rata sales from Tracks for a single Release.
 *
 * Calls callback(error, output) with an [error] if an error occurs and the [output] containing pro rata sales results.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */
releaseSchema.methods.proRataTrackContracts = function (callback) {
  const release = this;
  const trackIds = release.trackIds.map((id) => { try { return new ObjectId(id); } catch (e) { return null; } }).filter(Boolean);
  Track.find({ _id: { $in: trackIds } }, { salesReturnsRights: 1, releaseSpecificSalesReturnsRights: 1 })
    .then((tracks) => {
      // Only run if tracks are present on the release
      if (tracks && tracks.length > 0) {
        // Sum contracts by ID
        const contracts = {};
        let total = 0;
        tracks.forEach((track) => {
          total += 100;
          // Get Sales Returns
          track.salesReturnsRights.forEach((contractRow) => {
            // Check if the contract is in the specific sales returns rights first
            let useReleaseSpecificRights = false;
            track.releaseSpecificSalesReturnsRights.map((specificRight) => {
              if (specificRight.releaseId === release._id.toString()) {
                useReleaseSpecificRights = true;
              }
            });
            // Don't include the contract if it's present in the specific sales returns
            if (!useReleaseSpecificRights) {
              contracts[contractRow.contractId] = contracts[contractRow.contractId] || 0;
              contracts[contractRow.contractId] += Number(contractRow.percentage);
            }
          });
          // Add the contracts in Specific Sales Returns that have been exluded above
          track.releaseSpecificSalesReturnsRights.map((specificRight) => {
            if (specificRight.releaseId === release._id.toString()) {
              contracts[specificRight.contractId] = contracts[specificRight.contractId] || 0;
              contracts[specificRight.contractId] += Number(specificRight.percentage);
            }
          });
        });
        // Output as array of objects
        const output = [];
        Object.keys(contracts).forEach((contractId) => {
          const num = (contracts[contractId] / total) * 100;
          // Rounding to 6 decimal places
          const percentage = Math.round(num * 1000000) / 1000000;

          // make sure clientId of "null" is stored as null instead
          if (contractId === 'null') contractId = null;
          output.push({ contractId, percentage });
        });
        callback(null, output);
      } else {
        callback(null, release.salesReturnsRights);
      }
    })
    .catch((err) => {
      callback(err);
    });
};

/**
 * Returns Pro Rata costs from Tracks for a single Release.
 *
 * Calls callback(error, output) with an [error] if an error occurs and the [output] containing pro rata costs results.
 *
 * @method
 * @param {function(string, object[])} callback - The callback that handles the response.
 */
releaseSchema.methods.proRataTrackCostContracts = function (callback) {
  const release = this;
  const trackIds = release.trackIds.map((id) => { try { return new ObjectId(id); } catch (e) { return null; } }).filter(Boolean);
  Track.find({ _id: { $in: trackIds } }, { costsRights: 1 })
    .then((tracks) => {
      // Only run if tracks are present on the release
      if (tracks && tracks.length > 0) {
        // Sum contracts by ID
        const contracts = {};
        let total = 0;
        tracks.forEach((track) => {
          total += 100;
          if (track.costsRights) {
            track.costsRights.forEach((contractRow) => {
              contracts[contractRow.contractId] = contracts[contractRow.contractId] || 0;
              contracts[contractRow.contractId] += Number(contractRow.percentage);
            });
          }
        });
        // Output as array of objects
        const output = [];
        Object.keys(contracts).forEach((contractId) => {
          const num = (contracts[contractId] / total) * 100;
          // Rounding to 2 decimal places
          const percentage = Math.round(num * 100) / 100;
          // make sure clientId of "null" is stored as null instead
          if (contractId === 'null') contractId = null;
          output.push({ contractId, percentage });
        });
        callback(null, output);
      } else {
        callback(null, release.costsRights);
      }
    })
    .catch((err) => {
      callback(err);
    });
};

/**
 *
 * Inherits Mechanicals from Tracks for a single Release
 *
 * Calls callback(error) with an [error] if an error occurs and the updated [release] object.
 *
 * @method
 * @param {function(string, object)} callback - The callback that handles the response.
 */
releaseSchema.methods.inheritTrackMechanicals = function (callback) {
  const release = this;
  const trackIds = release.trackIds.map((id) => { try { return new ObjectId(id); } catch (e) { return null; } }).filter(Boolean);
  Track.find({ _id: { $in: trackIds } }, { mechanicalLicenses: 1, reportMechanicals: 1 })
    .then((tracks) => {
      release.mechanicalLicenses = release.mechanicalLicenses || {};
      tracks.forEach((track) => {
        release.mechanicalLicenses[track._id.toString()] = release.mechanicalLicenses[track._id.toString()] || {};
        release.mechanicalLicenses[track._id.toString()].reportMechanicals = track.reportMechanicals;
        release.mechanicalLicenses[track._id.toString()].licenses = release.mechanicalLicenses[track._id.toString()].licenses || [];

        // Delete any contracts that are on the release but not on the track
        track.mechanicalLicenses.forEach((trackLicense) => {
          release.mechanicalLicenses[track._id.toString()].licenses = release.mechanicalLicenses[track._id.toString()].licenses.filter((releaseLicense) => releaseLicense.contractId === trackLicense.contractId);
        });

        // Add/Update track licenses to the release
        track.mechanicalLicenses.map((trackLicense) => {
          let contractExistsOnRelease = false;
          release.mechanicalLicenses[track._id.toString()].licenses.map((releaseLicense) => {
            if (releaseLicense.contractId === trackLicense.contractId) {
              contractExistsOnRelease = true;
              releaseLicense.composerId = trackLicense.composerId;
              releaseLicense.publisherId = trackLicense.publisherId;
              releaseLicense.rate = trackLicense.rate;
              releaseLicense.share = trackLicense.share;
              releaseLicense.controlled = trackLicense.controlled;
            }
          });
          if (!contractExistsOnRelease) { release.mechanicalLicenses[track._id.toString()].licenses.push(trackLicense); }
        });
      });
      release.markModified('mechanicalLicenses');
      release.save()
        .then(() => {
          callback(null, release);
        })
        .catch((err) => {
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(`Error finding tracks in inheritTrackMechanicals: ${err}`);
      callback(err);
    });
};

/**
  * Shifts the populated contractIds to a new field to keep the original contractId field unmodified.
  *
  * @method
  * @param {object} release - The release to update.
  */
releaseSchema.statics.formatPopulatedRights = async function (release) {
  // Populate fields
  const populatedRelease = await Release.populate(
    release,
    [
      { path: 'salesReturnsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'costsRights.contractId', model: 'Contract', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );
  release = JSON.parse(JSON.stringify(populatedRelease));
  if (release.salesReturnsRights) {
    release.salesReturnsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  if (release.costsRights) {
    release.costsRights.forEach((right) => {
      if (right && right.contractId) {
        right.contract = right.contractId;
        right.contractId = right.contractId._id.toString();
      }
    });
  }

  return release;
};

/**
 * Populates the Composers, Publishers and Contracts on mechanical licenses.
 *
 *
 * @method
 * @param {function()} callback - The callback that handles the response.
 */

releaseSchema.methods.populateMechanicalLicenses = function (callback) {
  const Contract = require('./contract');
  const release = this;
  const trackIds = release.mechanicalLicenses ? Object.keys(release.mechanicalLicenses) : [];
  async.eachLimit(trackIds, 5, (track, cb) => {
    if (release.mechanicalLicenses[track] && release.mechanicalLicenses[track].licenses) {
      async.eachLimit(release.mechanicalLicenses[track].licenses, 5, (license, lcb) => {
        async.parallel([
          (pcb) => {
            if (license && license.publisherId) {
              Publisher.findById(license.publisherId, 'name')
                .then((publisher) => {
                  license.publisher = publisher || {};
                  pcb();
                })
                .catch((err) => {
                  license.publisher = {};
                  pcb();
                });
            } else {
              pcb();
            }
          },
          (pcb) => {
            if (license && license.composerId) {
              Composer.findById(license.composerId, 'name')
                .then((composer) => {
                  license.composer = composer || {};
                  pcb();
                })
                .catch((err) => {
                  license.composer = {};
                  pcb();
                });
            } else {
              pcb();
            }
          },
          (pcb) => {
            if (license && license.contractId) {
              Contract.findById(license.contractId, 'name')
                .then((contract) => {
                  license.contract = contract || {};
                  pcb();
                })
                .catch((err) => {
                  license.contract = {};
                  pcb();
                });
            } else {
              pcb();
            }
          },
        ], lcb);
      }, cb);
    } else {
      cb();
    }
  }, callback);
};

releaseSchema.statics.createReleases = async function (clientId, createdBy, lastModifiedBy, releases) {
  const created = [];
  const failed = [];
  // Loop through releases in series to ensure they are created and validated one by one
  for (const release of releases) {
    const { title, version, artist, catNo, barcode } = release;

    const newRelease = new Release({ title, version, artist, clientId, createdBy, lastModifiedBy, catNo, barcode });

    const savedRelease = await newRelease.save().catch(logger.error);

    if (!savedRelease) {
      failed.push(release.id);
      continue;
    }

    await UnmappedRelease
      .findByIdAndUpdate(release.id, { $set: { releaseId: savedRelease._id.toString(), complete: true } })
      .then(() => {
        created.push(release.id);
      })
      .catch((error) => {
        logger.error(`Error updating unmapped release ${release.id} after creating release ${savedRelease._id}`);
        logger.error(error);
      });
  }

  return { created, failed };
};

releaseSchema.post('save', (err, savedRelease, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

releaseSchema.post('save', function (savedRelease, next) {
  const release = this;
  try {
    release.updateCopyToCatalogueClients((err) => {
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
});

// releaseSchema.pre('remove', function (next) {
//   const release = this;
//   const salesFiles = [];
//   const cbErr = {
//     err: null,
//     data: null,
//   };
//   Client.findById(release.clientId, (err, client) => {
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
//         releaseId: release._id.toString(),
//       };

//       bigQuery.getDistinct(bigQuery.inputTable, column, filter, (err, results) => {
//         if (err) {
//           cbErr.err = err;
//           next(cbErr);
//         } else {
//           logger.debug('BQ results --- here');
//           logger.debug(results);
//           logger.debug(release._id.toString());
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
//       cbErr.err = new Error('Internal error, please try again');
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

const Release = mongoose.model(name, releaseSchema);

module.exports = Release;
