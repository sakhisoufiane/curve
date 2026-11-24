require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Task = require('./models/task');
const SalesFile = require('./models/salesFile');
const Client = require('./models/client');

const SalesFileController = require('./libs/salesIngestion/salesFileController');
const Platform = require('./libs/platform');

let busy = false;

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Task.findById(process.argv[2])
    .then((task) => {
      logger.info(task);
      if (task) {
        salesFileIngest(task.id, task.value.salesFileId, task.curveUserId);
      } else {
        logger.error(`No Task found with ID ${process.argv[2]}`);
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Report ID passed as an argument');
  process.exit(-1);
}

function salesFileIngest(taskId, salesFileId, curveUserId) {
  SalesFile.findById(salesFileId, (err, salesFile) => {
    if (err) {
      logger.info(`Error Ingesting Sales File (findbyId): ${salesFileId}`);
      logger.error(err);
    }
    if (salesFile) {
      Client.findById(salesFile.clientId, (err, client) => {
        if (err) {
          logger.error(err);
          busy = false;
          return false;
        }
        if (client?.features?.platformSalesIngestion) {
          logger.info(`Ingesting Sales File on Platform: ${salesFileId}: ${salesFile}`);
          Platform.ingestSalesFile(salesFile, (err) => {
            if (err) {
              completeErrored(taskId, err);
            } else {
              completeTask(taskId);
            }
          });
        } else {
          logger.info(`Ingesting Sales File: ${salesFileId}: ${salesFile}`);
          SalesFileController.ingest(salesFile, curveUserId, (err) => {
            if (err) {
              completeErrored(taskId, err);
            } else {
              completeTask(taskId);
            }
          });
        }
      });
    } else {
      busy = false;
      logger.error(`No Sales File found with ID ${salesFileId}`);
    }
  });
}

function completeTask(taskId) {
  busy = false;
  // set progressStatus to null as progression is complete
  Task.findByIdAndUpdate(taskId, { $set: { progressStatus: null, status: 'Complete' } }, (err, task) => {
    logger.info('Completed Task: ', task);
  });
}

function completeErrored(taskId, error) {
  busy = false;
  // leave progressStatus in the stae it was in when the error occured
  Task.findByIdAndUpdate(taskId, { $set: { status: 'Errored', error } }, (err, task) => {
    // If the task update was unsuccesful ensure we write the main error
    if (err) {
      logger.error(error);
    }
    logger.info('Completed Task: ', task);
  });
}
