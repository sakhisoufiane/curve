require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Reports = require('./libs/reports');

const reportId = process.argv[2] || '5e9eeb0dd46c947604304d9c';
const email = process.argv[3] || 'dite@curveroyaltysystems.com';

logger.info(`reportId:${reportId}`);
logger.info(`email:${email}`);

async function main() {
  if (!reportId) {
    logger.error('No Report ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('createReport');
    await Reports.createReport({ reportId, email });
    console.timeEnd('createReport');
    process.exit();
  } catch (err) {
    logger.error('Error creating report:', err);
    process.exit(1);
  }
}

main();
