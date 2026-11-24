const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const Client = require('../../../models/client');
const Report = require('../../../models/report');
const Statement = require('../../../models/statement');
const Period = require('../../../models/period');

const config = require('../../../config.json');
const collectData = require('../../writeCsv/collectData');
const getWorkIsrcs = require('../../getWorkIsrcs');
const associatedAddToContractIds = require('../statement/associatedAddToContractIds');
const CreateFiles = require('../statement/createFiles');
const CatalogueOverwritingData = require('../../catalogueOverwritingData');
const CompletedItemsUpdater = require('../completedItemsUpdater');

const PeriodStatementCreationBatch = {
  createStatementBatch: (period, batchTask, callback) => {
    logger.info(`${period._id} Running Statement Batch ${batchTask._id}`);
    Client.findById(period.clientId)
      .then((client) => {
        // Get MongoDB connection from mongoose
        const { db } = mongoose.connection;
        // Setup BigQuery connection
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        // Get Statements in batch
        Statement.find({ _id: { $in: batchTask.value.statementIds.map((id) => ObjectId.createFromHexString(id)) } })
          .then((statements) => {
            // Call run batch
            PeriodStatementCreationBatch.runBatchStatementCreation(period, statements, db, bigQuery, client, (err) => {
              if (err) {
                // Handle Error and store against batch task
                logger.info(`${period._id} Running Statement Batch Errored ${batchTask._id} ${err}`);
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
                    callback(saveErr);
                  });
              } else {
                // Update batch task to be complete
                logger.info(`${period._id} Completed Running Statement Batch ${batchTask._id}`);
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
          })
          .catch((err) => {
            logger.error(err);
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
                callback(saveErr);
              });
          });
      })
      .catch((err) => {
        logger.error(err);
        // Handle Error and store against batch task
        batchTask.status = 'Errored';
        batchTask.error = 'Failed to retreive client';
        batchTask.save()
          .then(() => {
            callback();
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      });
  },
  createIndividualStatementBatch: (period, batchTask, callback) => {
    logger.info(`${period._id} Running Individual Statement Batch ${batchTask._id}`);
    Client.findById(period.clientId)
      .then((client) => {
        // Get MongoDB connection from mongoose
        const { db } = mongoose.connection;
        // Setup BigQuery connection
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        // Get Statement
        Statement.findById(batchTask.value.statementId)
          .then((statement) => {
            // Create files for each statement
            CreateFiles.create(statement, db, bigQuery, client, period, null, (err) => {
              // Increment count
              Period.findByIdAndUpdate(period._id, { $inc: { completedCatalogueItems: 1 } }, { timestamps: false })
                .then(() => {
                  // Bongo refactor: Is this a mistake? Are we handling the wrong error here?
                  if (err) {
                    // Handle Error and store against batch task
                    logger.info(`${period._id} Running Individual Statement Batch Errored ${batchTask._id} ${err}`);
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
                        callback(saveErr);
                      });
                  } else {
                    // Update batch task to be complete
                    logger.info(`${period._id} Completed Running Individual Statement Batch ${batchTask._id}`);
                    batchTask.status = 'Complete';
                    batchTask.save()
                      .then(() => {
                        callback(err);
                      })
                      .catch((saveErr) => {
                        logger.error(saveErr);
                        callback(saveErr);
                      });
                  }
                })
                .catch((err) => {
                  logger.error(err);
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
                      callback(saveErr);
                    });
                });
            });
          })
          .catch((err) => {
            // Handle Error and store against batch task
            batchTask.status = 'Errored';
            batchTask.error = err.message;
            batchTask.save()
              .then(() => {
                callback(err);
              })
              .catch((saveErr) => {
                logger.error(saveErr);
                callback(saveErr);
              });
          });
      })
      .catch((err) => {
        logger.error(err);
        // Handle Error and store against batch task
        batchTask.status = 'Errored';
        batchTask.error = 'Failed to retreive client';
        batchTask.save()
          .then(() => {
            callback(err);
          })
          .catch((saveErr) => {
            logger.error(saveErr);
            callback(saveErr);
          });
      });
  },
  runBatchStatementCreation: (period, batch, db, bigQuery, client, callback) => {
    async.waterfall([
      function (cb) {
        // Create filter
        const filter = {
          periodId: period._id.toString(),
          contractId: { $in: [] },
          royaltyRate: { $ne: 0 },
          objectPercentage: { $ne: 0 },
        };
        async.each(batch, (statement, statementCb) => {
          associatedAddToContractIds(statement, (err, contractIds) => {
            if (err) {
              statementCb(err);
            } else if (contractIds) {
              contractIds.forEach((id) => {
                filter.contractId.$in.push(id);
              });
              statementCb();
            } else {
              statementCb();
            }
          });
        }, (err) => {
          cb(err, filter);
        });
      },
      function (filter, cb) {
        // Add partitions to the filter from the included contract IDs - done here to allow for any associated add tos to be added first
        Statement.find({ clientId: period.clientId, periodId: period._id.toString(), contractId: { $in: filter.contractId.$in } }, 'partitionNo')
          .then((statements) => {
            // Set up array
            const partitionNos = [];
            // Loop through statements to get unique partition nos, including any null values - distinct in the DB does not return null values
            statements.forEach((statement) => {
              if (!partitionNos.includes(statement.partitionNo)) {
                partitionNos.push(statement.partitionNo);
              }
            });
            // Check for any null values
            if (partitionNos.indexOf(null) !== -1) {
              const partitionsWithoutNull = partitionNos.filter(Boolean);
              filter.$or3 = [{ contractPartitionNo: null }];
              if (partitionsWithoutNull.length > 0) {
                filter.$or3.push({ contractPartitionNo: { $in: partitionsWithoutNull } });
              }
            } else {
              filter.contractPartitionNo = { $in: partitionNos };
            }
            cb(null, filter);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (filter, cb) {
        // Get Select Fields
        // @TODO: Add support for checking against Company (contract.statementDesignData)
        // @TODO: But we would then have to split these out into separate companies and/or client settings while batching contracts, if they differ between contracts to be included
        Report.findById(client.salesReportTemplate)
          .then((report) => {
          // Set template based on if report is present or not
            let template;
            if (report) {
              template = report.fields;
              // Find index of contractName if it exists
              let index = -1;
              template.forEach((item, itemIndex) => {
                if (item.field === 'contractName') {
                  index = itemIndex;
                }
              });
              if (index !== -1) { template.splice(index, 1); }
              // Add contract name to start of custom reports
              template.unshift({ field: 'contractName', header: 'Contract Name', type: 'Selector' });
            } else if (client.clientType === 'Publisher') {
              template = config.exportTemplates.statementPublishing;
            } else if (period.contractType === 'Mechanical') {
              template = config.exportTemplates.statementMechanicals;
            } else {
              template = config.exportTemplates.statementSales;
            }

            if (report) {
              // Get client mappings
              const options = {
                formatDates: true,
                joinArraysToString: true,
              };
              CatalogueOverwritingData.get(client, options, (err, mappingData) => {
                if (report.fields.map((field) => field.field).includes('workIsrcs')) {
                  mappingData = getWorkIsrcs(mappingData);
                }
                cb(err, filter, template, mappingData);
              });
            } else {
              cb(null, filter, template, null);
            }
          })
          .catch((err) => {
            logger.error(err);
            // Bongo refactor: I'm just going to cb with the error here seems like the error case
            // was not being handled properly before
            cb(err);
          });
      },
      function (filter, template, mappingData, cb) {
        // Get Data
        collectData.getDataBatch(bigQuery, bigQuery.outputTable, filter, template, {
          catalogueCatNo: 1, catalogueIsrc: 1, source: 1,
        }, client.suppressZeroValueInExport, null, mappingData, cb);
      },
      function (data, cb) {
        // Sort data into object
        const dataObject = {};
        data.forEach((line) => {
          // Check contract name exists on object - contract name will always be the first item in any sales data
          dataObject[line[0]] = dataObject[line[0]] || [];
          // Add line to contract name
          dataObject[line[0]].push(line);
        });
        cb(null, dataObject);
      },
      function (data, cb) {
        // Init completedItemsUpdater
        const completedItemsUpdater = new CompletedItemsUpdater({
          periodId: period._id,
          fieldToIncrease: 'completedCatalogueItems',
        });
        const statementConcurrencyCount = client.concurrentStatementCreations || 1; // Default to 1 when not set
        // Loop through statements
        async.eachLimit(batch, statementConcurrencyCount, (statement, statementCb) => {
          // Create files for each statement
          CreateFiles.create(statement, db, bigQuery, client, period, data, (createErr) => {
            // Increase completedCatalogueItems count
            completedItemsUpdater.increaseCount(1);
            statementCb(createErr);
          });
        }, (eachErr) => {
          // Stop completedItemsUpdater
          completedItemsUpdater.stop();
          cb(eachErr);
        });
      },
    ], callback);
  },
};

module.exports = PeriodStatementCreationBatch;
