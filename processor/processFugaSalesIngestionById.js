require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fugaSalesIngestion = require('./libs/fuga/fugaSalesIngestion');
const Task = require('./models/task');

let busy = false;

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Task.findById(process.argv[2])
    .then((task) => {
      logger.info(task);
      if (task) {
        runFugaSalesFileIngestion(task);
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

async function runFugaSalesFileIngestion(task) {
  try {
    await fugaSalesIngestion.ingestFile({ message: task.value });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

function completeTask(taskId) {
  busy = false;
  // set progressStatus to null as progression is complete
  Task.findByIdAndUpdate(taskId, { $set: { progressStatus: null, status: 'Complete' } })
    .then((task) => {
      logger.info('Completed Task: ', task);
    })
    .catch((err) => {
      logger.error(err);
    });
}

function completeErrored(taskId, error) {
  busy = false;
  // leave progressStatus in the stae it was in when the error occured
  Task.findByIdAndUpdate(taskId, { $set: { status: 'Errored', error } })
    .then((task) => {
      logger.info('Completed Task: ', task);
    })
    .catch((err) => {
      logger.error(`Main error updating task '${taskId}': ${error}`);
      logger.error(err);
    });
}
