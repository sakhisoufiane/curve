require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

// 5b4cac678485ae45349e3abd
Period.findById('5bd61ff71348721450d07bfa', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      period.clearPeriod(db, client, (err, result) => {
        period.calculateSales(db, client, (err) => {
          logger.error(err);
          logger.info(result);
          process.exit(-1);
        });
      });
    });
  });
});
