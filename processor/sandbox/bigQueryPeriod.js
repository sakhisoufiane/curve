require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5d289c6df4c22b2f563c9d7e', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup big query
      // const bigQuery = new BigQuery({
      //   datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      // });

      period.calculate((err) => {
        logger.error(err);
        logger.info('Done');
        process.exit(-1);
      });

      // period.createFiles(db, bigQuery, client, function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });
      // period.getAnalysisData(db, bigQuery, function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });
      // period.createStatementFiles(db, bigQuery, client, function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });
      // period.createUnreportedSalesCsv(bigQuery, client, function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });
    });
  });
});
