const async = require('async');
const BigQuery = require('../libs/bigQuery');
const logger = require('../libs/logger');
const testUtils = require('../libs/testUtils');

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

module.exports = async () => {
  logger.debug('Running Jest global setup..');
  await createBigQueryTables();
};
