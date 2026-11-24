require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('6184e626a71ba8243f1d474d', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      period.createUnreportedCostsCsv(db, client, (err) => {
        console.log(err);
        console.log('Complete')
      });
    });
  });
});