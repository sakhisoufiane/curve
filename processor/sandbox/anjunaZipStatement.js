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
          Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } }).exec(cb);
        },
      ], (err) => {
        db.close();
        if (err) {
          logger.error(`${period._id} Period Processing Errored`);
          logger.error(err);
          Period.findByIdAndUpdate(period._id, { $set: { calculationError: err, status: 'Errored' } }).exec();
        } else {
          logger.info(`${period._id} Period Processing Complete`);
          Period.findByIdAndUpdate(period._id, { $set: { processEndTime: new Date(), status: 'Complete' } }).exec();
        }
      });
    });
  });
});
