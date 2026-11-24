const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ObjectId } = require('mongodb');

const { isEmpty } = require('lodash');
const Client = require('../../../models/client');
const Contract = require('../../../models/contract');
const BatchTask = require('../../../models/batchTask');

const CalculateContract = require('../contract/calculateContract');
const calculationHelper = require('../../calculationHelper');
const onlyUnique = require('../../onlyUnique');
const CompletedItemsUpdater = require('../completedItemsUpdater');
const { CalculationHelpers } = require('../helpers');

const CalculateSalesBatch = {
  calculateSalesBatch: (period, batchTask, callback) => {
    const recalculation = period.recalculation || {};
    logger.info(`${period._id} Calculating Sales Batch ${batchTask._id}`);
    Client.findById(period.clientId).then((client) => {
      // Get MongoDB connection from mongoose
      const { db } = mongoose.connection;
      // Setup BigQuery connection
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      // Setup file for writing
      bigQuery.setupFile((bqSetupErr) => {
        if (bqSetupErr) {
          logger.error(`${period._id} Error retrieving contracts for BatchTask ${batchTask._id}`);
          // Handle Error and store against batch task
          batchTask.status = 'Errored';
          batchTask.error = 'Failed to set up BQ file';
          batchTask.save(() => callback(bqSetupErr)); // implicit return
        } else {
          // Get Batch from contractIds
          Contract.find({ _id: batchTask.value.contractIds.map((id) => new ObjectId(id)) }).then(async (batch) => {
            let salesFileIds = period.salesFilesIds; // NOTE salesFileIds (code) / salesFilesIds (db)
            let { salesPartitionNos } = period;
            const { resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos } = period;

            ({ salesFileIds, salesPartitionNos } = CalculationHelpers.checkForModifiedSales({ runType: batchTask.runType, recalculation, period, salesFileIds, salesPartitionNos }));

            let salesFileIdsForFilter = [...salesFileIds];
            if (client.features?.suspense) {
              // Merge resolvedGroupSalesPartitionNos into salesPartitionNos ONLY when feature flag is set
              salesPartitionNos = [...new Set([...salesPartitionNos, ...resolvedGroupSalesPartitionNos])];
              // Merge resolvedGroupSalesFileIds into salesFileIds ONLY when feature flag is set - this is used for filtering sales in royalty calculator, not the select query to get relevant sales lines for processing
              salesFileIdsForFilter = [...new Set([...salesFileIds, ...resolvedGroupSalesFileIds])];
            }

            // Prepare general object
            const object = {
              periodId: period._id.toString(),
              periodType: period.contractType,
              runType: batchTask.runType,
              salesFileIds: salesFileIdsForFilter,
              salesPartitionNos,
            };
              // Build query for filtering sales
            let mainQuery = await CalculationHelpers.buildMainQuery({ client, period, bigQuery, salesFileIds }).catch((buildQueryErr) => {
              logger.error(`${period._id} Error building main query for BatchTask ${batchTask._id}`, buildQueryErr);
              // Handle Error and store against batch task
              batchTask.status = 'Errored';
              batchTask.error = 'Failed to build main query';
              batchTask.save(() => callback(buildQueryErr)); // implicit return
            });
            mainQuery = CalculationHelpers.addPartitionFilterToQuery({ mainQuery, salesPartitionNos });

            // Get batch task from the database and check the task processId is equal to the current process, otherwise abort.
            const batchTaskFromDb = await BatchTask.findById(batchTask._id).select('processId');
            if (batchTaskFromDb && batchTaskFromDb.processId !== process.pid) {
              // Abort this calculation run as it will be picked up by another processor instance
              logger.error(`BatchTask ${batchTaskFromDb._id.toString()} has a process id (${batchTaskFromDb.processId}) different to the current process PID (${process.pid})`);
              callback();
            } else {
              // Call run batch
              CalculateSalesBatch.runBatchCalculation(batch, db, bigQuery, object, client, period, mainQuery, batchTask.value.contractSizes, null, null, (runErr) => {
                if (runErr) {
                  // Handle Error and store against batch task
                  logger.error(`${period._id} runBatchCalculation ${batchTask._id} Errored: ${runErr}`);
                  if (batchTask.retryCount < 3) {
                    // Set the batch task to pending, and retry it for up to 3 times.
                    batchTask.status = 'Pending';
                    batchTask.retryCount += 1;
                  } else {
                    batchTask.status = 'Errored';
                  }

                  batchTask.error = runErr.message;
                  batchTask.save(() => {
                    logger.error(`${period._id} Batch Task ${batchTask._id} Set to ${batchTask.status}`);
                    logger.error(`${period._id} Batch Task: ${batchTask}`);
                    callback(batchTask.status === 'Errored' ? runErr : null);
                  });
                } else {
                  bigQuery.writeFileToDb(bigQuery.outputTable, (writeErr) => {
                    if (writeErr) {
                      // Handle Error and store against batch task
                      logger.error(`${period._id} runBatchCalculation ${batchTask._id} Errored:`, writeErr);
                      batchTask.status = 'Errored';
                      batchTask.error = writeErr.message;
                      batchTask.save().then(() => callback(writeErr)).catch(callback);
                    } else {
                      // Update batch task to be complete
                      logger.info(`${period._id} Completed Calculating Sales Batch ${batchTask._id}`);
                      batchTask.status = 'Complete';
                      batchTask.save().then(() => callback()).catch(callback);
                    }
                  });
                }
              });
            }
          }).catch((contractErr) => {
            logger.error(`${period._id} Error retrieving contracts for BatchTask ${batchTask._id}`);
            // Handle Error and store against batch task
            batchTask.status = 'Errored';
            batchTask.error = 'Failed to retrieve contracts';
            batchTask.save().then(() => callback(contractErr)).catch((saveErr) => {
              logger.error(saveErr);
              callback(contractErr);
            }); // implicit return
          });
        }
      });
    }).catch((err) => {
      logger.error(`${period._id} Error retriving client for BatchTask ${batchTask._id}`);
      // Handle Error and store against batch task
      batchTask.status = 'Errored';
      batchTask.error = 'Failed to retrieve client';
      batchTask.save().then(() => callback(err)).catch((saveErr) => {
        logger.error(saveErr);
        callback(err);
      }); // implicit return
    });
  },
  runBatchCalculation: (contracts, db, bigQuery, object, client, period, mainQuery, contractSizes, options, batchTask, callback) => {
    // Load options from input, or default to standard
    let sqlOptions = { limit: 1000000, offset: 0, orderBy: 'id' };
    if (options) {
      sqlOptions = options;
    }

    // Instead of building this again, we are taking a copy of mainQuery. Could not see a reason why we are building the same query again
    const newFilter = { ...mainQuery };
    async.waterfall([
      (cb) => {
        if (batchTask && batchTask.value.type === 'Individial Contract Batch') {
          const query = JSON.parse(JSON.stringify(newFilter));
          // Build query from the batchTask
          if (batchTask.value.releaseIds) {
            query.$or.push({ catType: 'Release', releaseId: { $in: batchTask.value.releaseIds } });
          }
          if (batchTask.value.trackIds) {
            query.$or.push({ catType: 'Track', trackId: { $in: batchTask.value.trackIds } });
          }
          if (batchTask.value.workIds) {
            query.$or.push({ catType: 'Work', workId: { $in: batchTask.value.workIds } });
          }
          if (batchTask.value.contractId) {
            query.$or.push({ catType: 'Contract', contractId: batchTask.value.contractId });
          }

          logger.debug(`Individial Contract Batch QUERY: ${query}`);
          cb(null, query);
        } else {
          CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, newFilter, object, 'Standard', (err, query) => {
            cb(err, query);
          });
        }
      },
      (query, cb) => {
        // Query is blank when there are no contracts in the batch
        if (query) {
          // Get Data
          const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
          const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo', 'originalReleaseTitle', 'originalReleaseArtist', 'originalTrackTitle', 'originalTrackArtist', 'isrc'];
          // Set timestamp
          // const timestamp = moment().format('YYYYMMDDHHmmSSssss');
          bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, query, sqlOptions, cb);
        } else {
          // When no query, then we'll just return a blank array
          cb(null, []);
        }
      },
      (salesData, cb) => {
        logger.info(`${period._id} Batch Loaded, size ${salesData.length}`);
        // Init completedItemsUpdater
        const completedItemsUpdater = new CompletedItemsUpdater({
          periodId: period._id,
          fieldToIncrease: 'completedCatalogueItems',
        });
        async.eachLimit(contracts, 10, (contract, contractCb) => {
          const doesEscalationsExistForContract = period.escalationStartingFigures.find((escalation) => escalation.contractId === contract._id.toString() && !isEmpty(contract.escalationTracking));
          if (contractSizes[contract._id.toString()] === 0 && !doesEscalationsExistForContract) {
            logger.debug(`${period._id} Skipping Contract ${contract.name}, Total Lines ${contractSizes[contract._id.toString()]}`);
            // Increase completedCatalogueItems count
            completedItemsUpdater.increaseCount(1);
            contractCb();
          } else {
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, contractSizes[contract._id.toString()], salesData, completedItemsUpdater, batchTask, contractCb);
          }
        }, (eachErr) => {
          // Stop completedItemsUpdater
          completedItemsUpdater.stop();
          cb(eachErr);
        });
      },
    ], callback);
  },
  calculateSalesContract: (period, batchTask, callback) => {
    const recalculation = period.recalculation || {};
    logger.info(`${period._id} Calculating Individual Sales Batch ${batchTask._id}`);
    Client.findById(period.clientId).then(async (client) => {
      // Get MongoDB connection from mongoose
      const { db } = mongoose.connection;
      // Setup BigQuery connection
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      // Setup file for writing
      bigQuery.setupFile(() => {
        // Get Batch from contractIds
        Contract.findById(batchTask.value.contractId).then(async (contract) => {
          let salesFileIds = batchTask.value.salesFileIds ? batchTask.value.salesFileIds : period.salesFilesIds; // NOTE salesFileIds (code) / salesFilesIds (db)
          let { salesPartitionNos } = period;
          const { resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos } = period;

          if (batchTask.runType === 'modifiedSales') {
            if (recalculation.salesFiles?.salesFileIds?.length > 0) {
              if (!batchTask.value?.salesFileIds) {
                ({ salesFileIds } = recalculation.salesFiles);
              }
              // If this is modified Sales Run and we have a more granular list of partitions - then use it
              if (recalculation.salesFiles.partitionNos?.length > 0) {
                salesPartitionNos = recalculation.salesFiles.partitionNos;
              }
            }
          }

          let salesFileIdsForFilter = [...salesFileIds];
          if (client.features?.suspense) {
            // Merge resolvedGroupSalesPartitionNos into salesPartitionNos ONLY when feature flag is set
            salesPartitionNos = [...new Set([...salesPartitionNos, ...resolvedGroupSalesPartitionNos])];
            // Merge resolvedGroupSalesFileIds into salesFileIds ONLY when feature flag is set - this is used for filtering sales in royalty calculator, not the select query to get relevant sales lines for processing
            salesFileIdsForFilter = [...new Set([...salesFileIds, ...resolvedGroupSalesFileIds])];
          }

          // Prepare general object
          const object = {
            salesDatabaseTable: client.salesDatabaseTable,
            writeSalesDatabaseTable: client.periodSalesDatabaseTable,
            periodId: period._id.toString(),
            periodType: period.contractType,
            salesFileIds: salesFileIdsForFilter,
            salesPartitionNos,
            releaseIds: batchTask.value.releaseIds,
            trackIds: batchTask.value.trackIds,
            workIds: batchTask.value.workIds,
            contractIds: batchTask.value.contractIds,
          };
          // Build query for filtering sales
          let mainQuery = await CalculationHelpers.buildMainQuery({ client, period, bigQuery, salesFileIds }).catch((buildQueryErr) => {
            logger.error(`${period._id} Error building main query for BatchTask ${batchTask._id}`, buildQueryErr);
            // Handle Error and store against batch task
            batchTask.status = 'Errored';
            batchTask.error = 'Failed to build main query';
            batchTask.save(() => callback(buildQueryErr)); // implicit return
          });
          mainQuery = CalculationHelpers.addPartitionFilterToQuery({ mainQuery, salesPartitionNos });

          // Set options from batch task
          let options = { limit: batchTask.limit, offset: batchTask.offset, orderBy: 'id' };
          if (!batchTask.limit) {
            options = null;
          }
          // Set contract sizes object
          const contractSizes = {};
          contractSizes[batchTask.value.contractId] = calculationHelper.contractSizeByLimit(batchTask.value.contractSize, batchTask.limit, batchTask.offset);

          // Get batch task from the database and check the task processId is equal to the current process, otherwise abort.
          const batchTaskFromDb = await BatchTask.findById(batchTask._id).select('processId');
          if (batchTaskFromDb && batchTaskFromDb.processId !== process.pid) {
            // Abort this calculation run as it will be picked up by another processor instance
            logger.error(`BatchTask ${batchTaskFromDb._id.toString()} has a process id (${batchTaskFromDb.processId}) different to the current process PID (${process.pid})`);
            callback();
          } else if (batchTask.value?.type === 'Stream') {
            // Init completedItemsUpdater
            const completedItemsUpdater = new CompletedItemsUpdater({
              periodId: period._id,
              fieldToIncrease: 'completedCatalogueItems',
            });
              // Run on contract
            CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, batchTask.value.contractSize, null, completedItemsUpdater, batchTask, (err) => {
              // Stop completedItemsUpdater
              completedItemsUpdater.stop();
              if (err) {
                // Handle Error and store against batch task
                logger.error(`${period._id} runSalesCalculation ${batchTask._id} Errored: ${err}`);
                if (batchTask.retryCount < 3) {
                  // Set the batch task to pending, and retry it for up to 3 times.
                  batchTask.status = 'Pending';
                  batchTask.retryCount += 1;
                } else {
                  batchTask.status = 'Errored';
                }

                batchTask.error = err.message;
                batchTask.save()
                  .then(() => {
                    logger.error(`${period._id} Batch Task ${batchTask._id} Set to ${batchTask.status}`);
                    logger.error(`${period._id} Batch Task: ${batchTask}`);
                    callback(batchTask.status === 'Errored' ? err : null);
                  })
                  .catch((saveErr) => {
                    logger.error(saveErr);
                    callback(err);
                  });
              } else {
                bigQuery.writeFileToDb(bigQuery.outputTable, () => {
                  // Update batch task to be complete
                  logger.info(`${period._id} Completed Calculating Individual Sales Batch ${batchTask._id}`);
                  batchTask.status = 'Complete';
                  batchTask.save()
                    .then(() => {
                      callback(err);
                    })
                    .catch((saveErr) => {
                      logger.error(saveErr);
                      callback(err);
                    });
                });
              }
            });
          } else {
            // Call run batch
            CalculateSalesBatch.runBatchCalculation([contract], db, bigQuery, object, client, period, mainQuery, contractSizes, options, batchTask, (runErr) => {
              if (runErr) {
                // Handle Error and store against batch task
                logger.error(`${period._id} runBatchCalculation ${batchTask._id} Errored:`, runErr);
                if (batchTask.retryCount < 3) {
                  // Set the batch task to pending, and retry it for up to 3 times.
                  batchTask.status = 'Pending';
                  batchTask.retryCount += 1;
                } else {
                  batchTask.status = 'Errored';
                }
                batchTask.error = runErr.message;
                batchTask.save()
                  .then(() => {
                    logger.error(`${period._id} Batch Task ${batchTask._id} Set to ${batchTask.status}`);
                    logger.error(`${period._id} Batch Task: ${batchTask}`);
                    callback(batchTask.status === 'Errored' ? runErr : null);
                  })
                  .catch((saveErr) => {
                    logger.error(saveErr);
                    callback(runErr);
                  });
              } else {
                bigQuery.writeFileToDb(bigQuery.outputTable, (writeErr) => {
                  if (writeErr) {
                    // Handle Error and store against batch task
                    logger.error(`${period._id} runBatchCalculation ${batchTask._id} Errored:`, writeErr);
                    batchTask.status = 'Errored';
                    batchTask.error = writeErr.message;
                    batchTask.save()
                      .then(() => {
                        callback(writeErr);
                      })
                      .catch((saveErr) => {
                        logger.error(saveErr);
                        callback(writeErr);
                      });
                  } else {
                    // Update batch task to be complete
                    logger.info(`${period._id} Completed Calculating Sales Batch ${batchTask._id}`);
                    batchTask.status = 'Complete';
                    batchTask.save()
                      .then(() => {
                        callback();
                      })
                      .catch((saveErr) => {
                        logger.error(saveErr);
                        callback(saveErr);
                      });
                  }
                });
              }
            });
          }
        })
          .catch((err) => {
            logger.error(`${period._id} Error retrieving contract for BatchTask ${batchTask._id}`);
            batchTask.status = 'Errored';
            batchTask.error = 'Failed to retrieve contract';
            batchTask.save().then(() => callback(err)).catch((saveErr) => {
              logger.error(saveErr);
              callback(err);
            }); // implicit return
          });
      });
    }).catch((err) => {
      logger.error(`${period._id} Error retrieving client for BatchTask ${batchTask._id}`);
      batchTask.status = 'Errored';
      batchTask.error = 'Failed to retrieve client';
      batchTask.save().then(() => callback(err)).catch((saveErr) => {
        logger.error(saveErr);
        callback(err);
      }); // implicit return
    });
  },
  buildMultiContractFilter: (contracts, bigQuery, period, mainQuery, batchObject, type, callback) => {
    if (contracts && Array.isArray(contracts) && contracts.length > 0) {
      let releaseIds = [];
      let trackIds = [];
      let workIds = [];
      const contractIds = [];
      const allowBatching = type !== 'Mechancial';
      async.eachSeries(contracts, (contract, contractCb) => {
        CalculateContract.contractQuery(contract, bigQuery, period, mainQuery, batchObject, false, allowBatching, (err, query) => {
          if (err) {
            contractCb(err);
          } else {
            contractIds.push(contract._id.toString());
            // Need to handle the multi queries array
            if (Array.isArray(query)) {
              query.forEach((q) => {
                q.$or.forEach((or) => {
                  if (or.catType === 'Release' && or.releaseId && or.releaseId.$in) {
                    releaseIds = [].concat(releaseIds, or.releaseId.$in);
                  } else if (or.catType === 'Track' && or.trackId && or.trackId.$in) {
                    trackIds = [].concat(trackIds, or.trackId.$in);
                  } else if (or.catType === 'Work' && or.workId && or.workId.$in) {
                    workIds = [].concat(workIds, or.workId.$in);
                  }
                });
              });
            } else {
              query.$or.forEach((or) => {
                if (or.catType === 'Release' && or.releaseId && or.releaseId.$in) {
                  releaseIds = [].concat(releaseIds, or.releaseId.$in);
                } else if (or.catType === 'Track' && or.trackId && or.trackId.$in) {
                  trackIds = [].concat(trackIds, or.trackId.$in);
                } else if (or.catType === 'Work' && or.workId && or.workId.$in) {
                  workIds = [].concat(workIds, or.workId.$in);
                }
              });
            }
            contractCb();
          }
        });
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          if (contractIds.length > 0) {
            mainQuery.$or.push({ contractId: { $in: contractIds.filter(onlyUnique) } });
          }
          if (releaseIds.length > 0) {
            mainQuery.$or.push({ catType: 'Release', releaseId: { $in: releaseIds.filter(onlyUnique) } });
          }
          if (trackIds.length > 0) {
            mainQuery.$or.push({ catType: 'Track', trackId: { $in: trackIds.filter(onlyUnique) } });
          }
          if (workIds.length > 0) {
            mainQuery.$or.push({ catType: 'Work', workId: { $in: workIds.filter(onlyUnique) } });
          }
          callback(null, mainQuery);
        }
      });
    } else if (contracts && Array.isArray(contracts) && contracts.length === 0) {
      callback();
    } else {
      callback(new Error('An array of contracts is required'));
    }
  },
};

module.exports = CalculateSalesBatch;
