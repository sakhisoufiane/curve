const async = require('async');
const BigQuery = require('./bigQuery');
const logger = require('./logger');
const testUtils = require('./testUtils');

const { datasetName } = testUtils.bigQueryParams();

const bigQuery = new BigQuery({ datasetName });
const bigQueryTables = {
  inputTable: testUtils.randomString(),
  outputTable: testUtils.randomString(),
  costsTable: testUtils.randomString(),
};
function createBigQueryTables() {
  return new Promise((resolve, reject) => {
    logger.debug(`Creating tables on dataset: ${datasetName}`);
    async.parallel([
      // Create Input Table
      (cb) => {
        bigQuery.createTable(bigQueryTables.inputTable, bigQuery.inputSchema, null, cb);
      },
      // Create Output Table
      (cb) => {
        bigQuery.createTable(bigQueryTables.outputTable, bigQuery.outputSchema, null, cb);
      },
      // Create Costs Table
      (cb) => {
        bigQuery.createTable(bigQueryTables.costsTable, bigQuery.costsSchema, null, cb);
      },
    ], () => {
      logger.debug('Tables created.');
      process.env.TEST_INPUT_TABLE = bigQueryTables.inputTable;
      process.env.TEST_OUTPUT_TABLE = bigQueryTables.outputTable;
      process.env.TEST_COSTS_TABLE = bigQueryTables.costsTable;
      resolve();
    });
  });
}

function deleteBigQueryTables() {
  return new Promise((resolve, reject) => {
    logger.debug(`Deleting tables from dataset: ${datasetName}`);
    async.parallel([
      // Delete Input Table
      (cb) => {
        bigQuery.deleteTable(process.env.TEST_INPUT_TABLE, cb);
      },
      // Delete Output Table
      (cb) => {
        bigQuery.deleteTable(process.env.TEST_OUTPUT_TABLE, cb);
      },
      // Delete Costs Table
      (cb) => {
        bigQuery.deleteTable(process.env.TEST_COSTS_TABLE, cb);
      },
    ], () => {
      logger.debug('Tables deleted');
      process.env.TEST_INPUT_TABLE = null;
      process.env.TEST_OUTPUT_TABLE = null;
      process.env.TEST_COSTS_TABLE = null;
      resolve();
    });
  });
}

module.exports = {
  mochaGlobalSetup: async () => {
    logger.debug('Running mocha global setup..');
    await createBigQueryTables();
  },
  mochaGlobalTeardown: async () => {
    logger.debug('Running mocha global teardown..');
    await deleteBigQueryTables();
  },
};
