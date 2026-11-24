/* eslint-disable no-await-in-loop */
require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const Task = require('./models/task');
const SQS = require('./libs/sqs');

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Period.findById(process.argv[2])
    .then(async (period) => {
      if (!period) {
        logger.error(`No Period found with ID ${process.argv[2]}`);
        process.exit(-1);
      } else {
        for (let index = 0; index < (process.argv[3] || 1); index += 1) {
          const task = new Task({
            clientId: period.clientId, name: 'Batch Worker', status: 'Pending', value: { periodId: period._id.toString() },
          });
          await task.save();
          await new Promise((resolve) => {
            SQS.sendMessage(task, 2, () => {
              logger.info(`${period._id} Created Batch Worker`);
              resolve();
            });
          });
        }
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Period ID passed as an argument');
  process.exit(-1);
}
