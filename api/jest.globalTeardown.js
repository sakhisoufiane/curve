const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

const logKey = 'Jest Tests';

module.exports = async () => {
  logger.info(`${logKey} | Running global teardown..`);
  if (global.__MONGOD__) {
    logger.info(`${logKey} | Waiting for pending operations to complete before stopping in-memory MongoDB instance`);
    // wait for any pending operations to complete before tearing down the database
    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
    logger.info(`${logKey} | Stopping in-memory MongoDB instance`);
    await global.__MONGOD__.stop();
  }
  // Empty the tmp directory
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);
  logger.info(`${logKey} | Global teardown complete`);
};
