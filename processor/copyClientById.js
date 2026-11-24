require('dotenv').config();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const CopyClient = require('./libs/support/copyClient');

const email = 'arjun@curveroyaltysystems.com';
const includeSales = false;
const includeTables = true;
const includeArchived = false;
const includePeriodAndStatementFiles = false;
const taskId = null;

// NOTE WHEN RUNNING LOCALLY PLEASE USE APLLICATION BQ ACCOUNT NOT DEVELOPER OR THE APPLICATION TOOL WILL NOT BE ABE TO DELETE THE DATASET
if (process.argv[2]) {
  const clientId = process.argv[2];
  const options = { includeSales, includeTables, includeArchived, includePeriodAndStatementFiles };

  CopyClient.run({ taskId, email, clientId, options }).then(() => {
    logger.debug(`${clientId} copied to staging`);
    process.exit(0);
  }).catch((err) => {
    logger.error(err);
    process.exit(1);
  });
} else {
  logger.error('No Client ID passed as an argument');
  process.exit(0);
}
