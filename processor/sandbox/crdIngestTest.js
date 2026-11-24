require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');
const Client = require('../models/client');

// csv file test: 5f60d5ba5800fd18f811b6b2
// CRD FILE test: 5f60b12b2dcda83428a3165a
// 5f58b8c896e13f35af934778
// CRD file with dummy RPI and WER: 5f6392ff905c44daddbfaf41
// Staging: 5f5896f43dcf5730d7954c4c

SalesFile.findById('5f6392ff905c44daddbfaf41', (err, salesFile) => {
  Client.findById(salesFile.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup big query
      const bigQuery = new BigQuery({
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      });
      // const options = { joinArraysToString: true };
      // client.catalogueOverwritingData(options, function(err, data) {
      // console.log(data);
      // });
      /* SalesFileController.ingest(salesFile, function(err) {
      //console.log(err);
      console.log("Done");
      process.exit(-1);
      }); */
      // salesFile.runRevalidation(function(err) {
      // console.log(err);
      // console.log("Done");
      // process.exit(-1);
      // });

      const ingestSalesFile = require('../libs/salesIngestion/ingestSalesFile');
      async.waterfall([
        function (cb) {
          ingestSalesFile.ingestionProcessData(salesFile, false, false, cb);
        },
        function (data, cb) {
          // Call ingestion script
          data.db = db;
          data.bigQuery = bigQuery;
          ingestSalesFile.ingest(data, cb);
        },
        function (data, cb) {
          logger.info(data);
          logger.info('Done');
          process.exit(-1);
        },
      ]);
    });
  });
});
