require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Client = require('../models/client');

Client.find({ createdAt: { $gt: new Date(2020, 5, 1) } }, (err, clients) => {
  logger.info('Clients Found:', clients.length);
  async.eachSeries(clients, (client, cb) => {
    const bigQuery = new BigQuery({
      datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
    });
    bigQuery.updateSchema(bigQuery.costsTable, bigQuery.costsSchema, (err, res) => {
      if (err) {
        logger.error(err);
      } else {
        logger.info('Updated', client.name);
      }
      cb();
    });
  }, (err) => {
    logger.info('Complete');
  });
});
