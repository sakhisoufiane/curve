const async = require('async');
const BigQuery = require('../libs/bigQuery');
const logger = require('../libs/logger');
const testUtils = require('../libs/testUtils');

const { datasetName } = testUtils.bigQueryParams();

const bigQuery = new BigQuery({ datasetName });

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

module.exports = async () => {
  logger.debug('Running Jest global teardown..');
  await deleteBigQueryTables();
};
