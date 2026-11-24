const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Statement = require('../../../models/statement');
const Period = require('../../../models/period');
const BatchTask = require('../../../models/batchTask');
const Task = require('../../../models/task');

const SQS = require('../../sqs');
const Batch = require('./batch');
const associatedAddToContractIds = require('../statement/associatedAddToContractIds');

const PeriodStatementCreation = {
  orderContracts: (contracts, contractSizes) => {
    try {
      const orderedContractSizes = Object.keys(contractSizes).map((contractId) => ({ contractId, count: contractSizes[contractId] })).sort((a, b) => {
        if (a.count > b.count) {
          return 1;
        }
        return -1;
      });
      const output = [];
      orderedContractSizes.forEach((item, index) => {
        contracts.forEach((contract) => {
          if (item.contractId === contract._id.toString()) {
            output.push(contract);
          }
        });
      });
      return output;
    } catch (e) {
      logger.error(e);
    }
  },
  batchContracts: (contracts, contractSizes, catalogueSizes, limit) => {
    const output = [];
    let batchCount = 0;
    let batch = [];
    const individuals = [];
    // Loop through contracts
    contracts.forEach((contract) => {
      if (PeriodStatementCreation.isContractUsingEscalations(contract)) {
        // If contract is using escalations, add it to output array so it's not batched.
        // Only add this contract to the whole batch in case it's a big one.
        output.push([contract]);
      } else if (contractSizes[contract._id.toString()] > (limit / 2) || (catalogueSizes[contract._id.toString()] && catalogueSizes[contract._id.toString()] >= 5000)) {
        // If batch is larger than half of limit
        // OR if catalogue size is greater than 5k - this will push this down batched queries of individual calculations
        // Contract is larger than the batch size - add to individuals array
        individuals.push(contract);
      } else if (batchCount >= limit || batch.length >= 1000) {
        // Add batch to output
        output.push(batch);
        // Create new batch
        batch = [contract];
        // Reset count
        batchCount = contractSizes[contract._id.toString()];
      } else {
        // Contract falls within the batch
        // Add contract to batch
        batch.push(contract);
        // Add size to count
        batchCount += contractSizes[contract._id.toString()];
      }
    });
    // Add final batch to output
    output.push(batch);
    return { batches: output, individuals };
  },
  createStatementFiles: (period, db, bigQuery, client, callback) => {
    // @todo only run for affected contracts if partial and no salesFiles changed
    const { recalculation } = period;
    const filter = { clientId: period.clientId, periodId: period._id.toString() };

    if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
      filter.contractId = { $in: recalculation.contractIds };
    }

    Statement.countDocuments(filter)
      .then((statementCount) => {
        // Reset statements count
        // @todo don't want to be changing the totalContractsForCalculation on period when this is a partial - however it doesn't appear to be used anywhere so leaving for now
        Period.findByIdAndUpdate(period._id, { $set: { totalContractsForCalculation: statementCount } })
          .then(() => {
            // Get statements
            Statement.find(filter, 'name periodId contractId clientId')
              .then((statements) => {
                logger.debug(`createStatementFiles : statements.length: ${statements.length}`);
                // Get statement counts
                PeriodStatementCreation.statementSalesOutputCount(period, statements, bigQuery, (err, statementSizes) => {
                  logger.info(`${period._id} Statement Sizes: ${JSON.stringify(statementSizes)}`);
                  // Order statement by sales size
                  statements = PeriodStatementCreation.orderContracts(statements, statementSizes);
                  // Batch into segments
                  const batchResult = PeriodStatementCreation.batchContracts(statements, statementSizes, {}, 200000);
                  async.eachLimit(batchResult.batches, 10, (batch, batchCb) => {
                    // Setup Batch Task
                    const statementIds = batch.map((statement) => statement._id.toString());
                    const batchTask = new BatchTask({
                      clientId: period.clientId, periodId: period._id.toString(), name: 'Statement Batch Creation', status: 'Pending', value: { statementIds },
                    });
                    batchTask.save()
                      .then((batchTask) => {
                        batchCb(null, batchTask);
                      })
                      .catch((err) => {
                        logger.error(err);
                        batchCb(err);
                      });
                  }, (err) => {
                    if (err) {
                      callback(err);
                    } else {
                      // Loop through individiuals
                      async.each(batchResult.individuals, (statement, statementCb) => {
                        // Setup Batch Task
                        const batchTask = new BatchTask({
                          clientId: period.clientId, periodId: period._id.toString(), name: 'Statement Individual Creation', status: 'Pending', value: { statementId: statement._id.toString() },
                        });
                        batchTask.save()
                          .then((batchTask) => {
                            statementCb(null, batchTask);
                          })
                          .catch((err) => {
                            logger.error(err);
                            statementCb(err);
                          });
                      }, (err) => {
                        if (err) {
                          callback(err);
                        } else {
                          // Trigger Tasks to start extra processors for each batchWorker defined on client
                          if (client.batchWorkers > 0) {
                            for (let i = 1; i <= client.batchWorkers; i += 1) {
                              // Waiting 10 seconds * i to space out start of workers to not overload DB with many batches all at once
                              setTimeout(() => {
                                const task = new Task({
                                  clientId: period.clientId, name: 'Batch Worker', status: 'Pending', value: { periodId: period._id.toString() },
                                });
                                task.save()
                                  .then(() => {
                                    SQS.sendMessage(task, 2, () => {
                                      logger.info(`${period._id} Created Batch Worker`);
                                    });
                                  })
                                  .catch((err) => {
                                    // Bongo refactor: I guess we do nothing here?
                                    logger.error(err);
                                  });
                              }, 10000 * i);
                            }
                          }
                          // Start working on batches itself
                          Batch.mainProcessRunBatches(period, callback);
                        }
                      });
                    }
                  });
                });
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
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  statementSalesOutputCount: (period, statements, bigQuery, callback) => {
    // Setup query to get unique values
    const filter = {
      periodId: period._id.toString(),
      royaltyRate: { $ne: 0 },
      objectPercentage: { $ne: 0 },
    };
    const query = `SELECT contractId, COUNT(*) as count
        FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\`
        WHERE ${bigQuery.filterFromObject(filter)}
        GROUP BY contractId`;
    logger.debug(query);
    // Query BQ
    bigQuery.queryJob(query, (err, countOutputs) => {
      if (err) {
        return callback(err);
      }
      // Map outputs to contractId for easier mapping to the statement on multiple contractIds
      const contractCounts = {};
      countOutputs.forEach((output) => {
        if (output && output.contractId) {
          contractCounts[output.contractId] = contractCounts[output.contractId] || 0;
          contractCounts[output.contractId] += output.count;
        }
      });
      const statementSizes = {};
      async.eachLimit(statements, 10, (statement, statementCb) => {
        associatedAddToContractIds(statement, (err, contractIds) => {
          if (err) {
            return statementCb(err);
          }
          statementSizes[statement._id.toString()] = 0;
          contractIds.forEach((contractId) => {
            if (contractCounts[contractId]) {
              statementSizes[statement._id.toString()] += contractCounts[contractId];
            }
          });
          statementCb();
        });
      }, (err) => {
        callback(err, statementSizes);
      });
    });
  },
  isContractUsingEscalations: (contract) => {
    let contractUsingEscalations = false;
    if (contract.salesTerms?.length) {
      contract.salesTerms.forEach((term) => {
        // Check the sales term is not using trackers
        if (term?.escalationTrackers?.length) { contractUsingEscalations = true; }
        // Check no esclation conditions are using this tracker
        if (term?.escalations?.length) {
          term.escalations.forEach((escalation) => {
            if (escalation.conditions.length) {
              escalation.conditions.forEach((condition) => {
                if (condition.escalationTracker?.length && condition.escalationTracker !== 'Sale Date' && condition.escalationTracker !== 'Reporting Date') { contractUsingEscalations = true; }
              });
            }
          });
        }
      });
    }

    if (contract.costsTerms?.length) {
      contract.costsTerms.forEach((term) => {
        // Check the costs term is not using trackers
        if (term.escalationTrackers?.length) { contractUsingEscalations = true; }
      });
    }

    return contractUsingEscalations;
  },
};

module.exports = PeriodStatementCreation;
