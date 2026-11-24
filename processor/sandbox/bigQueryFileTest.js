require('../models/db');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Client = require('../models/client');

Client.findById('59da4fa608ca3f61f2051385', (err, client) => {
  const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
  });
  bigQuery.setupFile(() => {
    async.parallel([
      function (cb) {
        setTimeout(() => {
          bigQuery.writeFileToDb(bigQuery.inputTable, () => {
            cb();
          });
        }, 1000);
      },
      function (cb) {
        bigQuery.writeFileToDb(bigQuery.inputTable, () => {
          cb();
        });
      },
    ], () => {
      console.log('Complete');
    });
  });
});
