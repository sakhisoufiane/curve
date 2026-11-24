/* eslint-disable max-len  */
require('../../../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

const SQS = require('../../../sqs');
const LogoFiles = require('../../../calculation/logoFiles');
const PeriodStatementCreation = require('../../../calculation/period/periodStatementCreation');

const Period = require('../../../../models/period');
const Client = require('../../../../models/client');
const BatchTask = require('../../../../models/batchTask');

const createStatements = async (period, client, db, bigQuery, callback) => {
  logger.info(`${period._id} Starting to Create Statement Files`);
  // Download logos first - only downloads once through the process instead of every time
  const updatedPeriod = await Period.findById(period._id).catch(logger.error);
  if (!updatedPeriod) { return callback(new Error('No Period Found')); }

  LogoFiles.downloadLogos(client, () => {
    PeriodStatementCreation.createStatementFiles(updatedPeriod, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${updatedPeriod._id} Creating Statement Files Errored`);
        Period.findByIdAndUpdate(updatedPeriod._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } })
          .then(() => {
            callback();
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        logger.info(`${updatedPeriod._id} Sucessfully Created Statement Files`);
        Period.findByIdAndUpdate(updatedPeriod._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } })
          .then(() => {
            callback();
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  });
};

const setPeriodStatus = (period, callback) => {
  Period.findByIdAndUpdate(period._id, {
    $set: {
      status: 'Processing', calculationStatus: 'Creating Statement Files', completedCatalogueItems: 0,
    },
  })
    .then(() => {
      callback();
    })
    .catch((err) => {
      callback(err);
    });
};

function clearBatchTask(period, callback) {
  BatchTask.deleteMany({ periodId: period._id.toString(), status: { $ne: 'Complete' } })
    .then(() => {
      callback();
    })
    .catch((err) => {
      callback(err);
    });
}

async function createSqsQueue(period) {
  const { QueueUrl } = await SQS.createQueue(period._id.toString());
  period.sqsBatchQueue = QueueUrl;
  await Period.findByIdAndUpdate(period._id, { $set: { sqsBatchQueue: QueueUrl } });
}

const completeProcess = async (mongoClient, modComparisonTime, calculationErr, period, callback) => {
  mongoClient.close();
  // Calculation Notes are stored in the calculation process but not present on the period object here so reload
  let currentCalculationNotes;
  const { calculationLog } = period;
  const recalculation = calculationLog[calculationLog.length - 1];
  Period.findById(period._id, 'calculationNotes')
    .then(async (foundCurrentCalculationNotes) => {
      // Only if we have succesfully reloaded the period can we set recalculation.calculationNotes
      currentCalculationNotes = foundCurrentCalculationNotes;
      recalculation.calculationNotes = currentCalculationNotes.calculationNotes;
    })
    .catch((err) => {
      logger.error(`${period._id} Error finding period in recreateStatements`);
      logger.error(err);
    })
    .finally(async () => {
      const processEndTime = new Date();
      const setQuery = { status: 'Complete', forceFull: false, recalculation: null, calculationError: null };
      recalculation.endTime = processEndTime;
      recalculation.runType = 'Recreate Statements Support Script';
      // Only if we have succesfully reloaded the period can we set recalculation.calculationNotes
      if (calculationErr) {
        recalculation.status = 'Errored';
        recalculation.calculationError = { message: calculationErr.message, stack: calculationErr.stack };
        // processEndTime set to the previous successful one on a fail. If left as null - next partial will run a client inception to date
        // So processEndTime effectively become process last succesful end time
        setQuery.processEndTime = modComparisonTime;
        setQuery.status = recalculation.status;
        setQuery.calculationError = recalculation.calculationError;
        logger.error(`${period._id} Period Processing Errored`);
        logger.error(calculationErr);
      } else {
        recalculation.status = 'Complete';
        logger.info(`${period._id} Period Processing Complete`);
      }
      setQuery.calculationLog = calculationLog;

      await SQS.deleteQueue(period.sqsBatchQueue).catch(logger.error);
      Period.findByIdAndUpdate(period._id, { $set: setQuery })
        .then((foundPeriod) => {
          callback(null, foundPeriod);
        })
        .catch((err) => {
          logger.error(`${period._id} Error updating period`);
          logger.error(err);
          callback(err);
        });
    });
};

const recreateStatements = (periodId, callback) => {
  let modComparisonTime;
  Period.findById(periodId)
    .then((period) => {
      modComparisonTime = period.processStartTime;
      Client.findById(period.clientId)
        .then((client) => {
          MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
            .then((mongoClient) => {
              const db = mongoClient.db(databaseUtils.getMongoDBName());
              // Setup BigQuery connection
              const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
              async.waterfall([
                (cb) => clearBatchTask(period, () => cb()),
                (cb) => setPeriodStatus(period, cb),
                (cb) => createSqsQueue(period).then(cb).catch(cb),
                (cb) => createStatements(period, client, db, bigQuery, cb),
              ], (waterfallErr) => completeProcess(mongoClient, modComparisonTime, waterfallErr, period, callback));
            })
            .catch((err) => {
              logger.error(`${period._id} Error connecting to database`);
              logger.error(err);
              return callback(err);
            });
        })
        .catch((err) => {
          logger.error(`${period.clientId} Error finding client`);
          logger.error(err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(`${periodId} Error finding period`);
      logger.error(err);
      callback(err);
    });
};

module.exports = { recreateStatements };
