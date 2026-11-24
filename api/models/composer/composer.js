/**
 * @module composer
 */
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, LowerCaseString, Utils, TerritoryHelper, ComposerPreSave, ComposerPostSave } = require('@curveroyaltysystems/curve-shared-logic');
const { Composer: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const config = require('../../config.json');
const modelHistory = require('../../libs/modelHistory');
const Notification = require('../notification');
const Client = require('../client');
const TerritoryGroup = require('../territoryGroup');
const ComposerController = require('../../controllers/composer');

const { ObjectId } = mongoose.Types;

const composerSchema = schema;

composerSchema.plugin(modelHistory, { mongoose, name: 'composerPatches', useArchive: true, removePatches: true });
composerSchema.plugin(mongoosePaginate);

/**
  * Shifts the populated publisherAgreements to a new field to keep the original publisherId fields unmodified.
  *
  * @method
  * @param {object} publisher - The publisher to update.
  */
composerSchema.statics.formatPopulatedRights = async function (composer) {
  // Populate fields
  const populatedComposer = await Composer.populate(
    composer,
    [
      { path: 'publisherAgreements.publisherId', model: 'Publisher', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );
  composer = JSON.parse(JSON.stringify(populatedComposer));
  if (composer.publisherAgreements) {
    composer.publisherAgreements.forEach((agreement) => {
      if (agreement && agreement.publisherId) {
        agreement.publisher = agreement.publisherId;
        agreement.publisherId = agreement.publisherId._id.toString();
      }
    });
  }
  return composer;
};

/**
  * Sends an export of the Composers data by email.
  *
  * @method
  * @param {object} filter - The Composers filter object.
  * @param {object} clientType - The type of the client doing the export.
  * @param {object} curveUser - The User sending the export.
  */
composerSchema.statics.sendExport = function (filter, clientType, curveUser) {
  const Client = require('../client');
  try {
    async.waterfall([
      function (cb) {
        Composer.countDocuments(filter)
          .then((composers) => {
            cb(null, composers);
          })
          .catch((err) => {
            logger.error(`Error finding composer in composer.sendExport with clientId '${curveUser.clientId}': ${err}`);
            cb(err);
          });
      },
      function (count, cb) {
        if (count < 1000) {
          Composer.find(filter).then((composers) => {
            if (clientType !== 'Publisher') {
              Composer.convertMechanicalComposersForXlsx(composers, curveUser.clientId, (err, data, template) => {
                if (err) return cb(err);
                createXlsx.createInTemplate(data, template, cb);
              });
            } else {
              Composer.convertComposersForXlsx(composers, curveUser.clientId, (err, data, template) => {
                if (err) return cb(err);
                createXlsx.createInTemplate(data, template, cb);
              });
            }
          });
        } else {
          ComposerController.createExportCsv(filter, count, curveUser.clientId, clientType, cb);
        }
      },
      function (filePath, cb) {
        Client.findById(curveUser.clientId)
          .then((client) => {
            fileManager.uploadToS3(`exports/${client.name} Composer Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
          })
          .catch((err) => {
            logger.error(`Error finding client in composer.sendExport with clientId '${curveUser.clientId}': ${err}`);
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
              subject: `Your Composers Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Composers Export Ready', `Your Composers Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(`Error finding client in composer.sendExport with clientId '${curveUser.clientId}': ${err}`);
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
              subject: 'Your Composer Export Has Errored',
              error: err.message,
            };
            Notification.generate('Your Composer Export Has Errored', err.message, null, curveUser, generateOptions);
          })
          .catch((err) => {
            logger.error(`Error finding client in composer.sendExport with clientId '${curveUser.clientId}': ${err}`);
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
          subject: 'Your Composer Export Has Errored',
          error: 'Your composer export has errored. Please try again, or contact support',
        };
        Notification.generate('Your Composer Export Has Errored', 'Your composer export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(`Error finding client in composer.sendExport with clientId '${curveUser.clientId}': ${err}`);
      });
  }
};

/**
  * Formats mulitple Composers for the Excel export.
  *
  * Calls callback(err, [convertedComposers, convertedIdentifiers, convertedAgreements], template) with an [err] if an error occurs, an array containing [convertedComposers], [convertedIdentifiers] and[convertedAgreements] and the import template.
  *
  * @method
  * @param {object[]} releases - The Composers to format.
  * @param {function(string, array[], object)} callback - The callback that handles the response.
  */

composerSchema.statics.convertComposersForXlsx = function (composers, clientId, callback) {
  const Contract = require('../contract');
  const Publisher = require('../publisher/publisher');
  try {
    if (composers instanceof Array) {
      const convertedComposers = [];
      const convertedIdentifiers = [];
      const convertedAgreements = [];
      async.each(composers, (composer, cb) => {
        async.parallel([
          function (paraCb) {
            const contractIds = composer.linkedContracts.map((linkedContract) => new ObjectId(linkedContract.contractId));
            Contract.find({ _id: { $in: contractIds } }, { name: 1 })
              .then((contracts) => {
                const contractNames = contracts.map((contract) => {
                  if (contract) { return contract.name; }
                }).filter(Boolean);
                convertedComposers.push(composer.exportData({ contractNames }));
                paraCb();
              })
              .catch((err) => {
                logger.error(`Error finding contracts in composer.convertComposersForXlsx with clientId '${clientId}': ${err}`);
                paraCb(err);
              });
          },
          function (paraCb) {
            async.eachSeries(composer.societies, (society, societyCb) => {
              if (society) { convertedIdentifiers.push([composer.name, society.society, society.identifier]); }
              societyCb();
            }, paraCb);
          },
          function (paraCb) {
            async.eachSeries(composer.publisherAgreements, (publisherAgreement, agreementCb) => {
              Publisher.findOne({ _id: new ObjectId(publisherAgreement.publisherId) })
                .then((publisher) => {
                  if (publisher) { convertedAgreements.push([composer.name, publisher.name, publisherAgreement.agreementType, publisherAgreement.territory, publisherAgreement.society, publisherAgreement.agreementNo]); }
                  agreementCb();
                })
                .catch((err) => {
                  logger.error(`Error finding publisher in composer.convertComposersForXlsx with clientId '${clientId}': ${err}`);
                  agreementCb(err);
                });
            }, paraCb);
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          Exports.getTemplate({ Client, templateName: 'composer', clientId }).then((template) => {
            callback(null, [convertedComposers, convertedIdentifiers, convertedAgreements], template);
          });
        }
      });
    } else {
      callback(new Error('Must be passed an Array of Composers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
  * Formats mulitple mechanical Composers for the Excel export.
  *
  * Calls callback(err, [convertedComposers], template) with an [err] if an error occurs, an array containing [convertedComposers] and the import template.
  *
  * @method
  * @param {object[]} releases - The Composers to format.
  * @param {function(string, array[], object)} callback - The callback that handles the response.
  */

composerSchema.statics.convertMechanicalComposersForXlsx = function (composers, clientId, callback) {
  const Publisher = require('../publisher/publisher');
  try {
    if (composers instanceof Array) {
      const convertedComposers = [];
      async.each(composers, (composer, cb) => {
        async.parallel([
          function (paraCb) {
            Publisher.findOne({ _id: composer.publisherId }, { name: 1 })
              .then((publisher) => {
                const publisherName = publisher ? publisher.name : '';
                convertedComposers.push(composer.exportMechanicalData({ publisherName }));
                paraCb();
              })
              .catch((err) => {
                logger.error(`Error finding publisher in composer.convertMechanicalComposersForXlsx with clientId '${clientId}': ${err}`);
                paraCb(err);
              });
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          Exports.getTemplate({ Client, templateName: 'mechanicalComposer', clientId }).then((template) => {
            callback(null, [convertedComposers], template);
          });
        }
      });
    } else {
      callback(new Error('Must be passed an Array of Composers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

composerSchema.statics.convertComposersForCsv = function (composers, clientId, callback) {
  const Contract = require('../contract');
  const Publisher = require('../publisher/publisher');
  try {
    if (composers instanceof Array) {
      const convertedComposers = [];
      const convertedIdentifiers = [];
      const convertedAgreements = [];
      async.each(composers, (composer, cb) => {
        async.parallel([
          function (paraCb) {
            const contractIds = composer.linkedContracts.map((linkedContract) => new ObjectId(linkedContract.contractId));
            Contract.find({ _id: { $in: contractIds } }, { name: 1 })
              .then((contracts) => {
                const contractNames = contracts.map((contract) => {
                  if (contract) { return contract.name; }
                }).filter(Boolean);
                convertedComposers.push(composer.exportData({ contractNames }));
                paraCb();
              })
              .catch((err) => {
                logger.error(`Error finding contracts in composer.convertComposersForCsv with clientId '${clientId}': ${err}`);
                paraCb(err);
              });
          },
          function (paraCb) {
            async.eachSeries(composer.societies, (society, societyCb) => {
              if (society) { convertedIdentifiers.push([composer.name, society.society, society.identifier]); }
              societyCb();
            }, paraCb);
          },
          function (paraCb) {
            async.eachSeries(composer.publisherAgreements, (publisherAgreement, agreementCb) => {
              Publisher.findOne({ _id: new ObjectId(publisherAgreement.publisherId) })
                .then((publisher) => {
                  if (publisher) { convertedAgreements.push([composer.name, publisher.name, publisherAgreement.agreementType, publisherAgreement.territory, publisherAgreement.society, publisherAgreement.agreementNo]); }
                  agreementCb();
                })
                .catch((err) => {
                  logger.error(`Error finding publisher in composer.convertComposersForCsv with clientId '${clientId}': ${err}`);
                  agreementCb(err);
                });
            }, paraCb);
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, [convertedComposers, convertedIdentifiers, convertedAgreements]);
        }
      });
    } else {
      callback(new Error('Must be passed an Array of Composers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

composerSchema.statics.convertMechanicalComposersForCsv = function (composers, clientId, callback) {
  const Publisher = require('../publisher/publisher');
  try {
    if (composers instanceof Array) {
      const convertedComposers = [];
      async.each(composers, (composer, cb) => {
        async.parallel([
          function (paraCb) {
            Publisher.findOne({ _id: composer.publisherId }, { name: 1 })
              .then((publisher) => {
                const publisherName = publisher ? publisher.name : '';
                convertedComposers.push(composer.exportMechanicalData({ publisherName }));
                paraCb();
              })
              .catch((err) => {
                logger.error(`Error finding publisher in composer.convertMechanicalComposersForCsv with clientId '${clientId}': ${err}`);
                paraCb(err);
              });
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, [convertedComposers]);
        }
      });
    } else {
      callback(new Error('Must be passed an Array of Composers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
 * Returns an array of the Composer data to export.
 *
  * @method
  * @param {object} data - Composer export data.
  * @returns {array} result - The export data
  */

composerSchema.methods.exportData = function (data) {
  const result = [
    this._id.toString(),
    this.name,
    this.foreignId,
    this.partyNo,
    this.interestedPartyId,
    this.firstName,
    this.middleNames,
    this.surname,
    this.cae,
    this.controlled,
    this.notes,
    this.mainPro,
    this.mainProIdentifier,
    this.mechanicalPro,
    this.mechanicalProIdentifier,
    this.performancePro,
    this.performanceProIdentifier,
    this.syncPro,
    this.syncProIdentifier,
    this.territories && this.territories.length >= TerritoryHelper.allTerritories.length ? 'WW' : this.territories.join(';'),
  ];
  if (data.publisherName && data.publisherName !== '') { result.push(data.publisherName); }
  if (data.contractNames && data.contractNames.length > 0) { result.push(data.contractNames.join(';')); }
  return result;
};

/**
 * Returns an array of the mechanical Composer data to export.
 *
  * @method
  * @param {object} data - Composer export data.
  * @returns {array} result - The export data
  */
composerSchema.methods.exportMechanicalData = function (data) {
  const result = [
    this._id.toString(),
    this.name,
    this.firstName,
    this.middleNames,
    this.surname,
    this.cae,
  ];
  if (data.publisherName && data.publisherName !== '') { result.push(data.publisherName); }
  return result;
};

/**
  * Imports Composers from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Composer.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

composerSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('../client');
  const ImportXlsx = require('../../libs/importXlsx');
  try {
    const importData = {};
    async.parallel([
      function (paraCb) {
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.composer, 0, 2, null, (err, data) => {
          importData.composers = data;
          paraCb(err);
        });
      },
      function (paraCb) {
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.composerIdentifiers, 1, 2, null, (err, data) => {
          importData.identifiers = data;
          paraCb(err);
        });
      },
      function (paraCb) {
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publishingAgreements, 2, 2, null, (err, data) => {
          importData.agreements = data;
          paraCb(err);
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
              subject: 'Your Composer Import Has Errored',
              file: file.originalname,
              error: [error],
            };
            Notification.generate('Your Composer Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(`Error finding client in composer.importFromExcel with clientId '${curveUser.clientId}': ${err}`);
            callback(err);
          });
      } else {
        Composer.importComposers(importData.composers, importData.identifiers, importData.agreements, curveUser, overwriteBlanks, (errors, count, importedComposers) => {
          if (errors && errors.length > 0) {
            // Send errors email
            Client.findById(curveUser.clientId, (err, client) => {
              const generateOptions = {
                identifier: 'importError',
                curveUser,
                client,
                subject: 'Your Composer Import Has Errored',
                file: file.originalname,
                error: errors,
              };
              Notification.generate('Your Composer Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                if (callback) { callback(err, result); }
              });
            })
              .catch((err) => {
                logger.error(`Error finding client in composer.importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            const partialImportErrors = [];
            // Didn't error, save.
            async.eachSeries(importedComposers, (importedComposer, importCb) => {
              importedComposer.createdBy = curveUser.id;
              importedComposer.lastModifiedBy = curveUser.id;
              importedComposer.save()
                .then(() => {
                  importCb();
                })
                .catch((err) => {
                  partialImportErrors.push(`Composer ${importedComposer.name} did not save - ${err.message || err}`);
                  importCb();
                });
            }, () => {
              Client.findById(curveUser.clientId)
                .then((client) => {
                  if (partialImportErrors.length > 0) {
                    const generateOptions = {
                      identifier: 'partialImportError',
                      curveUser,
                      client,
                      subject: 'Your Composer Import Was Partially Successful',
                      file: file.originalname,
                      error: partialImportErrors,
                    };

                    Notification.generate(
                      'Your Composer Import Was Partially Successful',
                      `${partialImportErrors.length} errors in file ${file.originalname}`,
                      null,
                      curveUser,
                      generateOptions,
                      (err, result) => {
                        if (callback) { callback(err, result); }
                      },
                    );
                  } else {
                  // Send success email
                    Client.findById(curveUser.clientId)
                      .then((client) => {
                        const generateOptions = {
                          identifier: 'importComplete',
                          curveUser,
                          client,
                          subject: 'Your Composer Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Composer Import Has Completed', `${count} Composers imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      })
                      .catch((err) => {
                        logger.error(`Error finding client in composer.importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                        callback(err);
                      });
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding client in composer.importFromExcel with clientId '${curveUser.clientId}': ${err}`);
                  callback(err);
                });
            });
          }
        });
      }
    });
  } catch (e) {
    if (!curveUser) { return callback(new Error('A user must be passed'), null); }

    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Composer Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Composer Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in composer.importFromExcel with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports a single Composer.
  *
  * Calls callback(error, importedComposer) with an [error] if an errror occurs and the [importedComposer].
  *
  * @method
  * @param {object} data - The Composer to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */

composerSchema.statics.importComposer = function (data, importIdentifiers, importAgreements, curveUser, overwriteBlanks, callback) {
  const Contract = require('../contract');
  const Publisher = require('../publisher/publisher');
  try {
    let query = null;
    const { clientId } = curveUser;
    let fromIdLookup = false;
    if (!data) {
      return callback("Data doesn't match template", null);
    }
    if (ObjectId.isValid(data._id)) {
      fromIdLookup = true;
      query = { _id: new ObjectId(data._id), clientId };
    } else if (data?.cae && removeLeadingZeros(data.cae)) {
      const caeWithoutLeadingZeros = removeLeadingZeros(data.cae);
      query = {
        clientId,
        $or: [{ cae: data.cae },
          { cae: caeWithoutLeadingZeros },
          { caeWithoutLeadingZeros },
        ],
      };
    } else if (data.name) {
      // we now can have multiple composers with the same name so only filter for the one that has no CAE
      query = {
        clientId,
        lowerCaseName: LowerCaseString(data.name),
        $or: [
          { cae: { $eq: null } },
          { cae: { $eq: '00000000000' } },
        ],
      };
    } else if ((!data.name || data.name === '') && (!data.firstName || data.firstName === '') && (!data.cae || data.cae === '')) {
      // No data, so skip
      return callback();
    } else if (!data.name || data.name === '') {
      return callback('Composer requires a name', null);
    } else {
      return callback('Composer requires a name', null);
    }

    let composer = {};
    async.waterfall([
      function (cb) {
        Client.findById(clientId)
          .then((client) => {
            cb(null, client);
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (client, cb) {
        Composer.findOne(query)
          .then((composer) => {
            if (composer) {
              cb(null, client, composer);
            } else {
              cb(null, client, null);
            }
          })
          .catch((err) => {
            logger.error(`Error finding composer in composer.importComposer with clientId '${clientId}': ${err}`);
            cb(null, client, null);
          });
      },
      function (client, foundComposer, cb) {
        if (foundComposer && fromIdLookup) {
          cb(null, client, foundComposer);
        } else if (foundComposer && removeLeadingZeros(foundComposer.cae) !== removeLeadingZeros(data.cae)) {
          cb(null, client, null);
        } else {
          cb(null, client, foundComposer);
        }
      },
      function (client, foundComposer, cb) {
        const updateIPI = client?.features?.updateIPI;

        composer = foundComposer || new Composer();
        composer.clientId = clientId;

        if (data.name) { composer.name = data.name; }
        if (data.firstName || overwriteBlanks) { composer.firstName = data.firstName; }
        if (data.middleNames || overwriteBlanks) { composer.middleNames = data.middleNames; }
        if (data.surname || overwriteBlanks) { composer.surname = data.surname; }
        if (data.cae || overwriteBlanks) { composer.cae = padLeadingZeros(data.cae, 11); }
        if (!composer.cae) { composer.cae = padLeadingZeros(data.cae, 11); }
        if (data.controlled !== null) {
          composer.controlled = data.controlled;
        } else {
          composer.controlled = overwriteBlanks ? false : composer.controlled;
        }
        if (data.notes || overwriteBlanks) { composer.notes = data.notes; }
        if (data.mainPro || overwriteBlanks) { composer.mainPro = data.mainPro; }
        if (data.mainProIdentifier || overwriteBlanks) { composer.mainProIdentifier = data.mainProIdentifier; }
        if (data.mechanicalPro || overwriteBlanks) { composer.mechanicalPro = data.mechanicalPro; }
        if (data.mechanicalProIdentifier || overwriteBlanks) { composer.mechanicalProIdentifier = data.mechanicalProIdentifier; }
        if (data.performancePro || overwriteBlanks) { composer.performancePro = data.performancePro; }
        if (data.performanceProIdentifier || overwriteBlanks) { composer.performanceProIdentifier = data.performanceProIdentifier; }
        if (data.syncPro || overwriteBlanks) { composer.syncPro = data.syncPro; }
        if (data.syncProIdentifier || overwriteBlanks) { composer.syncProIdentifier = data.syncProIdentifier; }
        if (data.foreignId || overwriteBlanks) { composer.foreignId = data.foreignId; }
        if ((curveUser.internal && data.interestedPartyId && updateIPI) || (curveUser.internal && overwriteBlanks && updateIPI)) { composer.interestedPartyId = data.interestedPartyId; }
        cb();
      },
      function (cb) {
        if ((importIdentifiers && importIdentifiers.length !== 0) || overwriteBlanks) {
          composer.societies = [];
          async.eachSeries(importIdentifiers, (identifier, idCb) => {
            if (identifier && identifier.name === composer.name) {
              composer.societies.push({ society: identifier.society, identifier: identifier.identifier });
            }
            idCb();
          }, (err) => {
            if (err) {
              // Return any category errors
              callback(err);
            } else {
              cb();
            }
          });
        } else {
          cb();
        }
      },
      function (cb) {
        if ((importAgreements && importAgreements.length !== 0) || overwriteBlanks) {
          composer.publisherAgreements = [];
          async.eachSeries(importAgreements, (agreement, idCb) => {
            if (agreement && agreement.name === composer.name) {
              Publisher.findOne({ clientId: composer.clientId, name: agreement.publisherName })
                .then((publisher) => {
                  if (publisher) {
                    composer.publisherAgreements.push({
                      publisherId: publisher._id.toString(), agreementType: agreement.agreementType, territory: agreement.territory, society: agreement.society, agreementNo: agreement.agreementNo,
                    });
                    idCb();
                  } else {
                    idCb(new Error(`Publisher not found with name ${agreement.publisherName} on Agreements tab`));
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding publisher in composer.importComposer with clientId '${clientId}': ${err}`);
                  idCb(new Error(`Publisher not found with name ${agreement.publisherName} on Agreements tab`));
                });
            } else {
              idCb();
            }
          }, (err) => {
            if (err) {
              // Return any category errors
              callback(err);
            } else {
              cb();
            }
          });
        } else {
          cb();
        }
      },
      // Handle Composer Territories
      function (cb) {
        if (overwriteBlanks) { composer.territories = []; }

        if (data.territories && Array.isArray(data.territories) && data.territories.length) {
          if (data.territories.length === 1) {
            if (data.territories[0] === 'WW' || data.territories[0] === 'world' || data.territories[0] === 'World') {
              composer.territories = Utils.allTerritories;
              cb();
            } else {
              TerritoryGroup.findOne({ clientId, name: data.territories[0] })
                .then((territoryGroup) => {
                  if (territoryGroup) { composer.territories = territoryGroup.territories; } else { composer.territories = data.territories; }
                  cb();
                })
                .catch((err) => {
                  logger.error(`Error finding territory group in composer.importComposer with clientId '${clientId}': ${err}`);
                  composer.territories = data.territories;
                  cb();
                });
            }
          } else {
            composer.territories = data.territories;
            cb();
          }
        } else {
          cb();
        }
      },
      function (cb) {
        if (!data.publisherName && overwriteBlanks) {
          composer.publisherId = null;
          cb();
        } else if (data.publisherName) {
          Publisher.findOne({ clientId: composer.clientId, name: data.publisherName })
            .then((publisher) => {
              if (publisher) {
                composer.publisherId = publisher._id.toString();
                cb();
              } else {
                cb(new Error(`Publisher not found with name ${data.publisherName}`));
              }
            })
            .catch((err) => {
              logger.error(`Error finding publisher in composer.importComposer with clientId '${clientId}': ${err}`);
              cb(new Error(`Publisher not found with name ${data.publisherName}`));
            });
        } else {
          cb();
        }
      },
      function (cb) {
        if ((data.linkedContracts && data.linkedContracts.length !== 0) || overwriteBlanks) {
          composer.linkedContracts = [];
          async.eachSeries(data.linkedContracts, (contractName, contractCb) => {
            if (contractName || contractName === 0) {
              // When the user sets a number as contractName within the template, this gets imported as a number.
              contractName = (typeof contractName !== 'string') ? String(contractName) : contractName;
              Contract.findOne({ clientId, name: contractName.trim() })
                .then((contract) => {
                  if (contract) { composer.linkedContracts.push({ contractId: contract._id }); }
                  contractCb();
                })
                .catch((err) => {
                  logger.error(`Error finding contract in composer.importComposer with clientId '${clientId}': ${err}`);
                  contractCb();
                });
            } else {
              contractCb();
            }
          }, (err) => {
            if (err) {
              // Return any category errors
              callback(err);
            } else {
              cb();
            }
          });
        } else {
          cb();
        }
      },
    ], () => {
      // Validates payee
      composer.validate()
        .then(() => {
          callback(null, composer);
        })
        .catch((err) => {
          logger.error(`Error validating composer in composer.importComposer with clientId '${clientId}': ${err}`);
          callback(err, composer);
        });
    });
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this composer. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Imports an array of Composers.
  *
  * Calls callback(errors, count, importedComposers) with an array of [errors] if they occur, the [count] of Composers imported and an object containing the [importedComposers].
  *
  * @method
  * @param {object[]} composers - Composers to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */

composerSchema.statics.importComposers = function (composers, importIdentifiers, importAgreements, curveUser, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(composers) !== '[object Array]') {
    callback('Data must be an Array', null);
  } else if (!curveUser.clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedComposers = [];
    const errors = [];
    async.eachOfSeries(composers, (composer, index, cb) => {
      if (isObjectPopulated(composer)) {
        Composer.importComposer(composer, importIdentifiers, importAgreements, curveUser, overwriteBlanks, (err, importedComposer) => {
          if (err) {
            logger.error('Error on :');
            logger.error(composer);
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (importedComposer) {
            count += 1;
            importedComposers.push(importedComposer);
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err, null);
      } else {
        callback(errors, count, importedComposers);
      }
    });
  }
};

/**
  * Imports mechanical Composers from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Composer.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */
composerSchema.statics.importMechanicalFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('../client');
  const ImportXlsx = require('../../libs/importXlsx');
  try {
    const importData = {};
    async.parallel([
      function (paraCb) {
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.composerMechanical, 0, 2, null, (err, data) => {
          importData.composers = data;
          paraCb(err);
        });
      },
    ], (error) => {
      if (error) {
        if (error === 'Template does not match') { error = 'It appears the template does not match. Try downloading and checking our most up to date templates to ensure it matches.'; }
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'importError',
              curveUser,
              client,
              subject: 'Your Composer Import Has Errored',
              file: file.originalname,
              error: [error],
            };
            Notification.generate('Your Composer Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(`Error finding client in composer.importMechanicalFromExcel with clientId '${curveUser.clientId}': ${err}`);
            callback(err);
          });
      } else {
        Composer.importComposers(importData.composers, importData.identifiers, importData.agreements, curveUser, overwriteBlanks, (errors, count, importedComposers) => {
          if (errors && errors.length > 0) {
            // Send errors email
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Composer Import Has Errored',
                  file: file.originalname,
                  error: errors,
                };
                Notification.generate('Your Composer Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(`Error finding client in composer.importMechanicalFromExcel with clientId '${curveUser.clientId}': ${err}`);
                callback(err);
              });
          } else {
            // Didn't error, save.
            const partialImportErrors = [];
            async.eachSeries(importedComposers, (importedComposer, importCb) => {
              importedComposer.createdBy = curveUser.id;
              importedComposer.lastModifiedBy = curveUser.id;
              importedComposer.save()
                .then(() => {
                  importCb();
                })
                .catch((err) => {
                  partialImportErrors.push(`Composer ${importedComposer.name} did not save - ${err.message || err}`);
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
                      subject: 'Your Composer Import Was Partially Successful',
                      file: file.originalname,
                      error: partialImportErrors,
                    };

                    Notification.generate(
                      'Your Composer Import Was Partially Successful',
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
                      subject: 'Your Composer Import Has Completed',
                      file: file.originalname,
                      count,
                    };

                    Notification.generate('Your Composer Import Has Completed', `${count} Composers imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding client in composer.importMechanicalFromExcel with clientId '${curveUser.clientId}': ${err}`);
                  callback(err);
                });
            });
          }
        });
      }
    });
  } catch (e) {
    if (!curveUser) { return callback(new Error('A user must be passed'), null); }

    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Composer Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Composer Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(`Error finding client in composer.importMechanicalFromExcel with clientId '${curveUser.clientId}': ${err}`);
        callback(err);
      });
  }
};

/**
  * Imports a single mechanical Composer.
  *
  * Calls callback(error, importedComposer) with an [error] if an errror occurs and the [importedComposer].
  *
  * @method
  * @param {object} data - The Composer to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */

composerSchema.statics.importMechanicalComposer = function (data, importIdentifiers, importAgreements, clientId, overwriteBlanks, callback) {
  // const Contract = require('./contract');
  const Publisher = require('../publisher/publisher');
  try {
    let query = null;
    if (!data) {
      return callback("Data doesn't match template", null);
    }
    if (ObjectId.isValid(data._id)) {
      query = { _id: new ObjectId(data._id), clientId };
    } else if (data.name) {
      query = { clientId, name: data.name };
    } else if ((!data.name || data.name === '') && (!data.firstName || data.firstName === '') && (!data.cae || data.cae === '')) {
      // No data, so skip
      return callback();
    } else if (!data.name || data.name === '') {
      return callback('Composer requires a name', null);
    } else {
      return callback('Composer requires a name', null);
    }
    Composer.findOne(query)
      .then((composer) => {
        if (!composer) {
          composer = new Composer({
            clientId,
            name: data.name,
            firstName: data.firstName,
            middleNames: data.middleNames,
            surname: data.surname,
          });
        } else {
          composer.name = data.name;
          composer.firstName = data.firstName;
          composer.middleNames = data.middleNames;
          composer.surname = data.surname;
        }
        composer.cae = padLeadingZeros(data?.cae, 11);
        composer.caeWithoutLeadingZeros = removeLeadingZeros(data?.cae);
        async.waterfall([
          function (waterfallCb) {
            if (data.publisherName && data.publisherName !== '') {
              Publisher.findOne({ clientId: composer.clientId, name: data.publisherName })
                .then((publisher) => {
                  if (publisher) {
                    composer.publisherId = publisher._id.toString();
                    waterfallCb();
                  } else {
                    waterfallCb(new Error(`Linked Publisher not found with name ${data.publisherName} on Composer tab`));
                  }
                })
                .catch((err) => {
                  logger.error(`Error finding publisher in composer.importMechanicalComposer with clientId '${clientId}': ${err}`);
                  waterfallCb(new Error(`Linked Publisher not found with name ${data.publisherName} on Composer tab`));
                });
            } else {
              waterfallCb(new Error('Linked Publisher is required and can not be empty'));
            }
          },
          function (waterfallCb) {
            composer.societies = [];
            async.eachSeries(importIdentifiers, (identifier, idCb) => {
              if (identifier && identifier.name === composer.name) {
                composer.societies.push({ territory: identifier.territory, society: identifier.society, identifier: identifier.identifier });
              }
              idCb();
            }, waterfallCb);
          },
          function (waterfallCb) {
            composer.publisherAgreements = [];
            async.eachSeries(importAgreements, (agreement, idCb) => {
              if (agreement && agreement.name === composer.name) {
                Publisher.findOne({ clientId: composer.clientId, name: agreement.publisherName })
                  .then((publisher) => {
                    if (publisher) {
                      composer.publisherAgreements.push({
                        publisherId: publisher._id.toString(), agreementType: agreement.agreementType, territory: agreement.territory, society: agreement.society, agreementNo: agreement.agreementNo,
                      });
                      idCb();
                    } else {
                      idCb(new Error(`Publisher not found with name ${agreement.publisherName} on Agreements tab`));
                    }
                  })
                  .catch((err) => {
                    logger.error(`Error finding publisher in composer.importMechanicalComposer with clientId '${clientId}': ${err}`);
                    idCb(new Error(`Publisher not found with name ${agreement.publisher} on Agreements tab`));
                  });
              } else {
                idCb();
              }
            }, waterfallCb);
          },
        ], () => {
          composer.validate()
            .then(() => {
              callback(null, composer);
            })
            .catch((err) => {
              logger.error(`Error validating composer in composer.importMechanicalComposer with clientId '${clientId}': ${err}`);
              callback(err, composer);
            });
        });
      })
      .catch((err) => {
        logger.error(`Error finding composer in composer.importMechanicalComposer with clientId '${clientId}': ${err}`);
        callback(err, null);
      });
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this composer. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Imports an array of mechanical Composers.
  *
  * Calls callback(errors, count, importedComposers) with an array of [errors] if they occur, the [count] of Composers imported and an object containing the [importedComposers].
  *
  * @method
  * @param {object[]} composers - Composers to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */

composerSchema.statics.importMechanicalComposers = function (composers, importIdentifiers, importAgreements, clientId, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(composers) !== '[object Array]') {
    callback('Data must be an Array', null);
  } else if (!clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedComposers = [];
    const errors = [];
    async.eachOfSeries(composers, (composer, index, cb) => {
      if (isObjectPopulated(composer)) {
        Composer.importComposer(composer, importIdentifiers, importAgreements, clientId, overwriteBlanks, (err, importedComposer) => {
          if (err) {
            logger.error('Error on :');
            logger.error(composer);
            errors.push(`Line ${index + 3}: ${err}`);
          }
          if (importedComposer) {
            count += 1;
            importedComposers.push(importedComposer);
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err, null);
      } else {
        callback(errors, count, importedComposers);
      }
    });
  }
};

// Important: this must use function syntax, not an arrow function (so it can access the current composer)
composerSchema.pre('save', async function () {
  const Work = require('../work');
  try {
    await ComposerPreSave.preSave({ composer: this, Composer, Work });
  } catch (err) {
    logger.error('Error in Composer pre-save hook:', err);
    throw err;
  }
});

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
      if (message.includes('name: Path `name` is required')) {
        return 'A Name is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

composerSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const Work = require('../work');
  const composer = this;
  let workIds = [];
  Work.find({ clientId: composer.clientId, usedComposerIds: composer._id.toString() })
    .then((works) => {
      if (works.length !== 0) {
        for (let i = 0; i < works.length; i += 1) {
          const element = works[i];
          workIds.push({ name: element.title, link: `works/${element._id}/edit` });
        }

        // Remove any duplicates
        const obj = {};
        for (let i = 0, len = workIds.length; i < len; i += 1) {
          obj[workIds[i].link] = workIds[i];
        }
        workIds = new Array();
        for (const key in obj) {
          workIds.push(obj[key]);
        }

        next(new Error(JSON.stringify(workIds)));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(`Error finding works in composer.pre.remove with clientId '${composer.clientId}': ${err}`);
      next();
    });
});

composerSchema.post('save', (err, savedComposer, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current composer)
composerSchema.post('save', async function () {
  try {
    await ComposerPostSave.postSave({ composer: this, Composer, Client });
  } catch (err) {
    logger.error('Error in Composer post-save hook:', err);
  }
});

function removeLeadingZeros(value) {
  if (value) {
    return typeof value === 'string' ? value.replace(/^0+/, '') : String(value);
  }
  return '';
}

function padLeadingZeros(value, num) {
  if (value) {
    return String(value).padStart(num, '0');
  }
  return ''.padStart(num, '0');
}

function isObjectPopulated(obj) {
  let objectPopulated = false;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] !== '') objectPopulated = true;
    }
  }

  return objectPopulated;
}

const Composer = mongoose.model(name, composerSchema);

module.exports = Composer;
