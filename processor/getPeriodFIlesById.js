const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const PeriodFiles = require('./libs/calculation/period/periodFiles');

require('./models/db');

const run = async () => {
  const periodId = '67b39bc03024ccca8258cd74';
  const email = 'arjun@curveroyaltysystems.com';
  const type = 'Unreported Sales';
  const excludedSalesFiles = [];

  await PeriodFiles.get({ periodId, type, excludedSalesFiles });
};

run().then(() => {
  logger.info('Finished');
  process.exit(0);
}).catch((err) => {
  logger.error(err);
  process.exit(1);
});
