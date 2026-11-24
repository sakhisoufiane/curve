require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5d53d661b5c08042802f6cad', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      Statement.findById('5d548f44f7df48684592c038', (err, statement) => {
        statement.getData(db, client, period, (err, data) => {
          logger.error(err);
          logger.info(data);
        });
      });
    });
  });
});
