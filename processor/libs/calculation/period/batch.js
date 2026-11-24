const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const BatchTask = require('../../../models/batchTask');
const Client = require('../../../models/client');
const SQS = require('../../sqs');

const PeriodStatementCreationBatch = require('./periodStatementCreationBatch');
const CalculateSalesBatch = require('./calculateSalesBatch');
const CalculateMechanicalSalesBatch = require('./calculateMechanicalSalesBatch');

const Batch = {
  mainProcessRunBatches: (period, callback) => {
    // This process to run batches like a batch processor
    logger.info(`${period._id} Running Main Process`);
    Batch.runBatches(null, period, (err) => {
      if (err) {
        // Handle any calculation errors
        logger.error(`${period._id} mainProcessRunBatches Errored:`, err);
        callback(err);
      } else {
        // Check all other processes are complete
        Batch.checkBatchesComplete(period, callback);
      }
    });
  },
  checkBatchesComplete: (period, callback) => {
    logger.info(`${period._id} Checking For Complete Batches`);
    BatchTask.find({ periodId: period._id.toString(), status: { $in: ['Pending', 'In Progress'] } })
      .then((batches) => {
        if (batches?.length > 0) {
          logger.info(`${period._id} Batches still processing | Count: ${batches?.length} | BatchIds: ${batches.map((batch) => batch._id).join(', ')}`);
          // Batches are still processing, so it should wait two seconds, and then try function again
          setTimeout(() => {
            Batch.checkBatchesComplete(period, callback);
          }, 2000);
        } else {
          logger.info(`${period._id} Looking for errored batches`);
          BatchTask.find({ periodId: period._id.toString(), status: 'Errored' })
            .then((erroredBatches) => {
              if (erroredBatches?.length > 0) {
                const batchTaskIds = erroredBatches.map((task) => task._id.toString()).join(', ');
                return callback(new Error(`Batch Tasks have errored: ${batchTaskIds}`));
              }

              logger.info(`${period._id} All Batches Complete - No Errors`);
              callback();
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  runBatches: async (task, period, callback) => {
    // Find client
    Client.findById(period.clientId)
      .then(async (client) => {
        const pendingBatches = await BatchTask.countDocuments({ periodId: period._id.toString(), status: 'Pending' }).catch(logger.error);

        // Batch workers can take 1-20 mins to spin up on AWS Batch, so a period may complete before a worker runs.
        // The SQS queue is deleted on period completion, so bail early if there's nothing to process.
        if (!pendingBatches) {
          logger.info(`${period._id.toString()} | ${task?._id.toString() ?? 'Main Process'} No Batches Left to Process. Gracefully exiting...`);
          return callback();
        }

        // Find any batches that are not complete - limited to the number of concurrent calculations set against the client
        const batchTaskIds = await Batch.getSQSBatchIds({ task, periodId: period._id.toString(), QueueUrl: period.sqsBatchQueue, concurrentCalculations: client.concurrentCalculations });
        logger.info(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - ${batchTaskIds.length} SQS Batch tasks: ${batchTaskIds} | batch count ${batchTaskIds?.length}`);
        BatchTask.find({ periodId: period._id.toString(), status: 'Pending', _id: { $in: batchTaskIds } })
          .then((batches) => {
            if (batches?.length > 0) {
              logger.info(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - Running batches ${batches.map((batch) => batch._id).join(', ')}`);

              // Define where each batch is running
              const batchWorkerId = task?._id.toString() ?? 'Main Process';
              BatchTask.updateMany({ _id: { $in: batches.map((batch) => batch._id) } }, { $set: { status: 'In Progress', processId: process.pid, batchWorkerId } })
                .then(() => {
                  // Loop through each of the batches in parallel
                  async.each(batches, (batch, batchCb) => {
                    logger.info(`${period._id.toString()} ${batch._id.toString()} ${batch.name}`);
                    if (batch.name === 'Sales Batch Calculation') {
                      CalculateSalesBatch.calculateSalesBatch(period, batch, batchCb);
                    } else if (batch.name === 'Sales Individual Calculation') {
                      CalculateSalesBatch.calculateSalesContract(period, batch, batchCb);
                    } else if (batch.name === 'Statement Batch Creation') {
                      PeriodStatementCreationBatch.createStatementBatch(period, batch, batchCb);
                    } else if (batch.name === 'Statement Individual Creation') {
                      PeriodStatementCreationBatch.createIndividualStatementBatch(period, batch, batchCb);
                    } else if (batch.name === 'Mechanical Sales Calculation') {
                      CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batch, batchCb);
                    } else {
                      logger.error(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - Unrecognised batch task name: ${batch.name}`);
                      batchCb();
                    }
                  }, (err) => {
                    if (err) {
                      callback(err);
                    } else {
                      logger.info(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - Batches completed - Running again..`);
                      // Rerun process after completion to check for any more batches to be calculated
                      Batch.runBatches(task, period, callback);
                    }
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            } else {
              BatchTask.countDocuments({ periodId: period._id.toString(), status: 'Pending' })
                .then((count) => {
                  if (count) {
                    logger.info(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - Running batches again..`);
                    return Batch.runBatches(task, period, callback);
                  }
                  // No batches to calculate
                  logger.info(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - No batches left. Exiting..`);
                  callback();
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            }
          })
          .catch((err) => {
            logger.error(`TASK ${task?.name ?? 'Main Process'} ${task?._id.toString() ?? 'Main Process'} | ${period._id.toString()} - Error finding batches:`, err);
            callback(err);
          });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getSQSBatchIds: async ({ periodId, QueueUrl, concurrentCalculations }) => {
    let batchTaskIds = [];

    // Get the batch IDs from SQS
    await async.timesSeries(concurrentCalculations, async () => {
      const message = await new Promise((resolve, reject) => { SQS.getMessage(QueueUrl, (err, message) => { if (err) { reject(err); } else { resolve(message); } }); });
      if (message?.batchTaskId) { batchTaskIds.push(message.batchTaskId); }
    });

    // If no messages are returned, check mongoDB for any tasks that haven't been picked up
    if (!batchTaskIds.length) {
      const batches = await BatchTask.find({ periodId, status: 'Pending' }).sort({ _id: 1 }).limit(concurrentCalculations).select('_id');
      batchTaskIds = batches.map((batch) => batch._id.toString());
    }

    return batchTaskIds;
  },
};

module.exports = Batch;
