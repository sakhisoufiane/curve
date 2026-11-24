/* eslint-disable max-len, no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('60125d5451ef1a0040649098', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    console.time('Running');
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup BigQuery connection
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      period.runBatches((err) => {
        logger.error(err);
        logger.info('Complete');
      });
    });
  });
});
