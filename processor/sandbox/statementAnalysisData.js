/* eslint-disable max-len, no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Contract = require('../models/contract');
const Client = require('../models/client');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  /* Statement.findById("5f4b9529bd92623fa8175eb5", function(err, statement) {
    async.parallel({
      client: function(cb) {
        Client.findById(statement.clientId, cb);
      }
    }, function(cb, results) {
            const client = results.client;
            // Setup BigQuery connection
            let bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });

            statement.getAnalysisData(db, bigQuery, client, function(err, result) {
              logger.info(err);
              logger.info(result);
              process.exit(-1);
      });

    });
  }); */

  Period.findById('5e7479a1adb0db1d2247eb1c', (err, period) => {
    async.parallel({
      client(cb) {
        Client.findById(period.clientId, cb);
      },
    }, (cb, results) => {
      const { client } = results;
      // Setup BigQuery connection
      const bigQuery = new BigQuery({
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      });
      /* period.getStatementAnalysisData(db, bigQuery, client,  function(err, result) {
      logger.info(err);
      logger.info(result);
      process.exit(-1);
    }); */
      period.getAnalysisData(db, bigQuery, (err, result) => {
        logger.error(err);
        logger.info('result:', result);
        // logger.info("tracks:", result.net.tracks.slice(-200));
        // logger.info("releases:", result.net.releases.slice(-200));
        process.exit(-1);
      });
    });
  });
});
