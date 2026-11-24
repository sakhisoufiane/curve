require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

const callback = function () {
  logger.info('Complete');
  process.exit(-1);
};

Period.findById('60770fe43d0226540362cc9e', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.waterfall([
        function (cb) {
          logger.info('Starting to Create Statement Files');
          period.createStatementFiles(db, client, (err, result) => {
            if (err) {
              logger.info('Creating Statement Files Errored');
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info('Sucessfully Created Statement Files');
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info('Updating Sales Files Statuses');
          period.setSalesFileStatuses((err) => {
            cb();
          });
        },
      ], (err) => {
        db.close();
        if (err) {
          logger.info('Period Processing Errored');
          Period.findByIdAndUpdate(period._id, { $set: { calculationError: err, status: 'Errored' } }).exec(callback);
        } else {
          logger.info('Period Processing Complete');
          Period.findByIdAndUpdate(period._id, { $set: { processEndTime: new Date(), status: 'Complete' } }).exec(callback);
        }
      });
    });
  });
});
