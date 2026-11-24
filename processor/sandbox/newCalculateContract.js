require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5d4208f19492c65c76fcb70b', (err, period) => {
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    Client.findById(period.clientId, (err, client) => {
      period.calculateSales(db, client, () => {
        logger.info('Complete');
        process.exit(-1);
      });
    });
  });
});
