require('../models/db');
const async = require('async');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');
const Contract = require('../models/contract');

// let periodId = "5ec15df49e6f5e4efa9e144f";
const periodId = '5ea575a2daf69c4bd1642fa0';

Period.findById(periodId, (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    const bigQuery = new BigQuery({
      datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
    });
    async.waterfall([
      function (cb) {
        Statement.find({ periodId }, (err, statements) => {
          async.eachLimit(statements, 10, (statement, statementCb) => {
            Contract.findById(statement.contractId, (err, contract) => {
              statement.createPdf(bigQuery, client, period, contract, [], () => {
                statement.createTransactionPdf(client, period, contract, () => {
                  statement.createZipOfFiles(statementCb);
                });
              });
            });
          }, cb);
        });
      },
    ], (err) => {
      console.error(err);
      console.log('Complete');
    });
  });
});
