require('dotenv').config();
require('../models/db');
const async = require('async');
const SalesFile = require('../models/salesFile');
const Client = require('../models/client');
const BigQuery = require('../libs/bigQuery');

Client.find({ name: 'Connect Music Group' }, (err, clients) => {
  let count = 0;
  async.eachSeries(clients, (client, cb) => {
    count += 1;
    console.log(`${client.name}: ${count}/${clients.length}`);
    const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
    SalesFile.find({ clientId: client._id.toString() }, '_id', (err, salesFiles) => {
      const salesFileIds = salesFiles.map((salesFile) => salesFile._id.toString());
      bigQuery.deleteData(bigQuery.inputTable, { salesFileId: { $nin: salesFileIds } }, (err, res) => {
        console.log(res);
        cb();
      });
    });
  }, (err) => {
    console.error(err);
    console.log('Complete');
  });
});
