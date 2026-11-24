require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5e7b03fd243b0337a3f465e2', (err, period) => {
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
          period.getData(db, (err, result) => {
            if (err) {
              logger.error(`${period._id} Errored In Getting Period Data`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored In Getting Period Data' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Completed Getting Period Data`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Period Files' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
      ], (err) => {
        console.log('Complete');
      });
    });
  });
});
