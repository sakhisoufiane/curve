require('../../models/db');
const SalesFile = require('../../models/salesFile');
const { ingestSalesFile } = require('../../libs/platform');
const { logger } = require('@curveroyaltysystems/logger');

const run = async () => {
  const salesFile = await SalesFile.findById(process.argv[2])
    .catch((error) => {
      console.error(`Error finding sales file with id '${process.argv[2]}'`, error);
    });

  const taskId = process.argv[3];
  const userId = 'internal';

  if (salesFile) {
    await ingestSalesFile(salesFile, taskId, userId);
  } else {
    console.debug('No sales file detected.');
  }
};

logger.runInContext({}, run)
  .then(() => {
    logger.info('Successful platform ingestion');
    process.exit();
  })
  .catch((e) => {
    logger.error('Error ingesting salesFile: ', e);
    process.exit(1);
  });
