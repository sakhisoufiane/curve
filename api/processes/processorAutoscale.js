require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Task = require('../models/task');
const Autoscale = require('../libs/autoscale');

function scaleUp() {
  logger.info('AUTOSCALER: Checking scale up');
  const date = new Date();
  date.setMinutes(date.getMinutes() - 2);

  Task.countDocuments({ status: 'Pending', createdAt: { $lt: date } })
    .then((count) => {
      logger.info('AUTOSCALER: Pending tasks:', count);
      if (count > 0) {
        Autoscale.addProcessor((err) => {
          logger.info('AUTOSCALER: Added processor');
        });
      }
    })
    .catch((err) => {
      logger.error('AUTOSCALER: Error counting tasks:', err);
    });
}

function scaleDown() {
  logger.info('AUTOSCALER: Checking scale down');

  Task.countDocuments({ status: { $in: ['Pending', 'In Progress'] } })
    .then((count) => {
      logger.info('AUTOSCALER: Current tasks:', count);
      if (count === 0) {
        Autoscale.getProcessorsCount((err, processors) => {
          if (processors !== 1) {
            Autoscale.resetProcessors((err) => {
              logger.info('AUTOSCALER: Reset Processors');
            });
          }
        });
      }
    })
    .catch((err) => {
      logger.error('AUTOSCALER: Error counting tasks:', err);
    });
}

// What is the point of this process? It seems outdated
// Do we need to export the scaleUp and scaleDown functions?
setInterval(scaleUp, 120000); // Every 2 mins
setInterval(scaleDown, 300000); // Every 5 mins

scaleUp();
scaleDown();
