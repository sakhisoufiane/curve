require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { run } = require('../libs/support/copyClient/index');

const test = async () => {
  logger.debug('Running Copy Client Test...');
  const clientId = '6846b3018bd763a36567c371'; // Replace with a valid client ID for testing
  await run({taskId: null, email: 'samual.holmes@curveroyaltysystems.com', clientId, options: {
    includeSales: false,
    includeTables: true,
    sourceEnvironment: 'staging',
    targetEnvironment: 'beta',
  }});
};
const runScript = async () => {
  await test().then(() => {
    logger.debug('Copy Client Test completed successfully.');
    process.exit(0);
  }).catch((error) => {
    logger.error('Copy Client Test failed:', error);
    process.exit(1);
  });
};

runScript();
