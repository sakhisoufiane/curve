require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Client = require('../models/client');

Statement.findById('5e9e0ec4ea91234e800903e3', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Client.findById(statement.clientId, (err, client) => {
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
        keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
      }, (err, mongoClient) => {
        const db = mongoClient.db(databaseUtils.getMongoDBName());
        // Setup big query
        // const bigQuery = new BigQuery({
        //   datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
        // });

        statement.calculate((err) => {
          logger.error(err);
          logger.info('Done');
          process.exit(-1);
        });
        // period.calculateSales(db, bigQuery, client, function(err) {
        // console.log(err);
        // console.log("Done");
        // process.exit(-1);
        // });
        // statement.createSalesCsv(bigQuery, client, function(err) {
        // console.log(err);
        // console.log("Done");
        // process.exit(-1);
        // });
        // statement.createFiles(db, bigQuery, client, period, function(err) {
        // console.log(err);
        // console.log("Done");
        // process.exit(-1);
        // });
      });
    });
  });
});
