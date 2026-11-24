require('dotenv').config();
require('../models/db');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Task = require('../models/task');
const Platoon = require('../libs/platoon');

function runPlatoonGenerateFiles(task) {
  Period.findById(task.value.periodId, (err, period) => {
    if (err) { logger.error(err); }
    logger.info(`Platoon: Generating Files for Period: ${task.value.periodId}`);
    if (period) {
      Platoon.downloadSAPOutput(period, task.value.user, (err) => {
        if (err) {
          completeErrored(task._id.toString(), err);
        } else {
          completeTask(task._id.toString());
        }
      });
    } else {
      busy = false;
      logger.error(`No Period found with ID ${task.value.periodId}`);
    }
  });
}

const taskId = "659593d3d0ea558e552ee4c5";
Task.findById(taskId, (err, task) => {
  runPlatoonGenerateFiles(task);
});
