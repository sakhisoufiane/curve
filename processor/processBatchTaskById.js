require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const BatchTask = require('./models/batchTask');

const BatchTaskSupportScripts = require('./libs/support/batchTaskSupportScripts');

const batchTaskId = process.argv[2] || '680f5bb1cf05a3cb2530c7c9';

logger.info(`Running ${batchTaskId}`);
BatchTaskSupportScripts.processBatchTaskById(batchTaskId).then(() => {
  logger.info('Batch Task Script Complete');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(0);
});
