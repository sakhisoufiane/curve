/* eslint-disable max-len */
require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../models/statement');
const Client = require('../models/client');
const CreateFiles = require('../libs/calculation/statement/createFiles');

// Replace this with the statement ID you want to test
const statementId = '68402d0f95d43b1ad335402f';

Statement.findById(statementId, (err, statement) => {
  if (err) {
    logger.error('Error finding statement:', err);
    process.exit(1);
  }

  logger.info('Found statement:', statement);

  Client.findById(statement.clientId, (err, client) => {
    if (err) {
      logger.error('Error finding client:', err);
      process.exit(1);
    }

    const bigQuery = new BigQuery({
      datasetName: client.bigQueryDataset,
      inputTable: client.bigQuerySalesTable,
      outputTable: client.bigQueryPeriodSales,
      costsTable: client.bigQueryPeriodCosts,
    });

    // Call createSalesCsv with all required parameters
    CreateFiles.createSalesCsv(statement, bigQuery, client, null, (err, result) => {
      if (err) {
        logger.error('Error creating sales CSV:', err);
        process.exit(1);
      }
      
      logger.info('Successfully created sales CSV:', result);
      process.exit(0);
    });
  });
});