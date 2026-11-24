require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const FugaPublishStatements = require('./libs/fuga/fugaPublishStatements');

const periodId = '68d4efe428a20cfe4dac5a36'; // QA Test - (Fuga) Publishing
const email = 'louis.bluhm@curveroyaltysystems.com';

async function main() {
  if (!periodId) {
    logger.error('No Period ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('publishStatements');
    await FugaPublishStatements.publishStatements({ periodId, email });
    console.timeEnd('publishStatements');
    process.exit();
  } catch (err) {
    logger.error('Error publishing FUGA statements:', err);
    process.exit(1);
  }
}

main();
