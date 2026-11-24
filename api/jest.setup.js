const { randomString } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const console = require('console');

// Prevent Jest from grouping logging
global.console = console;

const useDb = !process.env.BYPASS_TEST_DB;
const logKey = 'Jest Tests';

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  setSubstitutionWrappers: jest.fn(),
  send: jest.fn((msg, callback) => {
    if (callback) callback(null, {});
    return Promise.resolve([{}, {}]);
  }),
}));

beforeAll(async () => {
  const { testPath } = expect.getState();
  logger.info(`${logKey} | Running test: ${testPath}`);
  if (useDb) {
    const databaseUri = process.env.JEST_MONGO_URI;
    if (!databaseUri) {
      throw new Error('JEST_MONGO_URI environment variable is not set');
    }
    const databaseName = randomString();
    const uri = databaseUri + databaseName;
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  if (useDb) {
    await mongoose.disconnect();
  }
});
