require('dotenv').config();
require('../models/db');
const Client = require('../models/client');
const BigQuery = require('../libs/bigQuery');

Client.findOne({ name: 'Disney Music Group' }, (err, client) => {
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });
  bigQuery.createTable(client.bigQueryAccountingPeriodSales, bigQuery.outputAccountingSchema, 'partitionNo', (err) => {
    console.log(err);
  });
});
