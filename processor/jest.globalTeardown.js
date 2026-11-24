const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

module.exports = async () => {
  logger.debug('Running Jest global teardown..');
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
  // Empty the tmp directory
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);
  logger.debug('Jest global teardown complete');
};
