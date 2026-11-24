/* eslint-disable no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Period.findById('5dcd867de24cc320c380a125', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      period.createGeneralLedger(db, client, (err, key) => {
        if (err) {
          logger.error(err);
        } else {
          logger.info(key);
        }
        process.exit(-1);
      });
    });
  });
});
