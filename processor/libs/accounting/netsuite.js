const { logger, fileManager, createZip, utils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb').ObjectId;
const fs = require('fs');
const moment = require('moment');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const SalesFile = require('../../models/salesFile');
const Contract = require('../../models/contract');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const WriteCsv = require('../writeCsv/writeCsvObject');

module.exports = {
  calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback) {
    const netsuite = this;
    async.waterfall([
      function (cb) {
        // Update accountingPeriod to starting point
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
          $set: {
            processStartTime: new Date(), status: 'Processing', calculationStatus: 'Clearing Previous Data', runNo: accountingPeriod.runNo,
          },
        })
          .then(() => {
            cb();
          })
          .catch((err) => {
            cb(err);
          });
      },
      function (cb) {
        // Clear old data out and return periodIds to blank where required
        logger.info('Clearing old accountingPeriod data');
        accountingPeriod.clearPeriod(bigQuery, client, (err, result) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Error in clearing previous data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Successfully Cleared Old Accounting Period data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Calculating Sales' } })
              .then((ap) => {
                accountingPeriod = ap;
                cb();
              })
              .catch((err) => {
                logger.error(err);
                // It's possible that not assigning undefined to accountingPeriod is an issue
                // It is how it was done before the change to promises, leaving it commented out for now
                // accountingPeriod = undefined;
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Get Partition Nos
        bigQuery.getMultiDistinct(bigQuery.accountingTable, ['partitionNo'], { salesFileId: { $in: accountingPeriod.salesFilesIds } }, (err, values) => {
          if (err) {
            cb(err);
          } else if (values) {
            accountingPeriod.salesPartitionNos = values.map((item) => item.partitionNo);
            accountingPeriod.save()
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            cb();
          }
        });
      },
      function (cb) {
        // Calculate Sales
        logger.info(`${accountingPeriod._id} Starting to Calculate Sales`);
        logger.info('Calculating Sales');
        netsuite.calculateSales(AccountingPeriod, accountingPeriod, bigQuery, client, (err) => {
          logger.info(`${accountingPeriod._id} Completed Calculating Sales`);
          if (err) {
            logger.error(`${accountingPeriod._id} Errored in Calculating Sales`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Sales Calculation Errored' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Calculating Sales`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Flushing Catalogue Data to Output' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Calculate Adjustment Sales
        logger.info(`${accountingPeriod._id} Starting to Calculate Adjustment Sales`);
        logger.info('Calculating Sales');
        netsuite.calculateAdjustmentSales(AccountingPeriod, accountingPeriod, bigQuery, client, (err) => {
          logger.info(`${accountingPeriod._id} Completed Calculating Adjustment Sales`);
          if (err) {
            logger.error(`${accountingPeriod._id} Errored in Calculating Adjustment Sales`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Sales Calculation Errored' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Calculating Sales`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Getting Period Data' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Get AccountingPeriod Data
        logger.info(`${accountingPeriod._id} Starting to Get Accounting Period Data`);
        logger.info('Getting AccountingPeriod Data');
        netsuite.getData(AccountingPeriod, accountingPeriod, bigQuery, (err, result) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Getting Accounting Period Data' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Creating Accounting Period Files' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Files');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Files`);
        netsuite.createFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, uniqueValues) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { uniqueValues } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Adjustment Files');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Adjustment`);
        netsuite.createAdjustmentFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allAdjustmentsCsv: s3Key } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Unreported Sales File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Unreported Sales File`);
        netsuite.createUnreportedSalesCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Unreported Sales File' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
              $set: {
                unreportedSalesCsv: s3Key, suspenseNetAmount: output.suspenseNetAmount, suspenseGrossAmount: output.suspenseGrossAmount, suspenseLines: output.suspenseLines,
              },
            })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Suspense Summary Files
        logger.info('Creating Accounting Period Unreported Sales File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Unreported Sales File`);
        netsuite.createSuspenseSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Unreported Sales File' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { suspenseSummaryCsv: s3Key } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Suspense Summary Files
        logger.info('Creating Accounting Period Adjustment Summary');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Adjustment Summary`);
        netsuite.createAdjustmentsSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Adjustment Summary`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Accounting Period Adjustment Summary' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Adjustment Summary`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { adjustmentSummaryCsv: s3Key } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Mappings File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Mappings File`);
        netsuite.createMappingsCsv(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Mappings File' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { mappingsCsv: s3Key } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Mappings File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Mappings File`);
        netsuite.createOutputsCsv(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Mappings File' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allCalculatedSalesCsv: s3Key } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Zip of Files
        logger.info('Creating Zip of Files');
        logger.info(`${accountingPeriod._id} Starting to Create Zip of Files`);
        netsuite.createZipOfFiles(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Zip of Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Zip of Files' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Zip of Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { outputZip: s3Key, separatedFiles: accountingPeriod.separatedFiles, calculationStatus: 'Complete' } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
    ], (err) => {
      if (err) {
        logger.error(`${accountingPeriod._id} Accounting Period Processing Errored`);
        logger.error(err);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationError: err, status: 'Errored' } })
          .then((accountingPeriod) => {
            callback(accountingPeriod);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        logger.info(`${accountingPeriod._id} Accounting Period Processing Complete`);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { processEndTime: new Date(), status: 'Complete' } })
          .then((accountingPeriod) => {
            callback(accountingPeriod);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
  calculateSales(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Setup file for writing sales to
    bigQuery.setupFile((err) => {
      if (err) {
        callback(err);
      } else {
        // Setup Output Array
        let output = [];
        // Refresh AccountingPeriod
        AccountingPeriod.findById(accountingPeriod._id)
          .then((accountingPeriod) => {
            async.waterfall([
              function (cb) {
                // Get query for filtering sales
                netsuite.createSalesFilter(accountingPeriod, cb);
              },
              function (query, cb) {
                // Get Mappings
                const mappings = {
                  distributionChannels: {}, configurations: {}, priceCategories: {}, sources: {}, subSources: {}, accounts: {},
                };
                client.accountingPeriodMappings.distributionChannels.forEach((item) => { mappings.distributionChannels[item.from] = item.to; });
                client.accountingPeriodMappings.configurations.forEach((item) => { mappings.configurations[item.from] = item.to; });
                client.accountingPeriodMappings.priceCategories.forEach((item) => { mappings.priceCategories[item.from] = item.to; });
                client.accountingPeriodMappings.sources.forEach((item) => { mappings.sources[item.from] = item.to; });
                client.accountingPeriodMappings.subSources.forEach((item) => { mappings.subSources[item.from] = item.to; });
                cb(null, query, mappings);
              },
              function (query, mappings, cb) {
                // Load data
                const inputFields = [
                  'id', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'catNo', 'isrc', 'distributionChannel',
                  'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description',
                  'units', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount',
                  'homeCurrencyNetAmount', 'status', 'partitionNo',
                ];
                const outputFields = ['salesLineId'];
                const sqlQuery = bigQuery.joinAccountsFilterQuery(inputFields, outputFields, query);
                bigQuery.logQuery(bigQuery.inputTable, sqlQuery, 'Accounting');
                let callbackCalled = false;
                let count = 0;
                let writeData = [];
                logger.debug(sqlQuery);
                bigQuery.client.createQueryStream(sqlQuery)
                  .on('error', (err) => {
                    if (!callbackCalled) {
                      callbackCalled = true;
                      cb(err);
                    }
                  })
                  .on('data', (salesLine) => {
                    // Update count
                    count += 1;
                    // Map data
                    salesLine = mapSalesLine(salesLine, mappings, accountingPeriod._id.toString());
                    // Set adjustment values
                    salesLine.adjustment = false;
                    // Add to output
                    output.push(salesLine);
                    // Write data to file when 100000
                    if (output.length === 100000) {
                      logger.debug('Calculated Lines:', count);
                      writeData = output.slice();
                      output = [];
                      bigQuery.writeToFile(writeData, bigQuery.accountingTable, () => {

                      });
                    }
                  })
                  .on('end', () => {
                    logger.info(`Total Lines: ${count}`);
                    if (!callbackCalled) {
                      callbackCalled = true;
                      // Write final lines to file
                      bigQuery.writeToFile(output, bigQuery.accountingTable, (err) => {
                        cb(err);
                      });
                    }
                  });
              },

            ], (err) => {
              if (err) {
                callback(err);
              } else {
                // Write to DB
                bigQuery.writeFileToDb(bigQuery.accountingTable, callback);
              }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
  calculateAdjustmentSales(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Setup file for writing sales to
    bigQuery.setupFile((err) => {
      if (err) {
        callback(err);
      } else {
        // Setup Output Array
        let output = [];
        // Refresh AccountingPeriod
        AccountingPeriod.find({
          clientId: accountingPeriod.clientId, outputType: { $ne: 'COGS' }, accountingDate: { $lt: accountingPeriod.accountingDate }, _id: { $ne: accountingPeriod._id },
        })
          .then((previousAccountingPeriods) => {
            if (previousAccountingPeriods && previousAccountingPeriods.length > 0) {
              async.map(previousAccountingPeriods, (previousAccountingPeriod, accountingPeriodCb) => {
                // Get query for filtering sales
                netsuite.createSalesFilter(previousAccountingPeriod, accountingPeriodCb);
              }, (err, queries) => {
                // Combine Queries
                const query = netsuite.combineSalesFilterQueries(queries);
                // const query = { $or: queries };
                async.waterfall([
                  function (cb) {
                    // Get Mappings
                    const mappings = {
                      distributionChannels: {}, configurations: {}, priceCategories: {}, sources: {}, subSources: {},
                    };
                    client.accountingPeriodMappings.distributionChannels.forEach((item) => { mappings.distributionChannels[item.from] = item.to; });
                    client.accountingPeriodMappings.configurations.forEach((item) => { mappings.configurations[item.from] = item.to; });
                    client.accountingPeriodMappings.priceCategories.forEach((item) => { mappings.priceCategories[item.from] = item.to; });
                    client.accountingPeriodMappings.sources.forEach((item) => { mappings.sources[item.from] = item.to; });
                    client.accountingPeriodMappings.subSources.forEach((item) => { mappings.subSources[item.from] = item.to; });
                    cb(null, mappings);
                  },
                  function (mappings, cb) {
                    // Load data
                    const inputFields = ['id', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'status', 'isrc', 'catNo', 'partitionNo'];
                    const outputFields = ['salesLineId'];
                    const sqlQuery = bigQuery.joinAccountsFilterQuery(inputFields, outputFields, query);
                    logger.debug(sqlQuery);
                    bigQuery.logQuery(bigQuery.inputTable, sqlQuery, 'Accounting');
                    let callbackCalled = false;
                    let count = 0;
                    bigQuery.client.createQueryStream(sqlQuery)
                      .on('error', (err) => {
                        if (!callbackCalled) {
                          callbackCalled = true;
                          cb(err);
                        }
                      })
                      .on('data', (salesLine) => {
                        // Update count
                        count += 1;
                        // Map data
                        salesLine = mapSalesLine(salesLine, mappings, accountingPeriod._id.toString());
                        // Set adjustment values
                        salesLine.adjustment = true;
                        // Add to output
                        output.push(salesLine);
                        // Write data to file when 100000
                        if (output.length === 100000) {
                          logger.debug('Calculated Lines:', count);
                          bigQuery.writeToFile(output, bigQuery.accountingTable, () => {
                            output = [];
                          });
                        }
                      })
                      .on('end', () => {
                        logger.info(`Total Lines: ${count}`);
                        if (!callbackCalled) {
                          callbackCalled = true;
                          // Write final lines to file
                          bigQuery.writeToFile(output, bigQuery.accountingTable, (err) => {
                            cb(err);
                          });
                        }
                      });
                  },

                ], (err) => {
                  if (err) {
                    callback(err);
                  } else {
                    // Write to DB
                    bigQuery.writeFileToDb(bigQuery.accountingTable, callback);
                  }
                });
              });
            } else {
              callback();
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
  combineSalesFilterQueries(queries) {
    const items = { releaseId: [], trackId: [], salesFileId: [], partitionNo: [] };
    if (Array.isArray(queries)) {
      queries.forEach((query) => {
        query.$or.forEach((orItem) => {
          if (orItem?.catType === 'Release') {
            items.releaseId = items.releaseId.concat(orItem.releaseId.$in, items.releaseId);
          }
          if (orItem?.catType === 'Track') {
            items.trackId = items.trackId.concat(orItem.trackId.$in, items.trackId);
          }
        });
        items.salesFileId = items.salesFileId.concat(query.salesFileId.$in, items.salesFileId);
        items.partitionNo = items.partitionNo.concat(query.partitionNo.$in, items.partitionNo);
      });
    }
    return {
      $or: [
        { catType: 'Release', releaseId: { $in: [...new Set(items.releaseId)] } },
        { catType: 'Track', trackId: { $in: [...new Set(items.trackId)] } },
      ],
      salesFileId: { $in: [...new Set(items.salesFileId)] },
      partitionNo: { $in: [...new Set(items.partitionNo)] },
      status: 'Complete',
    };
  },
  getData(AccountingPeriod, accountingPeriod, bigQuery, callback) {
    // Setup output values
    const setValues = {};
    async.waterfall([
      function (cb) {
        // Get non-adjustment data
        bigQuery.getAggregate(bigQuery.accountingTable, 'accountingPeriodId', [{ column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }], 'lines', { accountingPeriodId: accountingPeriod._id.toString(), adjustment: false }, {}, (err, groupedData) => {
          if (err) {
            logger.error(err);
            cb(err);
          } else if (groupedData && groupedData[0]) {
            logger.debug(groupedData);
            setValues.grossAmount = groupedData[0].homeCurrencyGrossAmount;
            setValues.netAmount = groupedData[0].homeCurrencyNetAmount;
            setValues.lines = groupedData[0].lines;
            cb();
          } else {
            cb();
          }
        });
      },
      function (cb) {
        // Get adjustment data
        bigQuery.getAggregate(bigQuery.accountingTable, 'accountingPeriodId', [{ column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }], 'lines', { accountingPeriodId: accountingPeriod._id.toString(), adjustment: true }, {}, (err, adjustmentData) => {
          if (err) {
            logger.error(err);
            cb(err);
          } else if (adjustmentData && adjustmentData[0]) {
            setValues.adjustmentGrossAmount = adjustmentData[0].homeCurrencyGrossAmount;
            setValues.adjustmentNetAmount = adjustmentData[0].homeCurrencyNetAmount;
            setValues.adjustmentLines = adjustmentData[0].lines;
            cb();
          } else {
            cb();
          }
        });
      },
      function (cb) {
        // Input sales totals
        bigQuery.getAggregate(bigQuery.inputTable, null, [{ column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }], 'lines', { salesFileId: { $in: accountingPeriod.salesFilesIds } }, {}, (err, groupedData) => {
          if (err) {
            logger.error(err);
            cb(err);
          } else if (groupedData) {
            setValues.salesInputAmount = groupedData[0].homeCurrencyGrossAmount;
            cb();
          } else {
            cb();
          }
        });
      },
    ], (err) => {
      // Set any null values to 0
      Object.keys(setValues).forEach((key) => {
        if (setValues[key] === null) {
          setValues[key] = 0;
        }
      });
      // Update accounting period
      AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
        $set: setValues,
      })
        .then(() => {
          callback();
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    });
  },
  createFiles(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Get unique salesFileIds
    bigQuery.getDistinct(bigQuery.accountingTable, 'salesFileId', { accountingPeriodId: accountingPeriod._id.toString(), adjustment: false }, (err, salesFileIds) => {
      // Handle errors
      if (err || !salesFileIds) {
        callback(err);
      } else if (salesFileIds) {
        async.eachSeries(salesFileIds, (salesFileId, cb) => {
          logger.debug('Running for file:', salesFileId);
          netsuite.createFileForSalesFile(salesFileId, AccountingPeriod, accountingPeriod, bigQuery, client, cb);
        }, (err) => {
          callback(err, null, accountingPeriod.uniqueValues);
        });
      }
    });
  },
  createFileForSalesFile(salesFileId, AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Setup file count
    let fileNo = 1;
    let mainCsvRows = [];
    // Setup catalogue mappings to contracts
    netsuite.mappingsForOutput(client, (err, mappings) => {
      // Get sales file
      const salesFile = mappings.salesFiles[salesFileId];
      // Set date from either the sales file, or falling back to the accounting period
      const invoiceDateString = `${salesFile.invoiceNo}`.split('_')[0];
      let date = new Date(accountingPeriod.accountingDate);
      if (invoiceDateString && !isNaN(parseInt(invoiceDateString[0]))) {
        date = new Date(`20${invoiceDateString[2]}${invoiceDateString[3]}`, parseInt(invoiceDateString[0] + invoiceDateString[1]), 0, 12, 0, 0);
      }
      // Read data
      // Get Query
      const sqlQuery = `
        SELECT accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, SUM(units) as units, SUM(homeCurrencyGrossAmount) as homeCurrencyGrossAmount
        FROM \`${bigQuery.datasetName}.${bigQuery.accountingTable}\`
        WHERE accountingPeriodId = '${accountingPeriod._id.toString()}' AND adjustment = false AND salesFileId = '${salesFileId}'
        GROUP BY accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource
        ORDER BY distributionChannel, territory
      `;
      bigQuery.logQuery(bigQuery.accountingTable, sqlQuery, 'Accounting');
      let callbackCalled = false;
      let count = 0;
      let account;
      let subSource;
      bigQuery.client.createQueryStream(sqlQuery)
        .on('error', (err) => {
          if (!callbackCalled) {
            callbackCalled = true;
            callback(err);
          }
        })
        .on('data', (salesLine) => {
          count += 1;
          if (count % 10000 === 0) {
            logger.debug('Writing Main File Lines:', count);
          }
          // Get catalogue item
          let catalogueItem = {};
          if (salesLine.catType === 'Release') {
            catalogueItem = mappings.releases[salesLine.releaseId];
          } else if (salesLine.catType === 'Track') {
            catalogueItem = mappings.tracks[salesLine.trackId];
          } else if (salesLine.catType === 'Work') {
            catalogueItem = mappings.works[salesLine.workId];
          } else if (salesLine.catType === 'Contract') {
            catalogueItem = mappings.contracts[salesLine.contractId];
          }
          // Map account
          account = mapAccount(salesLine, mappings.accounts);
          // Update subsource for updating the final line
          subSource = salesLine.subSource;
          // Add values to unique values
          if (accountingPeriod.uniqueValues.territories.indexOf(mapTerritory(salesLine.territory)) === -1) {
            accountingPeriod.uniqueValues.territories.push(mapTerritory(salesLine.territory));
          }
          if (catalogueItem && catalogueItem.contractId && accountingPeriod.uniqueValues.contractIds.indexOf(catalogueItem.contractId) === -1) {
            accountingPeriod.uniqueValues.contractIds.push(catalogueItem.contractId);
          }
          if (accountingPeriod.uniqueValues.accountCodes.indexOf(account) === -1) {
            accountingPeriod.uniqueValues.accountCodes.push(account);
          }
          if (accountingPeriod.uniqueValues.sources.indexOf(salesLine.subSource) === -1) {
            accountingPeriod.uniqueValues.sources.push(salesLine.subSource);
          }
          // Organise whether transaction is a credit or debit
          const debit = salesLine.homeCurrencyGrossAmount < 0 ? 0 - parseFloat(salesLine.homeCurrencyGrossAmount.toFixed(2)) : 0;
          const credit = salesLine.homeCurrencyGrossAmount >= 0 ? salesLine.homeCurrencyGrossAmount.toFixed(2) : 0;
          // Create output array
          const output = [
            salesFile ? `${salesFile.invoiceNo} ${fileNo}` : null,
            salesFile ? `${salesFile.invoiceNo} ${fileNo}` : null,
            '300 Entertainment',
            account,
            debit,
            credit,
            salesLine.subSource,
            salesLine.source,
            null,
            moment(date).format('MM/DD/YYYY'),
            mapTerritory(salesLine.territory),
            `${mapTerritory(salesLine.territory)} ${salesLine.distributionChannel}`,
            salesLine.homeCurrencyGrossAmount.toFixed(2),
            salesLine.units,
            catalogueItem ? catalogueItem.artist : null,
            catalogueItem ? catalogueItem.identifier : null,
            salesLine.configuration,
            catalogueItem ? catalogueItem.contractId : null,
          ];
          // If value is present on line - removing any zero value lines that come from Youtube, etc.
          if (salesLine.homeCurrencyGrossAmount) {
            // Add to files
            mainCsvRows.push(output);
          }
          // Write data to file when required
          writeDataToFiles(false, mappings, () => {});
        })
        .on('end', () => {
          if (!callbackCalled) {
            callbackCalled = true;
            // Write remaining data to file
            writeDataToFiles(true, mappings, () => {
              callback(err, accountingPeriod.uniqueValues);
            });
          }
        });

      function writeDataToFiles(forceWrite, mappings, callback) {
        // Get sales file from mappings
        const salesFile = mappings.salesFiles[salesFileId];
        // Update when force is true or length is 999
        if (forceWrite || mainCsvRows.length === 999) {
          const data = mainCsvRows.slice();
          // Reset data after writing
          mainCsvRows = [];
          // Loop through data to get totals for final line
          let totalCredit = 0;
          let totalDebit = 0;
          let totalRevenue = 0;
          let totalUnits = 0;
          let subSource;
          data.forEach((line) => {
            totalRevenue += parseFloat(line[12]);
            totalUnits += parseFloat(line[13]);
            subSource = line[6];
          });
          if (totalRevenue > 0) {
            totalCredit = totalRevenue;
          } else if (totalRevenue < 0) {
            totalDebit = totalRevenue;
          }
          // Add the final line balancing credit and debit for a forceWrite
          data.push([
            salesFile ? `${salesFile.invoiceNo} ${fileNo}` : null,
            salesFile ? `${salesFile.invoiceNo} ${fileNo}` : null,
            '300 Entertainment',
            '19050-000 Sales Receivable',
            totalCredit,
            totalDebit,
            subSource,
            null,
            null,
            moment(date).format('MM/DD/YYYY'),
            null,
            null,
            totalRevenue,
            totalUnits,
            null,
            null,
            null,
            '300E/Overhead',
          ]);
          // Add to file outputs
          accountingPeriod.uniqueValues.fileOutputs.push({
            invoiceNo: `${salesFile.invoiceNo} ${fileNo}`,
            totalRevenue,
            subSource,
            date: moment(date).format('MM/DD/YYYY'),
          });
          // Create File
          netsuite.createCsv(accountingPeriod, data, `${salesFile.invoiceNo} ${fileNo}`, () => {
            // Call callback if exists
            if (callback) {
              callback();
            }
          });
          // Increment fileNo
          fileNo += 1;
        }
      }
    });
  },
  createAdjustmentFiles(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Get unique salesFileIds
    bigQuery.getDistinct(bigQuery.accountingTable, 'salesFileId', { accountingPeriodId: accountingPeriod._id.toString(), adjustment: true }, (err, salesFileIds) => {
      // Handle errors
      if (err || !salesFileIds) {
        callback(err);
      } else if (salesFileIds) {
        async.eachSeries(salesFileIds, (salesFileId, cb) => {
          logger.debug('Running for file:', salesFileId);
          netsuite.createAdjustmentFileForSalesFile(salesFileId, AccountingPeriod, accountingPeriod, bigQuery, client, cb);
        }, (err) => {
          callback(err, null, accountingPeriod.uniqueValues);
        });
      }
    });
  },
  createAdjustmentFileForSalesFile(salesFileId, AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Setup file count
    let fileNo = 1;
    let mainCsvRows = [];
    // Setup catalogue mappings to contracts
    netsuite.mappingsForOutput(client, (err, mappings) => {
      // Get sales file
      const salesFile = mappings.salesFiles[salesFileId];
      // Set date accounting period date
      const date = new Date(accountingPeriod.accountingDate);
      // Read data
      // Get Query
      const sqlQuery = `
        SELECT accountingPeriodId, salesFileId, catType, catNo, isrc, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, SUM(units) as units, SUM(homeCurrencyGrossAmount) as homeCurrencyGrossAmount
        FROM \`${bigQuery.datasetName}.${bigQuery.accountingTable}\`
        WHERE accountingPeriodId = '${accountingPeriod._id.toString()}' AND adjustment = true AND salesFileId = '${salesFileId}'
        GROUP BY accountingPeriodId, salesFileId, catType, catNo, isrc, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource
        ORDER BY distributionChannel, territory
      `;
      bigQuery.logQuery(bigQuery.accountingTable, sqlQuery, 'Accounting');
      let callbackCalled = false;
      let count = 0;
      let account;
      let subSource;
      bigQuery.client.createQueryStream(sqlQuery)
        .on('error', (err) => {
          if (!callbackCalled) {
            callbackCalled = true;
            callback(err);
          }
        })
        .on('data', (salesLine) => {
          count += 1;
          if (count % 10000 === 0) {
            logger.debug('Writing Main File Lines:', count);
          }
          // Get catalogue item
          let catalogueItem = {};
          if (salesLine.catType === 'Release') {
            catalogueItem = mappings.releases[salesLine.releaseId];
          } else if (salesLine.catType === 'Track') {
            catalogueItem = mappings.tracks[salesLine.trackId];
          } else if (salesLine.catType === 'Work') {
            catalogueItem = mappings.works[salesLine.workId];
          } else if (salesLine.catType === 'Contract') {
            catalogueItem = mappings.contracts[salesLine.contractId];
          }
          // Map account
          account = mapAccount(salesLine, mappings.accounts);
          // Update subsource for updating the final line
          subSource = salesLine.subSource;
          // Add values to unique values
          if (accountingPeriod.uniqueValues.territories.indexOf(mapTerritory(salesLine.territory)) === -1) {
            accountingPeriod.uniqueValues.territories.push(mapTerritory(salesLine.territory));
          }
          if (catalogueItem && catalogueItem.contractId && accountingPeriod.uniqueValues.contractIds.indexOf(catalogueItem.contractId) === -1) {
            accountingPeriod.uniqueValues.contractIds.push(catalogueItem.contractId);
          }
          if (accountingPeriod.uniqueValues.accountCodes.indexOf(account) === -1) {
            accountingPeriod.uniqueValues.accountCodes.push(account);
          }
          if (accountingPeriod.uniqueValues.sources.indexOf(salesLine.subSource) === -1) {
            accountingPeriod.uniqueValues.sources.push(salesLine.subSource);
          }
          // Create output array
          const debit = salesLine.homeCurrencyGrossAmount < 0 ? salesLine.homeCurrencyGrossAmount.toFixed(2) : 0;
          const credit = salesLine.homeCurrencyGrossAmount >= 0 ? salesLine.homeCurrencyGrossAmount.toFixed(2) : 0;
          const output = [
            salesFile ? `${salesFile.invoiceNo} Adjustment ${fileNo}` : null,
            salesFile ? `${salesFile.invoiceNo} Adjustment ${fileNo}` : null,
            '300 Entertainment',
            account,
            debit,
            credit,
            salesLine.subSource,
            salesLine.source,
            null,
            moment(date).format('MM/DD/YYYY'),
            mapTerritory(salesLine.territory),
            `${mapTerritory(salesLine.territory)} ${salesLine.distributionChannel}`,
            salesLine.homeCurrencyGrossAmount.toFixed(2),
            salesLine.units,
            catalogueItem ? catalogueItem.artist : null,
            catalogueItem ? catalogueItem.identifier : null,
            salesLine.configuration,
            catalogueItem ? catalogueItem.contractId : null,
          ];
          // Create removal from suspense
          let suspenseIdentifier;
          if (salesLine.catType === 'Release') {
            suspenseIdentifier = salesLine.catNo ? salesLine.catNo : catalogueItem.identifier;
          } else {
            suspenseIdentifier = salesLine.isrc;
          }
          const suspenseDeduction = [
            salesFile ? `${salesFile.invoiceNo} Adjustment ${fileNo}` : null,
            salesFile ? `${salesFile.invoiceNo} Adjustment ${fileNo}` : null,
            '300 Entertainment',
            '10401-001 Suspense - Sales Revenue : Type 1 Suspense - Unmatched',
            credit,
            debit,
            salesLine.subSource,
            salesLine.source,
            null,
            moment(date).format('MM/DD/YYYY'),
            mapTerritory(salesLine.territory),
            `${mapTerritory(salesLine.territory)} ${salesLine.distributionChannel}`,
            salesLine.homeCurrencyGrossAmount.toFixed(2),
            salesLine.units,
            catalogueItem ? catalogueItem.artist : null,
            suspenseIdentifier,
            salesLine.configuration,
            'SUSPENSE',
          ];
          // If value is present on line - removing any zero value lines that come from Youtube, etc.
          if (salesLine.homeCurrencyGrossAmount) {
            // Add to files
            mainCsvRows.push(output);
            mainCsvRows.push(suspenseDeduction);
          }
          // Write data to file when required
          writeDataToFiles(false, mappings, () => { });
        })
        .on('end', () => {
          if (!callbackCalled) {
            callbackCalled = true;
            // Write remaining data to file
            writeDataToFiles(true, mappings, () => {
              callback(err, accountingPeriod.uniqueValues);
            });
          }
        });

      function writeDataToFiles(forceWrite, mappings, callback) {
        // Get sales file from mappings
        const salesFile = mappings.salesFiles[salesFileId];
        // Update when force is true or length is no larger than 999
        if (forceWrite || mainCsvRows.length >= 996) {
          const data = mainCsvRows.slice();
          // Reset data after writing
          mainCsvRows = [];
          // Loop through data to get totals for final line
          let totalRevenue = 0;
          let subSource;
          data.forEach((line) => {
            totalRevenue += parseFloat(line[5]);
            subSource = line[6];
          });
          // Add to file outputs
          accountingPeriod.uniqueValues.fileOutputs.push({
            invoiceNo: `${salesFile.invoiceNo} Adjustment ${fileNo}`,
            totalRevenue,
            subSource,
            date: moment(date).format('MM/DD/YYYY'),
          });
          // Create File
          netsuite.createCsv(accountingPeriod, data, `${salesFile.invoiceNo} Adjustment ${fileNo}`, () => {
            // Call callback if exists
            if (callback) {
              callback();
            }
          });
          // Increment fileNo
          fileNo += 1;
        }
      }
    });
  },
  createSalesFilter(accountingPeriod, callback) {
    const query = {
      salesFileId: { $in: accountingPeriod.salesFilesIds },
      status: 'Complete',
      $or: [],
    };
    // Manage partition nos
    if (accountingPeriod.salesPartitionNos.indexOf(null) !== -1) {
      const partitionsWithoutNull = accountingPeriod.salesPartitionNos.filter(Boolean);
      query.$or3 = [{ partitionNo: null }];
      if (partitionsWithoutNull.length > 0) {
        query.$or3.push({ partitionNo: { $in: partitionsWithoutNull } });
      }
    } else {
      query.partitionNo = { $in: accountingPeriod.salesPartitionNos };
    }

    // Get priamry contracts
    Contract.find({ clientId: accountingPeriod.clientId, $and: [{ foreignId: { $exists: true } }, { foreignId: { $ne: '' } }], primaryContract: true }, 'name')
      .then((contracts) => {
        // Get ContractIds
        const contractIds = contracts.map((contract) => contract._id.toString());
        async.parallel([
          function (paraCb) {
            // Get releases
            Release.find({ clientId: accountingPeriod.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }, '_id')
              .then((releases) => {
                if (releases) {
                  const releaseIds = releases.map((release) => release._id.toString());
                  query.$or.push({ catType: 'Release', releaseId: { $in: releaseIds } });
                  paraCb();
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
          function (paraCb) {
            // Get tracks
            Track.find({ clientId: accountingPeriod.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }, '_id')
              .then((tracks) => {
                if (tracks) {
                  const trackIds = tracks.map((track) => track._id.toString());
                  query.$or.push({ catType: 'Track', trackId: { $in: trackIds } });
                  paraCb();
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
          function (paraCb) {
            // Get works
            Work.find({ clientId: accountingPeriod.clientId, 'salesReturnsRights.contractId': { $in: contractIds } }, '_id')
              .then((works) => {
                if (works) {
                  const workIds = works.map((work) => work._id.toString());
                  query.$or.push({ catType: 'Work', workId: { $in: workIds } });
                  paraCb();
                } else {
                  paraCb();
                }
              })
              .catch((err) => {
                logger.error(err);
                paraCb(err);
              });
          },
        ], (err) => {
          callback(err, query);
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  mappingsForOutput(client, callback) {
    // Get all primary contracts
    Contract.find({ clientId: client._id.toString(), primaryContract: true })
      .then((contracts) => {
        // Set up mappings for use against catalogue
        const contractMappings = {};
        contracts.forEach((contract) => { contractMappings[contract._id.toString()] = contract; });
        // Get catalogue with mappings
        const catalogueData = {
          releases: {}, tracks: {}, works: {}, contracts: contractMappings, salesFiles: {}, accounts: {},
        };
        async.parallel([
          function (cb) {
            Release.find({ clientId: client._id.toString() })
              .then((releases) => {
                // Loop through releases for mapping
                releases.forEach((release) => {
                  // Set catalogue object
                  catalogueData.releases[release._id.toString()] = {
                    title: release.title, version: release.version, artist: release.artist, identifier: release.catNo,
                  };
                  // Loop through contracts to get primary artist
                  release.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      catalogueData.releases[release._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            Track.find({ clientId: client._id.toString() })
              .then((tracks) => {
                // Loop through tracks for mapping
                tracks.forEach((track) => {
                  // Set catalogue object
                  catalogueData.tracks[track._id.toString()] = {
                    title: track.title, version: track.version, artist: track.artist, identifier: track.isrc,
                  };
                  // Loop through contracts to get primary artist
                  track.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      catalogueData.tracks[track._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            Work.find({ clientId: client._id.toString() })
              .then((works) => {
                // Loop through tracks for mapping
                works.forEach((work) => {
                  // Set catalogue object
                  catalogueData.works[work._id.toString()] = { title: work.title, artist: work.composers, identifier: work.identifier };
                  // Loop through contracts to get primary artist
                  work.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      catalogueData.works[work._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            SalesFile.find({ clientId: client._id.toString() }, 'name invoiceNo overwriteFields')
              .then((salesFiles) => {
                salesFiles.forEach((salesFile) => {
                  catalogueData.salesFiles[salesFile._id.toString()] = salesFile;
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            // Map Account
            // Load Territory Groups
            TerritoryGroup.find({ clientId: client._id.toString() })
              .then((territoryGroups) => {
                // Map territory groups to key value object
                const territoryGroupMappings = {};
                territoryGroups.forEach((territoryGroup) => {
                  territoryGroupMappings[territoryGroup._id.toString()] = territoryGroup.territories;
                });
                client.accountingPeriodMappings.accounts.forEach((item) => {
                  catalogueData.accounts[item.source] = catalogueData.accounts[item.source] || [];
                  // Update territory group to array if ID
                  if (ObjectId.isValid(item.territory)) {
                    item.territory = territoryGroupMappings[item.territory];
                  }
                  // Add score for ordering
                  item.score = 0;
                  ['source', 'territory', 'distributionChannel'].forEach((key) => {
                    if (item[key] && item[key] !== '') { item.score += 1; }
                  });
                  catalogueData.accounts[item.source].push(item);
                  // Sort items
                  catalogueData.accounts[item.source].sort((a, b) => a.score - b.score);
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
        ], (err) => {
          callback(err, catalogueData);
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createUnreportedSalesCsv(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Setup counters for suspense values against accountingPeriod
    let grossAmount = 0;
    let netAmount = 0;
    let lines = 0;
    // Setup CSV
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} Unreported Sales.csv`;
    const csvWriter = new WriteCsv({ headers: ['ExternalID', 'Inv Reference', 'Subsidiary', 'Account', 'Debit', 'Credit', 'Customer Name', 'Memo', 'Memo1', 'Trans Date', 'Region', 'Description', 'Total Amount', 'Total Units', 'Artist', 'ReleaseCode', 'Configuration', 'ContractCode'], outputLocation });
    let csvRows = [];
    let fileNo = 1;
    let lineFileNo = 1;
    const date = new Date(accountingPeriod.accountingDate);
    // Setup catalogue mappings to contracts
    netsuite.mappingsForOutput(client, (err, mappings) => {
      // Prepare Query
      // let sqlQuery = `SELECT id, accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, saleDate, SUM(units) as units, SUM(homeCurrencyGrossAmount) as homeCurrencyGrossAmount, SUM(homeCurrencyNetAmount) as homeCurrencyNetAmount, Output.salesLineId
      // FROM \`${ bigQuery.datasetName}.${ bigQuery.inputTable} \` Input
      // LEFT OUTER JOIN \`${ bigQuery.datasetName}.${ bigQuery.accountingTable }\` Output
      // ON (Output.salesLineId = Input.id)
      // GROUP BY accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, saleDate
      // HAVING (Output.salesLineId IS NULL AND Input.salesFileId IN (${ accountingPeriod.salesFilesIds.join(', ') }))`
      const inputFields = [
        'id', 'salesFileId', 'catType', 'releaseId', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'catalogueCatNo',
        'catalogueBarcode', 'catNo', 'trackId', 'catalogueTrackTitle', 'catalogueTrackArtist', 'catalogueIsrc', 'isrc',
        'workId', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'distributionChannel', 'configuration',
        'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units',
        'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'isrc', 'catNo', 'barcode', 'partitionNo'];
      const outputFields = ['salesLineId'];
      let sqlQuery = bigQuery.joinAccountsFilterQuery(inputFields, outputFields, { salesFileId: { $in: accountingPeriod.salesFilesIds, partitionNo: { $in: accountingPeriod.salesPartitionNos } } });
      // Add sort
      sqlQuery += ' ORDER BY id';
      logger.debug(sqlQuery);
      bigQuery.logQuery(bigQuery.inputTable, sqlQuery, 'Accounting');
      let callbackCalled = false;
      // Stream Data
      bigQuery.client.createQueryStream(sqlQuery)
        .on('error', (err) => {
          if (!callbackCalled) {
            callbackCalled = true;
            callback(err);
          }
        })
        .on('data', (salesLine) => {
          // Get sales file
          const salesFile = mappings.salesFiles[salesLine.salesFileId];
          // Set date from either the sales file, or falling back to the accounting period
          const invoiceDateString = `${salesFile.invoiceNo}`.split('_')[0];
          let date = new Date(accountingPeriod.accountingDate);
          if (invoiceDateString && !isNaN(parseInt(invoiceDateString[0]))) {
            date = new Date(`20${invoiceDateString[2]}${invoiceDateString[3]}`, parseInt(invoiceDateString[0] + invoiceDateString[1]), 0, 12, 0, 0);
          }
          // Update suspense values
          if (salesLine.homeCurrencyGrossAmount) { grossAmount += salesLine.homeCurrencyGrossAmount; }
          if (salesLine.homeCurrencyNetAmount) { netAmount += salesLine.homeCurrencyNetAmount; }
          lines += 1;
          if (lines % 10000 === 0) {
            logger.debug('Writing Main File Lines:', lines);
          }
          // Get catalogue item
          let catalogueItem = {};
          if (salesLine.catType === 'Release') {
            catalogueItem = mappings.releases[salesLine.releaseId];
          } else if (salesLine.catType === 'Track') {
            catalogueItem = mappings.tracks[salesLine.trackId];
          } else if (salesLine.catType === 'Work') {
            catalogueItem = mappings.works[salesLine.workId];
          } else if (salesLine.catType === 'Contract') {
            catalogueItem = mappings.contracts[salesLine.contractId];
          }
          // Map subSource
          mappings.subSources = mappings.subSources || {};
          mappings.configurations = mappings.configurations || {};
          client.accountingPeriodMappings.subSources.forEach((item) => { mappings.subSources[item.from] = item.to; });
          client.accountingPeriodMappings.configurations.forEach((item) => { mappings.configurations[item.from] = item.to; });
          if (salesLine.subSource && mappings.subSources[salesLine.subSource]) { salesLine.subSource = mappings.subSources[salesLine.subSource]; }
          if (salesLine.configuration && mappings.configurations[salesLine.configuration]) { salesLine.configuration = mappings.configurations[salesLine.configuration]; }
          // Add values to unique values
          if (accountingPeriod.uniqueValues.territories.indexOf(mapTerritory(salesLine.territory)) === -1) {
            accountingPeriod.uniqueValues.territories.push(mapTerritory(salesLine.territory));
          }
          if (catalogueItem && catalogueItem.contractId && accountingPeriod.uniqueValues.contractIds.indexOf('SUSPENSE') === -1) {
            accountingPeriod.uniqueValues.contractIds.push('SUSPENSE');
          }
          if (accountingPeriod.uniqueValues.accountCodes.indexOf('10401-001 Suspense - Sales Revenue : Type 1 Suspense - Unmatched') === -1) {
            accountingPeriod.uniqueValues.accountCodes.push('10401-001 Suspense - Sales Revenue : Type 1 Suspense - Unmatched');
          }
          if (accountingPeriod.uniqueValues.sources.indexOf(salesLine.subSource) === -1) {
            accountingPeriod.uniqueValues.sources.push(salesLine.subSource);
          }
          // Add to output
          let suspenseIdentifier;
          if (salesLine.catType === 'Release') {
            suspenseIdentifier = salesLine.catNo ? salesLine.catNo : salesLine.barcode;
          } else {
            suspenseIdentifier = salesLine.isrc;
          }
          // Organise whether transaction is a credit or debit
          const debit = salesLine.homeCurrencyGrossAmount < 0 ? 0 - parseFloat(salesLine.homeCurrencyGrossAmount.toFixed(2)) : 0;
          const credit = salesLine.homeCurrencyGrossAmount >= 0 ? salesLine.homeCurrencyGrossAmount.toFixed(2) : 0;
          csvRows.push([
            `Suspense ${moment(date).format('MMYY')} ${lineFileNo}`,
            `Suspense ${moment(date).format('MMYY')} ${lineFileNo}`,
            '300 Entertainment',
            '10401-001 Suspense - Sales Revenue : Type 1 Suspense - Unmatched',
            debit,
            credit,
            salesLine.subSource,
            salesFile ? salesFile.invoiceNo : null,
            null,
            moment(date).format('MM/DD/YYYY'),
            mapTerritory(salesLine.territory),
            `${mapTerritory(salesLine.territory)} ${salesLine.distributionChannel}`,
            parseFloat(salesLine.homeCurrencyGrossAmount).toFixed(2),
            salesLine.units,
            catalogueItem ? catalogueItem.artist : null,
            suspenseIdentifier,
            salesLine.configuration,
            'SUSPENSE',
          ]);
          // Write data to file when required
          writeDataToFiles(false, mappings, lineFileNo, () => {});
        })
        .on('end', () => {
          if (!callbackCalled) {
            callbackCalled = true;
            // Write remaining data to file
            writeDataToFiles(true, mappings, lineFileNo, () => {
              // Close File
              csvWriter.write((err, fileLocation) => {
                if (err) {
                  callback(err);
                } else {
                  // Set S3 Key
                  const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Unreported Sales ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
                  // Upload to S3
                  fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
                    // Check file exists
                    if (fs.existsSync(outputLocation)) {
                      // Remove local file
                      fs.unlink(outputLocation, (err) => {
                        logger.info(`File deleted: ${outputLocation}`);
                        // Return key to callback
                        callback(err, s3Key, { suspenseGrossAmount: grossAmount, suspenseNetAmount: netAmount, suspenseLines: lines });
                      });
                    } else {
                      // Return key to callback
                      callback(err, s3Key, { suspenseGrossAmount: grossAmount, suspenseNetAmount: netAmount, suspenseLines: lines });
                    }
                  });
                }
              });
            });
          }
        });
    });

    function writeDataToFiles(forceWrite, mappings, newLineFileNo, callback) {
      // Update when force is true or length is 999
      if (forceWrite || csvRows.length === 999) {
        lineFileNo += 1;
        const data = csvRows.slice();
        // Reset data after writing
        csvRows = [];
        // Setup invoice no
        let invoiceNo;
        // Loop through data to get totals for final line
        let totalCredit = 0;
        let totalDebit = 0;
        let totalRevenue = 0;
        let totalUnits = 0;
        let subSource;
        data.forEach((line) => {
          invoiceNo = line[0];
          totalRevenue += parseFloat(line[12]);
          if (line[13]) totalUnits += parseFloat(line[13]);
          subSource = line[6];
        });
        if (totalRevenue > 0) {
          totalCredit = totalRevenue;
        } else if (totalRevenue < 0) {
          totalDebit = totalRevenue;
        }
        // Add the final line balancing credit and debit for a forceWrite
        data.push([
          `Suspense ${moment(date).format('MMYY')} ${newLineFileNo}`,
          `Suspense ${moment(date).format('MMYY')} ${newLineFileNo}`,
          '300 Entertainment',
          '19050-000 Sales Receivable',
          totalCredit,
          totalDebit,
          subSource,
          invoiceNo,
          null,
          moment(date).format('MM/DD/YYYY'),
          null,
          null,
          totalRevenue,
          totalUnits,
          null,
          null,
          null,
          '300E/Overhead',
        ]);
        // Add to file outputs
        accountingPeriod.uniqueValues.fileOutputs.push({
          invoiceNo: `Suspense ${fileNo}`,
          totalRevenue,
          subSource,
        });
        csvWriter.addData(data, () => {
          // Create File
          logger.debug(`Suspense ${fileNo}`);
          netsuite.createCsv(accountingPeriod, data, `Suspense ${fileNo}`, () => {
            // Call callback if exists
            if (callback) {
              callback();
            }
          });
          // Increment fileNo
          fileNo += 1;
        });
      }
    }
  },
  createSuspenseSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Get all sales files from this and previous periods
    AccountingPeriod.find({ clientId: accountingPeriod.clientId, outputType: 'Input' }, 'name salesFilesIds')
      .then((accountingPeriods) => {
        // Map all sales files into a single array
        let salesFileIds = [];
        accountingPeriods.forEach((ap) => {
          salesFileIds = salesFileIds.concat(ap.salesFilesIds);
        });
        // Create Sales File ID to Accounting Period Name mapping for use in output
        const accountingPeriodMappings = {};
        accountingPeriods.forEach((ap) => {
          ap.salesFilesIds.forEach((salesFileId) => {
            accountingPeriodMappings[salesFileId] = ap.name;
          });
        });
        // Get Sales File ID to Invoice No mapping
        netsuite.salesFileInvoiceNoMappings(client, (err, salesFileInvoiceNoMappings) => {
          if (err) {
            logger.error(err);
            return callback(err);
          }
          // Setup CSV
          const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} Suspense Summary.csv`;
          const csvWriter = new WriteCsv({ headers: ['Accounting Period', 'Invoice No', 'Identifier', 'Title', 'Version', 'Artist', 'Units', 'Amount'], outputLocation });
          const outputs = {};
          // Setup catalogue mappings to contracts
          netsuite.mappingsForOutput(client, (err, mappings) => {
            // Prepare Query
            // let sqlQuery = `SELECT id, accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, saleDate, SUM(units) as units, SUM(homeCurrencyGrossAmount) as homeCurrencyGrossAmount, SUM(homeCurrencyNetAmount) as homeCurrencyNetAmount, Output.salesLineId
            // FROM \`${ bigQuery.datasetName}.${ bigQuery.inputTable} \` Input
            // LEFT OUTER JOIN \`${ bigQuery.datasetName}.${ bigQuery.accountingTable }\` Output
            // ON (Output.salesLineId = Input.id)
            // GROUP BY accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, source, subSource, saleDate
            // HAVING (Output.salesLineId IS NULL AND Input.salesFileId IN (${ accountingPeriod.salesFilesIds.join(', ') }))`
            const inputFields = [
              'id', 'salesFileId', 'catType', 'releaseId', 'catalogueReleaseTitle', 'catalogueReleaseArtist', 'catalogueCatNo',
              'catalogueBarcode', 'catNo', 'trackId', 'catalogueTrackTitle', 'catalogueTrackArtist', 'catalogueIsrc', 'isrc', 'contractId',
              'workId', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'distributionChannel', 'configuration',
              'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units',
              'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'barcode', 'partitionNo'];
            const outputFields = ['salesLineId'];
            const sqlQuery = bigQuery.joinAccountsFilterQuery(inputFields, outputFields, { salesFileId: { $in: salesFileIds, partitionNo: { $in: accountingPeriod.salesPartitionNos } } });
            logger.debug(sqlQuery);
            bigQuery.logQuery(bigQuery.inputTable, sqlQuery, 'Accounting');
            // Stream Data
            bigQuery.client.createQueryStream(sqlQuery)
              .on('error', callback)
              .on('data', (salesLine) => {
                // logger.debug(salesLine);
                // Get catalogue item
                let catalogueItem = {};
                if (salesLine.catType === 'Release') {
                  catalogueItem = mappings.releases[salesLine.releaseId];
                } else if (salesLine.catType === 'Track') {
                  catalogueItem = mappings.tracks[salesLine.trackId];
                } else if (salesLine.catType === 'Work') {
                  catalogueItem = mappings.works[salesLine.workId];
                } else if (salesLine.catType === 'Contract') {
                  catalogueItem = mappings.contracts[salesLine.contractId];
                }
                // Map subSource
                mappings.subSources = mappings.subSources || {};
                mappings.configurations = mappings.configurations || {};
                client.accountingPeriodMappings.subSources.forEach((item) => { mappings.subSources[item.from] = item.to; });
                client.accountingPeriodMappings.configurations.forEach((item) => { mappings.configurations[item.from] = item.to; });
                if (salesLine.subSource && mappings.subSources[salesLine.subSource]) { salesLine.subSource = mappings.subSources[salesLine.subSource]; }
                if (salesLine.configuration && mappings.configurations[salesLine.configuration]) { salesLine.configuration = mappings.configurations[salesLine.configuration]; }
                // Add to output
                let itemIdentifier;
                if (salesLine.catType === 'Release') {
                  itemIdentifier = salesLine.catNo ? `${salesLine.catNo}` : `${salesLine.barcode}`;
                } else if (salesLine.catType === 'Track') {
                  itemIdentifier = `${salesLine.isrc}`;
                } else if (salesLine.catType === 'Contract') {
                  itemIdentifier = `${salesLine.contractId}`;
                }
                if (catalogueItem && catalogueItem.identifier) {
                  itemIdentifier = `${catalogueItem.identifier}`;
                }
                const suspenseIdentifier = `${itemIdentifier}${salesLine.salesFileId}`;
                if (salesLine.homeCurrencyGrossAmount) {
                  outputs[suspenseIdentifier] = outputs[suspenseIdentifier] || {};
                  outputs[suspenseIdentifier].identifier = itemIdentifier;
                  outputs[suspenseIdentifier].accountingPeriodName = accountingPeriodMappings[salesLine.salesFileId];
                  outputs[suspenseIdentifier].invoiceNo = salesFileInvoiceNoMappings[salesLine.salesFileId] ? salesFileInvoiceNoMappings[salesLine.salesFileId] : salesLine.salesFileId;
                  outputs[suspenseIdentifier].salesFileId = salesLine.salesFileId;
                  outputs[suspenseIdentifier].grossAmount = outputs[suspenseIdentifier].grossAmount || 0;
                  outputs[suspenseIdentifier].grossAmount += salesLine.homeCurrencyGrossAmount;
                  if (salesLine.units) {
                    outputs[suspenseIdentifier].units = outputs[suspenseIdentifier].units || 0;
                    outputs[suspenseIdentifier].units += salesLine.units;
                  }
                  if (catalogueItem) {
                    outputs[suspenseIdentifier].title = catalogueItem.title;
                    outputs[suspenseIdentifier].version = catalogueItem.version;
                    outputs[suspenseIdentifier].artist = catalogueItem.artist;
                  }
                }
              })
              .on('end', () => {
                // Write output to file
                const outputData = Object.keys(outputs).map((id) => [outputs[id].accountingPeriodName, outputs[id].invoiceNo, outputs[id].identifier, outputs[id].title, outputs[id].version, outputs[id].artist, outputs[id].units, outputs[id].grossAmount]);
                csvWriter.addData(outputData, () => {
                  // Close File
                  csvWriter.write((err, fileLocation) => {
                    if (err) {
                      callback(err);
                    } else {
                      // Set S3 Key
                      const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Suspense Summary ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
                      // Upload to S3
                      fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
                        // Check file exists
                        if (fs.existsSync(outputLocation)) {
                          // Remove local file
                          fs.unlink(outputLocation, (err) => {
                            logger.info(`File deleted: ${outputLocation}`);
                            // Return key to callback
                            callback(err, s3Key);
                          });
                        } else {
                          // Return key to callback
                          callback(err, s3Key);
                        }
                      });
                    }
                  });
                });
              });
          });
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createAdjustmentsSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, callback) {
    const netsuite = this;
    // Get all sales files from this and previous periods
    AccountingPeriod.find({ clientId: accountingPeriod.clientId, outputType: 'Input' }, 'name salesFilesIds')
      .then((accountingPeriods) => {
        // Map all sales files into a single array
        let salesFileIds = [];
        accountingPeriods.forEach((ap) => {
          salesFileIds = salesFileIds.concat(ap.salesFilesIds);
        });
        // Create Sales File ID to Accounting Period Name mapping for use in output
        const accountingPeriodMappings = {};
        accountingPeriods.forEach((ap) => {
          ap.salesFilesIds.forEach((salesFileId) => {
            accountingPeriodMappings[salesFileId] = ap.name;
          });
        });
        // Get Sales File ID to Invoice No mapping
        netsuite.salesFileInvoiceNoMappings(client, (err, salesFileInvoiceNoMappings) => {
          if (err) {
            logger.error(err);
            return callback(err);
          }
          // Setup CSV
          const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} Adjustments Summary.csv`;
          const csvWriter = new WriteCsv({ headers: ['Original Accounting Period', 'Invoice No', 'Original Suspense Identifier', 'Identifier', 'Title', 'Version', 'Artist', 'Units', 'Amount', 'Moved to Account'], outputLocation });
          const outputs = {};
          // Setup catalogue mappings to contracts
          netsuite.mappingsForOutput(client, (err, mappings) => {
            // Prepare Query
            const sqlQuery = `
              SELECT accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, catNo, isrc, SUM(units) as units, SUM(homeCurrencyGrossAmount) as homeCurrencyGrossAmount
              FROM \`${bigQuery.datasetName}.${bigQuery.accountingTable}\`
              WHERE accountingPeriodId = '${accountingPeriod._id.toString()}' AND adjustment = true
              GROUP BY accountingPeriodId, salesFileId, catType, releaseId, trackId, workId, catNo, isrc
            `;
            logger.debug(sqlQuery);
            bigQuery.logQuery(bigQuery.accountingTable, sqlQuery, 'Accounting');
            // Stream Data
            bigQuery.client.createQueryStream(sqlQuery)
              .on('error', callback)
              .on('data', (salesLine) => {
                // logger.debug(salesLine);
                // Get catalogue item
                let catalogueItem = {};
                if (salesLine.catType === 'Release') {
                  catalogueItem = mappings.releases[salesLine.releaseId];
                } else if (salesLine.catType === 'Track') {
                  catalogueItem = mappings.tracks[salesLine.trackId];
                } else if (salesLine.catType === 'Work') {
                  catalogueItem = mappings.works[salesLine.workId];
                } else if (salesLine.catType === 'Contract') {
                  catalogueItem = mappings.contracts[salesLine.contractId];
                }
                // Map subSource
                mappings.subSources = mappings.subSources || {};
                mappings.configurations = mappings.configurations || {};
                client.accountingPeriodMappings.subSources.forEach((item) => { mappings.subSources[item.from] = item.to; });
                client.accountingPeriodMappings.configurations.forEach((item) => { mappings.configurations[item.from] = item.to; });
                if (salesLine.subSource && mappings.subSources[salesLine.subSource]) { salesLine.subSource = mappings.subSources[salesLine.subSource]; }
                if (salesLine.configuration && mappings.configurations[salesLine.configuration]) { salesLine.configuration = mappings.configurations[salesLine.configuration]; }
                // Add to output
                let itemIdentifier;
                if (salesLine.catType === 'Release') {
                  itemIdentifier = salesLine.catNo ? `${salesLine.catNo}` : `${salesLine.barcode}`;
                } else if (salesLine.catType === 'Track') {
                  itemIdentifier = `${salesLine.isrc}`;
                } else if (salesLine.catType === 'Contract') {
                  itemIdentifier = `${salesLine.contractId}`;
                }
                if (catalogueItem && catalogueItem.identifier) {
                  itemIdentifier = `${catalogueItem.identifier}`;
                }
                const suspenseIdentifier = `${itemIdentifier}${salesLine.salesFileId}`;
                if (salesLine.homeCurrencyGrossAmount) {
                  outputs[suspenseIdentifier] = outputs[suspenseIdentifier] || {};
                  outputs[suspenseIdentifier].identifier = itemIdentifier;
                  outputs[suspenseIdentifier].accountingPeriodName = accountingPeriodMappings[salesLine.salesFileId];
                  outputs[suspenseIdentifier].invoiceNo = salesFileInvoiceNoMappings[salesLine.salesFileId] ? salesFileInvoiceNoMappings[salesLine.salesFileId] : salesLine.salesFileId;
                  outputs[suspenseIdentifier].salesFileId = salesLine.salesFileId;
                  outputs[suspenseIdentifier].grossAmount = outputs[suspenseIdentifier].grossAmount || 0;
                  outputs[suspenseIdentifier].grossAmount += salesLine.homeCurrencyGrossAmount;
                  if (salesLine.catType === 'Release') {
                    outputs[suspenseIdentifier].originalIdentifier = salesLine.catNo ? salesLine.catNo : salesLine.barcode;
                  } else {
                    outputs[suspenseIdentifier].originalIdentifier = salesLine.isrc;
                  }
                  // Falls back it item identifier if blank
                  if (!outputs[suspenseIdentifier].originalIdentifier) {
                    outputs[suspenseIdentifier].originalIdentifier = itemIdentifier;
                  }
                  if (salesLine.units) {
                    outputs[suspenseIdentifier].units = outputs[suspenseIdentifier].units || 0;
                    outputs[suspenseIdentifier].units += salesLine.units;
                  }
                  if (catalogueItem) {
                    outputs[suspenseIdentifier].title = catalogueItem.title;
                    outputs[suspenseIdentifier].version = catalogueItem.version;
                    outputs[suspenseIdentifier].artist = catalogueItem.artist;
                    outputs[suspenseIdentifier].contractId = catalogueItem.contractId;
                  }
                }
              })
              .on('end', () => {
                // Write output to file
                const outputData = Object.keys(outputs).map((id) => [outputs[id].accountingPeriodName, outputs[id].invoiceNo, outputs[id].originalIdentifier, outputs[id].identifier, outputs[id].title, outputs[id].version, outputs[id].artist, outputs[id].units, outputs[id].grossAmount, outputs[id].contractId]);
                csvWriter.addData(outputData, () => {
                  // Close File
                  csvWriter.write((err, fileLocation) => {
                    if (err) {
                      callback(err);
                    } else {
                      // Set S3 Key
                      const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Adjustment Summary ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
                      // Upload to S3
                      fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
                        // Check file exists
                        if (fs.existsSync(outputLocation)) {
                          // Remove local file
                          fs.unlink(outputLocation, (err) => {
                            logger.info(`File deleted: ${outputLocation}`);
                            // Return key to callback
                            callback(err, s3Key);
                          });
                        } else {
                          // Return key to callback
                          callback(err, s3Key);
                        }
                      });
                    }
                  });
                });
              });
          });
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  salesFileInvoiceNoMappings(client, callback) {
    SalesFile.find({ clientId: client._id.toString() }, { name: 1, invoiceNo: 1 })
      .then((salesFiles) => {
        const output = {};
        salesFiles.forEach((salesFile) => {
          output[salesFile._id.toString()] = salesFile.invoiceNo;
        });
        callback(null, output);
      })
      .catch((err) => {
        logger.error(err);
        callback(err, {});
      });
  },
  createMappingsCsv(accountingPeriod, callback) {
    // Setup CSV
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} Mappings.csv`;
    const csvWriter = new WriteCsv({ headers: ['Territories', 'Contract IDs', 'Account Codes', 'Sub Sources'], outputLocation });
    const csvRows = [];
    // Get longest length of mapping values to tell us how many rows we need
    let longestLength = accountingPeriod.uniqueValues.territories.length > accountingPeriod.uniqueValues.contractIds.length ? accountingPeriod.uniqueValues.territories.length : accountingPeriod.uniqueValues.contractIds.length;
    longestLength = accountingPeriod.uniqueValues.accountCodes.length > longestLength ? accountingPeriod.uniqueValues.accountCodes.length : longestLength;
    longestLength = accountingPeriod.uniqueValues.sources.length > longestLength ? accountingPeriod.uniqueValues.sources.length : longestLength;
    // Loop through lines
    for (let i = 0; i < longestLength; i += 1) {
      csvRows.push([
        accountingPeriod.uniqueValues.territories[i],
        accountingPeriod.uniqueValues.contractIds[i],
        accountingPeriod.uniqueValues.accountCodes[i],
        accountingPeriod.uniqueValues.sources[i],
      ]);
    }
    // Write data to CSV
    csvWriter.addData(csvRows, () => {
      // Write CSV
      csvWriter.write((err, fileLocation) => {
        if (err) {
          callback(err);
        } else {
          // Set S3 Key
          const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Mappings ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
          // Upload to S3
          fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
            // Check file exists
            if (fs.existsSync(outputLocation)) {
              // Remove local file
              fs.unlink(outputLocation, (err) => {
                logger.info(`File deleted: ${outputLocation}`);
                // Return key to callback
                callback(err, s3Key);
              });
            } else {
              // Return key to callback
              callback(err, s3Key);
            }
          });
        }
      });
    });
  },
  createOutputsCsv(accountingPeriod, callback) {
    // Setup CSV
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} Output.csv`;
    const csvWriter = new WriteCsv({ headers: ['Invoice No', 'Revenue', 'Customer', 'Date'], outputLocation });
    const csvRows = [];
    accountingPeriod.uniqueValues.fileOutputs.forEach((output) => {
      csvRows.push([
        output.invoiceNo,
        output.totalRevenue,
        output.subSource,
        output.date,
      ]);
    });
    // Write data to CSV
    csvWriter.addData(csvRows, () => {
      // Write CSV
      csvWriter.write((err, fileLocation) => {
        if (err) {
          callback(err);
        } else {
          // Set S3 Key
          const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Output ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
          // Upload to S3
          fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
            // Check file exists
            if (fs.existsSync(outputLocation)) {
              // Remove local file
              fs.unlink(outputLocation, (err) => {
                logger.info(`File deleted: ${outputLocation}`);
                // Return key to callback
                callback(err, s3Key);
              });
            } else {
              // Return key to callback
              callback(err, s3Key);
            }
          });
        }
      });
    });
  },
  createCsv(accountingPeriod, data, fileName, callback) {
    // Setup CSV Writer
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id} ${fileName.split('/').join(' ')}.csv`;
    logger.debug(`Creating File: ${outputLocation} with lines ${data.length}`);
    const mainCsv = new WriteCsv({ headers: ['ExternalID', 'Inv Reference', 'Subsidiary', 'Account', 'Debit', 'Credit', 'Customer Name', 'Memo', 'Memo1', 'Trans Date', 'Region', 'Description', 'Total Amount', 'Total Units', 'Artist', 'ReleaseCode', 'Configuration', 'ContractCode'], outputLocation });
    // Add data to file
    mainCsv.addData(data, () => {
      logger.debug('Added Data');
      // Close File
      mainCsv.write((err, fileLocation) => {
        logger.debug('Written File');
        if (err) {
          callback(err);
        } else {
          // Set S3 Key
          const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} ${fileName}.csv`;
          // Upload to S3
          fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
            // Add to files Array
            accountingPeriod.separatedFiles.push(s3Key);
            // Check file exists
            if (fs.existsSync(outputLocation)) {
              // Remove local file
              fs.unlink(outputLocation, (err) => {
                logger.info(`File deleted: ${outputLocation}`);
                callback();
              });
            } else {
              callback();
            }
          });
        }
      });
    });
  },
  createZipOfFiles(accountingPeriod, callback) {
    // Wait for 5 seconds before creating
    setTimeout(() => {
      // Create safe name for zip
      const safeName = utils.safeName(accountingPeriod.name);
      // Create Files From S3
      createZip.s3Files(accountingPeriod.separatedFiles, process.env.S3_bucket, `${appRootDir}/tmp/${safeName} Zip.zip`, (err, zipFile) => {
        fileManager.uploadToS3(`accountingPeriods/${accountingPeriod._id.toString()}/${safeName} Output.zip`, zipFile, (err, key) => {
          fs.unlink(zipFile, () => {
            callback(null, key);
          });
        });
      });
    }, 5000);
  },

};

function mapSalesLine(salesLine, mappings, accountingPeriodId) {
  if (salesLine && mappings) {
    // Set accountingPeriodId
    salesLine.accountingPeriodId = accountingPeriodId;
    // Remove status
    delete salesLine.status;
    // Change ID to salesLineId
    salesLine.salesLineId = salesLine.id;
    delete salesLine.id;
    // Read dates from sales line
    if (salesLine.saleDate && salesLine.saleDate.value) { salesLine.saleDate = salesLine.saleDate.value; }
    if (salesLine.transactionDate && salesLine.transactionDate.value) { salesLine.transactionDate = salesLine.transactionDate.value; }
    // Map each of the main values
    if (salesLine.distributionChannel && mappings.distributionChannels[salesLine.distributionChannel]) { salesLine.distributionChannel = mappings.distributionChannels[salesLine.distributionChannel]; }
    if (salesLine.configuration && mappings.configurations[salesLine.configuration]) { salesLine.configuration = mappings.configurations[salesLine.configuration]; }
    if (salesLine.priceCategory && mappings.priceCategories[salesLine.priceCategory]) { salesLine.priceCategory = mappings.priceCategories[salesLine.priceCategory]; }
    if (salesLine.source && mappings.sources[salesLine.source]) { salesLine.source = mappings.sources[salesLine.source]; }
    if (salesLine.subSource && mappings.subSources[salesLine.subSource]) { salesLine.subSource = mappings.subSources[salesLine.subSource]; }
    return salesLine;
  }
  return salesLine;
}

function mapTerritory(territory) {
  const mappings = {
    AF: 'AFG', AL: 'ALB', DZ: 'DZA', AS: 'ASM', AD: 'AND', AO: 'AGO', AI: 'AIA', AQ: 'ATA', AG: 'ATG', AR: 'ARG', AM: 'ARM', AW: 'ABW', AU: 'AUS', AT: 'AUT', AZ: 'AZE', BS: 'BHS', BH: 'BHR', BD: 'BGD', BB: 'BRB', BY: 'BLR', BE: 'BEL', BZ: 'BLZ', BJ: 'BEN', BM: 'BMU', BT: 'BTN', BO: 'BOL', BQ: 'BES', BA: 'BIH', BW: 'BWA', BV: 'BVT', BR: 'BRA', IO: 'IOT', BN: 'BRN', BG: 'BGR', BF: 'BFA', BI: 'BDI', CV: 'CPV', KH: 'KHM', CM: 'CMR', CA: 'CAN', KY: 'CYM', CF: 'CAF', TD: 'TCD', CL: 'CHL', CN: 'CHN', CX: 'CXR', CC: 'CCK', CO: 'COL', KM: 'COM', CD: 'COD', CG: 'COG', CK: 'COK', CR: 'CRI', HR: 'HRV', CU: 'CUB', CW: 'CUW', CY: 'CYP', CZ: 'CZE', CI: 'CIV', DK: 'DNK', DJ: 'DJI', DM: 'DMA', DO: 'DOM', EC: 'ECU', EG: 'EGY', SV: 'SLV', GQ: 'GNQ', ER: 'ERI', EE: 'EST', SZ: 'SWZ', ET: 'ETH', FK: 'FLK', FO: 'FRO', FJ: 'FJI', FI: 'FIN', FR: 'FRA', GF: 'GUF', PF: 'PYF', TF: 'ATF', GA: 'GAB', GM: 'GMB', GE: 'GEO', DE: 'DEU', GH: 'GHA', GI: 'GIB', GR: 'GRC', GL: 'GRL', GD: 'GRD', GP: 'GLP', GU: 'GUM', GT: 'GTM', GG: 'GGY', GN: 'GIN', GW: 'GNB', GY: 'GUY', HT: 'HTI', HM: 'HMD', VA: 'VAT', HN: 'HND', HK: 'HKG', HU: 'HUN', IS: 'ISL', IN: 'IND', ID: 'IDN', IR: 'IRN', IQ: 'IRQ', IE: 'IRL', IM: 'IMN', IL: 'ISR', IT: 'ITA', JM: 'JAM', JP: 'JPN', JE: 'JEY', JO: 'JOR', KZ: 'KAZ', KE: 'KEN', KI: 'KIR', KP: 'PRK', KR: 'KOR', KW: 'KWT', KG: 'KGZ', LA: 'LAO', LV: 'LVA', LB: 'LBN', LS: 'LSO', LR: 'LBR', LY: 'LBY', LI: 'LIE', LT: 'LTU', LU: 'LUX', MO: 'MAC', MG: 'MDG', MW: 'MWI', MY: 'MYS', MV: 'MDV', ML: 'MLI', MT: 'MLT', MH: 'MHL', MQ: 'MTQ', MR: 'MRT', MU: 'MUS', YT: 'MYT', MX: 'MEX', FM: 'FSM', MD: 'MDA', MC: 'MCO', MN: 'MNG', ME: 'MNE', MS: 'MSR', MA: 'MAR', MZ: 'MOZ', MM: 'MMR', NA: 'NAM', NR: 'NRU', NP: 'NPL', NL: 'NLD', NC: 'NCL', NZ: 'NZL', NI: 'NIC', NE: 'NER', NG: 'NGA', NU: 'NIU', NF: 'NFK', MP: 'MNP', NO: 'NOR', OM: 'OMN', PK: 'PAK', PW: 'PLW', PS: 'PSE', PA: 'PAN', PG: 'PNG', PY: 'PRY', PE: 'PER', PH: 'PHL', PN: 'PCN', PL: 'POL', PT: 'PRT', PR: 'PRI', QA: 'QAT', MK: 'MKD', RO: 'ROU', RU: 'RUS', RW: 'RWA', RE: 'REU', BL: 'BLM', SH: 'SHN', KN: 'KNA', LC: 'LCA', MF: 'MAF', PM: 'SPM', VC: 'VCT', WS: 'WSM', SM: 'SMR', ST: 'STP', SA: 'SAU', SN: 'SEN', RS: 'SRB', SC: 'SYC', SL: 'SLE', SG: 'SGP', SX: 'SXM', SK: 'SVK', SI: 'SVN', SB: 'SLB', SO: 'SOM', ZA: 'ZAF', GS: 'SGS', SS: 'SSD', ES: 'ESP', LK: 'LKA', SD: 'SDN', SR: 'SUR', SJ: 'SJM', SE: 'SWE', CH: 'CHE', SY: 'SYR', TW: 'TWN', TJ: 'TJK', TZ: 'TZA', TH: 'THA', TL: 'TLS', TG: 'TGO', TK: 'TKL', TO: 'TON', TT: 'TTO', TN: 'TUN', TR: 'TUR', TM: 'TKM', TC: 'TCA', TV: 'TUV', UG: 'UGA', UA: 'UKR', AE: 'ARE', GB: 'GBR', UM: 'UMI', US: 'USA', UY: 'URY', UZ: 'UZB', VU: 'VUT', VE: 'VEN', VN: 'VNM', VG: 'VGB', VI: 'VIR', WF: 'WLF', EH: 'ESH', YE: 'YEM', ZM: 'ZMB', ZW: 'ZWE', AX: 'ALA',
  };
  return mappings[territory];
}

function mapAccount(salesLine, mappings) {
  if (salesLine && mappings) {
    // Check source mapping exists
    if (mappings[salesLine.subSource]) {
      let output;
      mappings[salesLine.subSource].forEach((item) => {
        if (!item.territory && !item.channel) {
          output = item.to;
        } else {
          const territoryMatches = !!(item.territory === salesLine.territory || (Array.isArray(item.territory) && item.territory.includes(salesLine.territory)) || !item.territory);
          const channelMatches = !!(item.channel === salesLine.distributionChannel || !item.channel);
          if (territoryMatches && channelMatches) {
            output = item.to;
          }
        }
      });
      return output;
    }
    return null;
  }
}
