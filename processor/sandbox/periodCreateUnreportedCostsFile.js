require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5b18658081e65d2e96b342dc', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      period.createUnreportedCostsCsv(db, (err) => {
        logger.info('Complete');
      });
    });
  });
});
