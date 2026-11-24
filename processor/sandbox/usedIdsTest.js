require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Statement.findById('5ec6fb0011dc521509686bb9', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Client.findById(period.clientId, (err, client) => {
      console.time('Running');
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
        keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 36000000, connectTimeoutMS: 36000000,
      }, (err, mongoClient) => {
        const db = mongoClient.db(databaseUtils.getMongoDBName());
        period.getQueryMeta(db, client, (err, result) => {
          logger.info(result);
          logger.info('Includes:', result.trackIds.includes('TRACKID'));
        });
      });
    });
  });
});
