const { logger, fileOpener, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { IngestCwr, IngestCs, LowerCaseString, TerritoryHelper } = require('@curveroyaltysystems/curve-shared-logic');
const { Import: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const fs = require('fs');
const _ = require('lodash');
const async = require('async');
const modelHistory = require('../libs/modelHistory');
const importXlsx = require('../libs/importXlsx');
const config = require('../config.json');
const Contract = require('./contract');
const Payee = require('./payee');
const Track = require('./track');
const Release = require('./release');
const Composer = require('./composer');
const Publisher = require('./publisher');
const Work = require('./work');
const Client = require('./client');
const Notification = require('./notification');

let totalImportedPayees = 0;
let totalImportedContracts = 0;
let totalImportedReleases = 0;
let totalImportedTracks = 0;

const importSchema = schema;

importSchema.plugin(modelHistory, { mongoose, name: 'importPatches' });
importSchema.plugin(mongoosePaginate);

function valueToString(value) {
  if (value === undefined || value === null) {
    return value;
  }
  return String(value).trim();
}

importSchema.methods.pullMappingValues = function (localFile, template, callback) {
  const importObj = this;
  importXlsx.getDataByTemplate(localFile, template, 0, 1, null, (err, data) => {
    if (err) {
      callback(err);
    } else {
      const territories = [];
      const distributionChannels = [];
      const priceCategories = [];
      const configurations = [];
      data.forEach((line, index) => {
        logger.info(index);
        if (line) {
          if (line.territoryCode !== undefined && territories.indexOf(valueToString(line.territoryCode)) === -1) { territories.push(valueToString(line.territoryCode)); }
          if (line.distributionChannelCode !== undefined && distributionChannels.indexOf(valueToString(line.distributionChannelCode)) === -1) { distributionChannels.push(valueToString(line.distributionChannelCode)); }
          if (line.priceCategoryCode !== undefined && priceCategories.indexOf(valueToString(line.priceCategoryCode)) === -1) { priceCategories.push(valueToString(line.priceCategoryCode)); }
          if (line.priceCategory !== undefined && priceCategories.indexOf(valueToString(line.priceCategory)) === -1) { priceCategories.push(valueToString(line.priceCategory)); }
          if (line.configurationCode !== undefined && configurations.indexOf(valueToString(line.configurationCode)) === -1) { configurations.push(valueToString(line.configurationCode)); }
          if (line.productConfigCode !== undefined && configurations.indexOf(valueToString(line.productConfigCode)) === -1) { configurations.push(valueToString(line.productConfigCode)); }
          if (line.productConfigCode !== undefined && distributionChannels.indexOf(valueToString(line.productConfigCode)) === -1) { distributionChannels.push(valueToString(line.productConfigCode)); }
        }
        data[index] = null;
      });

      logger.info('Territories:', territories);
      logger.info('Distribution Channels:', distributionChannels);
      logger.info('Price Categories:', priceCategories);
      logger.info('Configurations:', configurations);
      importObj.valuesForMapping.territories = importObj.valuesForMapping.territories ? importObj.valuesForMapping.territories.concat(territories).filter(onlyUnique) : territories;
      importObj.valuesForMapping.distributionChannels = importObj.valuesForMapping.distributionChannels ? importObj.valuesForMapping.distributionChannels.concat(distributionChannels).filter(onlyUnique) : distributionChannels;
      importObj.valuesForMapping.configurations = importObj.valuesForMapping.configurations ? importObj.valuesForMapping.configurations.concat(configurations).filter(onlyUnique) : configurations;
      importObj.valuesForMapping.priceCategories = importObj.valuesForMapping.priceCategories ? importObj.valuesForMapping.priceCategories.concat(priceCategories).filter(onlyUnique) : priceCategories;

      callback();

      function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
      }
    }
  });
};

importSchema.methods.runImport = function (curveUser, callback) {
  const foundImport = this;
  const logId = foundImport._id.toString();
  const results = [];
  async.waterfall(
    [
      function (cb) {
        logger.info(`Client Import: ${logId} : getPayees`);
        foundImport.getPayees((err, payeesCount) => {
          results.push(payeesCount);
          cb(err);
        });
      },
      function (cb) {
        logger.info(`Client Import: ${logId} : setupInitialContract`);
        foundImport.setupInitialContract((err, contractsCount) => {
          results.push(contractsCount);
          cb(err);
        });
      },
      function (cb) {
        logger.info(`Client Import: ${logId} : getContractSalesTerms`);
        foundImport.getContractSalesTerms(cb);
      },
      function (catGroupMappings, cb) {
        logger.info(`Client Import: ${logId} : getReleasesAndTracks`);
        foundImport.getReleasesAndTracks(catGroupMappings, (err, releasesAndTracksCount) => {
          results.push(releasesAndTracksCount);
          cb(err);
        });
      },
    ],
    (err) => {
      if (err) {
        logger.info(`Client Import: IMPORT HAS ERRORED: ${logId}`);
        logger.error(err);
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'bulkImportError',
              curveUser,
              client,
              subject: `Your Import ${foundImport.name} Has Errored`,
              file: foundImport.name,
              error: [err],
            };
            Notification.generate(`Your Import ${foundImport.name} Has Errored`, `${err} in file ${foundImport.name}`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        logger.info(`Client Import: ${logId} : results`);
        logger.info(results);
        foundImport.ingestedPayees = results[0];
        foundImport.ingestedContracts = results[1];
        foundImport.ingestedReleases = results[2].releases;
        foundImport.ingestedTracks = results[2].tracks;
        foundImport.status = 'Complete';
        foundImport.save()
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'bulkImportComplete',
              curveUser,
              client,
              subject: `Your Import ${foundImport.name} Has Completed`,
              file: foundImport.name,
              releases: results[2].releases,
              tracks: results[2].tracks,
              payees: results[0],
              contracts: results[1],
            };
            Notification.generate('Bulk import complete', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    },
  );
};

importSchema.methods.getPayees = function (callback) {
  totalImportedPayees = 0;
  const foundImport = this;
  const fileKey = foundImport.counterpointFiles.royaltorsFile;
  const logId = foundImport._id.toString();

  fileManager.downloadFromS3(fileKey, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
    }

    importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.contractRoyaltorDatabase, 0, 1, null, (err, data) => {
      if (fs.existsSync(localFile)) {
        fs.unlinkSync(localFile);
      }
      if (err) return logger.error(err);

      async.eachSeries(data, (payee, cb) => {
        let payeeName = typeof payee.royaltorName === 'string' ? payee.royaltorName.trim() : payee.royaltorName;
        const regex = new RegExp(_.escapeRegExp(payeeName), 'i');

        Payee.countDocuments({ clientId: foundImport.clientId, name: { $regex: regex } })
          .then((count) => {
            // Payee with same name exists save with a prefix
            if (count) { payeeName += ` ${count + 1}`; }

            Payee({
              foreignId: payee.royaltorCode,
              name: payeeName,
              clientId: foundImport.clientId,
            }).save()
              .then((payee) => {
                logger.debug(`count: ${count}`);
                logger.debug(`payeeName: ${payeeName}`);
                totalImportedPayees += 1;
                logger.info(`Client Import: ${logId} : Payees Imported: ${totalImportedPayees}`);

                cb();
              })
              .catch((err) => {
                logger.error(`Client Import: ${logId} : PAYEE SAVE ERROR: ${payeeName}`);
                return cb(err);
              });
          })
          .catch((err) => {
            logger.error(`Client Import: ${logId} : PAYEE COUNT ERROR: ${payeeName}`);
            return cb(err);
          });
      }, (err) => {
        callback(err, totalImportedPayees);
      });
    });
  });
};

importSchema.methods.setupInitialContract = function (callback) {
  totalImportedContracts = 0;
  // Working on Royaltor Products File
  const foundImport = this;
  let fileKey = foundImport.counterpointFiles.royaltorRatesFile;
  const logId = foundImport._id.toString();
  const contractsArray = [];

  // Get Initial Contracts from Royaltor Rates File
  fileManager.downloadFromS3(fileKey, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
    }

    importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.royaltorRates, 0, 1, null, (err, data) => {
      if (fs.existsSync(localFile)) {
        fs.unlinkSync(localFile);
      }
      if (err) {
        logger.error(err);
        callback(err);
      }

      // Get unique values from array
      data.filter((item) => {
        const i = contractsArray.findIndex((x) => String(x.contractCode) == String(item.contractCode));
        if (i <= -1) {
          logger.debug(item.contractCode);
          if (item.contractCode) {
            contractsArray.push({
              royaltorName: typeof item.royaltorName === 'string' ? item.royaltorName.trim() : String(item.royaltorName).trim(),
              contractCode: String(item.contractCode),
              contractName: typeof item.contractName === 'string' ? item.contractName.trim() : String(item.contractName).trim(),
            });
          }
        }
        return null;
      });

      // Working on Contract Database File
      fileKey = foundImport.counterpointFiles.royaltorsFile;
      fileManager.downloadFromS3(fileKey, process.env.S3_bucket, (error, localFile) => {
        if (error) {
          logger.error(error);
        }

        importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.contractRoyaltorDatabase, 0, 1, null, (err, royaltorDatabase) => {
          if (fs.existsSync(localFile)) { fs.unlinkSync(localFile); }

          if (err) { return callback(err); }

          // adding payment frequency to contracts
          for (let i = 0; i < contractsArray.length; i += 1) {
            try {
              contractsArray[i].paymentFrequency = royaltorDatabase.find((item) => item.royaltorName === contractsArray[i].royaltorName).paymentFrequency;
            } catch (e) { logger.error(e); }
          }

          // Create Contracts from contractsArray
          async.eachSeries(contractsArray, (contract, cb) => {
            logger.debug(contract);
            Payee.findOne({ name: contract.royaltorName, clientId: foundImport.clientId }, '_id')
              .then((payee) => {
                const payeeId = payee ? payee._id.toString() : null;
                const paymentFrequency = contract.paymentFrequency === 'Six Monthly' ? 'Half-Yearly' : contract.paymentFrequency;
                let contractName = typeof contract.contractName === 'string' ? contract.contractName.trim() : contract.contractName;
                const regex = new RegExp(_.escapeRegExp(contractName), 'i');
                Contract.countDocuments({ clientId: foundImport.clientId, name: { $regex: regex } })
                  .then((count) => {
                    if (count) { contractName += ` ${count + 1}`; }

                    Contract({
                      clientId: foundImport.clientId,
                      name: contractName,
                      foreignId: contract.contractCode,
                      accountingPeriod: paymentFrequency,
                      payees: [{ payeeId, percentage: 100 }],
                      // Set defaults
                      costsTerms: foundImport.defaults.costContractTerms,
                      reserves: foundImport.defaults.reserveContractTerms,
                    }).save()
                      .then(() => {
                        totalImportedContracts += 1;
                        logger.info(`Client Import: ${logId} : Contracts Imported: ${totalImportedContracts}`);
                        cb();
                      })
                      .catch((err) => {
                        logger.error(`Client Import: ${logId} : CONTRACT SAVE ERROR: ${contract.contractName}`);
                        logger.error(err);
                        cb(err);
                      });
                  })
                  .catch((err) => {
                    logger.error(`Client Import: ${logId} : CONTRACT COUNT ERROR: ${contractName}`);
                    return cb(err);
                  });
              })
              .catch((err) => {
                logger.error(err);
                return cb(err);
              });
          }, (err) => {
            callback(err, totalImportedContracts);
          });
        });
      });
    });
  });
};

importSchema.methods.getContractSalesTerms = function (callback) {
  const foundImport = this;
  const logId = foundImport._id.toString();
  const typeMapping = {
    Net: 'Net Receipts',
    'Net Receipts Unit': 'Net Receipts',
    'Net Price': 'Net Receipts',
    Gross: 'Gross Receipts',
    Retail: 'Retail Price',
    'Modified P.P.D.': 'Unit Price',
    'Gross Receipts Unit': 'Gross Receipts',
    'P.P.D.': 'PPD',
    'Dealer Price': 'PPD',
  };
  // const catGroups = [];
  const catGroupMappings = [];

  const fileKey = foundImport.counterpointFiles.royaltorRatesFile;

  fileManager.downloadFromS3(fileKey, process.env.S3_bucket, (error, localFile) => {
    if (error) {
      logger.error(error);
    }

    importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.royaltorRates, 0, 1, null, (err, data) => {
      if (fs.existsSync(localFile)) {
        fs.unlinkSync(localFile);
      }
      if (err) return logger.error(err);

      async.eachSeries(data, (contractRow, cb) => {
        // Only to be used for catalogue specific rates
        // const catGroup = valueToString(contractRow.modelName) + " - " + valueToString(contractRow.contractCode);
        // catGroupMappings.push({ identifier: contractRow.productCode, catGroup: catGroup });
        // catGroups.push(catGroup);
        Contract.findOne({ foreignId: contractRow.contractCode, clientId: foundImport.clientId })
          .then((contract) => {
            if (contract) {
              contractRow.territoryCode = valueToString(contractRow.territoryCode);
              contractRow.distributionChannelCode = valueToString(contractRow.distributionChannelCode);
              contractRow.configurationCode = valueToString(contractRow.configurationCode);
              contractRow.priceCategoryCode = valueToString(contractRow.priceCategoryCode);
              const salesTerm = {
                // catalogueGroup: catGroup,
                territory: foundImport.mappings.territories[contractRow.territoryCode],
                channel: foundImport.mappings.distributionChannels[contractRow.distributionChannelCode],
                configuration: foundImport.mappings.configurations[contractRow.configurationCode],
                priceCategory: foundImport.mappings.priceCategories[contractRow.priceCategoryCode],
                type: contractRow.rateRecoup > 0 ? typeMapping[contractRow.priceType] : typeMapping[contractRow.receiptsType],
                rate: contractRow.rateRecoup > 0 ? contractRow.rateRecoup : contractRow.receiptsRate,
              };
              if (contractRow.salesPercentage && Number(contractRow.salesPercentage) > 0) { salesTerm.reductionRate = contractRow.salesPercentage; }
              // Add term to sales terms
              contract.salesTerms.push(salesTerm);
              // Filter only unique terms
              const termString = function (term) {
                if (term) { return term.catType + term.catalogueGroup + term.territory + term.channel + term.configuration + term.priceCategory + term.source; }
              };
              const termStrings = contract.salesTerms.map(termString);
              contract.salesTerms = contract.salesTerms.map((term, index) => {
                const thisTermString = termString(term);
                if (termStrings.indexOf(thisTermString) == index) {
                  return term;
                }
              }).filter(Boolean);

              contract.save()
                .then(() => {
                  logger.info(`Client Import: ${logId} : Contract Saved: ${contract._id.toString()}`);
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  // Calling back with the error here is not the way it worked originally
                  // But we have error handling so let's do it anyway
                  cb(err);
                });
            } else cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          // Add Cat Groups to client
          // Get unique values
          // catGroups = catGroups.filter(function(value, index, self) { return self.indexOf(value) === index; });
          // Client.findById(foundImport.clientId, function(err, client) {
          // client.catalogueGroups = catGroups;
          // client.save(function(err) {
          // callback(err, catGroupMappings);
          // });
          // })
          callback(err, []);
        }
      });
    });
  });
};

importSchema.methods.getReleasesAndTracks = function (catGroupMappings, callback) {
  totalImportedReleases = 0;
  totalImportedTracks = 0;

  const tracksConfigCodes = ['DD', 'STR', 'AV', 'AVD'];

  const foundImport = this;
  // get files
  async.parallel({
    royaltorProducts(cb) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorProductsFile, process.env.S3_bucket, (error, localFile) => {
        if (error) {
          logger.error(error);
        }
        importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.royaltorProducts, 0, 1, null, (err, data) => {
          if (err) return logger.error(err);
          cb(null, data);
        });
      });
    },
    productManager(cb) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.productManagerFile, process.env.S3_bucket, (error, localFile) => {
        if (error) {
          logger.error(error);
        }
        importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.productManager, 0, 1, null, (err, data) => {
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
          }
          if (err) return logger.error(err);
          cb(null, data);
        });
      });
    },
    productAKAs(cb) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.productAKAsFile, process.env.S3_bucket, (error, localFile) => {
        if (error) {
          logger.error(error);
        }
        importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.productAkas, 0, 1, null, (err, data) => {
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
          }
          if (err) return logger.error(err);
          cb(null, data);
        });
      });
    },
    soundRecordings(cb) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.soundRecordingsFile, process.env.S3_bucket, (error, localFile) => {
        if (error) {
          logger.error(error);
        }
        importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.soundRecordings, 0, 1, null, (err, data) => {
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
          }
          if (err) return logger.error(err);
          cb(null, data);
        });
      });
    },
  }, (err, results) => {
    async.eachSeries(results.royaltorProducts, (importedObject, cb) => {
      importedObject.productConfigCode = typeof importedObject.productConfigCode === 'string' ? importedObject.productConfigCode.trim() : importedObject.productConfigCode;
      if (tracksConfigCodes.indexOf(importedObject.productConfigCode) === -1) {
        importRelease(results, importedObject, foundImport, catGroupMappings, cb);
      } else {
        importTrack(results, importedObject, foundImport, catGroupMappings, cb);
      }
    }, (err) => {
      callback(err, { tracks: totalImportedTracks, releases: totalImportedReleases });
    });
  });
};

importSchema.methods.recordsFilesValidation = function (callback) {
  const foundImport = this;
  const errors = [];
  const tmpFiles = [];

  async.parallel([
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorsFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.contractRoyaltorDatabase, 0, (result) => {
          result.file = 'Contract Royaltor Database';
          callback(null, result);
        });
      });
    },
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorRatesFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.royaltorRates, 0, (result) => {
          result.file = 'Royaltor Rates';
          callback(null, result);
        });
      });
    },
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.royaltorProductsFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.royaltorProducts, 0, (result) => {
          result.file = 'Royaltor Products';
          callback(null, result);
        });
      });
    },
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.productManagerFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.productManager, 0, (result) => {
          result.file = 'Product Manager';
          callback(null, result);
        });
      });
    },
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.productAKAsFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.productAkas, 0, (result) => {
          result.file = 'Product AKA';
          callback(null, result);
        });
      });
    },
    function (callback) {
      fileManager.downloadFromS3(foundImport.counterpointFiles.soundRecordingsFile, process.env.S3_bucket, (error, localFile) => {
        tmpFiles.push(localFile);
        if (error) {
          logger.error(error);
        }
        importXlsx.validateFile(localFile, config.counterpointTemplates.soundRecordings, 0, (result) => {
          result.file = 'Sound Recordings';
          callback(null, result);
        });
      });
    },
  ], (err, results) => {
    for (let i = 0; i < results.length; i += 1) {
      if (!results[i].valid) errors.push(results[i]);
    }
    callback(errors);

    async.each(tmpFiles, (file, callback) => {
      if (fs.existsSync(file)) {
        fs.unlink(file, () => {
          callback(null);
        });
      }
    }, (err) => {
      logger.info('Done deleting files');
    });
  });
};

function importRelease(results, importedRelease, foundImport, catGroupMappings, cb) {
  const release = Release({
    clientId: foundImport.clientId,
    title: importedRelease.productTitle,
    artist: importedRelease.productArtist,
    catNo: typeof importedRelease.productCode === 'string' ? importedRelease.productCode.trim() : importedRelease.productCode,
    barcode: typeof importedRelease.productUPCCode === 'string' ? importedRelease.productUPCCode.trim() : importedRelease.productUPCCode,
  });

  release.releaseDate = searchArray('actualReleaseDate', release.catNo, results.productManager).actualReleaseDate;
  release.distributionChannel = importedRelease.productConfigCode && foundImport.mappings.distributionChannels[importedRelease.productConfigCode] ? foundImport.mappings.distributionChannels[importedRelease.productConfigCode] : null;
  release.format = importedRelease.productConfigCode && foundImport.mappings.configurations[importedRelease.productConfigCode] ? foundImport.mappings.configurations[importedRelease.productConfigCode] : null;
  release.priceCategory = foundImport.mappings.priceCategories[searchArray('priceCategory', release.catNo, results.productManager).priceCategory];
  const aliases = searchArrayForMultipleValue('productCode', release.catNo, results.productAKAs);
  release.aliases = aliases.map((alias) => String(alias.productAkaCode).trim());

  const contractName = typeof importedRelease.contractName === 'string' ? importedRelease.contractName.trim() : importedRelease.contractName;
  Contract.findOne({ name: contractName, clientId: foundImport.clientId })
    .then((contract) => {
      if (contract) {
        Release.findOne({ clientId: release.clientId, format: release.format, catNo: release.catNo })
          .then((foundRelease) => {
            if (foundRelease) {
              foundRelease.salesReturnsRights.push({ contractId: contract._id.toString(), percentage: importedRelease.part });
              foundRelease.costsRights.push({ contractId: contract._id.toString(), percentage: importedRelease.part });
              foundRelease.salesReturnsRights = foundRelease.salesReturnsRights.filter(onlyUnique);
              foundRelease.costsRights = foundRelease.costsRights.filter(onlyUnique);
              catGroupMappings.forEach((mapping) => {
                if (mapping && mapping.identifier == foundRelease.catNo) { foundRelease.catalogueGroups.push(mapping.catGroup); }
              });
              foundRelease.save()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.info(err);
                  cb(err);
                });
            } else {
              release.salesReturnsRights = [{ contractId: contract._id.toString(), percentage: importedRelease.part }];
              release.costsRights = [{ contractId: contract._id.toString(), percentage: importedRelease.part }];
              catGroupMappings.forEach((mapping) => {
                if (mapping && mapping.identifier == release.catNo) { release.catalogueGroups.push(mapping.catGroup); }
              });
              release.save()
                .then(() => {
                  totalImportedReleases++;
                  cb();
                })
                .catch((err) => {
                  logger.info(err);
                  cb(err);
                });
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        logger.info('Contract Not Found:', contractName);
        cb();
      }
    })
    .catch((err) => {
      logger.info(err);
      cb(err);
    });
}

function importTrack(results, importedTrack, foundImport, catGroupMappings, cb) {
  const track = Track({
    clientId: foundImport.clientId,
    title: importedTrack.productTitle,
    artist: importedTrack.productArtist,
    isrc: typeof importedTrack.productCode === 'string' ? importedTrack.productCode.trim() : importedTrack.productCode,
  });

  const aliases = searchArrayForMultipleValue('productCode', track.isrc, results.productAKAs);
  track.aliases = aliases.map((alias) => String(alias.productAkaCode).trim());
  const soundRecordingISRC = searchArray('soundRecordingISRC', track.isrc, results.soundRecordings);
  track.version = (soundRecordingISRC) ? soundRecordingISRC.soundRecordingSubmix : null;
  const trackDuration = (soundRecordingISRC) ? soundRecordingISRC.soundRecordingTime : null;
  if (trackDuration) {
    track.duration = getDuration(trackDuration);
  }

  const contractName = typeof importedTrack.contractName === 'string' ? importedTrack.contractName.trim() : importedTrack.contractName;
  Contract.findOne({ name: contractName, clientId: foundImport.clientId })
    .then((contract) => {
      if (contract) {
        Track.findOne({ clientId: track.clientId, isrc: track.isrc })
          .then((foundTrack) => {
            if (foundTrack) {
              foundTrack.salesReturnsRights.push({ contractId: contract._id.toString(), percentage: importedTrack.part });
              foundTrack.costsRights.push({ contractId: contract._id.toString(), percentage: importedTrack.part });
              foundTrack.salesReturnsRights = foundTrack.salesReturnsRights.filter(onlyUnique);
              foundTrack.costsRights = foundTrack.costsRights.filter(onlyUnique);
              catGroupMappings.forEach((mapping) => {
                if (mapping && mapping.identifier == foundTrack.isrc) { foundTrack.catalogueGroups.push(mapping.catGroup); }
              });
              foundTrack.save()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.info(err);
                  cb(err);
                });
            } else {
              track.salesReturnsRights = [{ contractId: contract._id.toString(), percentage: importedTrack.part }];
              track.costsRights = [{ contractId: contract._id.toString(), percentage: importedTrack.part }];
              catGroupMappings.forEach((mapping) => {
                if (mapping && mapping.identifier == track.isrc) { track.catalogueGroups.push(mapping.catGroup); }
              });
              track.save()
                .then(() => {
                  totalImportedTracks++;
                  cb();
                })
                .catch((err) => {
                  logger.info(err);
                  cb(err);
                });
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        logger.info('Contract Not Found:', contractName);
        cb();
      }
    })
    .catch((err) => {
      logger.info(err);
      cb(err);
    });
}

function getDuration(duration) {
  duration = duration.split(':');
  if (duration.length === 3) {
    return parseInt(duration[0]) * 3600 + parseInt(duration[1]) * 60 + parseInt(duration[2]);
  }
  return 0;
}

function searchArray(key, value, array) {
  // @Tom: this loop only ever runs once
  // eslint-disable-next-line no-unreachable-loop
  for (let i = 0; i < array.length; i += 1) {
    if (array[i][key] === value) {
      return array[i];
    } return {};
  }
}

function searchArrayForMultipleValue(key, value, array) {
  return array.map((element) => {
    if (element[key] && String(element[key]).trim() == value) {
      return element;
    }
  }).filter(Boolean);
}

// Publishing
importSchema.methods.publishingFilesValidation = function (callback) {
  logger.info('publishingFilesValidation');
  this.pullPublishingValues((err) => {
    callback([]);
  });
};

importSchema.methods.runPublishingImport = function (curveUser, callback) {
  const foundImport = this;
  // Payees, contracts, composers, publishers, works
  let contractData;
  async.waterfall([
    function (cb) {
      if (foundImport.counterpointFiles.publishingRatesExport) {
        logger.debug('Opening Rates');
        foundImport.openPublishingRates((err, data) => {
          logger.debug('Read Rates');
          if (err) { logger.error(err); }
          contractData = data;
          cb(err);
        });
      } else {
        cb();
      }
    },
    function (cb) {
      if (contractData) {
        logger.debug('Opening Payees');
        foundImport.createPublishingPayees(contractData, (err, count) => {
          logger.debug('Read Payees');
          if (err) { logger.error(err); }
          foundImport.ingestedPayees = count;
          cb(err);
        });
      } else {
        cb();
      }
    },
    function (cb) {
      if (contractData) {
        logger.debug('Opening Publishing Contracts');
        foundImport.createPublishingContracts(contractData, (err, count) => {
          logger.debug('Read Publishing Contracts');
          if (err) { logger.error(err); }
          foundImport.ingestedContracts = count;
          cb(err);
        });
      } else {
        cb();
      }
    },
    function (cb) {
      if (foundImport.counterpointFiles.publishingComposers) {
        logger.debug('Opening Composers');
        foundImport.createPublisherComposers((err, count) => {
          logger.debug('Read Composers');
          if (err) { logger.error(err); }
          foundImport.ingestedComposers = count;
          cb(err);
        });
      } else {
        cb();
      }
    },
    function (cb) {
      if (foundImport.counterpointFiles.publishingPublishers) {
        foundImport.createPublisherPublishers((err, count) => {
          if (err) { logger.error(err); }
          foundImport.ingestedPublishers = count;
          cb(err);
        });
      } else {
        cb();
      }
    },
    function (cb) {
      foundImport.createPublishingWorks((err, count) => {
        if (err) { logger.error(err); }
        foundImport.ingestedWorks = count;
        cb(err);
      });
    },
  ], (err) => {
    if (err) {
      logger.error(err);
    }
    foundImport.status = 'Complete';
    foundImport.save()
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'bulkPublishingImportComplete',
          curveUser,
          client,
          subject: `Your Import ${foundImport.name} Has Completed`,
          file: foundImport.name,
          payees: foundImport.ingestedPayees,
          contracts: foundImport.ingestedContracts,
          composers: foundImport.ingestedComposers,
          publishers: foundImport.ingestedPublishers,
          works: foundImport.ingestedWorks,
        };
        Notification.generate('Bulk import complete', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
          if (callback) {
            callback(err, result);
          }
        });
        if (callback) {
          callback(err);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  });
};

importSchema.methods.pullPublishingValues = function (callback) {
  const foundImport = this;
  // Get values from catalogue export
  const capacities = [];
  const societies = [];
  const territories = [];
  const rateConfigs = [];
  async.waterfall([
    function (cb) {
      // Get data from catalogue file
      logger.info('Pulling publishing values');
      const opener = foundImport.transferringSystem == 'Linked Publishing' ? foundImport.openLinkedPublishingCatalogueExport : foundImport.openPublishingCatalogueExport;
      opener(foundImport, cb);
    },
    function (catalogueData, cb) {
      // Pull values from data
      async.each(catalogueData, (item, itemCb) => {
        territories.push(item.territoryCode);
        if (item.chains) {
          item.chains.forEach((chain) => {
            chain.forEach((ip) => {
              capacities.push(ip.Capacity);
              societies.push(ip.Affiliation);
            });
          });
        }
        itemCb();
      }, cb);
    },
    function (cb) {
      if (foundImport.counterpointFiles.publishingRatesExport) {
        logger.debug('Getting publisher rates');
        // Get data from rates file
        foundImport.openPublishingRates(cb);
      } else {
        cb(null, {});
      }
    },
    function (rates, cb) {
      logger.debug('Mapping publisher rates');
      // Pull unique mapping rates
      async.each(Object.keys(rates), (key, keyCb) => {
        rates[key].forEach((rate) => {
          rateConfigs.push(rate.name);
        });
        keyCb();
      }, cb);
    },
  ], (err) => {
    foundImport.valuesForMapping.capacities = capacities.filter(onlyUnique).filter(Boolean);
    foundImport.valuesForMapping.societies = societies.filter(onlyUnique).filter(Boolean);
    foundImport.valuesForMapping.territories = territories.filter(onlyUnique).filter(Boolean);
    foundImport.valuesForMapping.publishingRates = rateConfigs.filter(onlyUnique).filter(Boolean);
    foundImport.save()
      .then(() => {
        callback(err, {
          capacities: capacities.filter(onlyUnique).filter(Boolean), societies: societies.filter(onlyUnique).filter(Boolean), territories: territories.filter(onlyUnique).filter(Boolean), rateConfigs: rateConfigs.filter(onlyUnique).filter(Boolean),
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  });
};

importSchema.methods.openPublishingCatalogueExport = function (foundImport, callback) {
  // const foundImport = this;
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingCatalogueExport, process.env.S3_bucket, (error, localFile) => {
    const options = {
      tab: 0,
      startingLine: 0,
      startingColumn: 0,
      delimiter: ',',
    };
    fileOpener.extractData(localFile, options, (err, totalTabs, data) => {
      const works = [];
      // Pull headers from first row in file
      const headers = data.shift();
      // Loop through each row of data
      async.each(data, (row, cb) => {
        const work = {};
        // Loop through each value in row
        async.forEachOf(row, (field, index, rowCb) => {
          // Map to correct field based on value
          mapFieldToValue(work, headers, field, index, rowCb);
        }, (err) => {
          works.push(work);
          cb();
        });
      }, (err) => {
        callback(err, works);
      });
    });
  });

  function mapFieldToValue(work, headers, field, index, callback) {
    if (headers[index].includes('Chain')) {
      // Map Chain
      mapChain(work, headers[index], field, callback);
    } else if (headers[index].includes('Client')) {
      // Map Contracts
      mapClient(work, headers[index], field, callback);
    } else if (headers[index].includes('Recording')) {
      // Map Recordings
      mapRecording(work, headers[index], field, callback);
    } else {
      // Map straight to field
      work[mapFieldName(headers[index])] = field;
      callback();
    }
  }

  function mapFieldName(fieldName) {
    switch (fieldName) {
      case 'Music Maestro Song Code':
        return 'foreignId';
      case 'Song Title':
        return 'title';
      case 'ISWC':
        return 'iswc';
      case 'Song Notes':
        return 'notes';
      case 'Territory 1 Music Maestro Code':
        return 'territoryCode';
      case 'Territory 1 Name':
        return 'territoryName';
      case 'Territory':
        return 'territoryName';
      default:
        return fieldName;
    }
  }

  function mapChain(work, header, field, callback) {
    if (field) {
      // Create chains if it doesn't exist
      work.chains = work.chains || [];
      // Get functions for each
      const split = header.split(' ');
      const chainNo = parseInt(split[1]) - 1;
      const ipNo = parseInt(split[3]) - 1;
      const ipFieldName = mapFieldName(split.slice(4, split.length).join(' '));
      // Create chain if it doesn't exist
      work.chains[chainNo] = work.chains[chainNo] || [];
      // Create IP if it doesn't exist
      work.chains[chainNo][ipNo] = work.chains[chainNo][ipNo] || {};
      // Add field to IP object
      work.chains[chainNo][ipNo][ipFieldName] = field;
      // Add chain no
      work.chains[chainNo][ipNo]['Chain No'] = chainNo;
    }
    callback();
  }

  function mapClient(work, header, field, callback) {
    if (field) {
      // Create chains if it doesn't exist
      work.clients = work.clients || [];
      // Get functions for each
      const split = header.split(' ');
      const clientNo = parseInt(split[1]) - 1;
      const clientFieldName = mapFieldName(split.slice(2, split.length).join(' '));
      // Create chain if it doesn't exist
      work.clients[clientNo] = work.clients[clientNo] || {};
      // Add field to Client object
      work.clients[clientNo][clientFieldName] = field;
    }
    callback();
  }

  function mapRecording(work, header, field, callback) {
    if (field) {
      // Create chains if it doesn't exist
      work.recordings = work.recordings || [];
      // Get functions for each
      const split = header.split(' ');
      const recordingNo = parseInt(split[1]) - 1;
      const recordingFieldName = mapFieldName(split.slice(2, split.length).join(' '));
      // Create chain if it doesn't exist
      work.recordings[recordingNo] = work.recordings[recordingNo] || {};
      // Add field to Recording object
      work.recordings[recordingNo][recordingFieldName] = field;
    }
    callback();
  }
};

importSchema.methods.openLinkedPublishingCatalogueExport = function (foundImport, callback) {
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingCatalogueExport, process.env.S3_bucket, (error, localFile) => {
    const options = {
      tab: 0,
      startingLine: 0,
      startingColumn: 0,
      delimiter: ',',
    };
    fileOpener.extractData(localFile, options, (err, totalTabs, data) => {
      const works = [];
      // Pull headers from first row in file
      const headers = data.shift();
      // Loop through each row of data
      async.each(data, (row, cb) => {
        const work = {};
        // Loop through each value in row
        async.forEachOf(row, (field, index, rowCb) => {
          // Map to correct field based on value
          mapFieldToValue(work, headers, field, index, rowCb);
        }, (err) => {
          buildChainFromParties(work, (err, updatedWork) => {
            works.push(updatedWork);
            logger.info(updatedWork);
            logger.info(updatedWork.chains);
            cb();
          });
        });
      }, (err) => {
        callback(err, works);
      });
    });
  });

  function mapFieldToValue(work, headers, field, index, callback) {
    if (headers[index].includes('Composer') || headers[index].includes('Publisher')) {
      // Map Chain
      mapChain(work, headers[index], field, callback);
    } else if (headers[index].includes('Recording')) {
      // Map Recordings
      mapRecording(work, headers[index], field, callback);
    } else {
      // Map straight to field
      work[mapFieldName(headers[index])] = field;
      callback();
    }
  }

  function mapFieldName(fieldName) {
    switch (fieldName) {
      case 'Music Maestro Song Code':
        return 'foreignId';
      case 'Song Title':
        return 'title';
      case 'ISWC':
        return 'iswc';
      case 'Song Notes':
        return 'notes';
      case 'Territory 1 Music Maestro Code':
        return 'territoryCode';
      case 'Territory 1 Name':
        return 'territoryName';
      case 'Territory':
        return 'territoryName';
      case 'Song Code':
        return 'foreignId';
      default:
        return fieldName;
    }
  }

  function mapChain(work, header, field, callback) {
    if (field) {
      const type = header.includes('Composer') ? 'Composer' : 'Publisher';
      // Create chains if it doesn't exist
      work.chains = work.chains || [];
      work.parties = work.parties || {};
      // Get functions for each
      const chainNo = parseInt(header.replace(/\D/g, ''));
      const typeString = `${type} ${chainNo}`;
      work.parties[typeString] = work.parties[typeString] || {};
      /// / Get IP Field Name from the second half
      const split = header.split(header.replace(/\D/g, ''));
      const ipFieldNameOriginal = split[split.length - 1].trim();
      const ipFieldName = mapFieldName(ipFieldNameOriginal);
      work.parties[typeString][ipFieldName] = field;
    }
    callback();
  }

  function mapRecording(work, header, field, callback) {
    if (field) {
      // Create chains if it doesn't exist
      work.recordings = work.recordings || [];
      // Get functions for each
      const recordingNo = parseInt(header.replace(/\D/g, '')) - 1;
      // Get IP Field Name from the second half
      const split = header.split(header.replace(/\D/g, ''));
      const recordingFieldNameOriginal = split[split.length - 1].trim();
      const recordingFieldName = mapFieldName(recordingFieldNameOriginal);
      // Create chain if it doesn't exist
      work.recordings[recordingNo] = work.recordings[recordingNo] || {};
      // Add field to Recording object
      work.recordings[recordingNo][recordingFieldName] = field;
    }
    callback();
  }

  function buildChainFromParties(work, callback) {
    if (work && work.parties) {
      async.eachSeries(Object.keys(work.parties), (party, partyCb) => {
        if (party.includes('Composer')) {
          work.parties[party].Type = 'C';
          const chainNo = parseInt(party.replace(/\D/g, '')) - 1;
          // Get IP Field Name from the second half
          const split = party.split(party.replace(/\D/g, ''));
          const ipFieldNameOriginal = split[split.length - 1].trim();
          const ipFieldName = mapFieldName(ipFieldNameOriginal);
          // Create chain if it doesn't exist
          work.chains[chainNo] = work.chains[chainNo] || [];
          work.parties[party]['Chain No'] = chainNo;
          work.chains[chainNo].push(work.parties[party]);
          if (work.parties[party]['Linked Publisher']) {
            getLinkedPublisher(work.chains[chainNo], work.parties[party]['Linked Publisher'], 'Original', chainNo, partyCb);
          } else {
            partyCb();
          }
        } else {
          partyCb();
        }
      }, (err) => {
        callback(null, work);
      });
    } else {
      callback(null, work);
    }

    function getLinkedPublisher(chain, linkedPublisher, type, chainNo, callback) {
      async.eachSeries(Object.keys(work.parties), (party, partyCb) => {
        if (work.parties[party].Name == linkedPublisher) {
          work.parties[party].Type = 'P';
          work.parties[party]['Chain No'] = chainNo;
          // Add item to chain
          if ((type == 'Original' && work.parties[party].Capacity == 'OP') || (type == 'Sub Publisher' && ['AM', 'SE'].includes(work.parties[party].Capacity))) {
            chain.unshift(work.parties[party]);
          }
          if (work.parties[party]['Linked Publisher']) {
            getLinkedPublisher(chain, work.parties[party]['Linked Publisher'], 'Sub Publisher', chainNo, partyCb);
          } else {
            partyCb();
          }
        } else {
          partyCb();
        }
      }, callback);
    }
  }
};

importSchema.methods.openPublishingRates = function (callback) {
  const foundImport = this;
  logger.debug(foundImport.counterpointFiles.publishingRatesExport);
  logger.debug(process.env.S3_bucket);
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingRatesExport, process.env.S3_bucket, (error, localFile) => {
    logger.debug('DOWNLOADED FILE');
    const options = {
      tab: 0,
      startingLine: 0,
      startingColumn: 0,
      delimiter: ',',
    };
    fileOpener.extractData(localFile, options, (err, totalTabs, data) => {
      logger.debug(data);
      const output = {};
      // Remove first 2 rows
      data.shift();
      data.shift();
      let client; let source;
      async.eachSeries(data, (row, cb) => {
        logger.debug(row);
        // Reset for each client
        if (row[1] == 'Client') {
          client = row[3];
        } else if (row[1] == 'Source of Income') {
          source = row[3];
        } else {
          // Create client if it doesn't exist
          output[client] = output[client] || [];
          if (row[13]) {
            const name = `${source} - ${row[3]}`;
            output[client].push({ name, rate: row[13] });
          }
        }
        cb();
      }, (err) => {
        logger.debug('Completed Reading Publishing Rates');
        callback(err, output);
      });
    });
  });
};

importSchema.methods.createPublishingPayees = function (data, callback) {
  const foundImport = this;
  let count = 0;
  if (data) {
    async.each(Object.keys(data), (name, cb) => {
      const payee = new Payee({
        name,
        clientId: foundImport.clientId,
      });
      payee.save()
        .then(() => {
          count += 1;
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb();
        });
    }, (err) => {
      callback(err, count);
    });
  } else {
    callback(new Error('No data passed to function'));
  }
};

importSchema.methods.createPublishingContracts = function (data, callback) {
  const foundImport = this;
  let count = 0;
  if (data) {
    async.each(Object.keys(data), (name, cb) => {
      Payee.findOne({ clientId: foundImport.clientId, name })
        .then((payee) => {
          const payeeId = payee ? payee._id.toString() : null;
          const contract = new Contract({
            clientId: foundImport.clientId,
            name,
            payees: [{ payeeId, percentage: 100 }],
            accountingPeriod: foundImport.defaults.accountingPeriod,
            type: 'Royalty',
          });
          async.each(data[name], (term, termCb) => {
            term.name = term.name.replace(/\./g, '');
            const mapping = foundImport.mappings.publishingRates[term.name];
            if (mapping) {
              contract.salesTerms = contract.salesTerms || [];
              const salesTerm = {
                territory: mapping.territory ? mapping.territory : 'World',
                channel: mapping.channel ? mapping.channel : 'All',
                configuration: mapping.config ? mapping.config : 'All',
                source: mapping.source ? mapping.source : null,
                type: mapping.type ? mapping.type : 'Net Receipts',
                rate: parseFloat(term.rate),
              };
              contract.salesTerms.push(salesTerm);
            }
            termCb();
          }, (err) => {
            // Remove duplicates
            contract.salesTerms = contract.salesTerms.filter((value, index, self) => self.indexOf(value) === index).filter(Boolean);
            contract.save()
              .then(() => {
                count += 1;
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb();
              });
          });
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    }, (err) => {
      callback(err, count);
    });
  } else {
    callback(new Error('No data passed to function'));
  }
};

importSchema.methods.createPublisherComposers = function (callback) {
  const foundImport = this;
  let count = 0;
  // Download file
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingComposers, process.env.S3_bucket, (error, localFile) => {
    // Open file by template
    importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.publishingComposers, 0, 1, null, (err, data) => {
      logger.info(data);
      // Loop create a composer for each
      async.each(data, (composerData, cb) => {
        Composer.findOne({ clientId: foundImport.clientId, lowerCaseName: LowerCaseString(`${composerData.firstName} ${composerData.surname}`) })
          .then((foundComposer) => {
            if (foundComposer) {
              count += 1;
              cb();
            } else {
              const composer = new Composer(composerData);
              composer.clientId = foundImport.clientId;
              composer.performancePro = composer.mainPro;
              composer.name = `${composer.firstName} ${composer.surname}`;
              composer.controlled = composerData.controlled === 'Yes';
              composer.save()
                .then(() => {
                  count += 1;
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  // Maybe shouldn't cb error here in the async.each loop
                  // But it seems wrong to not pass it and also not increment count
                  cb(err);
                });
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }, (err) => {
        callback(err, count);
      });
    });
  });
};

importSchema.methods.createPublisherPublishers = function (callback) {
  const foundImport = this;
  let count = 0;
  // Download file
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingPublishers, process.env.S3_bucket, (error, localFile) => {
    // Open file by template
    importXlsx.getDataByTemplate(localFile, config.counterpointTemplates.publishingPublishers, 0, 1, null, (err, data) => {
      if (err) { logger.info(err); }
      // Loop create a publisher for each
      async.each(data, (publisherData, cb) => {
        Publisher.findOne({ clientId: foundImport.clientId, lowerCaseName: LowerCaseString(publisherData.name) })
          .then((foundPublisher) => {
            if (foundPublisher) {
              count += 1;
              cb();
            } else {
              const publisher = new Publisher(publisherData);
              publisher.clientId = foundImport.clientId;
              publisher.performancePro = publisher.mainPro;
              publisher.controlled = publisherData.controlled === 'Yes';
              publisher.save()
                .then(() => {
                  count += 1;
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }, (err) => {
        callback(err, count);
      });
    });
  });
};

importSchema.methods.createPublishingWorks = function (callback) {
  const foundImport = this;
  let count = 0;
  const TerritoryGroup = require('./territoryGroup');
  const opener = foundImport.transferringSystem == 'Linked Publishing' ? foundImport.openLinkedPublishingCatalogueExport : foundImport.openPublishingCatalogueExport;
  opener(foundImport, (err, data) => {
    if (err) {
      callback(err);
    } else {
      logger.info('No of Work Lines:', data.length);
      createImportCatalogueItems(data, foundImport)
        .then(() => {
          async.eachLimit(data, 20, (workData, cb) => {
            Work.findOne({ clientId: foundImport.clientId, [`submitterWorkNos.${foundImport?.transferringParty}`]: `${workData.foreignId}` })
              .then((foundWork) => {
                const work = foundWork || new Work({
                  clientId: foundImport.clientId,
                  title: workData.title,
                  iswc: workData.iswc,
                  submitterWorkNos: { [foundImport?.transferringParty]: workData.foreignId },
                });

                const useIdentifiersAsMainIdentifiers = foundImport?.defaults?.setMainIdentifier;
                if (useIdentifiersAsMainIdentifiers && !work.identifier) {
                  work.identifier = workData.foreignId;
                } else if (!useIdentifiersAsMainIdentifiers) {
                  work.foreignId = workData.foreignId;
                }
                if (!work.iswc) {
                  work.iswc = workData.iswc;
                }
                work.notes = workData.notes;
                work.title = workData.title;

                if (work?.source.length && !work?.source.find(({ importId }) => importId.toString() === foundImport._id.toString())) {
                  const source = {
                    importId: foundImport._id,
                    importPartnerId: foundImport.importPartnerId._id,
                    action: 'Updated',
                    date: new Date(),
                  };
                  work.source = [...work.source, source];
                }

                // Set any PRO Mappings
                Object.keys(workData).forEach((key) => {
                  // Find any key that includes 'Work Number(s)', and that it has a value
                  if (key && key.includes('Work Number(s)') && workData[key] && workData[key] !== '') {
                    // Get the PRO from the string
                    let proName = key.split('Work Number(s)')[0];
                    proName = String(proName).trim();
                    const mappedPro = foundImport.mappings.societies[proName] ? foundImport.mappings.societies[proName] : proName;
                    // Add identifier to the output
                    work.societyIdentifiers = work.societyIdentifiers || [];
                    // Identifiers are split by semi-colons in this import
                    workData[key].split(';').forEach((identifier) => {
                      work.societyIdentifiers.push({ society: mappedPro, identifier });
                    });
                  }
                });
                // Set Catalogue Groups
                if (foundImport.defaults && foundImport.defaults.catalogueGroups && foundImport.defaults.catalogueGroups.length > 0) {
                  work.catalogueGroups = [].concat(work.catalogueGroups, foundImport.defaults.catalogueGroups);
                }
                // Reset Rights Chain
                work.rightsChain = [];
                async.parallel([
                  function (paraCb) {
                    if (workData.territoryCode) {
                      // Map Territories
                      const territory = foundImport.mappings.territories[workData.territoryCode];
                      if (territory && territory.length == 24) {
                        TerritoryGroup.findById(territory)
                          .then((territoryGroup) => {
                            if (territoryGroup) { work.territories = territoryGroup.territories; }
                            paraCb();
                          })
                          .catch((err) => {
                            logger.error(err);
                            paraCb(err);
                          });
                      } else {
                        work.territories = TerritoryHelper.continentToTerritoryCodes(territory);
                        paraCb();
                      }
                    } else {
                      paraCb();
                    }
                  },
                  function (paraCb) {
                    // Map Contracts
                    if (workData.clients && workData.clients.length > 0) {
                      // Reset rights;
                      work.salesReturnsRights = [];
                      work.salesReturnsRightsDisplay = [];
                    }
                    logger.debug(workData);
                    async.each(workData.clients, (clientData, clientCb) => {
                      Contract.findOne({ clientId: foundImport.clientId, name: clientData.Name })
                        .then((contract) => {
                          if (contract) {
                            work.salesReturnsRights.push({ contractId: contract._id.toString(), percentage: parseFloat(clientData.Share), displayPercentage: parseFloat(clientData.Share) });
                            work.salesReturnsRightsDisplay.push({ contractId: contract._id.toString(), percentage: parseFloat(clientData.Share), displayPercentage: parseFloat(clientData.Share) });
                          }
                          clientCb();
                        })
                        .catch((err) => {
                          logger.error(err);
                          clientCb(err);
                        });
                    }, (err) => {
                      // Add default contracts
                      if (foundImport.defaults.contracts && foundImport.defaults.contracts.length > 0) {
                        // Prevent previously attached contracts from attaching twice
                        const usedContractIds = work.salesReturnsRights.map((right) => right.contractId);
                        foundImport.defaults.contracts.forEach((contract) => {
                          if (!usedContractIds.includes(contract.contractId)) {
                            work.salesReturnsRights.push({ contractId: contract.contractId, percentage: parseFloat(contract.percentage), displayPercentage: parseFloat(contract.percentage) });
                            work.salesReturnsRightsDisplay.push({ contractId: contract.contractId, percentage: parseFloat(contract.percentage), displayPercentage: parseFloat(contract.percentage) });
                          }
                        });
                        paraCb();
                      } else {
                        paraCb();
                      }
                    });
                  },
                  function (paraCb) {
                    // Reorganise chain
                    workData.chains = reorganiseChains(workData.chains);
                    logger.info('Updated Chains:');
                    logger.info(workData.chains);
                    // Map IP Chain
                    const mainRightsChain = [];
                    async.eachSeries(workData.chains, (chainData, chainCb) => {
                      logger.info(chainData);
                      let ipChain;
                      const composers = [];
                      async.eachSeries(chainData, (ipData, ipCb) => {
                        if (ipData) {
                          if (ipData.Type == 'P') {
                            const query = { $or: [] };
                            const caeWithoutLeadingZeros = removeLeadingZeros(ipData['CAE No']);
                            if (ipData['CAE No'] && caeWithoutLeadingZeros) {
                              query.$or = query.$or.concat([
                                { clientId: foundImport.clientId, cae: ipData['CAE No'] },
                                { clientId: foundImport.clientId, cae: caeWithoutLeadingZeros },
                                { clientId: foundImport.clientId, caeWithoutLeadingZeros },
                              ]);
                            }
                            if (ipData.Name) {
                              query.$or.push({ clientId: foundImport.clientId, lowerCaseName: LowerCaseString(ipData.Name) });
                            }
                            if (ipData['Music Maestro Code'] && ipData['Music Maestro Code'] !== '') {
                              query.$or.push({ clientId: foundImport.clientId, foreignId: ipData['Music Maestro Code'] });
                            }
                            async.waterfall([
                              function (waterfallCb) {
                                // Find publisher from query
                                Publisher.findOne(query)
                                  .then((publisher) => {
                                    waterfallCb(null, publisher);
                                  })
                                  .catch((err) => {
                                    logger.error(err);
                                    waterfallCb(err);
                                  });
                              },
                              function (publisher, waterfallCb) {
                                if (publisher) {
                                  waterfallCb(null, publisher);
                                } else {
                                  const mainPro = foundImport.mappings.societies[ipData.Affiliation] ? foundImport.mappings.societies[ipData.Affiliation] : ipData.Affiliation;
                                  publisher = new Publisher({ clientId: foundImport.clientId, name: ipData.Name, foreignId: ipData['Music Maestro Code'], mainPro });
                                  if (ipData['CAE No'] && ipData['CAE No'] !== '' && ipData['CAE No'] !== '0') {
                                    publisher.cae = ipData['CAE No'];
                                    publisher.mainProIdentifier = ipData['CAE No'];
                                  }
                                  Publisher.countDocuments({ clientId: foundImport.clientId, name: ipData.Name })
                                    .then((count) => {
                                      if (count > 0) {
                                        logger.info(`New Publisher: ${publisher.name} (${ipData['Music Maestro Code']})`);
                                        publisher.name = `${publisher.name} (${ipData['Music Maestro Code']})`;
                                      }
                                      publisher.save()
                                        .then((savedPublisher) => {
                                          waterfallCb(null, savedPublisher);
                                        })
                                        .catch((err) => {
                                          logger.error(err);
                                          waterfallCb(err);
                                        });
                                    })
                                    .catch((err) => {
                                      logger.error(err);
                                      waterfallCb(err);
                                    });
                                }
                              },
                              function (publisher, waterfallCb) {
                                const newIpChain = {
                                  type: 'Publisher',
                                  publisherId: publisher._id.toString(),
                                  contractType: foundImport.mappings.capacities[ipData.Capacity],
                                  controlled: ipData.Controlled == 'Y',
                                  mechanicalOwnership: ipData['MO Share'] ? parseFloat(ipData['MO Share']) : 0,
                                  performanceOwnership: ipData['PO Share'] ? parseFloat(ipData['PO Share']) : 0,
                                  mechanicalCollection: ipData['MC Share'] ? parseFloat(ipData['MC Share']) : 0,
                                  performanceCollection: ipData['PC Share'] ? parseFloat(ipData['PC Share']) : 0,
                                  children: [],
                                };
                                logger.info('New IP Chain:', newIpChain);
                                if (ipChain) {
                                  newIpChain.children.push(ipChain);
                                  ipChain = newIpChain;
                                } else {
                                  newIpChain.children = composers;
                                  ipChain = newIpChain;
                                }
                                // Add onto main object if last
                                if (ipData == chainData[chainData.length - 1]) { mainRightsChain.push(ipChain); }
                                waterfallCb();
                              },
                            ], ipCb);
                          } else if (ipData.Type == 'C') {
                            const query = { $or: [] };
                            const name = formatComposerName(ipData.Name);
                            const caeWithoutLeadingZeros = removeLeadingZeros(ipData['CAE No']);
                            if (ipData['CAE No'] && caeWithoutLeadingZeros) {
                              query.$or = query.$or.concat([
                                { clientId: foundImport.clientId, cae: ipData['CAE No'] },
                                { clientId: foundImport.clientId, cae: caeWithoutLeadingZeros },
                                { clientId: foundImport.clientId, caeWithoutLeadingZeros },
                              ]);
                            }
                            if (ipData.Name) {
                              query.$or = query.$or.concat([
                                { clientId: foundImport.clientId, lowerCaseName: LowerCaseString(name), cae: { $eq: null } },
                                { clientId: foundImport.clientId, lowerCaseName: LowerCaseString(name), cae: { $eq: '00000000000' } },
                              ]);
                            }
                            if (ipData['Music Maestro Code'] && ipData['Music Maestro Code'] !== '') {
                              query.$or.push({ clientId: foundImport.clientId, foreignId: ipData['Music Maestro Code'] });
                            }

                            async.waterfall([
                              function (waterfallCb) {
                                // Find composer from query
                                Composer.findOne(query)
                                  .then((composer) => {
                                    waterfallCb(null, composer);
                                  })
                                  .catch((err) => {
                                    logger.error(err);
                                    waterfallCb(err);
                                  });
                              },
                              function (composer, waterfallCb) {
                                if (composer) {
                                  waterfallCb(null, composer);
                                } else {
                                  const mainPro = foundImport.mappings.societies[ipData.Affiliation] ? foundImport.mappings.societies[ipData.Affiliation] : ipData.Affiliation;
                                  composer = new Composer({ clientId: foundImport.clientId, name, foreignId: ipData['Music Maestro Code'], mainPro });
                                  if (ipData['CAE No'] && ipData['CAE No'] !== '' && ipData['CAE No'] !== '0') {
                                    composer.cae = ipData['CAE No'];
                                    composer.mainProIdentifier = ipData['CAE No'];
                                  }
                                  logger.info(`New Composer: ${composer.name}`);
                                  composer.save()
                                    .then((savedComposer) => {
                                      waterfallCb(null, savedComposer);
                                    })
                                    .catch((err) => {
                                      logger.error(err);
                                      waterfallCb(err);
                                    });
                                }
                              },
                              function (composer, waterfallCb) {
                                const newComposer = {
                                  type: 'Composer',
                                  composerId: composer._id.toString(),
                                  contractType: foundImport.mappings.capacities[ipData.Capacity],
                                  controlled: ipData.Controlled == 'Y',
                                  mechanicalOwnership: ipData['MO Share'] ? parseFloat(ipData['MO Share']) : 0,
                                  performanceOwnership: ipData['PO Share'] ? parseFloat(ipData['PO Share']) : 0,
                                  mechanicalCollection: ipData['MC Share'] ? parseFloat(ipData['MC Share']) : 0,
                                  performanceCollection: ipData['PC Share'] ? parseFloat(ipData['PC Share']) : 0,
                                };
                                composers.push(newComposer);
                                // Add onto main object if last
                                if (ipData == chainData[chainData.length - 1]) {
                                  if (ipChain) {
                                    mainRightsChain.push(ipChain);
                                  } else {
                                    // add single uncontrolled composer
                                    if (!newComposer.controlled) { mainRightsChain.push(newComposer); }
                                  }
                                }
                                waterfallCb();
                              },
                            ], ipCb);
                          } else {
                            logger.info('ALIEN DATA TYPE:', ipData.Type);
                            ipCb();
                          }
                        } else {
                          ipCb();
                        }
                      }, chainCb);
                    }, (err) => {
                      if (err) {
                        logger.error(err);
                      }
                      logger.info('mainRightsChain:', mainRightsChain);
                      // Add default claiming party to top of controlled chain
                      if (foundImport.defaults && foundImport.defaults.claimingParty && foundImport.defaults.claimingParty.publisherId && mainRightsChain[0] && mainRightsChain[0].controlled) {
                        const additionalMainRightsChain = {
                          type: 'Publisher',
                          publisherId: foundImport.defaults.claimingParty.publisherId,
                          contractType: foundImport.defaults.claimingParty.contractType,
                          controlled: true,
                          mechanicalOwnership: 0,
                          performanceOwnership: 0,
                          mechanicalCollection: mainRightsChain[0].mechanicalCollection,
                          performanceCollection: mainRightsChain[0].performanceCollection,
                          children: [],
                        };
                        mainRightsChain[0].mechanicalCollection = 0;
                        mainRightsChain[0].performanceCollection = 0;
                        additionalMainRightsChain.children = mainRightsChain;

                        work.rightsChain.push({ territory: 'WW', children: [additionalMainRightsChain] });
                      } else {
                        work.rightsChain.push({ territory: 'WW', children: mainRightsChain });
                      }
                      paraCb(err);
                    });
                  },
                  function (paraCb) {
                    // Map Recordings
                    if (workData.recordings) {
                      async.eachSeries(workData.recordings, (recordingData, recordingCb) => {
                        if (recordingData.ISRC) {
                          if (recordingData.ISRC) { recordingData.ISRC = recordingData.ISRC.split('-').join(); }
                          async.waterfall([
                            function (waterfallCb) {
                              // Find or Create Track
                              Track.findOne({ clientId: foundImport.clientId, isrc: recordingData.ISRC })
                                .then((track) => {
                                  if (!track) {
                                    track = new Track({
                                      clientId: foundImport.clientId,
                                      title: recordingData.Title ? recordingData.Title : workData.title,
                                      isrc: recordingData.ISRC,
                                      duration: durationToSeconds(recordingData.duration),
                                    });
                                    track.save()
                                      .then(() => {
                                        waterfallCb(null, track);
                                      })
                                      .catch((err) => {
                                        logger.error(err);
                                        waterfallCb(err);
                                      });
                                  } else {
                                    waterfallCb(null, track);
                                  }
                                })
                                .catch((err) => {
                                  logger.error(err);
                                  waterfallCb(err);
                                });
                            },
                            function (track, waterfallCb) {
                              // Associate with work
                              if (track) {
                                work.trackIds = [];
                                work.trackIds.push(track._id.toString());
                                waterfallCb(null, track);
                              } else {
                                waterfallCb();
                              }
                            },
                            function (track, waterfallCb) {
                              // Find or Create Release
                              logger.info(track);
                              logger.info(recordingData);
                              if (track && recordingData['Catalog Number']) {
                                Release.findOne({ clientId: foundImport.clientId, catNo: recordingData['Catalog Number'] })
                                  .then((release) => {
                                    if (!release) {
                                      release = new Release({
                                        clientId: foundImport.clientId,
                                        title: recordingData['Album Title'],
                                        catNo: recordingData['Catalog Number'],
                                        label: recordingData['Label Name'],
                                      });
                                    }
                                    if (release.trackIds.indexOf(track._id.toString()) === -1) { release.trackIds.push(track._id.toString()); }
                                    logger.info(release);
                                    release.save()
                                      .then(() => {
                                        waterfallCb();
                                      })
                                      .catch((err) => {
                                        logger.error(err);
                                        waterfallCb(err);
                                      });
                                  })
                                  .catch((err) => {
                                    logger.error(err);
                                    waterfallCb(err);
                                  });
                              } else {
                                waterfallCb();
                              }
                            },
                          ], recordingCb);
                        } else {
                          recordingCb();
                        }
                      }, paraCb);
                    } else {
                      paraCb();
                    }
                  },
                ], (err) => {
                  logger.info('Saving Work');
                  logger.info(work);
                  work.save()
                    .then(() => {
                      count += 1;

                      // Save the progress
                      if (count % 100 === 0) {
                        foundImport.ingestedWorks = count;
                        foundImport.save()
                          .then(() => {
                            cb();
                          })
                          .catch((err) => {
                            logger.error(err);
                            cb();
                          });
                      } else cb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      // It seems err is explicitly ignored here so will follow suit
                      cb();
                    });
                });
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }, (err) => {
            callback(err, count);
          });
        })
        .catch(callback);
    }
  });
};

const createImportCatalogueItems = async function (data, foundImport) {
  logger.info(`Creating catalogue data for import ${foundImport._id}`);
  const useIdentifiersAsMainIdentifiers = foundImport?.defaults?.setMainIdentifier;
  const { clientId } = foundImport;
  const works = {};
  const composers = {};
  const publishers = {};
  const tracks = {};
  const releases = {};

  for (const workData of data) {
    const work = {
      clientId: foundImport.clientId,
      title: workData.title,
      iswc: workData.iswc,
    };
    if (useIdentifiersAsMainIdentifiers) {
      work.identifier = workData.foreignId;
    } else {
      work.foreignId = workData.foreignId;
    }

    works[workData.foreignId] = work;
    // Map IP chain
    workData.chains = reorganiseChains(workData.chains);
    for (const chainData of workData.chains) {
      for (const ipData of chainData) {
        if (ipData) {
          if (ipData.Type === 'P') {
            const mainPro = foundImport.mappings.societies[ipData.Affiliation] ? foundImport.mappings.societies[ipData.Affiliation] : ipData.Affiliation;
            const publisher = { clientId: foundImport.clientId, name: ipData.Name, foreignId: ipData['Music Maestro Code'], mainPro };
            if (ipData['CAE No'] && ipData['CAE No'] !== '' && ipData['CAE No'] !== '0') {
              publisher.cae = ipData['CAE No'];
              publisher.mainProIdentifier = ipData['CAE No'];

              publishers[publisher.cae] = publisher;
            } else {
              publishers[publisher.name] = publisher;
            }
          } else if (ipData.Type === 'C') {
            const mainPro = foundImport.mappings.societies[ipData.Affiliation] ? foundImport.mappings.societies[ipData.Affiliation] : ipData.Affiliation;
            const name = formatComposerName(ipData.Name);
            const composer = { clientId: foundImport.clientId, name, foreignId: ipData['Music Maestro Code'], mainPro };
            if (ipData['CAE No'] && ipData['CAE No'] !== '' && ipData['CAE No'] !== '0') {
              composer.cae = ipData['CAE No'];
              composer.mainProIdentifier = ipData['CAE No'];

              composers[composer.cae] = composer;
            } else {
              composers[composer.name] = composer;
            }
          }
        }
      }
    }
    // Map Recordings
    if (workData.recordings) {
      for (const recordingData of workData.recordings) {
        if (recordingData.ISRC) {
          if (recordingData.ISRC) { recordingData.ISRC = recordingData.ISRC.split('-').join(); }
          const track = { clientId: foundImport.clientId, title: recordingData.Title ? recordingData.Title : workData.title, isrc: recordingData.ISRC, duration: durationToSeconds(recordingData.duration) };
          tracks[track.isrc] = track;
          if (recordingData['Catalog Number']) {
            const release = { clientId: foundImport.clientId, title: recordingData['Album Title'], catNo: recordingData['Catalog Number'], label: recordingData['Label Name'] };
            releases[release.catNo] = release;
          }
        }
      }
    }
  }

  // Create Works
  logger.debug(`Creating ${works.length} works..`);

  let workPartyNo = 1;
  const lastWork = await Work.find({ clientId: foundImport.clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).limit(1);
  if (lastWork?.[0]?.partyNo) { workPartyNo = lastWork[0].partyNo + 1; }

  await async.eachOfLimit(works, 1, async (work) => {
    const workIdentifier = useIdentifiersAsMainIdentifiers ? work.identifier : work.foreignId;
    const count = await Work.countDocuments({ clientId: foundImport.clientId, [`submitterWorkNos.${foundImport?.transferringParty}`]: `${workIdentifier}` });
    if (!count) {
      work.submitterWorkNos = { [foundImport?.transferringParty]: workIdentifier };
      work.partyNo = workPartyNo;
      workPartyNo += 1;

      const source = {
        importId: foundImport._id,
        importPartnerId: foundImport.importPartnerId._id,
        action: 'Created',
        date: new Date(),
      };
      work.source = [source];

      await new Work(work).save().catch(logger.error);
    }
  });

  // Create Publishers
  logger.debug(`Creating ${publishers.length} publishers..`);

  let publisherPartyNo = 1;
  const lastPublisher = await Publisher.find({ clientId: foundImport.clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).limit(1);
  if (lastPublisher?.[0]?.partyNo) { publisherPartyNo = lastPublisher[0].partyNo + 1; }

  await async.eachOfLimit(publishers, 10, async (publisher) => {
    const query = { $or: [] };
    if (publisher.cae && publisher.cae !== '' && publisher.cae !== '0') {
      query.$or.push({ clientId, cae: publisher.cae });
    } else {
      query.$or.push({ clientId, name: publisher.name });
    }
    if (publisher.foreignId && publisher.foreignId !== '') {
      query.$or.push({ clientId: foundImport.clientId, foreignId: publisher.foreignId });
    }

    const count = await Publisher.countDocuments(query);
    if (!count) {
      if (publisherPartyNo) {
        publisher.partyNo = publisherPartyNo;
        publisherPartyNo += 1;
      }

      await new Publisher(publisher).save().catch(logger.error);
    }
  });

  // Create Composers
  logger.debug(`Creating ${composers.length} composers..`);

  let composerPartyNo = 1;
  const lastComposer = await Publisher.find({ clientId: foundImport.clientId }, { partyNo: 1 }).sort({ partyNo: -1 }).limit(1);
  if (lastComposer?.[0]?.partyNo) { composerPartyNo = lastComposer[0].partyNo + 1; }

  await async.eachOfLimit(composers, 10, async (composer) => {
    const query = { $or: [] };
    if (composer.cae && composer.cae !== '' && composer.cae !== '0') {
      query.$or.push({ clientId: foundImport.clientId, cae: composer.cae });
    } else {
      query.$or.push({ clientId: foundImport.clientId, name: composer.name });
    }
    if (composer.foreignId && composer.foreignId !== '') {
      query.$or.push({ clientId: foundImport.clientId, foreignId: composer.foreignId });
    }
    const count = await Composer.countDocuments(query);
    if (!count) {
      composer.partyNo = composerPartyNo;
      composerPartyNo += 1;

      await new Composer(composer).save().catch(logger.error);
    }
  });

  // Create Tracks
  logger.debug(`Creating ${tracks.length} tracks..`);
  await async.eachOfLimit(tracks, 10, async (track) => {
    const count = await Track.countDocuments({ clientId: foundImport.clientId, isrc: track.foreignId });
    if (!count) { await new Track(track).save().catch(logger.error); }
  });

  // Create Release
  logger.debug(`Creating ${releases.length} releases..`);
  await async.eachOfLimit(releases, 10, async (release) => {
    const count = await Track.countDocuments({ clientId: foundImport.clientId, catNo: release.catNo });
    if (!count) { await new Release(release).save().catch(logger.error); }
  });
};

function reorganiseChains(chains) {
  logger.info('Input Chains:');
  logger.info(chains);
  const array = [];
  if (chains) {
    chains.forEach((chain, chainIndex) => {
      chain.forEach((ip, ipIndex) => {
        const chainNo = parseInt(ip['Chain No']);
        // chainNo = chainNo || chainNo == 0 ? chainNo - 1 : 0;
        array[chainNo] = array[chainNo] || [];
        array[chainNo][ipIndex] = ip;
      });
    });
  }
  return array.filter(Boolean);
}

function durationToSeconds(duration) {
  if (duration) {
    const split = duration.split(':');
    let seconds = parseInt(split[1]);
    seconds += (parseInt(split[0]) * 60);
    return seconds;
  }
  return undefined;
}
// SR1
importSchema.methods.sr1PublishingFilesValidation = function (callback) {
  this.pullSr1PublishingValues(() => {
    callback([]);
  });
};

importSchema.methods.openSr1PublishingCatalogueExport = function (callback) {
  const foundImport = this;
  fileManager.downloadFromS3(foundImport.counterpointFiles.publishingCatalogueExport, process.env.S3_bucket, (error, localFile) => {
    // const localFile = appRootDir + "/tmp/hostpialPublishing.xlsx";
    const options = {
      tab: 0,
      startingLine: 0,
      startingColumn: 0,
      delimiter: ',',
    };
    fileOpener.extractData(localFile, options, (err, totalTabs, data) => {
      const works = [];
      // Pull headers from first row in file
      const headers = data.shift();
      // Loop through each row of data
      async.each(data, (row, cb) => {
        const work = {};
        // Loop through each value in row
        async.forEachOf(row, (field, index, rowCb) => {
          // Map to correct field based on value
          mapFieldToValue(work, headers, field, index, rowCb);
        }, (err) => {
          works.push(work);
          cb();
        });
      }, (err) => {
        callback(err, works);
      });
    });
  });

  function mapFieldToValue(work, headers, field, index, callback) {
    if (headers[index].includes('Contributor') || headers[index].includes('Publisher') || headers[index].includes('Administrator') || headers[index].includes('Collector') || headers[index].includes('Administered') && !headers[index].includes('Territory')) {
      // Map Chain
      mapChain(work, headers[index], field, callback);
    } else if (headers[index].includes('ISRC')) {
      // Map Recordings
      mapRecording(work, headers[index], field, callback);
    } else {
      // Map straight to field
      work[mapFieldName(headers[index])] = field;
      callback();
    }
  }

  function mapFieldName(fieldName) {
    switch (fieldName) {
      case 'SR1 Work ID':
        return 'foreignId';
      case 'Work Title':
        return 'title';
      case 'Writers':
        return 'composer';
      case 'ISWC':
        return 'iswc';
      case 'Work ID':
        return 'identifier';
      case 'Song Notes':
        return 'notes';
      case 'Territory Administered':
        return 'territoryCode';
      default:
        return fieldName;
    }
  }

  function mapChain(work, header, field, callback) {
    if (field) {
      // Create chains if it doesn't exist
      work.chains = work.chains || [[]];
      // Get functions for each
      const split = header.split(' ');
      const chainNo = parseInt(split.pop());
      const ipFieldName = mapFieldName(split.join(' '));
      // Create chain if it doesn't exist
      work.chains[0][chainNo] = work.chains[0][chainNo] || {};
      // Add field to IP object
      work.chains[0][chainNo][ipFieldName] = field;
    }
    callback();
  }

  function mapRecording(work, header, field, callback) {
    if (field) {
      // Get functions for each
      work.recordings = field.split(';');
    }
    callback();
  }
};

importSchema.methods.pullSr1PublishingValues = function (callback) {
  const foundImport = this;
  // Get values from catalogue export
  const capacities = [];
  const societies = [];
  const territories = [];
  async.waterfall([
    function (cb) {
      // Get data from catalogue file
      foundImport.openSr1PublishingCatalogueExport(cb);
    },
    function (catalogueData, cb) {
      // Pull values from data
      async.each(catalogueData, (item, itemCb) => {
        territories.push(item.territoryCode);
        if (item && item.chains) {
          item.chains.forEach((chain) => {
            if (chain) {
              chain.forEach((ip) => {
                societies.push(ip['Contributor PRO']);
                capacities.push(ip['Contributor Role']);
              });
            }
          });
        }
        itemCb();
      }, cb);
    },
  ], (err) => {
    foundImport.valuesForMapping.capacities = capacities.filter(onlyUnique).filter(Boolean);
    foundImport.valuesForMapping.societies = societies.filter(onlyUnique).filter(Boolean);
    foundImport.valuesForMapping.territories = territories.filter(onlyUnique).filter(Boolean);
    const sr1PublishingValues = { capacities: capacities.filter(onlyUnique).filter(Boolean), societies: societies.filter(onlyUnique).filter(Boolean), territories: territories.filter(onlyUnique).filter(Boolean) };
    foundImport.save()
      .then(() => {
        callback(null, sr1PublishingValues);
      })
      .catch((err) => {
        logger.error(err);
        callback(err, sr1PublishingValues);
      });

    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index;
    }
  });
};

importSchema.methods.runSr1PublishingImport = function (curveUser, callback) {
  const foundImport = this;
  let worksData;
  // Payees, contracts, composers, publishers, works
  async.waterfall([
    function (cb) {
      foundImport.openSr1PublishingCatalogueExport((err, data) => {
        if (err) { logger.error(err); }
        worksData = data;
        cb(err);
      });
    },
    function (cb) {
      async.eachSeries(worksData, (work, workCb) => {
        importSr1Work(foundImport, work, workCb);
      }, cb);
    },
  ], (err, result) => {
    if (err) { logger.error(err); }
    foundImport.status = 'Complete';
    foundImport.save()
      .catch((err) => {
        logger.error(err);
      });
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'bulkPublishingImportComplete',
          curveUser,
          client,
          subject: `Your Import ${foundImport.name} Has Completed`,
          file: foundImport.name,
          payees: foundImport.ingestedPayees,
          contracts: foundImport.ingestedContracts,
          composers: foundImport.ingestedComposers,
          publishers: foundImport.ingestedPublishers,
          works: foundImport.ingestedWorks,
        };
        Notification.generate('Bulk import complete', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
    if (callback) { callback(err); }
  });
};

function importSr1Work(foundImport, workData, callback) {
  if (workData) {
    // Prepare Work
    logger.info('Input Data:');
    logger.info(workData);
    Work.countDocuments({ clientId: foundImport.clientId, identifier: workData.identifier })
      .then((count) => {
        if (count == 0) {
          const work = new Work({
            clientId: foundImport.clientId,
            title: workData.title,
            foreignId: workData.foreignId,
            composer: workData.composer,
            iswc: workData.iswc,
            territories: TerritoryHelper.allTerritories,
          });
          // Match to identifier or tunecode
          if (workData.identifier && workData.identifier.includes('SITKOK')) {
            work.identifier = workData.identifier;
          } else {
            work.tunecode = workData.identifier;
          }
          const rightsChain = { territory: 'WW', children: [] };
          const publishers = {};
          const publisherPercentages = {};
          const admins = {};
          const adminPercentages = {};
          async.waterfall([
            function (cb) {
              // Loop through chains - create or find composer, create or find publishers, piece together ip chain
              if (workData.chains && workData.chains[0]) {
                async.eachSeries(workData.chains[0], (composerData, composerCb) => {
                  if (composerData) {
                    async.waterfall([
                      function (waterfallCb) {
                        // Admin
                        if (composerData['Administrator Name'] && composerData['Administrator Name'] != composerData['Publisher Name']) {
                          // Create Admin if it's different to the publisher
                          findOrCreateAdmin(composerData, (err, admin) => {
                            if (err) {
                              logger.error(err);
                              waterfallCb(err);
                            } else if (admin) {
                              // Add publisher percentages to object
                              adminPercentages[admin.name] = publisherPercentages[admin.name] || 0;
                              adminPercentages[admin.name] += composerData['Administered Share %'];
                              // Add to object if it doesn't exist
                              admins[composerData['Publisher Name']] = admin;
                              waterfallCb(err);
                            } else {
                              waterfallCb();
                            }
                          });
                        } else {
                          waterfallCb();
                        }
                      },
                      function (waterfallCb) {
                        // Publisher
                        findOrCreatePublisher(composerData, (err, publisher) => {
                          if (err) {
                            logger.error(err);
                            waterfallCb(err);
                          } else if (publisher) {
                            // Add publisher percentages to object
                            publisherPercentages[publisher.name] = publisherPercentages[publisher.name] || 0;
                            // Only add if no admin is present
                            if (!admins[composerData['Publisher Name']]) { publisherPercentages[publisher.name] += composerData['Administered Share %']; }
                            // Add to object if it doesn't exist
                            publishers[publisher.name] = publishers[publisher.name] || [];
                            waterfallCb(err, publisher);
                          } else {
                            waterfallCb();
                          }
                        });
                      },
                      function (publisher, waterfallCb) {
                        if (publisher) {
                          // Composer
                          findOrCreateComposer(composerData, publisher, (err, composer) => {
                            if (err) {
                              logger.error(err);
                              waterfallCb(err);
                            } else if (composer) {
                              publishers[publisher.name].push({
                                _id: composer._id,
                                controlled: publisher.controlled,
                                'Contributor Role': composerData['Contributor Role'],
                                'Contributor Share %': composerData['Contributor Share %'],
                              });
                              waterfallCb();
                            } else {
                              waterfallCb();
                            }
                          });
                        } else {
                          waterfallCb();
                        }
                      },
                    ], composerCb);
                  } else {
                    composerCb();
                  }
                }, (err) => {
                  // Save Publishers and composers to rights chain as children
                  const tempAdmins = {};
                  async.eachSeries(Object.keys(publishers), (publisherName, publisherCb) => {
                    let tempPublisher;
                    async.waterfall([
                      function (waterfallCb) {
                        if (admins[publisherName] && !tempAdmins[publisherName]) {
                          tempAdmins[publisherName] = {
                            type: 'Publisher',
                            publisherId: admins[publisherName]._id.toString(),
                            contractType: 'Admin',
                            controlled: admins[publisherName].controlled,
                            mechanicalOwnership: 0,
                            performanceOwnership: 0,
                            mechanicalCollection: parseFloat(adminPercentages[admins[publisherName].name]),
                            performanceCollection: parseFloat(adminPercentages[admins[publisherName].name]) * 50 / 100,
                            children: [],
                          };
                          waterfallCb();
                        } else {
                          waterfallCb();
                        }
                      },
                      function (waterfallCb) {
                        Publisher.findOne({ clientId: foundImport.clientId, name: publisherName })
                          .then((publisher) => {
                            if (publisher) {
                              tempPublisher = {
                                type: 'Publisher',
                                publisherId: publisher._id.toString(),
                                contractType: 'Original Publisher',
                                controlled: publisher.controlled,
                                children: [],
                              };
                              if (tempAdmins[publisherName]) {
                                tempPublisher.controlled = admins[publisherName].controlled;
                                tempPublisher.mechanicalOwnership = parseFloat(adminPercentages[admins[publisherName].name]);
                                tempPublisher.performanceOwnership = parseFloat(adminPercentages[admins[publisherName].name]) * 50 / 100;
                                tempPublisher.mechanicalCollection = 0;
                                tempPublisher.performanceCollection = 0;
                              } else {
                                tempPublisher.mechanicalOwnership = parseFloat(publisherPercentages[publisher.name]);
                                tempPublisher.performanceOwnership = parseFloat(publisherPercentages[publisher.name]) * 50 / 100;
                                tempPublisher.mechanicalCollection = parseFloat(publisherPercentages[publisher.name]);
                                tempPublisher.performanceCollection = parseFloat(publisherPercentages[publisher.name]) * 50 / 100;
                              }
                            }
                            waterfallCb();
                          })
                          .catch((err) => {
                            logger.error(err);
                            waterfallCb(err);
                          });
                      },
                      function (waterfallCb) {
                        async.eachSeries(publishers[publisherName], (composerInfo, composerInfoCb) => {
                          const tempComposer = {
                            type: 'Composer',
                            composerId: composerInfo._id.toString(),
                            contractType: foundImport.mappings.capacities[composerInfo['Contributor Role']],
                            controlled: composerInfo.controlled,
                            mechanicalOwnership: tempPublisher ? 0 : parseFloat(composerInfo['Contributor Share %']),
                            performanceOwnership: tempPublisher ? parseFloat(composerInfo['Contributor Share %']) * 50 / 100 : parseFloat(composerInfo['Contributor Share %']),
                            mechanicalCollection: tempPublisher ? 0 : parseFloat(composerInfo['Contributor Share %']),
                            performanceCollection: tempPublisher ? parseFloat(composerInfo['Contributor Share %']) * 50 / 100 : parseFloat(composerInfo['Contributor Share %']),
                          };
                          if (tempPublisher) {
                            // Push each composer onto children
                            tempComposer.controlled = tempPublisher.controlled;
                            tempPublisher.children.push(tempComposer);
                          } else {
                            rightsChain.children.push(tempComposer);
                          }
                          composerInfoCb();
                        }, waterfallCb);
                      },
                    ], (err) => {
                      logger.info('TEMP PUBLISHER');
                      logger.info(tempPublisher);
                      if (tempAdmins[publisherName]) {
                        tempAdmins[publisherName].children.push(tempPublisher);
                      } else {
                        rightsChain.children.push(tempPublisher);
                      }
                      publisherCb(err);
                    });
                  }, (err) => {
                    async.eachSeries(Object.keys(tempAdmins), (publisherName, seriesCb) => {
                      logger.info('ADMIN');
                      logger.info(tempAdmins[publisherName]);
                      rightsChain.children.unshift(tempAdmins[publisherName]);
                      seriesCb();
                    }, cb);
                  });
                });
              } else {
                cb();
              }
            },
            function (cb) {
              // Add recordings
              if (workData.recordings && workData.recordings.length > 0) {
                async.eachSeries(workData.recordings, (isrc, isrcCb) => {
                  Track.findOne({ clientId: foundImport.clientId, isrc })
                    .then((track) => {
                      if (track) { work.trackIds.push(track._id.toString()); }
                      isrcCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      isrcCb(err);
                    });
                }, cb);
              } else {
                cb();
              }
            },
          ], (err) => {
            // Complete
            work.rightsChain.push(rightsChain);
            logger.info('Completed Work');
            logger.info(work);
            work.save()
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback();
              });
          });
        } else {
          logger.info('Work with identifier', workData.identifier, 'already exists, skipping');
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    callback();
  }

  function findOrCreatePublisher(composerData, callback) {
    const filter = { clientId: foundImport.clientId };
    if (composerData['Publisher ID (IPI/CAE)']) {
      filter.cae = composerData['Publisher ID (IPI/CAE)'].replace(/\W/g, '');
    } else {
      filter.name = composerData['Publisher Name'];
    }
    logger.info('FILTER:', filter);
    Publisher.findOne(filter)
      .then((publisher) => {
        if (publisher) {
          callback(null, publisher);
        } else {
          const publisher = new Publisher({
            clientId: foundImport.clientId,
            name: composerData['Publisher Name'],
            cae: composerData['Publisher ID (IPI/CAE)'] ? composerData['Publisher ID (IPI/CAE)'].replace(/\W/g, '') : null,
          });
          publisher.save()
            .then((savedPublisher) => {
              callback(null, savedPublisher);
            })
            .catch((err) => {
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }

  function findOrCreateAdmin(composerData, callback) {
    const filter = { clientId: foundImport.clientId };
    if (composerData['Administrator ID (IPI/CAE)']) {
      filter.cae = composerData['Administrator ID (IPI/CAE)'].replace(/\W/g, '');
    } else {
      filter.name = composerData['Administrator Name'];
    }
    Publisher.findOne(filter)
      .then((publisher) => {
        if (publisher) {
          callback(null, publisher);
        } else {
          const publisher = new Publisher({
            clientId: foundImport.clientId,
            name: composerData['Administrator Name'],
            cae: composerData['Administrator ID (IPI/CAE)'] ? composerData['Administrator ID (IPI/CAE)'].replace(/\W/g, '') : null,
          });
          publisher.save()
            .then((savedPublisher) => {
              callback(null, savedPublisher);
            })
            .catch((err) => {
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }

  function findOrCreateComposer(composerData, publisher, callback) {
    const filter = { clientId: foundImport.clientId };
    if (composerData['Contributor ID (IPI/CAE)']) {
      filter.cae = composerData['Contributor ID (IPI/CAE)'].replace(/\W/g, '');
    } else {
      filter.name = `${composerData['Contributor First Name']} ${composerData['Contributor Last Name']}`;
    }
    logger.info('COMPOSER FILTER');
    logger.info(filter);
    Composer.findOne(filter)
      .then((composer) => {
        if (composer) {
          callback(null, composer);
        } else {
          const composer = new Composer({
            clientId: foundImport.clientId,
            name: `${composerData['Contributor First Name']} ${composerData['Contributor Last Name']}`,
            firstName: composerData['Contributor First Name'],
            surname: composerData['Contributor Last Name'],
            cae: composerData['Contributor ID (IPI/CAE)'] ? composerData['Contributor ID (IPI/CAE)'].replace(/\W/g, '') : null,
            mainPro: foundImport.mappings.societies[composerData['Contributor PRO']],
            controlled: publisher.controlled,
          });
          composer.save()
            .then((savedComposer) => {
              callback(null, savedComposer);
            })
            .catch((err) => {
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
}

// CWR
importSchema.methods.runCwrImport = function (curveUser, callback) {
  const foundImport = this;
  // Run import
  IngestCwr.ingest(
    {
      Work,
      Track,
      Release,
      Publisher,
      Composer,
      Import: foundImport,
      s3Key: foundImport.counterpointFiles.publishingCatalogueExport,
      bucket: process.env.S3_bucket,
      clientId: curveUser.clientId,
      defaults: foundImport.defaults,
      submitter: foundImport.transferringParty,
    },
    (err, count, errors) => {
      if (err) {
        logger.error(err);
        foundImport.errors = errors;

        // Send errors to user
        foundImport.status = 'Errored';
        foundImport.errorMessage = err.message;
        foundImport.ingestedWorks = count;
        foundImport.save()
          .catch((err) => {
            logger.error(err);
          });

        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'bulkImportError',
              curveUser,
              client,
              subject: `Your Import ${foundImport.name} Has Errored`,
              file: foundImport.name,
              error: err.message,
            };

            Notification.generate(`Your Import ${foundImport.name} Has Errored`, `${err.message} in file ${foundImport.name}`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else if (errors?.length) {
        // Send confirmation email with count
        foundImport.status = 'Complete';
        foundImport.errorMessage = 'Partially Complete';
        foundImport.errors = errors;
        foundImport.ingestedWorks = count;
        foundImport.save()
          .catch((err) => {
            logger.error(err);
          });

        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'partialImportError',
              curveUser,
              client,
              subject: `Your Import ${foundImport.name} Has Partially Completed`,
              file: foundImport.name,
              error: errors?.map((error) => `${error.error} (${error.title} - ${error.identifier})`),
              count,
            };

            Notification.generate('CWR Bulk import partially completed', `${errors.length} errors in file ${foundImport.name}. ${count} works imported.`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        // Send confirmation email with count
        foundImport.status = 'Complete';
        foundImport.ingestedWorks = count;
        foundImport.save()
          .catch((err) => {
            logger.error(err);
          });

        Client.findById(curveUser.clientId)
          .then((client) => {
            const generateOptions = {
              identifier: 'cwrImportComplete',
              curveUser,
              client,
              subject: `Your Import ${foundImport.name} Has Completed`,
              file: foundImport.name,
              count,
            };

            Notification.generate('CWR Bulk import completed', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
              if (callback) { callback(err, result); }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    },
  );
  // Report to user
};

// Maestro 400 Catalogue Shipment
importSchema.methods.runCsImport = function (curveUser, callback) {
  const foundImport = this;
  // Run import
  IngestCs.ingest({
    Work,
    Release,
    Track,
    Publisher,
    Composer,
    s3Key: foundImport.counterpointFiles.publishingCatalogueExport,
    bucket: process.env.S3_bucket,
    clientId: curveUser.clientId,
    defaults: foundImport.defaults,
    submitter: foundImport.transferringParty,
  }, (err, count, errors) => {
    if (err) {
      logger.error(err);
      foundImport.errors = errors;
      // Send errors to user
      foundImport.status = 'Errored';
      foundImport.errorMessage = err.message;
      foundImport.save()
        .catch((err) => {
          logger.error(err);
        });
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'bulkImportError',
            curveUser,
            client,
            subject: `Your Import ${foundImport.name} Has Errored`,
            file: foundImport.name,
            error: err.message,
          };
          Notification.generate(`Your Import ${foundImport.name} Has Errored`, `${err.message} in file ${foundImport.name}`, null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else if (errors.length) {
      // Send confirmation email with count
      foundImport.status = 'Complete';
      foundImport.errorMessage = 'Partially Complete';
      foundImport.errors = errors;
      foundImport.ingestedWorks = count;
      foundImport.save()
        .catch((err) => {
          logger.error(err);
        });
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'csPartialImportError',
            curveUser,
            client,
            subject: `Your Import ${foundImport.name} Has Partially Completed`,
            file: foundImport.name,
            error: errors,
            count,
          };
          Notification.generate('CS Bulk import partially completed', `${errors.length} errors in file ${foundImport.name}. ${count} works imported.`, null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
      if (callback) { callback(err); }
    } else {
      // Send confirmation email with count
      foundImport.status = 'Complete';
      foundImport.ingestedWorks = count;
      foundImport.save()
        .catch((err) => {
          logger.error(err);
        });
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'cwrImportComplete',
            curveUser,
            client,
            subject: `Your Import ${foundImport.name} Has Completed`,
            file: foundImport.name,
            count,
          };
          Notification.generate('CS Bulk import completed', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
      // Does this line mean callback is called twice? Seems dangerous
      if (callback) { callback(err); }
    }
  });
  // Report to user
};

// Catalogue Shipment
importSchema.methods.runCatalogueShipmentImport = function (curveUser, callback) {
  const foundImport = this;
  foundImport.createPublishingWorks((err, count) => {
    if (err) {
      logger.error(err);
      logger.error(err);
      foundImport.status = 'Errored';
      foundImport.save()
        .catch((err) => {
          logger.error(err);
        });
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'bulkImportError',
            curveUser,
            client,
            subject: `Your Import ${foundImport.name} Has Errored`,
            file: foundImport.name,
            error: [err],
          };
          Notification.generate(`Your Import ${foundImport.name} Has Errored`, `${err} in file ${foundImport.name}`, null, curveUser, generateOptions, (err, result) => {
            if (callback) { callback(err, result); }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      foundImport.ingestedWorks = count;
      foundImport.status = 'Complete';
      foundImport.save()
        .catch((err) => {
          logger.error(err);
        });
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'importComplete',
            curveUser,
            client,
            subject: `Your Import ${foundImport.name} Has Completed`,
            file: foundImport.name,
            count: foundImport.ingestedWorks,
          };
          Notification.generate('Bulk import complete', `Your Import ${foundImport.name} Has Completed`, null, curveUser, generateOptions, (err, result) => {
            if (callback) {
              callback(err, result);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  });
};

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function removeLeadingZeros(value) {
  if (value) {
    return (typeof value === 'string' ? value.replace(/^0+/, '') : String(value)).trim();
  }
  return '';
}

function formatComposerName(name) {
  return ((name ? name.split('|').reverse() : []).join(' ')).trim();
}

const Import = mongoose.model(name, importSchema);

module.exports = Import;
