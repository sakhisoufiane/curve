const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger, testUtils, BigQueryTestUtils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

const bqTestUtils = new BigQueryTestUtils();

module.exports = async () => {
  logger.debug('Running Jest global setup..');
  testUtils.makeTmpDir(`${appRootDir}/tmp`);
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'jest-tests',
    },
  });

  logger.debug('Init containerised BigQuery to ensure container is downloaded before tests run');
  await bqTestUtils.init();

  process.env.JEST_MONGO_URI = mongoServer.getUri();
  process.env.APP_ROOT_DIR = appRootDir;
  global.__MONGOD__ = mongoServer;
  logger.debug('Jest global setup complete');
};
