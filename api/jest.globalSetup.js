const { MongoMemoryServer } = require('mongodb-memory-server');
const { logger, testUtils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

process.env.NODE_ENV = 'test-jest';

const useDb = !process.env.BYPASS_TEST_DB;
const logKey = 'Jest Tests';

module.exports = async () => {
  logger.info(`${logKey} | Running global setup..`);
  testUtils.makeTmpDir(`${appRootDir}/tmp`);
  await testUtils.emptyTmpDir(`${appRootDir}/tmp`);

  if (useDb) {
    logger.info(`${logKey} | Setting up in-memory MongoDB instance for Jest tests`);
    const mongoServer = await MongoMemoryServer.create();
    process.env.JEST_MONGO_URI = mongoServer.getUri();
    global.__MONGOD__ = mongoServer;
  } else {
    logger.info(`${logKey} | Bypassing in-memory MongoDB instance for Jest tests`);
  }
  process.env.APP_ROOT_DIR = appRootDir;
  logger.info(`${logKey} | Global setup complete`);
};
