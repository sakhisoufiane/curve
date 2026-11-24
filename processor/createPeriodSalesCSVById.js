require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const AllSalesCsv = require('./libs/calculation/period/allSalesCsv');

const periodId = process.argv[2] || '60770fe43d0226540362cc9e';
const email = process.argv[3] || 'dite@curveroyaltysystems.com';

async function main() {
  logger.info(`periodId:${periodId}`);
  logger.info(`email:${email}`);
  console.time('createSalesCsv');
  try {
    await AllSalesCsv.create(periodId, email);
    logger.info('success');
  } catch (err) {
    logger.error(err);
  } finally {
    console.time('createSalesCsv');
    process.exit();
  }
}

main();
