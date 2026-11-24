require('../models/db');
const { MongoClient } = require('mongodb');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5e84d96c40e0300b542c7f06', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    console.time('Running');
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000000, connectTimeoutMS: 36000000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.waterfall([
        function (cb) {
          // Get Period Data
          logger.info(`${period._id} Starting to Get Period Data`);
          period.getAnalysisData(db, cb);
        },
      ], (err) => {
        logger.info('Complete');
      });
    });
  });
});
