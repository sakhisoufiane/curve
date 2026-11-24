const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SalesCalculator = require('@curveroyaltysystems/sales-calculator');
const _ = require('lodash');
const async = require('async');
const chunk = require('chunk');

const SalesFile = require('../../../../models/salesFile');
const Period = require('../../../../models/period');
const Contract = require('../../../../models/contract');
const BatchTask = require('../../../../models/batchTask');
const Task = require('../../../../models/task');
const Client = require('../../../../models/client');
const Release = require('../../../../models/release');

const listFromNumber = require('../../../listFromNumber');
const SQS = require('../../../sqs');
const PeriodStatementCreation = require('../periodStatementCreation');
const SalesCalculation = require('../../../calculateSales');
const Batch = require('../batch');
const CalculateContract = require('../../contract/calculateContract');
const MechanicalContractTerms = require('../../contract/mechanicalContractTerms');
const McpsSalesTerms = require('../../mcpsSalesTerms');
const CompletedItemsUpdater = require('../../completedItemsUpdater');
const SalesFileController = require('../../../salesIngestion/salesFileController');
const currenciesToPrefix = require('../../../currenciesToPrefix');
const { CalculationHelpers } = require('../../helpers');

const CalculateSales = {
  updateSalesFilesReportedStatus: (period, callback) => {
    Client.findById(period.clientId).lean().then((client) => {
      // Check for sales Files which were previously included in the period but have been removed. These need flushed as well
      let salesFileIdsToFlush = [...period.salesFilesIds];
      if (period.recalculation?.salesFiles) {
        // Add sales files removed from period since last run to flushing array
        const removedSalesFileIds = _.difference(period.recalculation.salesFiles.salesFileIds, period.salesFilesIds);
        salesFileIdsToFlush.push(...removedSalesFileIds);
      }

      if (client.features?.suspense && period.contractType !== 'MCPS') {
        // Add salesFileIds from Resolved Groups to the list
        salesFileIdsToFlush = [...new Set([...salesFileIdsToFlush, ...period.resolvedGroupSalesFileIds])];
      }

      logger.debug(`${period._id} updating SalesFilesReportedStatus for salesFileIds:`, salesFileIdsToFlush);

      SalesFile.find({ _id: { $in: salesFileIdsToFlush } })
        .then((salesFiles) => {
          async.eachLimit(salesFiles, 5, (salesFile, cb) => {
            SalesFileController.updateReportedStatus(salesFile, cb);
          }, callback);
        })
        .catch((err) => {
          logger.error(`${period._id} Error finding SalesFiles to update reported status`, err);
          callback(err);
        });
    }).catch(callback);
  },
  calculate: (period, db, bigQuery, client, runType, callback) => {
    // Refresh Period (Partition numbers and recalculation filter updated since last refresh)
    Period.findById(period._id).then((period) => {
      const recalculation = period.recalculation || {};
      let salesFileIds = period.salesFilesIds; // NOTE salesFileIds (code) / salesFilesIds (db)
      let { salesPartitionNos } = period;
      const { resolvedGroupIds, resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos } = period;

      // Only run the sales calculation if Sales Files or Resolved Groups are attached to the period - otherwise skip the stage
      if (salesFileIds?.length > 0 || (client.features?.suspense && resolvedGroupIds.length > 0)) {
        ({ salesFileIds, salesPartitionNos } = CalculationHelpers.checkForModifiedSales({ runType, recalculation, period, salesFileIds, salesPartitionNos }));

        let salesFileIdsForFilter = [...salesFileIds];

        if (client.features?.suspense) {
          // Merge resolvedGroupSalesPartitionNos into salesPartitionNos ONLY when feature flag is set
          salesPartitionNos = [...new Set([...salesPartitionNos, ...resolvedGroupSalesPartitionNos])];
          // Merge resolvedGroupSalesFileIds into salesFileIds ONLY when feature flag is set - this is used for filtering sales in royalty calculator, not the select query to get relevant sales lines for processing
          salesFileIdsForFilter = [...new Set([...salesFileIds, ...resolvedGroupSalesFileIds])];
        }

        logger.debug('calculateSales');
        logger.debug({ runType, salesFileIds, salesPartitionNos, salesFileIdsForFilter });

        // Setup file for writing sales to
        bigQuery.setupFile(async (bqSetupErr) => {
          if (bqSetupErr) { return callback(bqSetupErr); }
          // Prepare general object
          const object = {
            periodId: period._id.toString(),
            periodType: period.contractType,
            salesFileIds: salesFileIdsForFilter,
            runType,
          };

          // Build query for filtering sales
          let query = await CalculationHelpers.buildMainQuery({ client, period, bigQuery, salesFileIds }).catch((buildQueryErr) => {
            logger.error(`${period._id} Error building main query: `, buildQueryErr);
            callback(buildQueryErr);
          });
          query = CalculationHelpers.addPartitionFilterToQuery({ mainQuery: query, salesPartitionNos });

          // Run new refactored sales calculations for: clients with the feature flag enabled, non-mechanical contracts, non MCPS contracts
          if (client.features.refactoredSalesCalculation && period.contractType !== 'Mechanical' && period.contractType !== 'MCPS') {
            logger.info(`${period._id} Running Refactored Sales Calculation`);
            SalesCalculator.calculate({ period, client, object, query }).then(callback).catch(callback);
          } else {
            // Call run sales
            CalculateSales.runSales(period, db, bigQuery, query, object, client, (err) => {
              if (err) {
                callback(err);
              } else {
                // Write file to DB
                bigQuery.writeFileToDb(bigQuery.outputTable, callback);
              }
            });
          }
        });
      } else {
        logger.info(`${period._id} Skipping Sales Calculation - no sales files attached`);
        callback();
      }
    })
      .catch(callback);
  },
  runSales: async (period, db, bigQuery, query, object, client, cb) => {
    if (period.contractType === 'MCPS') {
      CalculateSales.mcpsSalesCalculations(period, db, bigQuery, object, query, cb);
    } else {
      CalculateSales.runContractSalesCalculations(period, db, bigQuery, object, client, query, cb);
    }
  },
  runContractSalesCalculations: (period, db, bigQuery, object, client, mainQuery, callback) => {
    const recalculation = period.recalculation || {};
    // Find contracts for period
    const contractFilter = { clientId: period.clientId, active: true, accountingPeriod: period.accountingPeriodType };
    if (period.contractType === 'Mechanical') {
      contractFilter.contractType = 'Mechanical';
      contractFilter.mechanicalContractTerms = { $ne: [] };
    } else {
      contractFilter.contractType = { $ne: 'Mechanical' };
    }
    if (client.features?.suspense && period.resolvedGroupIds?.length) {
      logger.debug('Running full runContractSalesCalculations, as we have period.resolvedGroupIds', period.resolvedGroupIds);
      // @NOTE: we do not yet have recalculation filters for Resolved Groups - so we do not modify the contractFilter, to ensure we do not miss any contracts
    } else if (object.runType === 'main') {
      // check period recalculation to determine if we are running a partial
      if (recalculation.contractIds) {
        logger.debug('runContractSalesCalculations:', recalculation.contractIds);
        contractFilter._id = { $in: recalculation.contractIds };
      }
    } else if (object.runType === 'modifiedSales' && recalculation.salesFiles?.contractIds?.length > 0) {
      // have contractFilter._id = { $in: period.recalculation.salesFiles.contractIds };
      logger.debug('runModifiedSalesCalculations:', recalculation.salesFiles.contractIds);
      let modifiedSalesContractIds = recalculation.salesFiles.contractIds;

      // Need to pull recalculation.contractIds from recalculation.salesFiles.contractIds first as these have already been recalculated
      if (recalculation.contractIds) {
        modifiedSalesContractIds = modifiedSalesContractIds.filter((value, index, self) => !recalculation.contractIds.includes(value)).filter(Boolean);
      }

      logger.debug(`modifiedSalesContractIds: ${modifiedSalesContractIds}`);
      contractFilter._id = { $in: modifiedSalesContractIds };
    } else {
      const contractsError = 'ModifiedSales type sales Calculation requires contracts parameter';
      logger.error(`${period._id} ${contractsError}`);
      callback(new Error(contractsError));
    }

    logger.debug({ contractFilter });
    Contract.find(contractFilter).then((contracts) => {
      if (contracts && (period.recalculation?.contractIds || period.recalculation?.salesFiles)) {
        period.recalculation.totalContractsForCalculation = contracts.length;
      }
      // @todo don't want to be changing the totalContractsForCalculation on period when this is a partial - however it doesn't appear to be used anywhere so leaving for now
      Period.findByIdAndUpdate(period._id, { $set: { totalContractsForCalculation: contracts.length, recalculation: period.recalculation } }).then(() => {
        if (period.contractType === 'Mechanical') {
          CalculateSales.getContractSizes({ period, bigQuery, contracts, client }, (err, contractSizes) => {
            if (err) {
              callback(err);
            } else {
              // Group Mechanical Contracts
              CalculateSales.groupMechanicalContracts(contracts, contractSizes, 20000, (gmErr, mechanicalGroups) => {
                if (gmErr) {
                  callback(gmErr);
                } else {
                  const mechancialGroupNames = Object.keys(mechanicalGroups.groups);
                  logger.info(`${period._id} runContractSalesCalculations - Creating batch tasks`);
                  async.eachLimit(mechancialGroupNames, 10, (mechanicalGroupName, mechanicalGroupCb) => {
                    // Batch contracts
                    const contractChunks = chunk(mechanicalGroups.groups[mechanicalGroupName], 50);
                    // Loop through batches
                    async.eachLimit(contractChunks, 10, (batch, batchCb) => {
                      // Run calculation on batch
                      const baseGroupName = mechanicalGroupName.replace(/_overflow.*/, '');
                      if (mechanicalGroups.terms[baseGroupName]) {
                        const batchTask = new BatchTask({
                          clientId: period.clientId,
                          periodId: period._id.toString(),
                          name: 'Mechanical Sales Calculation',
                          status: 'Pending',
                          value: {
                            contracts: batch,
                            mainQuery,
                            mechanicalQuery: mechanicalGroups.terms[baseGroupName],
                            object,
                          },
                          runType: object.runType,
                        });
                        batchTask.save().then(() => batchCb()).catch(batchCb);
                      } else {
                        batchCb();
                      }
                    }, mechanicalGroupCb);
                  }, (err) => {
                    logger.info(`${period._id} runContractSalesCalculations - Done creating batch tasks. Running main batch process`);
                    // Trigger Tasks to start extra processors for each batchWorker defined on client
                    if (client.batchWorkers > 0) {
                      for (let i = 1; i <= client.batchWorkers; i += 1) {
                        // Waiting 1 second * i to space out start of workers to not overload DB with many batches all at once
                        setTimeout(() => {
                          const task = new Task({
                            clientId: period.clientId, name: 'Batch Worker', status: 'Pending', value: { periodId: period._id.toString() },
                          });
                          task.save().then(() => {
                            SQS.sendMessage(task, 2, () => {
                              logger.info(`${period._id} Created Batch Worker`);
                            });
                          }).catch((err) => {
                            logger.error(err);
                          });
                        }, 1000 * i);
                      }
                    }
                    // Start processing the batches
                    Batch.mainProcessRunBatches(period, callback);
                  });
                }
              });
            }
          });
        } else {
          // Get Contract Sizes
          CalculateSales.getContractSizes({ period, bigQuery, contracts, client }, (err, contractSizes, catalogueCount, rawCountData) => {
            if (err) {
              return callback(err);
            }
            logger.info(`${period._id} Contract Sizes`, contractSizes);
            // Order contracts by sales size
            contracts = PeriodStatementCreation.orderContracts(contracts, contractSizes);
            // Batch into segments
            const batchResult = PeriodStatementCreation.batchContracts(contracts, contractSizes, catalogueCount, 20000);
            // Loop through individiuals
            logger.info(`${period._id} runContractSalesCalculations : Creating Individual Batch Tasks: ${batchResult.individuals.length}`);
            // Init completedItemsUpdater
            const completedItemsUpdater = new CompletedItemsUpdater({
              periodId: period._id,
              fieldToIncrease: 'totalContractsForCalculation',
            });
            const lineLimit = 150000;
            async.eachLimit(batchResult.individuals, 10, (contract, contractCb) => {
              completedItemsUpdater.increaseCount(-1);
              const count = contractSizes[contract._id.toString()];
              // Anything greater than 1m lines, stream the data, otherwise batch
              if (count > 1000000 || catalogueCount[contract._id.toString()] > 5000) {
                CalculateSales.breakDownLargeBatches(period, contract, contractSizes[contract._id.toString()], bigQuery, mainQuery, object, lineLimit, contractCb);
              // NOTE: TA - I believe that above should batch this properly, but leaving here in case we need to break it out separately
              // } else if (catalogueCount[contract._id.toString()] > 5000) {
                // This is where the contract has a lot of catalogue, and we are breaking down into specific catalogue batches
                // CalculateSales.breakDownLargeContract(period, contract, contractSizes[contract._id.toString()], rawCountData, bigQuery, mainQuery, object, lineLimit, contractCb);
              } else {
                const noOfBatches = Math.floor(count / lineLimit) + 1;
                let whilstCount = 0;
                async.whilst((cb) => {
                  cb(null, whilstCount < noOfBatches);
                }, (cb) => {
                  // Setup Batch Task
                  const batchTask = new BatchTask({
                    clientId: period.clientId,
                    periodId: period._id.toString(),
                    name: 'Sales Individual Calculation',
                    status: 'Pending',
                    value: {
                      contractId: contract._id.toString(),
                      contractSize: contractSizes[contract._id.toString()],
                      type: 'Batch',
                    },
                    limit: lineLimit,
                    offset: lineLimit * whilstCount,
                    runType: object.runType,
                  });
                  // Add additional counter
                  if (whilstCount !== 1) {
                    // Increase totalContractsForCalculation count
                    completedItemsUpdater.increaseCount(1);
                  }
                  whilstCount += 1;
                  batchTask.save().then(() => cb()).catch(cb);
                }, (whilstErr) => {
                  // Stop completedItemsUpdater
                  completedItemsUpdater.stop();
                  contractCb(whilstErr);
                });
              }
            }, (err) => {
              if (err) {
                callback(err);
              } else {
                // Loop through batches
                logger.info(`${period._id} runContractSalesCalculations : Creating Batch Tasks: ${batchResult.batches.length}`);
                async.eachLimit(batchResult.batches, 5, (batch, batchCb) => {
                  // Setup Batch Task
                  const contractIds = batch.map((contract) => contract._id.toString());
                  const batchTask = new BatchTask({
                    clientId: period.clientId,
                    periodId: period._id.toString(),
                    name: 'Sales Batch Calculation',
                    status: 'Pending',
                    value: { contractIds, contractSizes },
                    runType: object.runType,
                  });

                  batchTask.save().then(() => batchCb()).catch(batchCb);
                }, (err) => {
                  if (err) {
                    callback(err);
                  } else {
                    // Trigger Tasks to start extra processors for each batchWorker defined on client
                    if (client.batchWorkers > 0) {
                      for (let i = 1; i <= client.batchWorkers; i += 1) {
                        // Waiting 1 second * i to space out start of workers to not overload DB with many batches all at once
                        setTimeout(() => {
                          const task = new Task({
                            clientId: period.clientId, name: 'Batch Worker', status: 'Pending', value: { periodId: period._id.toString() },
                          });
                          task.save().then(() => {
                            SQS.sendMessage(task, 2, () => {
                              logger.info(`${period._id} Created Batch Worker`);
                            });
                          }).catch((err) => {
                            logger.error(err);
                          });
                        }, 1000 * i);
                      }
                    }
                    // Start working on batches itself
                    Batch.mainProcessRunBatches(period, callback);
                  }
                });
              }
            });
          });
        }
      })
        .catch(callback);
    })
      .catch(callback);
  },
  getContractSizes: ({ period, bigQuery, contracts, statement, client }, callback) => {
    logger.debug('Getting Contract Sizes');
    CalculateSales.getDbCatalogueCounts({ period, bigQuery, statement, client }, (err, catalogueCounts) => {
      logger.debug({ catalogueCounts });
      if (err) {
        return callback(err);
      }
      const contractSizes = {};
      const catalogueCount = {};
      async.eachLimit(contracts, 10, (contract, contractCb) => {
        CalculateContract.getContractCatalogueIds(period, contract, (err, catalogueContract) => {
          if (err) {
            return callback(err);
          }
          // Setup contract count
          contractSizes[contract._id.toString()] = 0;
          // Add contract direct linked sales to the contract
          if (catalogueCounts.contracts[contract._id.toString()]) {
            contractSizes[contract._id.toString()] += catalogueCounts.contracts[contract._id.toString()];
          }
          // Loop through each of the areas
          ['releases', 'tracks', 'works'].forEach((area) => {
            // Add cat size to catalogueCount
            catalogueCount[contract._id.toString()] = catalogueCount[contract._id.toString()] || 0;
            catalogueCount[contract._id.toString()] += catalogueContract[area].length;
            // Loop through each ID
            catalogueContract[area].forEach((id) => {
              if (catalogueCounts[area][id]) {
                contractSizes[contract._id.toString()] += catalogueCounts[area][id];
              }
            });
          });
          contractCb();
        });
      }, (err) => {
        callback(err, contractSizes, catalogueCount, catalogueCounts);
      });
    });
  },
  getDbCatalogueCounts: async ({ period, statement, bigQuery, client }, callback) => {
    // Setup query to get unique values
    const mainFilter = await CalculationHelpers.buildMainQuery({ client, period, statement, bigQuery, salesFileIds: period.salesFilesIds }).catch((buildQueryErr) => {
      logger.error(`${period._id} ${statement?._id || ''} Error building main query: `, buildQueryErr);
      callback(buildQueryErr);
    });

    const query = `SELECT catType, releaseId, trackId, workId, contractId, COUNT(*) as count
        FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
        WHERE ${bigQuery.filterFromObject(mainFilter)}
        GROUP BY catType, releaseId, trackId, workId, contractId`;

    // logger.debug({ query });
    // Query BQ
    bigQuery.queryJob(query, (err, countOutputs) => {
      if (err) {
        return callback(err);
      }
      const output = { releases: {}, tracks: {}, works: {}, contracts: {} };
      // Loop through output items and match to their
      countOutputs.forEach((item) => {
        if (item.catType === 'Release') {
          output.releases[item.releaseId] = output.releases[item.releaseId] || 0;
          output.releases[item.releaseId] += item.count;
        } else if (item.catType === 'Track') {
          output.tracks[item.trackId] = output.tracks[item.trackId] || 0;
          output.tracks[item.trackId] += item.count;
        } else if (item.catType === 'Work') {
          output.works[item.workId] = output.works[item.workId] || 0;
          output.works[item.workId] += item.count;
        }
        // Contracts mapped against the contract whether it matches or not
        if (item.contractId) {
          output.contracts[item.contractId] = output.contracts[item.contractId] || 0;
          output.contracts[item.contractId] += item.count;
        }
      });
      // logger.debug(output);
      callback(null, output);
    });
  },
  breakDownLargeBatches: (period, contract, size, bigQuery, mainQuery, object, lineLimit, callback) => {
    // Get contract query
    CalculateContract.contractQuery(contract, bigQuery, period, mainQuery, {}, false, true, (contractErr, newQuery) => {
      // QUERYLOOP HERE
      logger.debug(newQuery);
      if (Array.isArray(newQuery)) {
        async.eachSeries(newQuery, (batchQuery, batchCb) => {
          CalculateSales.breakDownLargeBatchesQuery(batchQuery, period, contract, size, bigQuery, mainQuery, object, lineLimit, true, batchCb);
        }, callback);
      } else {
        CalculateSales.breakDownLargeBatchesQuery(newQuery, period, contract, size, bigQuery, mainQuery, object, lineLimit, false, callback);
      }
    });
  },
  breakDownLargeBatchesQuery: (newQuery, period, contract, size, bigQuery, mainQuery, object, lineLimit, forceCatalogueInQuery, callback) => {
    // Add Group By query
    let query = `SELECT salesFileId, COUNT(*) as count  
        FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
        WHERE ${bigQuery.filterFromObject(newQuery)}
        GROUP BY salesFileId`;
    // Reduce catalogue requests to much smaller
    query = bigQuery.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
    query = bigQuery.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
    query = bigQuery.catalogueIdsToParams(query, 'workId IN ', 'workIds');
    query = bigQuery.catalogueIdsToParams(query, 'salesFileId IN ', 'salesFileIds');
    // logger.debug(query);
    bigQuery.queryJob(query, (err, salesFileCounts) => {
      logger.debug(salesFileCounts);
      if (salesFileCounts) {
        // Spilt sales files into batches and create tasks
        CalculateSales.batchSalesFileTasks(salesFileCounts, period, contract, object, lineLimit, bigQuery, mainQuery, forceCatalogueInQuery, newQuery, callback);
      } else {
        // No sales file data, just stream output
        const batchTask = new BatchTask({
          clientId: period.clientId,
          periodId: period._id.toString(),
          name: 'Sales Individual Calculation',
          status: 'Pending',
          value: {
            contractId: contract._id.toString(),
            contractSize: size,
            type: 'Stream',
          },
          runType: object.runType,
        });
        if (forceCatalogueInQuery) {
          // States that the query is built from a partial catalogue, so needs to include the catalogue from the query in the batch task
          const catalogueItems = CalculateSales.getCatalogueDataFromQuery(newQuery);
          batchTask.value.releaseIds = catalogueItems.releaseIds;
          batchTask.value.trackIds = catalogueItems.trackIds;
          batchTask.value.workIds = catalogueItems.workIds;
        }
        batchTask.save().then(() => callback()).catch(callback);
      }
    });
  },
  getCatalogueDataFromQuery: (query) => {
    const output = {};
    if (query && query.$or) {
      query.$or.forEach((orStatement) => {
        if (orStatement.releaseId) {
          output.releaseIds = orStatement.releaseId.$in;
        }
        if (orStatement.trackId) {
          output.trackIds = orStatement.trackId.$in;
        }
        if (orStatement.workId) {
          output.workIds = orStatement.workId.$in;
        }
      });
    }
    return output;
  },
  batchSalesFileTasks: (salesFileCounts, period, contract, object, lineLimit, bigQuery, mainQuery, forceCatalogueInQuery, query, callback) => {
    if (salesFileCounts) {
      // Order by size
      const salesFiles = salesFileCounts.sort((a, b) => a.count - b.count);
      // Batch
      const batches = CalculateSales.batchSalesFiles(salesFiles);
      logger.debug(batches);
      // Init completedItemsUpdater
      const completedItemsUpdater = new CompletedItemsUpdater({
        periodId: period._id,
        fieldToIncrease: 'totalContractsForCalculation',
      });
      // Create tasks for batches
      async.eachLimit(batches, 5, (batch, batchCb) => {
        if (batch.count > 1000000) {
          // CalculateSales.breakDownLargeSalesFileBatches(query, period, contract, batch.count, batch.salesFileIds, bigQuery, mainQuery, object, lineLimit, forceCatalogueInQuery, callback);
          // Temp - run this as streaming
          // Setup Batch Task
          const batchTask = new BatchTask({
            clientId: period.clientId,
            periodId: period._id.toString(),
            name: 'Sales Individual Calculation',
            status: 'Pending',
            value: {
              contractId: contract._id.toString(),
              contractSize: batch.count,
              type: 'Stream',
              salesFileIds: batch.salesFileIds,
            },
            runType: object.runType,
          });
          if (forceCatalogueInQuery) {
            // States that the query is built from a partial catalogue, so needs to include the catalogue from the query in the batch task
            const catalogueItems = CalculateSales.getCatalogueDataFromQuery(query);
            batchTask.value.releaseIds = catalogueItems.releaseIds;
            batchTask.value.trackIds = catalogueItems.trackIds;
            batchTask.value.workIds = catalogueItems.workIds;
          }
          // Increase totalContractsForCalculation count
          completedItemsUpdater.increaseCount(1);
          batchTask.save().then(() => batchCb()).catch(batchCb);
        } else {
          const noOfBatches = Math.floor(batch.count / lineLimit) + 1;
          let whilstCount = 0;
          async.whilst((cb) => {
            cb(null, whilstCount < noOfBatches);
          }, (cb) => {
            // Setup Batch Task
            const batchTask = new BatchTask({
              clientId: period.clientId,
              periodId: period._id.toString(),
              name: 'Sales Individual Calculation',
              status: 'Pending',
              value: {
                contractId: contract._id.toString(),
                contractSize: batch.count,
                type: 'Batch',
                salesFileIds: batch.salesFileIds,
              },
              limit: lineLimit,
              offset: lineLimit * whilstCount,
              runType: object.runType,
            });
            if (forceCatalogueInQuery) {
              // States that the query is built from a partial catalogue, so needs to include the catalogue from the query in the batch task
              const catalogueItems = CalculateSales.getCatalogueDataFromQuery(query);
              batchTask.value.releaseIds = catalogueItems.releaseIds;
              batchTask.value.trackIds = catalogueItems.trackIds;
              batchTask.value.workIds = catalogueItems.workIds;
              batchTask.value.type = 'Individial Contract Batch';
            }
            // Add additional counter
            if (whilstCount !== 1) {
              // Increase totalContractsForCalculation count
              completedItemsUpdater.increaseCount(1);
            }
            whilstCount += 1;
            batchTask.save().then(() => cb()).catch(cb);
          }, (whilstErr) => {
            // Stop completedItemsUpdater
            completedItemsUpdater.stop();
            batchCb(whilstErr);
          });
        }
      }, callback);
    } else {
      callback();
    }
  },
  batchSalesFiles: (salesFiles) => {
    const batchSizes = 125000;
    const outputBatches = [];
    let currentBatch = { salesFileIds: [], count: 0 };
    salesFiles.forEach((salesFile) => {
      // Add sales file to the batch
      currentBatch.salesFileIds.push(salesFile.salesFileId);
      currentBatch.count += salesFile.count;
      if (currentBatch.count >= batchSizes) {
        // Reset batch when it's over the batch size
        outputBatches.push(currentBatch);
        currentBatch = { salesFileIds: [], count: 0 };
      }
    });
    // Add final batch if it contains any data
    if (currentBatch.count) {
      outputBatches.push(currentBatch);
    }
    return outputBatches;
  },
  breakDownLargeSalesFileBatches: (newQuery, period, contract, size, salesFileIds, bigQuery, mainQuery, object, lineLimit, forceCatalogueInQuery, callback) => {
    // Add salesFileIds to newQuery - not needed if being passed down
    // newQuery.salesFileId = { $in: salesFileIds };
    // Add Group By query
    let query = `SELECT catType, releaseId, trackId, workId, contractId, COUNT(*) as count  
        FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
        WHERE ${bigQuery.filterFromObject(newQuery)}
        GROUP BY catType, releaseId, trackId, workId, contractId`;
    // Reduce catalogue requests to much smaller
    query = bigQuery.catalogueIdsToParams(query, 'releaseId IN ', 'releaseIds');
    query = bigQuery.catalogueIdsToParams(query, 'trackId IN ', 'trackIds');
    query = bigQuery.catalogueIdsToParams(query, 'workId IN ', 'workIds');
    query = bigQuery.catalogueIdsToParams(query, 'salesFileId IN ', 'salesFileIds');
    logger.debug(query);
    bigQuery.queryJob(query, (err, catalogueCounts) => {
      logger.debug('catalogueCounts');
      logger.debug(catalogueCounts);
      if (catalogueCounts) {
        // Spilt sales files into batches and create tasks
        CalculateSales.batchSalesFileCatalogueTasks(catalogueCounts, period, contract, object, lineLimit, salesFileIds, forceCatalogueInQuery, callback);
      } else {
        // No catalogue data, just stream output
        const batchTask = new BatchTask({
          clientId: period.clientId,
          periodId: period._id.toString(),
          name: 'Sales Individual Calculation',
          status: 'Pending',
          value: {
            contractId: contract._id.toString(),
            contractSize: size,
            salesFileIds,
            type: 'Stream',
          },
          runType: object.runType,
        });
        if (forceCatalogueInQuery) {
          // States that the query is built from a partial catalogue, so needs to include the catalogue from the query in the batch task
          const catalogueItems = CalculateSales.getCatalogueDataFromQuery(newQuery);
          batchTask.value.releaseIds = catalogueItems.releaseIds;
          batchTask.value.trackIds = catalogueItems.trackIds;
          batchTask.value.workIds = catalogueItems.workIds;
          batchTask.value.type = 'Individial Contract Batch';
        }
        batchTask.save().then(() => callback()).catch(callback);
      }
    });
  },
  batchSalesFileCatalogueTasks: (catalogueCounts, period, contract, object, lineLimit, salesFileIds, forceCatalogueInQuery, callback) => {
    if (catalogueCounts) {
      // Order by size
      const catalogueCount = catalogueCounts.sort((a, b) => a.count - b.count);
      // Batch
      const batches = CalculateSales.batchSalesFileCatalogue(catalogueCount);
      logger.debug(batches);
      // Create tasks for batches
      async.eachLimit(batches, 5, (batch, batchCb) => {
        // Init completedItemsUpdater
        const completedItemsUpdater = new CompletedItemsUpdater({
          periodId: period._id,
          fieldToIncrease: 'totalContractsForCalculation',
        });
        const noOfBatches = Math.floor(batch.count / lineLimit) + 1;
        let whilstCount = 0;
        async.whilst((cb) => {
          cb(null, whilstCount < noOfBatches);
        }, (cb) => {
          // let type = batch.count > 1000000 ? 'Stream' : 'Batch';
          let type = batch.count > 1000000 ? 'Stream' : 'Individial Contract Batch';
          if (forceCatalogueInQuery) {
            // Sets type to batching when forced catalogue on batch
            type = 'Individial Contract Batch';
          }
          // Setup Batch Task
          const batchTask = new BatchTask({
            clientId: period.clientId,
            periodId: period._id.toString(),
            name: 'Sales Individual Calculation',
            status: 'Pending',
            value: {
              contractId: contract._id.toString(),
              contractSize: batch.count,
              type,
              salesFileIds,
              releaseIds: batch.releaseIds,
              trackIds: batch.trackIds,
              workIds: batch.workIds,
              contractIds: batch.contractIds,
            },
            limit: lineLimit,
            offset: lineLimit * whilstCount,
            runType: object.runType,
          });
          // Add additional counter
          if (whilstCount !== 1) {
            // Increase totalContractsForCalculation count
            completedItemsUpdater.increaseCount(1);
          }
          whilstCount += 1;
          batchTask.save().then(() => cb()).catch(cb);
        }, (whilstErr) => {
          // Stop completedItemsUpdater
          completedItemsUpdater.stop();
          batchCb(whilstErr);
        });
      }, callback);
    } else {
      callback();
    }
  },
  batchSalesFileCatalogue: (items) => {
    const batchSizes = 125000;
    const outputBatches = [];
    let currentBatch = { releaseIds: [], trackIds: [], workIds: [], contractIds: [], count: 0 };
    items.forEach((item) => {
      // Add sales file to the batch
      if (item.catType === 'Release') {
        currentBatch.releaseIds.push(item.releaseId);
      } else if (item.catType === 'Track') {
        currentBatch.trackIds.push(item.trackId);
      } else if (item.catType === 'Work') {
        currentBatch.workIds.push(item.workId);
      } else if (item.catType === 'Contract') {
        currentBatch.contractIds.push(item.contractId);
      }
      currentBatch.count += item.count;
      if (currentBatch.count >= batchSizes) {
        // Reset batch when it's over the batch size
        outputBatches.push(currentBatch);
        currentBatch = { releaseIds: [], trackIds: [], workIds: [], contractIds: [], count: 0 };
      }
    });
    // Add final batch if it contains any data
    if (currentBatch.count) {
      outputBatches.push(currentBatch);
    }
    return outputBatches;
  },
  groupMechanicalContracts: (contracts, contractSizes, sizeLimit, callback) => {
    const contractGroups = {};
    const contractGroupTerms = {};
    const groupSizes = {};
    const overflowIndices = {};
    async.each(contracts, (contract, cb) => {
      MechanicalContractTerms.mechanicalTermsToQuery(contract, (err, terms) => {
        const termStringObject = {};
        terms.forEach((term) => {
          if (term.territory) {
            termStringObject.territory = termStringObject.territory || [];
            CalculateSales.itemToArray(term.territory).forEach((item) => {
              if (!termStringObject.territory.includes(item)) {
                termStringObject.territory.push(item);
              }
            });
          }
          if (term.distributionChannel) {
            termStringObject.distributionChannel = termStringObject.distributionChannel || [];
            CalculateSales.itemToArray(term.distributionChannel).forEach((item) => {
              if (!termStringObject.distributionChannel.includes(item)) {
                termStringObject.distributionChannel.push(item);
              }
            });
          }
          if (term.configuration) {
            termStringObject.configuration = termStringObject.configuration || [];
            CalculateSales.itemToArray(term.configuration).forEach((item) => {
              if (!termStringObject.configuration.includes(item)) {
                termStringObject.configuration.push(item);
              }
            });
          }
        });
        let termString = '';
        if (termStringObject.territory) {
          termString += `Territory:${termStringObject.territory.sort().join('')}`;
        }
        if (termStringObject.distributionChannel) {
          termString += `Channel:${termStringObject.distributionChannel.sort().join('')}`;
        }
        if (termStringObject.configuration) {
          termString += `Config:${termStringObject.configuration.sort().join('')}`;
        }
        if (!contractGroups[termString]) {
          contractGroups[termString] = [];
          contractGroupTerms[termString] = terms;
          groupSizes[termString] = 0;
        }

        const contractSize = contractSizes[contract._id.toString()] || 0;
        // This shouldnt be triggered, but if it is we need to start breaking down the contracts
        if (contractSize > sizeLimit) {
          logger.info(`Contract ${contract._id} is over the size limit and might need to be broken down.`);
          contractGroups[`${termString}_overflow_${contract._id.toString()}`] = [contract];
          cb();
          return;
        }

        // Check if adding this contract would exceed the size limit
        if (groupSizes[termString] + contractSize > sizeLimit) {
          // Create or add to an overflow group
          let overflowIndex = overflowIndices[termString] || 0;
          let overflowGroupName = `${termString}_overflow_${overflowIndex}`;
          while (contractGroups[overflowGroupName] && groupSizes[overflowGroupName] + contractSize > sizeLimit) {
            overflowIndex += 1;
            overflowGroupName = `${termString}_overflow_${overflowIndex}`;
          }

          if (!contractGroups[overflowGroupName]) {
            contractGroups[overflowGroupName] = [];
            groupSizes[overflowGroupName] = 0;
            logger.info(`Created new overflow group: ${overflowGroupName}`);
          }

          contractGroups[overflowGroupName].push(contract);
          groupSizes[overflowGroupName] += contractSize; // Update overflow group size
          overflowIndices[termString] = overflowIndex + 1; // Update overflow index
        } else {
          // Add contract to the existing group
          contractGroups[termString].push(contract);
          groupSizes[termString] += contractSize; // Update group size
        }
        cb();
      });
    }, (err) => {
      callback(err, { groups: contractGroups, terms: contractGroupTerms });
    });
  },
  itemToArray: (item) => {
    if (Array.isArray(item)) {
      return item;
    }
    return [item];
  },
  mcpsSalesCalculations: (period, db, bigQuery, object, query, callback) => {
    async.waterfall([
      function (cb) {
        // Get Client
        Client.findById(period.clientId, {
          mcpsId: 1, mcpsTargets: 1, mcpsFreeGoodsTargets: 1, mcpsReturnsTargets: 1, mcpsConsignmentTargets: 1, mcpsExcludedCatGroups: 1,
        })
          .then((client) => {
            cb(null, client);
          })
          .catch(cb);
      },
      function (client, cb) {
        // Get Releases Count to Batch
        const limit = 1000;
        const catFilter = { clientId: client._id.toString(), $or: [{ catalogueGroups: { $size: 0 } }, { catalogueGroups: { $exists: false } }, { catalogueGroups: { $nin: client.mcpsExcludedCatGroups } }] };
        Release.countDocuments(catFilter).then((count) => {
          const rounds = listFromNumber(Math.floor(count / limit));
          async.eachSeries(rounds, (round, loopCb) => {
            logger.info(`${period._id} Release Round: ${round} of ${rounds}`);
            // Calculate Batch of Releases
            CalculateSales.calculateMcpsReleaseBatch(period, client, db, bigQuery, object, catFilter, limit * round, limit, loopCb);
          }, cb);
        })
          .catch(cb);
      },
    ], callback);
  },
  calculateMcpsReleaseBatch: (period, client, db, bigQuery, object, catFilter, catOffset, limit, callback) => {
    Release
      .find(catFilter, { _id: 1 })
      .sort({ _id: 1 })
      .limit(limit)
      .skip(catOffset)
      .then((releases) => {
        const releaseIds = releases.map((release) => release._id.toString());
        // Build the filters
        async.eachSeries([client.mcpsFreeGoodsTargets, client.mcpsReturnsTargets, client.mcpsTargets, client.mcpsConsignmentTargets], (filter, filterCb) => {
          const query = {
            salesFileId: { $in: period.salesFilesIds },
            releaseId: { $in: period.includedReleaseIds },
          };

          McpsSalesTerms.seperatedMcpsSalesTerms(client, filter, (err, mcpsTerms) => {
            const data = { name: `Period ID: ${period._id.toString()}`, objectPercentage: 100, contractId: 'MCPS', terms: { sales: mcpsTerms } };
            const newObject = JSON.parse(JSON.stringify(object));
            newObject.contracts = [data];
            newObject.type = 'Release';
            newObject.releaseIds = releaseIds;
            newObject.periodEndDate = period.endDate;
            newObject.exchangeRates = period.currencyExchangeRates;
            newObject.clientCurrencies = currenciesToPrefix(client);
            newObject.mechanicalAmounts = {};
            newObject.bigQuery = bigQuery;
            newObject.salesData = [];
            newObject.contractQuery = query;
            newObject.db = db;
            const salesCalculation = new SalesCalculation(newObject);
            salesCalculation.calculate((err, payload) => {
              if (err) {
                logger.error(`${period._id} Error Calculating Data`, err);
                filterCb(err);
              } else {
                filterCb();
              }
            });
          });
        }, callback);
      })
      .catch(callback);
  },
};

module.exports = CalculateSales;
