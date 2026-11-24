/* eslint-disable max-len */
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Client = require('../models/client');
const Period = require('../models/period');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Period.findById('5f8d8a0cd33339001c89fa0e', (err, period) => {
    async.parallel({
      client(cb) {
        Client.findById(period.clientId, cb);
      },
    }, (cb, results) => {
      const bigQuery = new BigQuery({
        datasetName: results.client.bigQueryDataset, inputTable: results.client.bigQuerySalesTable, outputTable: results.client.bigQueryPeriodSales, costsTable: results.client.bigQueryPeriodCosts,
      });
      period.createMcpsStatement(db, bigQuery, results.client, (err, res) => {
        logger.error(err);
        logger.info(res);
      });
    });
  });
});
