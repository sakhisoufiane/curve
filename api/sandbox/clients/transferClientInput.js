require('dotenv').config();
require('../models/db');
const { MongoClient } = require('mongodb');
const async = require('async');
const moment = require('moment');
const BigQuery = require('../libs/bigQuery');
const Client = require('../models/client');

Client.findById('59da4fa608ca3f61f2051385', (err, client) => {
  // Set up Big Query connection
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
  // Connect to Mongo
  MongoClient.connect(process.env.salesDatabaseUrl, { keepAlive: true, maxPoolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000 }, (err, db) => {
    const collection = db.collection(client.salesDatabaseTable);
    const limit = 100000;
    // Setup write file
    bigQuery.setupFile(() => {
      // Get total size
      collection.count({}, (err, total) => {
        const rounds = listFromNumber(Math.floor(total / limit));
        console.log(rounds);
        async.eachSeries(rounds, (batch, batchCb) => {
          console.log('Batch:', batch);
          // Find data
          collection.find({}).limit(limit).skip(batch * limit).toArray((err, data) => {
            console.log(data.length);
            // Map data to remove any unwanted values
            data = data.map((item) => {
              // Removal list - delete anything from it
              ['null', 'undefined', 'ignore', 'calculationContractIds', 'periodIds'].forEach((field) => {
                delete item[field];
              });
              // Set ID
              item.id = item._id;
              // Delete original ID
              delete item._id;
              // License No should be string
              if (item.licenseNo) { item.licenseNo = String(item.licenseNo); }
              // Set dates to SQL style dates
				      if (item.saleDate) { item.saleDate = moment(item.saleDate).format('YYYY-MM-DD'); }
				      if (item.transactionDate) { item.transactionDate = moment(item.transactionDate).format('YYYY-MM-DD'); }
				      // Return edited item
              return item;
            });
            // Write data to file
            bigQuery.writeToFile(data, () => {
              // Callback
              batchCb();
            });
          });
        }, (err) => {
          if (err) {
            // Handle Errors
            console.log(err);
          } else {
            // Write file to DB
            bigQuery.writeFileToDb(bigQuery.inputTable, (err, res) => {
              console.log(err);
              console.log('Complete');
            });
          }
        });
      });
    });
  });
});

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i++) { list.push(i); }
  return list;
}
