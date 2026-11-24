require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

// 5b4cac678485ae45349e3abd
Period.findById('6267fa1ac5addf001df40f80', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      period.createMechanicalUnreportedSalesCsv(bigQuery, client, (err, result) => {
        logger.error(err);
        logger.info(result);
        process.exit(-1);
      });
    });
  });
});
