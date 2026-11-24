/**
 * @module publisher
 */
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, LowerCaseString, Utils, TerritoryHelper, PublisherPreSave, PublisherPostSave } = require('@curveroyaltysystems/curve-shared-logic');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const { Publisher: { name, schema } } = require('@curveroyaltysystems/models');
const config = require('../../config.json');
const modelHistory = require('../../libs/modelHistory');
const Notification = require('../notification');
const Client = require('../client');
const TerritoryGroup = require('../territoryGroup');
const PublisherController = require('../../controllers/publisher');

const { ObjectId } = mongoose.Types;

const publisherSchema = schema;

publisherSchema.plugin(modelHistory, { mongoose, name: 'publisherPatches', useArchive: true, removePatches: true });
publisherSchema.plugin(mongoosePaginate);

/**
  * Shifts the populated publisherAgreements to a new field to keep the original publisherId fields unmodified.
  *
  * @method
  * @param {object} publisher - The publisher to update.
  */
publisherSchema.statics.formatPopulatedRights = async function (publisher) {
  // Populate fields
  const populatedPublisher = await Publisher.populate(
    publisher,
    [
      { path: 'publisherAgreements.publisherId', model: 'Publisher', select: 'name' },
      { path: 'createdBy', select: 'email' },
      { path: 'lastModifiedBy', select: 'email' },
    ],
  );

  publisher = JSON.parse(JSON.stringify(populatedPublisher));
  if (publisher.publisherAgreements) {
    publisher.publisherAgreements.forEach((agreement) => {
      if (agreement && agreement.publisherId) {
        agreement.publisher = agreement.publisherId;
        agreement.publisherId = agreement.publisherId._id.toString();
      }
    });
  }
  return publisher;
};

/**
  * Sends an export of the Publishers data by email.
  *
  * @method
  * @param {object} filter - The Publishers filter object.
  * @param {object} clientType - The type of the client doing the export.
  * @param {object} curveUser - The User sending the export.
  */
publisherSchema.statics.sendExport = function (filter, clientType, curveUser) {
  const Client = require('../client');
  try {
    async.waterfall([
      function (cb) {
        Publisher.find(filter)
          .then((publishers) => {
            cb(null, publishers);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (publishers, cb) {
        if (clientType !== 'Publisher') {
          Publisher.convertMechanicalPublishersForXlsx(publishers, curveUser.clientId, cb);
        } else {
          Publisher.convertPublishersForXlsx(publishers, curveUser.clientId, cb);
        }
      },
      function (data, template, cb) {
        if (data[0].length < 1000) {
          createXlsx.createInTemplate(data, template, cb);
        } else {
          PublisherController.createExportCsv(data, cb);
        }
      },
      function (filePath, cb) {
        Client.findById(curveUser.clientId).then((client) => {
          fileManager.uploadToS3(`exports/${client.name} Publisher Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
        }).catch((err) => {
          logger.error(err);
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
              subject: `Your Publishers Export for ${client.name} is Ready to Download`,
              link,
            };
            Notification.generate('Publishers Export Ready', `Your Publishers Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(err);
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
              subject: 'Your Publisher Export Has Errored',
              error: err.message,
            };
            Notification.generate('Your Publisher Export Has Errored', err.message, null, curveUser, generateOptions);
          })
          .catch((err) => {
            logger.error(err);
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
          subject: 'Your Publisher Export Has Errored',
          error: 'Your Publisher export has errored. Please try again, or contact support',
        };
        Notification.generate('Your Publisher Export Has Errored', 'Your Publisher export has errored. Please try again, or contact support', null, curveUser, generateOptions);
      })
      .catch((err) => {
        logger.error(err);
      });
  }
};

/**
  * Formats multiple Publishers for the Excel export.
  *
  * Calls callback(err, [convertedPublishers, convertedIdentifiers, convertedAgreements], template) with an [err] if an error occurs, an array containing [convertedPublishers], [convertedIdentifiers] and[convertedAgreements] and the import template.
  *
  * @method
  * @param {object[]} publishers - The Publishers to format.
  * @param {function(string, array[], object)} callback - The callback that handles the response.
  */

publisherSchema.statics.convertPublishersForXlsx = function (publishers, clientId, callback) {
  const Contract = require('../contract');
  try {
    if (publishers instanceof Array) {
      const convertedPublishers = [];
      const convertedIdentifiers = [];
      const convertedAgreements = [];
      const convertedAliases = [];
      async.each(publishers, (publisher, cb) => {
        async.parallel([
          function (paraCb) {
            const contractIds = publisher.linkedContracts.map((linkedContract) => new ObjectId(linkedContract.contractId));
            Contract.find({ _id: { $in: contractIds } }, { name: 1 })
              .then((contracts) => {
                const contractNames = contracts.map((contract) => {
                  if (contract) { return contract.name; }
                }).filter(Boolean);
                convertedPublishers.push(publisher.exportData(contractNames));
                paraCb();
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
          function (paraCb) {
            async.eachSeries(publisher.societies, (society, societyCb) => {
              if (society) { convertedIdentifiers.push([publisher.name, society.society, society.identifier, society.publisherName, society.mechanicalPro, society.performancePro, society.syncPro]); }
              societyCb();
            }, paraCb);
          },
          function (paraCb) {
            async.eachSeries(publisher.publisherAgreements, (publisherAgreement, agreementCb) => {
              Publisher.findOne({ _id: new ObjectId(publisherAgreement.publisherId) })
                .then((foundPublisher) => {
                  if (publisher) { convertedAgreements.push([publisher.name, foundPublisher.name, publisherAgreement.agreementType, publisherAgreement.territory, publisherAgreement.society, publisherAgreement.agreementNo]); }
                  agreementCb();
                })
                .catch((err) => {
                  logger.error(err);
                  agreementCb(err);
                });
            }, paraCb);
          },
          function (paraCb) {
            // Export aliases — one row per alias with publisher ID and name
            if (publisher.aliases && publisher.aliases.length > 0) {
              publisher.aliases.forEach((alias) => {
                convertedAliases.push([publisher._id.toString(), publisher.name, alias]);
              });
            }
            paraCb();
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          Exports.getTemplate({ Client, templateName: 'publisher', clientId }).then((template) => {
            // Data (tabs): 0=Publishers, 1=Identifiers, 2=Agreements, 3=Aliases, 4=Reference (empty placeholder)
            callback(null, [convertedPublishers, convertedIdentifiers, convertedAgreements, convertedAliases, []], template);
          });
        }
      });
    } else {
      callback(new Array('Must be passed an Array of Publishers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
  * Formats mulitple mechanical Publishers for the Excel export.
  *
  * Calls callback(err, [convertedPublishers], template) with an [err] if an error occurs, an array containing [convertedPublishers] and the import template.
  *
  * @method
  * @param {object[]} publishers - The Publishers to format.
  * @param {function(string, array[], object)} callback - The callback that handles the response.
  */

publisherSchema.statics.convertMechanicalPublishersForXlsx = function (publishers, clientId, callback) {
  const Contract = require('../contract');
  try {
    if (publishers instanceof Array) {
      const convertedPublishers = [];
      async.each(publishers, (publisher, cb) => {
        async.parallel([
          function (paraCb) {
            const contractIds = publisher.linkedContracts.map((linkedContract) => new ObjectId(linkedContract.contractId));
            Contract.find({ _id: { $in: contractIds } }, { name: 1 })
              .then((contracts) => {
                const contractNames = contracts.map((contract) => {
                  if (contract) { return contract.name; }
                }).filter(Boolean);
                convertedPublishers.push(publisher.exportMechanicalData(contractNames));
                paraCb();
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
        ], cb);
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          Exports.getTemplate({ Client, templateName: 'mechanicalPublisher', clientId }).then((template) => {
            callback(null, [convertedPublishers], template);
          });
        }
      });
    } else {
      callback(new Array('Must be passed an Array of Publishers'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

/**
 * Returns an array of the Publisher data to export.
 *
  * @method
  * @param {object} contractNames - Contract Names to export.
  * @returns {array} result - The export data
  */
publisherSchema.methods.exportData = function (contractNames) {
  const result = [
    this._id.toString(),
    this.name,
    this.cwrName,
    this.foreignId,
    this.partyNo,
    this.interestedPartyId,
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
  if (contractNames && contractNames.length > 0) { result.push(contractNames.join(';')); }
  return result;
};

/**
 * Returns an array of the mechanical Publisher data to export.
 *
  * @method
  * @param {object} contractNames - Contract Names to export.
  * @returns {array} result - The export data
  */

publisherSchema.methods.exportMechanicalData = function (contractNames) {
  const result = [
    this._id.toString(),
    this.name,
    this.foreignId,
    this.cae];
  if (contractNames && contractNames.length > 0) { result.push(contractNames.join(';')); }
  return result;
};

/**
  * Imports Publishers from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Publishers.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

publisherSchema.statics.importFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('../client');
  const ImportXlsx = require('../../libs/importXlsx');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        const importData = {};
        async.parallel([
          function (paraCb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publisher, 0, 2, dateFormat, (err, data) => {
              importData.publishers = data;
              paraCb(err);
            });
          },
          function (paraCb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publishingIdentifiers, 1, 2, dateFormat, (err, data) => {
              importData.identifiers = data;
              paraCb(err);
            });
          },
          function (paraCb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publishingAgreements, 2, 2, dateFormat, (err, data) => {
              importData.agreements = data;
              paraCb(err);
            });
          },
          function (paraCb) {
            // Aliases tab — optional for backwards compatibility with old templates
            // Sheet index 3 for standard template (Publishers=0, Identifiers=1, Agreements=2, Aliases=3, Reference=4)
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publishingAliases, 3, 2, dateFormat, (err, data) => {
              if (err) {
                // Sheet doesn't exist in old templates — not an error, just skip aliases
                logger.info('No Aliases tab found in publisher template, skipping alias import');
                importData.aliases = [];
                paraCb(null);
              } else {
                importData.aliases = data;
                paraCb(null);
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
                  subject: 'Your Publisher Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Publisher Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          } else {
            Publisher.importPublishers(importData.publishers, importData.identifiers, importData.agreements, importData.aliases, curveUser, overwriteBlanks, (errors, count, importedPublishers) => {
              if (errors && errors.length > 0) {
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Publisher Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Publisher Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                async.eachSeries(importedPublishers, (importedPublisher, importCb) => {
                  importedPublisher.createdBy = curveUser.id;
                  importedPublisher.lastModifiedBy = curveUser.id;
                  importedPublisher.save()
                    .then(() => {
                      importCb();
                    })
                    .catch((err) => {
                      partialImportErrors.push(`Publisher ${importedPublisher.name} did not save - ${err.message || err}`);
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
                          subject: 'Your Publisher Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };
                        Notification.generate(
                          'Your Publisher Import Was Partially Successful',
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
                          subject: 'Your Publisher Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Publisher Import Has Completed', `${count} Publishers imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      callback(err);
                    });
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Publisher Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Publisher Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
  * Imports a single Publisher.
  *
  * Calls callback(error, importedPublisher) with an [error] if an errror occurs and the [importedPublisher].
  *
  * @method
  * @param {object} data - The Publisher to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */

publisherSchema.statics.importPublisher = function (data, importIdentifiers, importAgreements, curveUser, overwriteBlanks, callback) {
  const Contract = require('../contract');
  try {
    let query = null;
    const { clientId } = curveUser;
    if (!data) {
      return callback("Data doesn't match template", null);
    }
    if (data._id && data._id !== '') {
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
      query = { clientId, lowerCaseName: LowerCaseString(data.name) };
    } else if (!data.name || data.name === '') {
      return callback();
    } else {
      return callback('Publisher requires a name', null);
    }

    let publisher = {};
    async.waterfall([
      function (cb) {
        Client.findById(clientId)
          .then((client) => {
            cb(null, client);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (client, cb) {
        Publisher.findOne(query)
          .then((publisher) => {
            if (publisher) {
              cb(null, client, publisher);
            } else {
              cb(null, client, null);
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (client, foundPublisher, cb) {
        const updateIPI = client?.features?.updateIPI;
        publisher = foundPublisher || new Publisher();
        publisher.clientId = clientId;
        if (data.name) { publisher.name = data.name; }
        if (data.cwrName || overwriteBlanks) { publisher.cwrName = data.cwrName; }
        if (data.cae || overwriteBlanks) { publisher.cae = padLeadingZeros(data.cae, 11); }
        if (!publisher.cae) { publisher.cae = padLeadingZeros(data.cae, 11); }
        if (data.controlled || overwriteBlanks) { publisher.controlled = data.controlled ? data.controlled : false; }
        if (data.notes || overwriteBlanks) { publisher.notes = data.notes; }
        if (data.mainPro || overwriteBlanks) { publisher.mainPro = data.mainPro; }
        if (data.mainProIdentifier || overwriteBlanks) { publisher.mainProIdentifier = data.mainProIdentifier; }
        if (data.mechanicalPro || overwriteBlanks) { publisher.mechanicalPro = data.mechanicalPro; }
        if (data.mechanicalProIdentifier || overwriteBlanks) { publisher.mechanicalProIdentifier = data.mechanicalProIdentifier; }
        if (data.performancePro || overwriteBlanks) { publisher.performancePro = data.performancePro; }
        if (data.performanceProIdentifier || overwriteBlanks) { publisher.performanceProIdentifier = data.performanceProIdentifier; }
        if (data.syncPro || overwriteBlanks) { publisher.syncPro = data.syncPro; }
        if (data.syncProIdentifier || overwriteBlanks) { publisher.syncProIdentifier = data.syncProIdentifier; }
        if (data.foreignId || overwriteBlanks) { publisher.foreignId = data.foreignId; }
        if ((curveUser.internal && data.interestedPartyId && updateIPI) || (curveUser.internal && overwriteBlanks && updateIPI)) { publisher.interestedPartyId = data.interestedPartyId; }
        cb();
      },
      function (cb) {
        if ((importIdentifiers && importIdentifiers.length !== 0) || overwriteBlanks) {
          publisher.societies = [];
          async.eachSeries(importIdentifiers, (identifier, idCb) => {
            if (identifier && identifier.name === publisher.name) {
              publisher.societies.push({
                society: identifier.society,
                identifier: identifier.identifier,
                publisherName: identifier.publisherName,
                mechanicalPro: identifier.mechanicalPro,
                performancePro: identifier.performancePro,
                syncPro: identifier.syncPro,
              });
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
          publisher.publisherAgreements = [];
          async.eachSeries(importAgreements, (agreement, idCb) => {
            if (agreement && agreement.name === publisher.name) {
              Publisher.findOne({ clientId: publisher.clientId, name: agreement.publisherName })
                .then((publisherAgreement) => {
                  if (publisherAgreement) {
                    publisher.publisherAgreements.push({
                      publisherId: publisherAgreement._id.toString(), agreementType: agreement.agreementType, territory: agreement.territory, society: agreement.society, agreementNo: agreement.agreementNo,
                    });
                    idCb();
                  } else {
                    idCb(new Error(`Publisher not found with name ${agreement.publisherName} on Agreements tab`));
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  idCb(err);
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
      // Handle Publisher Territories
      function (cb) {
        if (overwriteBlanks) { publisher.territories = []; }

        if (data.territories && Array.isArray(data.territories) && data.territories.length) {
          if (data.territories.length === 1) {
            if (data.territories[0] === 'WW' || data.territories[0] === 'world' || data.territories[0] === 'World') {
              publisher.territories = Utils.allTerritories;
              cb();
            } else {
              TerritoryGroup.findOne({ clientId, name: data.territories[0] })
                .then((territoryGroup) => {
                  if (territoryGroup) { publisher.territories = territoryGroup.territories; } else { publisher.territories = data.territories; }
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            }
          } else {
            publisher.territories = data.territories;
            cb();
          }
        } else {
          cb();
        }
      },
      function (cb) {
        if ((data.linkedContracts && data.linkedContracts.length !== 0) || overwriteBlanks) {
          publisher.linkedContracts = [];
          async.eachSeries(data.linkedContracts, (contractName, contractCb) => {
            if (contractName) {
              Contract.findOne({ clientId, name: contractName.trim() })
                .then((contract) => {
                  if (contract) { publisher.linkedContracts.push({ contractId: contract._id.toString() }); }
                  contractCb();
                })
                .catch((err) => {
                  logger.error(err);
                  contractCb(err);
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
      publisher.validate()
        .then(() => {
          callback(null, publisher);
        })
        .catch((err) => {
          // @Arjun: Do we want to bother logging validation errors?
          logger.error(err);
          callback(err);
        });
    });
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this publisher. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Imports an array of Publishers.
  *
  * Calls callback(errors, count, importedPublishers) with an array of [errors] if they occur, the [count] of Publishers imported and an object containing the [importedPublishers].
  *
  * @method
  * @param {object[]} publishers - Publishers to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Publishers.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */

publisherSchema.statics.importPublishers = function (publishers, importIdentifiers, importAgreements, importAliases, curveUser, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(publishers) !== '[object Array]') {
    callback('Data must be an Array', null);
  } else if (!curveUser.clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedPublishers = [];
    const errors = [];
    async.eachOfSeries(publishers, (publisher, index, cb) => {
      if (isObjectPopulated(publisher)) {
        Publisher.importPublisher(publisher, importIdentifiers, importAgreements, curveUser, overwriteBlanks, (err, importedPublisher) => {
          if (err) { errors.push(`Line ${index + 3}: ${err}`); }
          if (importedPublisher) {
            count += 1;
            importedPublishers.push(importedPublisher);
          }
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) {
        callback(err, null);
      } else if (importAliases && importAliases.length > 0) {
        // Process aliases after all publishers have been imported (tab ordering guarantee)
        Publisher.importPublisherAliases(importAliases, importedPublishers, curveUser, (aliasErrors) => {
          callback(errors.concat(aliasErrors), count, importedPublishers);
        });
      } else {
        callback(errors, count, importedPublishers);
      }
    });
  }
};

/**
  * Imports aliases for Publishers from the Aliases tab.
  *
  * Processes each row: resolves the target publisher by ID or name,
  * validates alias uniqueness, and appends to the publisher's aliases array.
  * Idempotent: if an alias already exists on the target publisher, it is skipped.
  *
  * @method
  * @param {object[]} aliasRows - Parsed rows from the Aliases sheet.
  * @param {object[]} importedPublishers - Publishers created/updated during this import (for cross-tab reference).
  * @param {object} curveUser - The importing user.
  * @param {function(string[])} callback - Callback with an array of error strings.
  */

publisherSchema.statics.importPublisherAliases = function (aliasRows, importedPublishers, curveUser, callback) {
  const { clientId } = curveUser;
  const errors = [];

  // Track aliases seen within this import file: lowerAlias → publisherId
  // Same-publisher duplicates are silently skipped, cross-publisher duplicates are errors
  const seenAliasesInFile = new Map();

  async.eachOfSeries(aliasRows, (row, index, cb) => {
    if (!isObjectPopulated(row)) return cb();

    const rowNum = index + 3; // +3 accounts for header row + hint row + 1-based indexing
    const alias = row.alias ? row.alias.trim() : '';

    // Validate alias is not empty
    if (!alias) {
      errors.push(`Aliases tab line ${rowNum}: Alias cannot be empty`);
      return cb();
    }

    const lowerAlias = alias.toLowerCase();

    // Resolve the target publisher
    let publisherQuery = null;

    if (row._id && row._id !== '') {
      if (!ObjectId.isValid(row._id)) {
        errors.push(`Aliases tab line ${rowNum}: Invalid Publisher ID '${row._id}'`);
        return cb();
      }
      publisherQuery = { _id: row._id, clientId };
    } else if (row.name && row.name !== '') {
      publisherQuery = { clientId, lowerCaseName: LowerCaseString(row.name) };
    } else {
      errors.push(`Aliases tab line ${rowNum}: Publisher ID or Publisher Name is required`);
      return cb();
    }

    // Check importedPublishers first to avoid unnecessary DB query
    // Use LowerCaseString(p.name) rather than p.lowerCaseName because newly created
    // publishers haven't been saved yet, and lowerCaseName is only set in pre('save')
    const existingImport = importedPublishers.find((p) => {
      if (row._id && row._id !== '') return p._id.toString() === row._id;
      if (row.name) return LowerCaseString(p.name) === LowerCaseString(row.name);
      return false;
    });

    const resolvePublisher = existingImport
      ? Promise.resolve({ publisher: existingImport, isExistingDbPublisher: false })
      : Publisher.findOne(publisherQuery).then((dbPublisher) => {
        if (!dbPublisher) return null;
        return { publisher: dbPublisher, isExistingDbPublisher: true };
      });

    resolvePublisher
      .then((result) => {
        if (!result) {
          const identifier = row._id || row.name;
          errors.push(`Aliases tab line ${rowNum}: Publisher '${identifier}' not found`);
          return cb();
        }

        const { publisher, isExistingDbPublisher } = result;
        const resolvedPubId = publisher._id.toString();

        // Check for intra-file duplicates using resolved publisher ID
        // Same-publisher duplicates are silently skipped; cross-publisher duplicates are errors
        if (seenAliasesInFile.has(lowerAlias)) {
          const previousPubId = seenAliasesInFile.get(lowerAlias);
          if (previousPubId === resolvedPubId) {
            logger.info(`Aliases tab line ${rowNum}: Duplicate alias '${alias}' within the import file for '${publisher.name}' — skipped`);
            return cb();
          }
          errors.push(`Aliases tab line ${rowNum}: Cannot add alias '${alias}'. This alias is already assigned to another publisher in the import file.`);
          return cb();
        }
        seenAliasesInFile.set(lowerAlias, resolvedPubId);

        // Initialise aliases array if not present
        if (!publisher.aliases) publisher.aliases = [];

        // Idempotent: skip if alias already exists on this publisher
        const alreadyExists = publisher.aliases.find((existing) => existing.toLowerCase() === lowerAlias);
        if (alreadyExists) {
          logger.info(`Aliases tab line ${rowNum}: Alias '${alias}' already exists on '${publisher.name}' — skipped`);
          return cb();
        }

        // Check alias doesn't match the publisher's own primary name (no DB query needed)
        if (publisher.name && publisher.name.toLowerCase() === lowerAlias) {
          errors.push(`Aliases tab line ${rowNum}: Alias '${alias}' matches the publisher's own name`);
          return cb();
        }

        const excludeFilter = { clientId, _id: { $ne: publisher._id } };
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Check alias doesn't match another publisher's primary name or existing alias
        Promise.all([
          Publisher.findOne({ ...excludeFilter, lowerCaseName: lowerAlias }),
          Publisher.findOne({ ...excludeFilter, aliases: { $regex: new RegExp(`^${escapedAlias}$`, 'i') } }),
        ])
          .then(([nameConflict, aliasConflict]) => {
            if (nameConflict) {
              errors.push(`Aliases tab line ${rowNum}: Cannot add alias '${alias}'. This is the primary name of publisher '${nameConflict.name}'.`);
            } else if (aliasConflict) {
              errors.push(`Aliases tab line ${rowNum}: Cannot add alias '${alias}'. This alias is already used by publisher '${aliasConflict.name}'.`);
            } else {
              // Also check in-flight importedPublishers for conflicts not yet saved to DB
              const publisherId = publisher._id.toString();
              const inFlightNameConflict = importedPublishers.find((p) => p._id.toString() !== publisherId
                && p.name && p.name.toLowerCase() === lowerAlias);
              const inFlightAliasConflict = importedPublishers.find((p) => p._id.toString() !== publisherId
                && p.aliases && p.aliases.some((a) => a.toLowerCase() === lowerAlias));

              if (inFlightNameConflict) {
                errors.push(`Aliases tab line ${rowNum}: Cannot add alias '${alias}'. This is the primary name of publisher '${inFlightNameConflict.name}'.`);
              } else if (inFlightAliasConflict) {
                errors.push(`Aliases tab line ${rowNum}: Cannot add alias '${alias}'. This alias is already used by publisher '${inFlightAliasConflict.name}'.`);
              } else {
                publisher.aliases.push(alias);
                // Add DB-only publishers to importedPublishers so they are saved by the caller
                if (isExistingDbPublisher && !importedPublishers.some((p) => p._id.toString() === publisher._id.toString())) {
                  importedPublishers.push(publisher);
                }
              }
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            errors.push(`Aliases tab line ${rowNum}: Error checking alias uniqueness - ${err.message || err}`);
            cb();
          });
      })
      .catch((err) => {
        logger.error(err);
        errors.push(`Aliases tab line ${rowNum}: Error finding publisher - ${err.message || err}`);
        cb();
      });
  }, () => {
    callback(errors);
  });
};

/**
  * Imports mechanical Publishers from Excel.
  *
  * Calls callback(err, result) with an [err] if an error occurs and the generated notification [result].
  * @method
  * @param {object} file - File to import.
  * @param {object} curveUser - User importing the Publishers.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object)} callback - The callback that handles the response.
  */

publisherSchema.statics.importMechanicalFromExcel = function (file, curveUser, overwriteBlanks, callback) {
  const Client = require('../client');
  const ImportXlsx = require('../../libs/importXlsx');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat?.toUpperCase() ? `${client.dateFormat.toUpperCase()}` : '';
        const importData = {};
        async.parallel([
          function (paraCb) {
            ImportXlsx.getDataByTemplate(file.path, config.importTemplates.publisherMechanical, 0, 2, dateFormat, (err, data) => {
              importData.publishers = data;
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
                  subject: 'Your Publisher Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Publisher Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          } else {
            Publisher.importMechanicalPublishers(importData.publishers, importData.identifiers, importData.agreements, curveUser.clientId, overwriteBlanks, (errors, count, importedPublishers) => {
              if (errors && errors.length > 0) {
                // Send errors email
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Publisher Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Publisher Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              } else {
                // Didn't error, save.
                const partialImportErrors = [];
                async.eachSeries(importedPublishers, (importedPublisher, importCb) => {
                  importedPublisher.createdBy = curveUser.id;
                  importedPublisher.lastModifiedBy = curveUser.id;
                  importedPublisher.save()
                    .then(() => {
                      importCb();
                    })
                    .catch((err) => {
                      partialImportErrors.push(`Publisher ${importedPublisher.name} did not save - ${err.message || err}`);
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
                          subject: 'Your Publisher Import Was Partially Successful',
                          file: file.originalname,
                          error: partialImportErrors,
                        };

                        Notification.generate(
                          'Your Publisher Import Was Partially Successful',
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
                          subject: 'Your Publisher Import Has Completed',
                          file: file.originalname,
                          count,
                        };
                        Notification.generate('Your Publisher Import Has Completed', `${count} Publishers imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                          if (callback) { callback(err, result); }
                        });
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      callback(err);
                    });
                });
              }
            });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Publisher Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Publisher Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
  * Imports a single mechanical Publisher.
  *
  * Calls callback(error, importedPublisher) with an [error] if an errror occurs and the [importedPublisher].
  *
  * @method
  * @param {object} data - The Publisher to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Releases.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string, object, string[], object)} callback - The callback that handles the response.
  */

publisherSchema.statics.importMechanicalPublisher = function (data, importIdentifiers, importAgreements, clientId, overwriteBlanks, callback) {
  const Contract = require('../contract');
  try {
    let query = null;
    if (!data) {
      return callback("Data doesn't match template", null);
    }
    if (data._id && data._id !== '') {
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
      query = { clientId, name: data.name };
    } else if (!data.name || data.name === '') {
      return callback();
    } else {
      return callback('Publisher requires a name', null);
    }

    let publisher = {};
    async.waterfall([
      function (cb) {
        Publisher.findOne(query)
          .then((foundPublisher) => {
            cb(null, foundPublisher);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (foundPublisher, cb) {
        publisher = foundPublisher || new Publisher();
        publisher.clientId = clientId;
        if (data.name) { publisher.name = data.name; }
        if (data.cae || overwriteBlanks) { publisher.cae = padLeadingZeros(data.cae, 11); }
        if (!publisher.cae) { publisher.cae = padLeadingZeros(data.cae, 11); }
        if (data.foreignId || overwriteBlanks) { publisher.foreignId = data.foreignId; }
        cb();
      },
      function (cb) {
        if ((data.societies && data.societies.length !== 0) || overwriteBlanks) {
          publisher.societies = [];
          async.eachSeries(importIdentifiers, (identifier, idCb) => {
            if (identifier && identifier.name === publisher.name) {
              publisher.societies.push({ territory: identifier.territory, society: identifier.society, identifier: identifier.identifier });
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
        if ((data.publisherAgreements && data.publisherAgreements.length !== 0) || overwriteBlanks) {
          publisher.publisherAgreements = [];
          async.eachSeries(importAgreements, (agreement, idCb) => {
            if (agreement && agreement.name === publisher.name) {
              Publisher.findOne({ clientId: publisher.clientId, name: agreement.publisherName })
                .then((publisherAgreement) => {
                  if (publisherAgreement) {
                    publisher.publisherAgreements.push({
                      publisherId: publisherAgreement._id.toString(), agreementType: agreement.agreementType, territory: agreement.territory, society: agreement.society, agreementNo: agreement.agreementNo,
                    });
                    idCb();
                  } else {
                    idCb(new Error(`Publisher not found with name ${agreement.publisherName} on Agreements tab`));
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  idCb(err);
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
      function (cb) {
        if ((data.linkedContracts && data.linkedContracts.length !== 0) || overwriteBlanks) {
          publisher.linkedContracts = [];
          async.eachSeries(data.linkedContracts, (contractName, contractCb) => {
            if (contractName) {
              Contract.findOne({ clientId, name: contractName.trim() })
                .then((contract) => {
                  if (contract) { publisher.linkedContracts.push({ contractId: contract._id.toString() }); }
                  contractCb();
                })
                .catch((err) => {
                  logger.error(err);
                  contractCb(err);
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
      publisher.validate()
        .then(() => {
          callback(null, publisher);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    });
  } catch (e) {
    logger.error(e);
    callback('An unknown error occurred when ingesting this publisher. Check all data is present and as expected and try again. If the error persists, please contact support.');
  }
};

/**
  * Imports an array of mechanical Publishers.
  *
  * Calls callback(errors, count, importedPublishers) with an array of [errors] if they occur, the [count] of Publishers imported and an object containing the [importedPublishers].
  *
  * @method
  * @param {object[]} publishers - Publishers to import.
  * @param {object[]} importIdentifiers - An array of identifiers to import.
  * @param {object[]} importAgreements - An array of agreements to import.
  * @param {string} clientId - ID of the client importing the Publishers.
  * @param {boolean} overwriteBlanks - Set to true to overwrite blank values.
  * @param {function(string[], number, object[])} callback - The callback that handles the response.
  */

publisherSchema.statics.importMechanicalPublishers = function (publishers, importIdentifiers, importAgreements, clientId, overwriteBlanks, callback) {
  if (Object.prototype.toString.call(publishers) !== '[object Array]') {
    callback('Data must be an Array', null);
  } else if (!clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedPublishers = [];
    const errors = [];
    async.eachOfSeries(publishers, (publisher, index, cb) => {
      if (isObjectPopulated(publisher)) {
        Publisher.importMechanicalPublisher(publisher, importIdentifiers, importAgreements, clientId, overwriteBlanks, (err, importedPublisher) => {
          if (err) { errors.push(`Line ${index + 3}: ${err}`); }
          if (importedPublisher) {
            count += 1;
            importedPublishers.push(importedPublisher);
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
        callback(errors, count, importedPublishers);
      }
    });
  }
};

// Important: this must use function syntax, not an arrow function (so it can access the current publisher)
publisherSchema.pre('save', async function () {
  try {
    await PublisherPreSave.preSave({ publisher: this, Publisher });
  } catch (err) {
    logger.error('Error in Publisher pre-save hook:', err);
    throw err;
  }
});

publisherSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const publisher = this;
  let workIds = [];
  const Work = require('../work');
  Work.find({ clientId: publisher.clientId, usedPublisherIds: publisher._id.toString() })
    .then((works) => {
      if (works.length !== 0) {
        for (let i = 0; i < works.length; i += 1) {
          workIds.push({ name: works[i].title, link: `works/${works[i]._id}/edit` });
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
      logger.error(err);
      next(err);
    });
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

publisherSchema.post('save', (err, savedPublisher, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current publisher)
publisherSchema.post('save', async function () {
  try {
    await PublisherPostSave.postSave({ publisher: this, Publisher, Client });
  } catch (err) {
    logger.error('Error in Publisher post-save hook:', err);
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

const Publisher = mongoose.model(name, publisherSchema);

module.exports = Publisher;
