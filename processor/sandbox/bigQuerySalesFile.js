require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');
const Client = require('../models/client');

['5d2899e5f4c22b2f563c9d7a', '5d289a920646192fa9d9643e', '5d81073a5b6e7b8a0d960d46', '5d81097f5b6e7b8a0d960d49', '5baa1157e8e29551f2bcb06e', '5d001a5a51dab8c28e7b8ac0'];

SalesFile.findById('5baa1157e8e29551f2bcb06e', (err, salesFile) => {
  Client.findById(salesFile.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup big query
      // const bigQuery = new BigQuery({
      //   datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      // });
      // const options = { joinArraysToString: true };
      // client.catalogueOverwritingData(options, function(err, data) {
      // console.log(data);
      // });
      SalesFileController.ingest(salesFile, (err) => {
        logger.error(err);
        logger.info('Done');
        process.exit(-1);
      });
      // salesFile.runRevalidation(function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });
    });
  });
});
