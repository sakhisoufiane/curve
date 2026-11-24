/**
 * @module ingestSalesFile
 */

const { logger, fileOpener, fileManager, TemplateMatcher, CurveError, ERROR_CODES } = require('@curveroyaltysystems/platform-shared-utils');
const { withDefaultCredentials, createDeleteQuery } = require('@curveroyaltysystems/bigquery');
const fs = require('fs');
const async = require('async');
const moment = require('moment');
const SQS = require('../sqs');
const Mapper = require('./mapper');
const Validate = require('./validate');
const iTunesSpecifics = require('./iTunesSpecifics');
const facebookSpecifics = require('./facebookSpecifics');
const Mappings = require('../mappings');
const salesIngestionUtils = require('./salesIngestionUtils');
const CatalogueOverwritingData = require('../catalogueOverwritingData');

const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const SalesTemplate = require('../../models/salesTemplate');
const LibraryTemplate = require('../../models/libraryTemplate');
const FailedMapping = require('../../models/failedMapping');
const Task = require('../../models/task');

const dateFormat = 'DD/MM/YYYY HH:mm:ss.SS';
const templateMatcher = new TemplateMatcher({ SalesTemplate, LibraryTemplate });

/**
 * The beginning of the ingestion process, this method handles the following
 *
 * * file download from S3
 * * automatic matching to a Sales Template if one is not attached to the Sales File
 * * delete previous sales data for the Sales File
 * * then calls the main ingestion process function
 * * Calls `callback(err, validationData, identification)` with `validationData` containing the validation data & `identification` containing the identification extracted from the file
 * * Calls `callback(err, validationData, identification)` with an `err` message if an error occurs
 *
 * @param {object} data - contains elements required for ingestion (below)
 * @param {object} data.bigQuery - bigQuery instance
 * @param {object} data.salesFile - Sales File document
 * @param {function(string, object, object)} callback - A callback that handles the response
 */
const ingestSalesFile = {
  ingest(data, callback) {
    try {
      async.waterfall([
        function (cb) {
          // Download File and store to local temporary file
          if (!data.salesFile.file) {
            cb(new Error('No file is attached, please upload a file'));
          } else {
            logger.info(`${data.salesFile._id} Downloading file from S3: ${data.salesFile.file}: ${moment().format(dateFormat)}`);
            fileManager.downloadFromS3(data.salesFile.file, process.env.S3_bucket, cb);
          }
        },
        function (localFile, cb) {
          logger.info(`${data.salesFile._id} Downloaded File: ${moment().format(dateFormat)}`);
          // Automatic Matching if no Sales Template
          if (!data.salesFile.salesTemplateId) {
            logger.info(`${data.salesFile._id} No template present, extracting identifiers: ${moment().format(dateFormat)}`);
            ingestSalesFile.matchToTemplate(localFile, data.salesFile, cb);
          } else {
            cb(null, localFile);
          }
        },
        function (localFile, cb) {
          // set up all required information for ingestion process
          logger.info(`${data.salesFile._id} Setting up all required information for ingestion process: ${moment().format(dateFormat)}`);
          ingestSalesFile.ingestionProcessData(data.salesFile, false, false, (ingDataErr, event) => {
            if (ingDataErr) {
              logger.error(`${data.salesFile._id} Error while setting up all required information for ingestion process: ${moment()
                .format(dateFormat)}:`, ingDataErr);
              cb(ingDataErr);
            } else {
              event.localFile = localFile;
              event.bigQuery = data.bigQuery;
              cb(null, event);
            }
          });
        },
        function (event, cb) {
          logger.info(`${event.salesFileId} Removing old sales data: ${moment().format(dateFormat)}`);
          // remove old sales data
          const bigQueryClient = withDefaultCredentials({ datasetName: event.bigQuery.datasetName, inputTable: event.bigQuery.inputTable, retryBackoffTime: 10000 });
          ingestSalesFile.removeOldSales(bigQueryClient, event.salesFileId, event.partitionNo)
            .then(() => {
              logger.info(`${event.salesFileId} Removed Old Sales Data: ${moment().format(dateFormat)}`);
              cb(null, event);
            })
            .catch((removeOldDataErr) => {
              logger.error(`${event.salesFileId} Error removing old sales data: ${moment().format(dateFormat)}`, removeOldDataErr);
              cb(new Error('There was an issue with removing the old data from the database. Please try ingesting again, and if the problem persists, please contact support.'));
            });
        },
        function (event, cb) {
          logger.info(`${event.salesFileId} Processing file ${event.localFile}: ${moment().format(dateFormat)}`);
          // then process the file
          ingestSalesFile.processFile(event.bigQuery, event.localFile, event, cb);
        },
      ], (waterfallErr, output, identification) => {
        if (waterfallErr) {
          logger.error(`${data.salesFile._id} Error during Sales File Ingestion: ${moment().format(dateFormat)}`, waterfallErr);
        } else {
          logger.info(`${data.salesFile._id} Sales File Ingestion complete: ${moment().format(dateFormat)}`);
        }
        callback(waterfallErr, output, identification);
      });
    } catch (catchErr1) {
      // Return Error to API
      logger.error(`${data.salesFile._id} Error during Sales File Ingestion try/catch: ${moment().format(dateFormat)}`, catchErr1);
      callback(catchErr1);
    }
  },

  /**
   * Try matching the uploaded sales file to a template within the client's templates or the template library.
   * If additional sales files are required, these are created and tasks added to ingest these as well.
   * * Calls `callback(localFile, err)` with `localFile` assigned to the localFile provided on the input params
   * * Calls `callback(err)` with an `err` message if an error occurs
   *
   * @param {string} localFile - path to sales file stored locally
   * @param {object} salesFile - Sales File document
   * @param {function(Error)} callback - A callback that handles the response
   */
  matchToTemplate(localFile, salesFile, callback) {
    fileOpener.extractIdentifiers(localFile, (identErr, identifiers, tabNames) => {
      if (identErr) {
        logger.error(`${salesFile._id} Error extracting identifiers: ${moment().format(dateFormat)}`, identErr);
        callback(identErr);
      } else {
        const { clientId } = salesFile;
        const originalSalesFileName = salesFile.name;
        logger.info(`${salesFile._id} Finding matching templates: ${moment().format(dateFormat)}`);
        templateMatcher.findMatchingTemplates(identifiers, clientId, salesFile, (findMatchErr, matches) => {
          if (!findMatchErr && matches.length > 0) {
            logger.info(`${salesFile._id} Processing matches: ${moment().format(dateFormat)}`);
            async.forEachOf(matches, (match, i, eachCb) => {
              if (i === 0) {
                logger.info(`${salesFile._id} Processing original sales file with id ${salesFile._id}: ${moment().format(dateFormat)}`);
                ingestSalesFile.addTemplateInfoToSalesFile(match.templateId, salesFile, (addTplInfoErr) => {
                  if (addTplInfoErr) {
                    logger.error(`${salesFile._id} Error adding Template info to Sales File: ${moment().format(dateFormat)}`, addTplInfoErr);
                    eachCb(addTplInfoErr);
                  } else {
                    logger.info(`${salesFile._id} Added Template info to Sales File: ${moment().format(dateFormat)}`);
                    salesFile.name = ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, originalSalesFileName, tabNames);
                    logger.info(`${salesFile._id} Saving Sales File: ${moment().format(dateFormat)}`);
                    salesFile.save()
                      .then(() => {
                        logger.info(`${salesFile._id} Saving Sales File complete: ${moment().format(dateFormat)}`);
                        eachCb();
                      })
                      .catch((saveFileErr) => {
                        logger.error(`${salesFile._id} Error saving sales file: ${moment().format(dateFormat)}`, saveFileErr);
                        eachCb(saveFileErr);
                      });
                  }
                });
              } else {
                // create additional sales file
                ingestSalesFile.createAdditionalSalesFile(salesFile, match, matches, originalSalesFileName, tabNames, eachCb);
              }
            }, (forEachOfErr) => {
              if (forEachOfErr) {
                logger.error(`${salesFile._id} Error processing matches: ${moment().format(dateFormat)}`, forEachOfErr);
              } else {
                logger.info(`${salesFile._id} Matched templates assignment complete: ${moment().format(dateFormat)}`);
              }
              callback(null, localFile);
            });
          } else {
            logger.info(`${salesFile._id} Saving failed mapping: ${moment().format(dateFormat)}`);
            const failedMapping = new FailedMapping({ clientId: salesFile.clientId, salesFileId: salesFile._id.toString() });
            failedMapping.save()
              .then(() => {
                callback(new CurveError({ message: 'No matching template found', statusCode: ERROR_CODES.salesTemplateNotMatched }));
              })
              .catch((saveFailedMappingErr) => {
                logger.error(`${salesFile._id} Error saving failed mapping: ${moment().format(dateFormat)}`, saveFailedMappingErr);
                callback(new CurveError({ message: 'No matching template found', statusCode: ERROR_CODES.salesTemplateNotMatched }));
              });
          }
        });
      }
    });
  },

  /**
   * Creates an additional sales file
   *
   * @param {object} salesFile - Sales File document
   * @param {object} match - Object containing matched template info
   * @param {array} matches - Array containing all matches
   * @param {string} originalSalesFileName - The name of the original Sales File
   * @param {array} tabNames - an array containing all tab names extracted from the Sales File
   * @param {function(string)} callback - A callback that handles the response
   */
  createAdditionalSalesFile(salesFile, match, matches, originalSalesFileName, tabNames, callback) {
    const salesFileCopy = JSON.parse(JSON.stringify(salesFile));
    delete salesFileCopy._id;
    delete salesFileCopy.file;
    const newSalesFile = new SalesFile(salesFileCopy);
    logger.info(`${salesFile._id} Creating additional sales file with id ${newSalesFile._id}: ${moment().format(dateFormat)}`);
    async.waterfall(
      [
        function (waterfallCb) {
          // copy S3 file
          const sourceKey = salesFile.file;
          const fileName = sourceKey.substr(sourceKey.lastIndexOf('/') + 1);
          const newSalesFileId = newSalesFile._id.toString();
          const destKey = `salesFiles/${newSalesFileId}/${fileName}`;
          logger.info(`${salesFile._id} Copying sales file to: ${destKey}: ${moment().format(dateFormat)}`);
          fileManager.copyS3File(sourceKey, destKey, {}, (copyS3FileErr) => {
            if (copyS3FileErr) {
              logger.error(`${salesFile._id} Error copying sales file: ${moment().format(dateFormat)}`, copyS3FileErr);
              waterfallCb(copyS3FileErr);
            } else {
              newSalesFile.file = destKey;
              waterfallCb();
            }
          });
        },
        function (waterfallCb) {
          logger.info(`${salesFile._id} Adding Template info to Sales File. Template id: ${match.templateId}: ${moment().format(dateFormat)}`);
          ingestSalesFile.addTemplateInfoToSalesFile(match.templateId, newSalesFile, (addTplInfoErr2) => {
            if (addTplInfoErr2) {
              logger.error(`${salesFile._id} Error adding Template info to Sales File: ${moment().format(dateFormat)}`, addTplInfoErr2);
              waterfallCb(addTplInfoErr2);
            } else {
              logger.info(`${salesFile._id} Added Template info to Sales File: ${moment().format(dateFormat)}`);
              newSalesFile.name = ingestSalesFile.combineSalesFileNameAndSuffix(match, matches, originalSalesFileName, tabNames);
              waterfallCb();
            }
          });
        },
        function (waterfallCb) {
          logger.info(`${salesFile._id} Saving additional Sales File: ${moment().format(dateFormat)}`);
          newSalesFile.save()
            .then(() => {
              waterfallCb();
            })
            .catch((saveAddFileErr) => {
              logger.error(`${salesFile._id} Error saving additional Sales File: ${moment().format(dateFormat)}`, saveAddFileErr);
              waterfallCb(saveAddFileErr);
            });
        },
        function (waterfallCb) {
          logger.info(`${salesFile._id} Creating task for additional Sales File ingestion: ${moment().format(dateFormat)}`);
          ingestSalesFile.createIngestTask(newSalesFile, 2, (createTaskErr) => {
            if (createTaskErr) {
              logger.error(`${salesFile._id} Error creating task for additional Sales File ingestion: ${moment().format(dateFormat)}`, createTaskErr);
              waterfallCb(createTaskErr);
            } else {
              logger.info(`${salesFile._id} Created task for additional Sales File ingestion: ${moment().format(dateFormat)}`);
              waterfallCb();
            }
          });
        }],
      callback,
    );
  },

  /**
   * Adds relevant settings from the Sales Template to the Sales File
   *
   * * Calls `callback(err)` with an `err` message if an error occurs, otherwise err = undefined
   *
   * @param {string} salesTemplateId - Sales Template id
   * @param {object} salesFile - Sales File document
   * @param {function(string)} callback - A callback that handles the response
   */
  addTemplateInfoToSalesFile(salesTemplateId, salesFile, callback) {
    logger.info(`${salesFile._id} addTemplateInfoToSalesFile: Getting Sales Template from db ${salesTemplateId}: ${moment().format(dateFormat)}`);
    SalesTemplate.findById(salesTemplateId)
      .then((salesTemplate) => {
        salesFile.salesTemplateId = salesTemplate._id.toString();
        salesFile.salesAccountName = salesTemplate.source;
        salesFile.salesTemplateName = salesTemplate.name;
        // Don't overwrite overwriteFields if there is already a value against the sales file
        logger.info(`${salesFile._id} addTemplateInfoToSalesFile: Adding Overwrite Fields to Sales File: ${moment().format(dateFormat)}`);
        Object.keys(salesTemplate.overwriteFields).forEach((key) => {
          if (!salesFile.overwriteFields[key]) {
            salesFile.overwriteFields[key] = salesTemplate.overwriteFields[key];
          }
        });
        salesFile.overwriteFieldTargetCells = salesTemplate.overwriteFieldTargetCells;
        callback();
      })
      .catch((findSalesTplErr) => {
        logger.error(`${salesFile._id} addTemplateInfoToSalesFile: Error getting Sales Template from db: ${moment().format(dateFormat)}`, findSalesTplErr);
        callback(findSalesTplErr);
      });
  },

  /**
   * Adds relevant settings from the Sales Template to the Sales File
   *
   * @param {object} match - Object containing matched template info
   * @param {array} matches - Array containing all matches
   * @param {string} salesFileName - The Sales File name to add to
   * @param {array} tabNames - an array containing all tab names extracted from the Sales File
   */
  combineSalesFileNameAndSuffix(match, matches, salesFileName, tabNames) {
    if (match.priorityIngestion && match.priorityIngestionSuffix && match.priorityIngestionSuffix !== '') {
      // if priority ingestion is used for this template and a suffix has been provided, add this to the sales file name
      return `${salesFileName} - ${match.priorityIngestionSuffix}`;
    }
    if (matches.length > 1 && tabNames && tabNames[match.tab]) {
      // otherwise, if more than one match, append tab name to sales file name and save
      return `${salesFileName} - ${tabNames[match.tab]}`;
    }
    return salesFileName;
  },

  /**
   * Processes Data for the ingestion process
   *
   * * Gets template mappings from client settings and Sales Template attached to the Sales File
   * * Gets catalogueOverwritingData and exchange rate defaults obtained from client
   * * Then returns the resulting data plus any other information to be passed to the ingestion process
   * * Calls `callback(err, output)` with `output` containing all the information required for sales ingestion
   * * Calls `callback(err, output)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - Sales File document
   * @param {boolean} platform - Indicates whether we are generating data for the new platform or not
   * @param {boolean} useDb - Indicates whether we should store Catalogue Overwriting Data in a database (instead of in-memory) or not
   * @param {function(string, object)} callback - A callback that handles the response
   */
  ingestionProcessData(salesFile, platform, useDb, callback) {
    // Get client
    logger.info(`${salesFile._id} ingestionProcessData: Getting client from db: ${salesFile.clientId}: ${moment().format(dateFormat)}`);
    Client.findById(salesFile.clientId)
      .then((client) => {
        if (!client) {
          logger.error(`${salesFile._id} ingestionProcessData: Error getting client from db: ${moment().format(dateFormat)}`);
          callback(new Error('There was an error loading the client for ingesting sales. Please try again or contact support.'));
        } else {
          let template;
          async.waterfall([
            function (cb) {
            // Get sales template
              logger.info(`${salesFile._id} ingestionProcessData: Getting Sales Template from db: ${salesFile.salesTemplateId}: ${moment().format(dateFormat)}`);
              SalesTemplate.findById(salesFile.salesTemplateId)
                .then((salesTemplate) => {
                  cb(null, salesTemplate);
                })
                .catch((err) => {
                  logger.error(`${salesFile._id} ingestionProcessData: Error getting Sales Template from db: ${moment().format(dateFormat)}`, err);
                  cb(err);
                });
            },
            function (salesTemplate, cb) {
            // Get mappings from template
              if (salesTemplate) {
                template = salesTemplate;
                logger.info(`${salesFile._id} ingestionProcessData: Getting full mappings for Sales Ingestion from Sales Template: ${moment().format(dateFormat)}`);
                salesTemplate.fullMappingsForSalesIngestion(platform, cb);
              } else {
              // Handle no template found error
                cb(new Error('There was an error loading the template for ingesting sales. Please try again or contact support.'));
              }
            },
            function (templateMappings, cb) {
            // Build mapping objects
              logger.info(`${salesFile._id} ingestionProcessData: Build mapping objects: ${moment().format(dateFormat)}`);
              Mappings.templateMappingsToObjects(templateMappings, client, cb);
            },
            function (output, cb) {
              const options = { joinArraysToString: true, platform, db: useDb };
              logger.info(`${salesFile._id} ingestionProcessData: Get catalogueOverwritingData from client: ${moment().format(dateFormat)}`);
              CatalogueOverwritingData.get(client, options, (err, catalogueOverwritingData) => {
                cb(err, output, catalogueOverwritingData);
              });
            },
            function (output, catalogueOverwritingData, cb) {
            // Set exchange rate defaults
              logger.info(`${salesFile._id} ingestionProcessData: Set exchange rate defaults: ${moment().format(dateFormat)}`);
              // Build array of currencies
              const exchangeRates = salesFile.exchangeRates.slice();
              // Loop through each exchange rate
              [client.homeCurrency, client.currency2, client.currency3, client.currency4].filter(Boolean).forEach((currency) => {
              // Check that exchange rates doesn't already include another exchange
                let includesCurrency = false;
                // For each currency that exists on the client, check the exchange rates array
                // for a mapping that is from AND to that particular currency
                salesFile.exchangeRates.forEach((c) => {
                  if (c && c.from == currency && c.to == currency) {
                    includesCurrency = true;
                  }
                });
                // If that particular mapping doesn't exist
                if (!includesCurrency) {
                // Set toCurrency where required to 'Home Currency' when the current currency is homeCurrency
                // or the current currency when it is not
                  const toCurrency = currency == client.homeCurrency ? 'Home Currency' : currency;
                  // Add a default of 1 to each
                  exchangeRates.push({ from: currency, to: toCurrency, rate: 1 });
                }
              });

              // Build object for sales ingestion
              const object = {
                salesFileId: salesFile._id.toString(),
                salesFileName: salesFile.name.toString(),
                key: salesFile.file,
                customAdditionalFile: salesFile.customAdditionalFile,
                fileType: template.fileType,
                bucket: process.env.S3_bucket,
                tab: template.tabIndex(),
                startingColumn: template.startingLeftIndex(),
                startingLine: template.startingLineIndex(),
                exchangeRates,
                currencies: {
                  currency2: client.currency2,
                  currency3: client.currency3,
                  currency4: client.currency4,
                },
                calculation: template.calculation,
                delimiter: template.delimiter,
                encoding: template.encoding,
                overwriteFields: salesFile.overwriteFields,
                overwriteFieldTargetCells: salesFile.overwriteFieldTargetCells,
                template: template.fields,
                templateSource: template.source,
                templateId: template._id,
                characterSeparators: template.characterSeparators(),
                catalogue: {
                  territories: output.territories,
                  distributionChannels: output.distributionChannels,
                  configurations: output.configurations,
                  priceCategories: output.priceCategories,
                  saleTypes: output.saleTypes,
                  copyFields: output.copyFields,
                  positiveNegatives: output.positiveNegatives,
                  sources: output.sources,
                  subSources: output.subSources,
                  currencies: output.currencies,
                  releases: output.releases,
                  tracks: output.tracks,
                  contracts: output.contracts,
                  works: output.works,
                  externalReleases: output.externalReleases,
                  externalTracks: output.externalTracks,
                  externalContracts: output.externalContracts,
                  externalWorks: output.externalWorks,
                  releaseExceptions: output.releaseExceptions,
                  trackExceptions: output.trackExceptions,
                  workExceptions: output.workExceptions,
                },
                proRataAmount: salesFile.proRataAmount,
                catalogueOverwritingData,
                partitionNo: salesFile.partitionNo,
              };
              cb(null, object);
            },
          ], callback);
        }
      })
      .catch((findClientErr) => {
        logger.error(`${salesFile._id} ingestionProcessData: Error getting client from db: ${moment().format(dateFormat)}`, findClientErr);
        callback(new Error('There was an error loading the client for ingesting sales. Please try again or contact support.'));
      });
  },

  /**
   * The main sales ingestion process.
   *
   * * reads the Sales Data file and any additional Financial file (if applicable) attached to the Sales File
   * * uses the mapper and runs any calculations attached to the Sales Template
   * * then validates the data and saves to BigQuery database
   * * returns the validation info and any errors as well as the identification extracted from the file
   * * Calls `callback(err, validationData, identification)` with `validationData` containing the validation data & `identification` containing the identification extracted from the file
   * * Calls `callback(err, validationData, identification)` with an `err` message if an error occurs
   *
   * @param {object} bigQuery - bigQuery instance
   * @param {string} file - File path to data file
   * @param {object} event - object with information for sales ingestion
   * @param {function(string, object, object)} callback - A callback that handles the response
   */
  processFile(bigQuery, file, event, callback) {
    try {
      bigQuery.setupFile(() => {
        logger.info(`${event.salesFileId} Starting Extracting Data: ${moment().format(dateFormat)}`);
        ingestSalesFile.extractData(file, event.tab, event.startingLine, event.startingColumn, event.delimiter, event.characterSeparators, event.encoding, event.overwriteFieldTargetCells, event.fileType, event.salesFileId, (extractDataErr, data, identification, extractedOverwriteFields, nextChunkStart) => {
          if (extractDataErr) {
            logger.error(`${event.salesFileId} Error Extracting Data From File: ${moment().format(dateFormat)}`, extractDataErr);
            callback(extractDataErr);
          } else {
            logger.info(`${event.salesFileId} Extracted Data From File: ${moment().format(dateFormat)}`);
            const totalLines = data.length;
            identification.salesFileId = event.salesFileId; // add sales file id
            identification.salesFileName = event.salesFileName; // and sales file name
            const chunked = ingestSalesFile.chunk(data, 10000);
            let iTunesExchangeRates = {};
            let iTunesPerUnitRates = {};
            let requiredExchangeRates = [];
            let customAdditionalFileMissing = false;
            let facebookPerUnitRates = {};
            // Get allowed keys for the DB from the BigQuery lib
            logger.info(`${event.salesFileId} Get allowed keys for the DB from the BigQuery lib: ${moment().format(dateFormat)}`);
            const allowedKeys = bigQuery.inputSchema.map((item) => {
              if (item.mode !== 'REPEATED') {
                return item.name;
              }
            }).filter(Boolean);
            // Prepare field types from BigQuery
            const fieldTypes = {};
            bigQuery.inputSchema.forEach((field) => { fieldTypes[field.name] = field.type; });
            async.waterfall([
              function (waterfallCb) {
                ingestSalesFile.replaceOverwriteValuesAndProRataAmount(event, extractedOverwriteFields, waterfallCb);
              },
              function (waterfallCb) {
                if (['Apple Music', 'iTunes', 'iTunes Match', 'Beats', 'Apple DJ'].includes(event.fileType)) {
                  ingestSalesFile.processAppleFinancialFile(event.customAdditionalFile, event.salesFileId, event.exchangeRates, (err, iTunesRequiredExchangeRates, exchangeRates, additionalFileMissing) => {
                    if (iTunesRequiredExchangeRates) { requiredExchangeRates = iTunesRequiredExchangeRates; }
                    if (exchangeRates) { iTunesExchangeRates = exchangeRates; }
                    if (additionalFileMissing) { customAdditionalFileMissing = true; }
                    waterfallCb(err);
                  });
                } else {
                  waterfallCb();
                }
              },
              function (waterfallCb) {
                if (['iTunes Match'].includes(event.fileType)) {
                  ingestSalesFile.processItunesMatchFile(event, file, chunked, iTunesExchangeRates, allowedKeys, fieldTypes, facebookPerUnitRates, (err, perUnitRates) => {
                    iTunesPerUnitRates = perUnitRates;
                    waterfallCb(err);
                  });
                } else {
                  waterfallCb();
                }
              },
              function (waterfallCb) {
                if (['Facebook'].includes(event.fileType)) {
                  ingestSalesFile.processFacebookFinancialFile(event.customAdditionalFile, event.salesFileId, (err, perProductionRates, additionalFileMissing) => {
                    facebookPerUnitRates = perProductionRates;
                    if (additionalFileMissing) { customAdditionalFileMissing = true; }
                    waterfallCb(err);
                  });
                } else {
                  waterfallCb();
                }
              },
              function (waterfallCb) {
                ingestSalesFile.setPerUnitRate(event, chunked, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, waterfallCb);
              },
              function (perUnitRate, waterfallCb) {
                // ensure memory allocation for data is cleared
                data = null;
                ingestSalesFile.processDataChunks(chunked, nextChunkStart, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, customAdditionalFileMissing, bigQuery, file, totalLines, requiredExchangeRates, identification, waterfallCb);
              },
            ], callback);
          }
        });
      });
    } catch (catchErr2) {
      logger.error(`${event.salesFileId} Error caught in ingestSalesFile.processFile: ${moment().format(dateFormat)}`, catchErr2);
      callback(new Error('There was an error processing the file. Check the file and template and try and again.'));
    }
  },

  /**
   * Extracts Sales Data, Identification and overwriteFields from the supplied file
   *
   * * Calls `callback(err, data, identification, extractedOverwriteFields)` with `data` containing the extracted Sales Data, `identification` containing the identification extracted from the file & `extractedOverwriteFields` containing Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" }
   * * Calls `callback(err, data, identification, extractedOverwriteFields)` with an `err` message if an error occurs
   *
   * @param {string} file - File path to data file
   * @param {number} tab - Number of tab to extract
   * @param {number} startingLine - Starting line to extract from (first line = 0)
   * @param {number} startingColumn - Starting column to extract from (first column = 0)
   * @param {string} delimiter - Delimiter to use
   * @param {number[]} characterSeparators - Array containing length of each column to split by
   * @param {string} encoding - Encoding type
   * @param {object[]} overwriteFieldTargetCells - Target Cells, e.g. { field: "originalCurrency", type: "String", cell: "A3" }
   * @param {string} templatefileType - Type of template being used for the sales file (only current usage: "CRD")
   * @param {string} salesFileId - Sales file id used for logging
   * @param {function(string, array[], object[], object[])} callback - A callback that handles the response
   */
  extractData(file, tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, overwriteFieldTargetCells, templatefileType, salesFileId, callback) {
    const options = {
      tab, delimiter, characterSeparators, encoding, templatefileType,
    };
    logger.info(`${salesFileId}: Calling fileOpener.extractData: ${moment().format(dateFormat)}`);
    fileOpener.extractData(file, options, (extractErr2, totalTabs, data, nextChunkStart) => {
      if (extractErr2) {
        logger.error(`${salesFileId}: Error calling fileOpener.extractData: ${moment().format(dateFormat)}`, extractErr2);
        callback(extractErr2);
      } else {
        logger.info(`${salesFileId}: Extracting Overwrite Field Target Cells: ${moment().format(dateFormat)}`);

        let extractedOverwriteFields;
        try {
          extractedOverwriteFields = ingestSalesFile.extractOverwriteFieldTargetCells(data, overwriteFieldTargetCells);
          logger.info(`${salesFileId}: Successfully extracted ${extractedOverwriteFields.length} overwrite fields: ${moment().format(dateFormat)}`);
        } catch (extractOverwriteErr) {
          logger.error(`${salesFileId}: Error extracting overwrite field target cells: ${moment().format(dateFormat)}`, extractOverwriteErr);
          return callback(extractOverwriteErr);
        }
        async.waterfall([
          function (cb) {
            if (delimiter) {
              const options2 = { tab, encoding, maxRows: 20 };
              logger.info(`${salesFileId}: Calling fileOpener.extractData to get identification: ${moment().format(dateFormat)}`);
              fileOpener.extractData(file, options2, (extractErr3, totalTabs2, data2) => {
                if (extractErr3) {
                  logger.error(`${salesFileId}: Error calling fileOpener.extractData to get identification: ${moment().format(dateFormat)}`, extractErr3);
                  cb(extractErr3);
                } else {
                  logger.info(`${salesFileId}: Calling templateMatcher.buildIdentification II: ${moment().format(dateFormat)}`);
                  const identification = templateMatcher.buildIdentification(totalTabs2, data2);
                  cb(null, data, identification);
                }
              });
            } else {
              logger.info(`${salesFileId}: Calling templateMatcher.buildIdentification I: ${moment().format(dateFormat)}`);
              const identification = templateMatcher.buildIdentification(totalTabs, data);
              cb(null, data, identification);
            }
          },
        ], (err, data, identification) => {
          logger.info(`${salesFileId}: Extract results: ${moment().format(dateFormat)}`);
          const salesData = ingestSalesFile.extractResults(data, startingLine, startingColumn);
          callback(err, salesData, identification, extractedOverwriteFields, nextChunkStart);
        });
      }
    });
  },

  /**
   * Extracts Overwrite Fields from data array according to the Target Cells provided in the Sales File
   *
   * @param {array[]} data - Sales Data
   * @param {object[]} overwriteFieldTargetCells - Target Cells, e.g. { field: "originalCurrency", type: "String", cell: "A3" }
   * @returns {object[]} Array of Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" }
   */
  extractOverwriteFieldTargetCells(data, overwriteFieldTargetCells) {
    const extractedOverwriteFields = [];
    if (overwriteFieldTargetCells) {
      overwriteFieldTargetCells.forEach((targetCell) => {
        // Skip null/undefined entries that may be present in the data
        if (!targetCell || !targetCell.cell) return;
        const colAndRow = ingestSalesFile.getColAndRowFromCellReference(targetCell.cell);
        const row = data[colAndRow.row - 1];
        const value = row ? row[colAndRow.col - 1] : null;
        if (value && value !== '') {
          extractedOverwriteFields.push({ field: targetCell.field, cell: targetCell.cell, value: salesIngestionUtils.fieldToFormat(value, targetCell.field, targetCell.type) });
        }
      });
    }
    return extractedOverwriteFields;
  },

  /**
   * Translate Excel column reference (e.g. A1, B3) to column and row numbers
   *
   * @param {string} cellRef - String representation of cell (e.g. "A3", "B7")
   * @returns {object} object containing col and row, e.g. { col: 1, row: 3 } for A3
   */
  getColAndRowFromCellReference(cellRef) {
    if (!cellRef) return {};
    const row = parseInt((cellRef.trim().replace(/[^0-9]+/, '')), 10);
    const colString = (cellRef.trim().toUpperCase().replace(/[^A-Z]+/, ''));
    const col = ingestSalesFile.getColNumber(colString);
    return { col, row };
  },

  /**
   * Translates column number from a string (e.g. "A" => 1, "B" => 2)
   *
   * @param {string} colString - String representation of column (e.g. "A", "B")
   * @returns {number} Number representation of column
   */
  getColNumber(colString) {
    const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let i;
    let j;
    let colNumber = 0;
    for (i = 0, j = colString.length - 1; i < colString.length; i += 1, j -= 1) {
      colNumber += (base.length ** j) * (base.indexOf(colString[i]) + 1);
    }
    return colNumber;
  },

  /**
   * Replace overwrite values and pro rata amount with values from sales file
   *
   * @param {object} event - object with information for sales ingestion
   * @param {object[]} extractedOverwriteFields - containing Overwrite Fields, e.g. { field: "originalCurrency", type: "String", value: "USD" }
   * @param {function(string)} callback - A callback that handles the response
   */
  replaceOverwriteValuesAndProRataAmount(event, extractedOverwriteFields, callback) {
    if (extractedOverwriteFields.length > 0) {
      const errors = [];
      extractedOverwriteFields.forEach((line) => {
        if (line.field !== 'proRataAmount') {
          if (line.value instanceof Date && isNaN(line.value)) {
            errors.push(`Date format not valid for cell ${line.cell}`);
          } else {
            event.overwriteFields[line.field] = line.value;
          }
        } else {
          event.proRataAmount = line.value;
        }
      });
      if (errors.length > 0) {
        callback(new Error(errors.join(', ')));
      } else {
        logger.info(`${event.salesFileId} Update overwriteFields and proRataAmount: ${moment().format(dateFormat)}`);
        SalesFile.findByIdAndUpdate(event.salesFileId, { $set: { overwriteFields: event.overwriteFields, proRataAmount: event.proRataAmount } })
          .then(() => {
            callback();
          })
          .catch((updateErr) => {
            logger.error(`${event.salesFileId} Error updating overwriteFields and proRataAmount: ${moment().format(dateFormat)}`, updateErr);
            callback(updateErr);
          });
      }
    } else {
      callback();
    }
  },

  /**
   * Process Apple Financial File
   *
   * @param {string} customAdditionalFile - S3 path to Apple Financial File
   * @param {string} salesFileId - Sales File id
   * @param {string[]} exchangeRates - array of currencies
   * @param {function(string)} callback - A callback that handles the response
   */
  processAppleFinancialFile(customAdditionalFile, salesFileId, exchangeRates, callback) {
    // Download custom file
    if (customAdditionalFile) {
      logger.info(`${salesFileId} Downloading Apple financial file: ${customAdditionalFile}: ${moment().format(dateFormat)}`);
      fileManager.downloadFromS3(customAdditionalFile, process.env.S3_bucket, (downloadErr, localFile) => {
        if (downloadErr) {
          logger.error(`${salesFileId} Error downloading Apple financial file: ${moment().format(dateFormat)}`, downloadErr);
          callback(downloadErr);
        } else {
          logger.info(`${salesFileId} Getting Exchange Rates from Apple financial file: ${moment().format(dateFormat)}`);
          // Get exchange rates as an object
          iTunesSpecifics.getExchangeRates(localFile, exchangeRates, (exRatesErr, exchangeRates, iTunesRequiredExchangeRates) => {
            if (exRatesErr) {
              logger.error(`${salesFileId} Error getting Exchange Rates from Apple financial file: ${moment().format(dateFormat)}`, exRatesErr);
              callback(exRatesErr);
            } else {
              callback(null, iTunesRequiredExchangeRates, exchangeRates);
            }
          });
        }
      });
    } else {
      logger.info(`${salesFileId} Apple financial file missing: ${moment().format(dateFormat)}`);
      callback(null, null, null, true);
    }
  },

  /**
   * Process iTunes Match file
   *
   * @param {object} event - object with information for sales ingestion
   * @param {string} file - File path to data file
   * @param {array[]} chunked - array containing chunks of data
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
   * @param {object} fieldTypes - Field types from Big Query
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {function(string)} callback - A callback that handles the response
   */
  processItunesMatchFile(event, file, chunked, iTunesExchangeRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback) {
    const perUnitRates = {};
    // @TOM: NOTE: We will have to refactor this for files being read in chunks. Leaving this for now
    // Get total values per territory as an object
    logger.info(`${event.salesFileId} iTunes Match: Getting data from main file: ${moment().format(dateFormat)}`);
    // @TOM: why are we calling extractData on the main file again here? I don't see why this is needed. We seem to be overwriting the same data variable again here.
    ingestSalesFile.extractData(file, event.tab, event.startingLine, event.startingColumn, event.delimiter, event.characterSeparators, event.encoding, null, event.fileType, event.salesFileId, (extractErr, data) => {
      if (extractErr) {
        logger.error(`${event.salesFileId} iTunes Match: Error getting data from main file: ${moment().format(dateFormat)}`, extractErr);
        callback(extractErr);
      } else {
        logger.info(`${event.salesFileId} iTunes Match: Getting Revenue Totals by Territory: ${moment().format(dateFormat)}`);
        iTunesSpecifics.getRevenueTotalsByTerritory(data, (revErr, revenuesPerTerritory) => {
          if (revErr) {
            logger.error(`${event.salesFileId} iTunes Match: Error getting Revenue Totals by territory: ${moment().format(dateFormat)}`, revErr);
            callback(revErr);
          } else {
            const unitsPerTerritory = {};
            logger.info(`${event.salesFileId} iTunes Match: Getting total units per territory: ${moment().format(dateFormat)}`);
            // Get total units per territory
            async.eachOfLimit(chunked, 3, (chunk, idx, seriesCb) => {
              logger.info(`${event.salesFileId} iTunes Match: Processing chunk ${idx} - Calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`);
              Mapper.arrayToTemplate(chunk, event, null, iTunesExchangeRates, perUnitRates, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, facebookPerUnitRates, (mapperErr1, dataForDatabase) => {
                chunk = null;
                if (mapperErr1) {
                  logger.error(`${event.salesFileId} iTunes Match: Processing chunk ${idx} - Error while calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`, mapperErr1);
                  seriesCb(mapperErr1);
                } else {
                  logger.info(`${event.salesFileId} iTunes Match: Processing chunk ${idx} - Add total units by territory to unitsPerTerritory array: ${moment().format(dateFormat)}`);
                  dataForDatabase.forEach((line) => {
                    if (line.units) {
                      unitsPerTerritory[line.territory] = unitsPerTerritory[line.territory] || 0;
                      unitsPerTerritory[line.territory] += line.units;
                    }
                  });
                  seriesCb();
                }
              });
            }, (eachSeriesErr) => {
              if (eachSeriesErr) {
                logger.error(`${event.salesFileId} iTunes Match: Error getting total units per territory: ${moment().format(dateFormat)}`, eachSeriesErr);
                callback(eachSeriesErr);
              } else {
                // Set per unit rates for ingestion
                logger.info(`${event.salesFileId} iTunes Match: Setting per unit rates for ingestion: ${moment().format(dateFormat)}`);
                Object.keys(revenuesPerTerritory).forEach((key) => {
                  if (revenuesPerTerritory[key] && unitsPerTerritory[key]) {
                    perUnitRates[key] = revenuesPerTerritory[key] / unitsPerTerritory[key];
                  }
                });
                callback(null, perUnitRates);
              }
            });
          }
        });
      }
    });
  },

  /**
   * Process Facebook Financial File
   *
   * @param {string} customAdditionalFile - S3 path to Apple Financial File
   * @param {string} salesFileId - Sales File id
   * @param {function(Error, Object.<string, number>, boolean)} callback - A callback that handles the response
   */
  processFacebookFinancialFile(customAdditionalFile, salesFileId, callback) {
    // Download custom file
    if (customAdditionalFile) {
      logger.info(`${salesFileId} Facebook: Downloading financial file: ${customAdditionalFile}: ${moment().format(dateFormat)}`);
      fileManager.downloadFromS3(customAdditionalFile, process.env.S3_bucket, (dlFbErr, localFile) => {
        if (dlFbErr) {
          logger.error(`${salesFileId} Facebook: Error downloading financial file: ${moment().format(dateFormat)}`, dlFbErr);
          callback(dlFbErr);
        } else {
          // Get exchange rates as an object
          logger.info(`${salesFileId} Facebook: Getting exchange rates as an object: ${moment().format(dateFormat)}`);
          facebookSpecifics.getPerProductionRates(localFile, (perProdErr, perProductionRates) => {
            if (perProdErr) {
              logger.error(`${salesFileId} Facebook: Error getting exchange rates as an object: ${moment().format(dateFormat)}`, perProdErr);
              callback(perProdErr);
            } else {
              logger.info(`${salesFileId} Facebook: Assigning per production rates to global var: ${moment().format(dateFormat)}`);
              callback(null, perProductionRates);
            }
          });
        }
      });
    } else {
      logger.info(`${salesFileId} Facebook: Financial file missing: ${moment().format(dateFormat)}`);
      callback(null, null, true);
    }
  },

  /**
   * Callback for adding two numbers.
   *
   * @callback setPerUnitRateCallback
   * @param {Error} [error] The error message, if any.
   * @param {Number} [perUnitRate] The Per-Unit rate. Will be null if there is an error, or if there is no pro-rata amount.
   */

  /**
   * Set per-unit rate if proRata is set
   *
   * @param {object} event - object with information for sales ingestion
   * @param {array[]} chunked - array containing chunks of data
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
   * @param {object} fieldTypes - Field types from Big Query
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {setPerUnitRateCallback} callback - A callback that handles the response
   */
  setPerUnitRate(event, chunked, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, callback) {
    // @TOM: NOTE: We will have to refactor pro-rata processing for files being read in chunks. Leaving this for now
    // When pro-rata amount exists, run mapping first to get totals
    logger.info(`${event.salesFileId} When pro rata amount exists, run mapping first to get totals: ${moment().format(dateFormat)}`);
    if (event.proRataAmount) {
      let unitsTotal = 0;
      async.eachOfLimit(chunked, 3, (chunk, idx, seriesCb) => {
        logger.info(`${event.salesFileId} Pro Rata: Processing chunk ${idx} - Calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`);
        Mapper.arrayToTemplate(chunk, event, null, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, facebookPerUnitRates, (mapperErr2, dataForDatabase) => {
          chunk = null;
          if (mapperErr2) {
            logger.error(`${event.salesFileId} Pro Rata: Processing chunk ${idx} - Error calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`, mapperErr2);
            seriesCb(mapperErr2);
          } else {
            dataForDatabase.forEach((line) => { if (line.units) { unitsTotal += line.units; } });
            seriesCb();
          }
        });
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          const perUnitRate = Number(event.proRataAmount) / unitsTotal;
          callback(null, perUnitRate);
        }
      });
    } else {
      callback(null, null);
    }
  },

  /**
   * Process the chunked data
   *
   * @param {array[]} chunked - array containing chunks of data
   * @param {number} nextChunkStart - position of next chunk of data
   * @param {object} event - Object with information for sales ingestion
   * @param {number} perUnitRate - Per Unit Rate obtained from pro-rata amount
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
   * @param {object} fieldTypes - Field types from Big Query
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {boolean} customAdditionalFileMissing - indicates if custom file was detected missing during the process
   * @param {object} bigQuery - bigQuery instance
   * @param {string} file - File path to data file
   * @param {number} totalLines - total data lines to process
   * @param {string[]} requiredExchangeRates - Exchange rates obtained from Apple Financial file
   * @param {identification} identification - Identification generated from input file
   * @param {function(string)} callback - A callback that handles the response
   */
  processDataChunks(chunked, nextChunkStart, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, customAdditionalFileMissing, bigQuery, file, totalLines, requiredExchangeRates, identification, callback) {
    const validationData = {
      units: 0,
      validationUnits: 0,
      netAmount: 0,
      validationNetAmount: 0,
      homeCurrencyNetAmount: 0,
      lines: 0,
      validationLines: 0,
      invalidLines: 0,
      valid: 0,
      grossAmount: 0,
      homeCurrencyGrossAmount: 0,
      distributionChannels: [],
      configurations: [],
      priceCategories: [],
      territories: [],
      sources: [],
      subSources: [],
      currencies: [],
      currencyCodes: [],
      releases: [],
      tracks: [],
      works: [],
      contracts: [],
      invalidFields: {
        saleDate: false,
        transactionDate: false,
      },
    };
    let writtenChunksCount = 0;
    let totalChunks = 0;
    let nextFileChunkStart = nextChunkStart;
    let processChunk = true;
    // process the data
    async.whilst(
      (testCb) => { testCb(null, processChunk); },
      (whilstCb) => {
        totalChunks += chunked.length;
        async.eachOfLimit(chunked, 5, (chunk, idx, cb) => {
          ingestSalesFile.processNextChunk(event, chunk, idx, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, validationData, customAdditionalFileMissing, bigQuery, (err, writtenChunks) => {
            writtenChunksCount += writtenChunks;
            cb(err);
          });
        }, (eachOfLimitErr) => {
          if (eachOfLimitErr) {
            logger.error(`${event.salesFileId} Process Data: Error while processing chunks: ${moment().format(dateFormat)}`, eachOfLimitErr);
            whilstCb(eachOfLimitErr);
          } else if (nextFileChunkStart) {
            // if there is another chunk of data to read from the file
            // ensure memory allocation for chunked is cleared
            chunked = null;
            const options = {
              tab: event.tab,
              delimiter: event.delimiter,
              characterSeparators: event.characterSeparators,
              encoding: event.encoding,
              templatefileType: event.fileType,
              chunkStart: nextFileChunkStart,
            };
            // get the next chunk of data from the file
            logger.info(`${event.salesFileId} Process Data: Calling fileOpener.extractData to get next chunk of data: ${moment().format(dateFormat)}`);
            fileOpener.extractData(file, options, (extractErr4, totalTabs, data, nextChunkStart2) => {
              if (extractErr4) {
                logger.error(`${event.salesFileId} Process Data: Error calling fileOpener.extractData to get next chunk of data: ${moment().format(dateFormat)}`, extractErr4);
                whilstCb(extractErr4);
              } else {
                totalLines += data.length;
                nextFileChunkStart = nextChunkStart2;
                chunked = ingestSalesFile.chunk(data, 10000);
                // and read the next chunk for data extracted
                processChunk = true;
                logger.info(`${event.salesFileId} Process Data: Processing next chunk of data: ${moment().format(dateFormat)}`);
                whilstCb();
              }
            });
          } else {
            logger.info(`${event.salesFileId} Process Data: No more chunks of data to process: ${moment().format(dateFormat)}`);
            processChunk = false;
            whilstCb();
          }
        });
      },
      (whilstErr) => {
        if (whilstErr) {
          logger.error(whilstErr);
          callback(whilstErr, {});
        } else {
          logger.info(`${event.salesFileId} Total Lines in File: ${totalLines}: ${moment().format(dateFormat)}`);
          // Call write function - structured this way to check everything is written to file before triggering
          writeToDbWhenComplete(callback);

          // eslint-disable-next-line no-inner-declarations
          function writeToDbWhenComplete(cb) {
            // Check all chunks are written to DB
            if (writtenChunksCount === totalChunks) {
              logger.info(`${event.salesFileId} Writing Data to BigQuery DB: ${moment().format(dateFormat)}`);
              // Write data To BigQuery
              bigQuery.writeFileToDb(bigQuery.inputTable, (writeFileToDbErr) => {
                if (writeFileToDbErr) {
                  // @TOM: It feels like we should error here. Generic error to user?
                  logger.error(`${event.salesFileId} Error writing Data to BigQuery DB: ${moment().format(dateFormat)}`, writeFileToDbErr);
                } else {
                  logger.info(`${event.salesFileId} Completed writing Data to BigQuery DB: ${moment().format(dateFormat)}`);
                }
                logger.info(`${event.salesFileId} Deleting local file ${file}: ${moment().format(dateFormat)}`);
                fs.unlink(file, (unlinkErr) => {
                  if (unlinkErr) {
                    logger.error(`${event.salesFileId} Error deleting local file: ${moment().format(dateFormat)}`, unlinkErr);
                  }
                  // Get net amount and no of lines from DB to confirm what has been ingested
                  logger.info(`${event.salesFileId} Calling Validate.getNetAmountFromDatabase: ${moment().format(dateFormat)}`);
                  Validate.getNetAmountFromDatabase(event.salesFileId, bigQuery, (getNetErr, dbData) => {
                    if (getNetErr) {
                      logger.error(`${event.salesFileId} Error calling Validate.getNetAmountFromDatabase: ${moment().format(dateFormat)}`, getNetErr);
                    }
                    // Update on validation data if it exists
                    if (dbData) {
                      validationData.homeCurrencyNetAmount = dbData.homeCurrencyNetAmount;
                      validationData.lines = dbData.lines;
                    }
                    // Add any iTunes exchange rates that are missing
                    validationData.currencies = ingestSalesFile.combineArray(validationData.currencies, requiredExchangeRates);
                    cb(getNetErr, validationData, identification);
                  });
                });
              });
            } else {
              logger.info(`${event.salesFileId} Wait two seconds before writing to DB: ${moment().format(dateFormat)}`);
              // Wait two seconds before writing to DB
              setTimeout(() => {
                writeToDbWhenComplete(cb);
              }, 2000);
            }
          }
        }
      },
    );
  },

  /**
   * Process next chunk
   *
   * @param {object} event - Object with information for sales ingestion
   * @param {array} chunk - chunk of data
   * @param {number} idx - index of chunk in chunks array
   * @param {number} perUnitRate - Per Unit Rate obtained from pro-rata amount
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
   * @param {object} fieldTypes - Field types from Big Query
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {object} validationData - object containing validation data to add to sales file after processing
   * @param {boolean} customAdditionalFileMissing - indicates if custom file was detected missing during the process
   * @param {object} bigQuery - bigQuery instance
   * @param {function(string)} callback - A callback that handles the response
   */
  processNextChunk(event, chunk, idx, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates, validationData, customAdditionalFileMissing, bigQuery, callback) {
    logger.info(`${event.salesFileId} Process Data: Processing chunk ${idx} - Calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`);
    Mapper.arrayToTemplate(chunk, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, facebookPerUnitRates, (mapperErr3, dataForDatabase) => {
      chunk = null;
      if (mapperErr3) {
        logger.error(`${event.salesFileId} Process Data: Processing chunk ${idx} - Error calling Mapper.arrayToTemplate: ${moment().format(dateFormat)}`, mapperErr3);
        callback(mapperErr3);
      } else {
        // Get Validation Data from Returned Data
        logger.info(`${event.salesFileId} Process Data: Processing chunk ${idx} - Getting Validation Data from returned data: ${moment().format(dateFormat)}`);
        Validate.getValidationDataFromData(dataForDatabase, (validateErr, validationDataAmounts) => {
          if (validateErr) {
            logger.error(`${event.salesFileId} Process Data: Processing chunk ${idx} - Error getting Validation Data from returned data: ${moment().format(dateFormat)}`, validateErr);
            callback(validateErr);
          } else {
            // Update validation data
            validationData.units += validationDataAmounts.units;
            validationData.validationUnits += validationDataAmounts.validationUnits;
            validationData.netAmount += validationDataAmounts.netAmount;
            validationData.validationNetAmount += validationDataAmounts.validationNetAmount;
            validationData.homeCurrencyNetAmount += validationDataAmounts.homeCurrencyNetAmount;
            validationData.lines += validationDataAmounts.lines;
            validationData.validationLines += validationDataAmounts.validationLines;
            validationData.valid += validationDataAmounts.valid;
            validationData.grossAmount += validationDataAmounts.grossAmount;
            validationData.homeCurrencyGrossAmount += validationDataAmounts.homeCurrencyGrossAmount;
            validationData.invalidLines += validationDataAmounts.invalidLines;
            validationData.distributionChannels = ingestSalesFile.combineArray(validationData.distributionChannels, validationDataAmounts.distributionChannels);
            validationData.configurations = ingestSalesFile.combineArray(validationData.configurations, validationDataAmounts.configurations);
            validationData.priceCategories = ingestSalesFile.combineArray(validationData.priceCategories, validationDataAmounts.priceCategories);
            validationData.territories = ingestSalesFile.combineArray(validationData.territories, validationDataAmounts.territories);
            validationData.sources = ingestSalesFile.combineArray(validationData.sources, validationDataAmounts.sources);
            validationData.subSources = ingestSalesFile.combineArray(validationData.subSources, validationDataAmounts.subSources);
            validationData.currencies = ingestSalesFile.combineArray(validationData.currencies, validationDataAmounts.currencies);
            validationData.currencyCodes = ingestSalesFile.combineArray(validationData.currencyCodes, validationDataAmounts.currencyCodes);
            validationData.releases = ingestSalesFile.combineObjectArray(validationData.releases, validationDataAmounts.releases);
            validationData.tracks = ingestSalesFile.combineObjectArray(validationData.tracks, validationDataAmounts.tracks);
            validationData.works = ingestSalesFile.combineObjectArray(validationData.works, validationDataAmounts.works);
            validationData.contracts = ingestSalesFile.combineArray(validationData.contracts, validationDataAmounts.contracts);
            validationData.invalidFields.saleDate = validationData.invalidFields.saleDate || validationDataAmounts.invalidFields.saleDate;
            validationData.invalidFields.transactionDate = validationData.invalidFields.transactionDate || validationDataAmounts.invalidFields.transactionDate;
            validationData.invalidFields.customAdditionalFile = !!customAdditionalFileMissing;
            logger.info(`${event.salesFileId} Process Data: Processing chunk ${idx} - Calling bigQuery.writeToFile: ${moment().format(dateFormat)}`);
            bigQuery.writeToFile(dataForDatabase, (writeArrayErr, response) => {
              if (writeArrayErr) {
                // @TOM: should we not handle the error here? Might be a reason why not to, but can't find one
                logger.error(`${event.salesFileId} Process Data: Processing chunk ${idx} - Error calling bigQuery.writeToFile: ${moment().format(dateFormat)}`, writeArrayErr);
              }
              callback(null, 1);
            });
          }
        });
      }
    });
  },

  /**
   * Removes old sales data for Sales Fil with id salesFileId
   *
   * * Calls callback(err, output) with `output` containing query results passed back from bigQuery
   * * Calls callback(err, output) with an `err` message if an error occurs
   *
   * @param {object} bigQuery - bigQuery instance
   * @param {string} salesFileId - Sales File id
   * @param {number} partitionNo - Bug Query partition number
   * @param {function(string, array)} callback - A callback that handles the response
   */
  async removeOldSales(bigQueryClient, salesFileId, partitionNo) {
    logger.info(`${salesFileId} - Deleting old sales data before ingestion`);
    const deleteFilter = { salesFileId, partitionNo: partitionNo ?? null };
    const deleteQuery = createDeleteQuery(bigQueryClient.datasetName, bigQueryClient.inputTable, deleteFilter);
    const maxRetries = 15;
    await bigQueryClient.query(deleteQuery, { sales_file_id: salesFileId }, maxRetries);
  },

  /**
   * Splits array into multiple arrays (chunks)
   *
   * @param {array} arr - Array to chunk
   * @param {number} len - Maximum length of each chunk
   * @returns {array} Array of arrays with each array containing chunked data of length <= *len*
   */
  chunk(arr, len) {
    const chunks = [];
    const i = 0;
    let n = arr.length;

    while (n > 0) {
      chunks.push(arr.splice(i, len));
      n = arr.length;
    }
    return chunks;
  },

  /**
   * Combines two arrays of primitive values
   *
   * @param {array} a - Array a
   * @param {array} b - Array b
   * @returns {array} Combined array
   */
  combineArray(a, b) {
    // Loop through array b
    b.forEach((item) => {
      // Check if it already exists in array a
      if (!a.includes(item)) {
        // Push if it doesn't exist
        a.push(item);
      }
    });
    // Return amended array a
    return a;
  },

  /**
   * Combines two arrays of objects
   *
   * @param {object[]} a - Array of objects a
   * @param {object[]} b - Array of objects b
   * @returns {object[]} Combined array of objects
   */
  combineObjectArray(a, b) {
    // Map object values into a string
    const objectStrings = a.map((item) => {
      let string = '';
      // Loop through object keys
      Object.keys(item).forEach((key) => {
        if (key !== 'source') {
          // Add value to string
          string += item[key];
        }
      });
      // Return string of all object values
      return string;
    });
    // Loop through array b
    b.forEach((item) => {
      let string = '';
      // Loop through object keys
      Object.keys(item).forEach((key) => {
        if (key !== 'source') {
          // Add value to string
          string += item[key];
        }
      });
      // Check if string exists in objectStrings
      if (!objectStrings.includes(string)) {
        // Add to a array
        a.push(item);
        // Add to objectStrings to not add the same object twice
        objectStrings.push(string);
      }
    });
    return a;
  },

  /**
   * Extracts the desired results from the Sales Data, according to *startingLine* and *startingColumn*
   *
   * @param {array[]} data - Sales Data
   * @param {number} startingLine - Starting line to extract from (first line = 0)
   * @param {number} startingColumn - Starting column to extract from (first column = 0)
   * @returns {array[]} Array of extracted data rows as arrays
   */
  extractResults(data, startingLine, startingColumn) {
    if (startingLine && startingLine > 0) data.splice(0, startingLine);
    if (startingColumn && startingColumn > 0) {
      data.forEach((row) => {
        row.splice(0, startingColumn);
      });
    }
    return data;
  },

  /**
   * Creates an ingest task to be picked up by the processor
   *
   * * Creates a task in the database
   * * Then changes status of Sales File to "Waiting"
   * * Sends a message to AWS SQS to notify processor of the pending task
   * * Calls `callback(err, data)` with `data` containing the data returned by SQS.sendMessage
   * * Calls `callback(err, data)` with an `err` message if an error occurs
   *
   * @param {object} salesFile - The sales file document
   * @param {number} priority - The priority of the task (defaults to 1)
   * @param {function(string, object)} callback - A callback that handles the response
   */
  createIngestTask: (salesFile, priority, callback) => {
    priority = priority || 1;
    logger.info(`${salesFile._id} createIngestTask: Getting client ${salesFile.clientId}`);
    Client.findById(salesFile.clientId, 'name')
      .then((client) => {
        logger.info(`${salesFile._id} createIngestTask: Counting pending tasks`);
        Task.countDocuments({
          name: 'Sales File Ingest', clientId: salesFile.clientId, status: 'Pending', 'value.salesFileId': salesFile._id.toString(),
        })
          .then((count) => {
            if (!count) {
              salesFile.status = 'Waiting';
              logger.info(`${salesFile._id} createIngestTask: Saving Sales File`);
              salesFile.save()
                .then(() => {
                  const task = new Task({
                    name: 'Sales File Ingest', clientId: salesFile.clientId, clientName: client.name, priority, status: 'Pending', value: { salesFileId: salesFile._id.toString() },
                  });
                  logger.info(`${salesFile._id} createIngestTask: Saving Task`);
                  task.save()
                    .then(() => {
                      SQS.sendMessage(task, priority, callback);
                    })
                    .catch((taskSaveErr) => {
                      logger.error(`${salesFile._id} createIngestTask: Error saving Task`, taskSaveErr);
                      callback(taskSaveErr);
                    });
                })
                .catch((saveErr4) => {
                  logger.error(`${salesFile._id} createIngestTask: Error saving Sales File`, saveErr4);
                  callback(saveErr4);
                });
            } else {
              callback(new Error('Task already exists and is waiting to complete'));
            }
          })
          .catch((countErr) => {
            logger.error(`${salesFile._id} createIngestTask: Error counting pending tasks`, countErr);
            callback(countErr);
          });
      })
      .catch((findErr3) => {
        logger.error(`${salesFile._id} createIngestTask: Error getting client`, findErr3);
        callback(findErr3);
      });
  },
};

module.exports = ingestSalesFile;
