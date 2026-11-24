require('dotenv').config();
require('../../models/db');
const Client = require('../../models/client');
const BigQuery = require('../libs/bigQuery');

async function run() {
  Client.findById('59da4fa608ca3f61f2051385', (err, client) => {
    client.save(() => {
      const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts, accountingTable: client.bigQueryAccountingPeriodSales });
      bigQuery.createTable(client.bigQueryAccountingPeriodSales, bigQuery.accountingSchema, 'partitionNo', (err, res) => {
        console.log(err);
        console.log(res);
      });
    });

    // bigQuery.getData(bigQuery.inputTable, ['id'], 'true', { limit: 100 }, function(err, data) {
    // console.log(data);
    // });

    // console.time("Get Data");
    // bigQuery.getData(bigQuery.outputTable, ["periodId", "contractId", "salesLineId", "salesFileId", "catalogueTrackTitle", "releaseId", "catalogueFormat", "catalogueIdentifier"], 'true', { limit: 20000 }, function(err, data) {
    // console.timeEnd("Get Data");
    /// /console.log(err);
    // console.log(data.length);
    // });

    // bigQuery.updateSchema(bigQuery.inputTable, bigQuery.inputSchema, function(err, table) {
    // console.log(err);
    // console.log(table);
    // });

    // bigQuery.deleteData(bigQuery.inputTable, 'true', function(err, res) {
    // console.log(res);
    // });
  });
}

run();
