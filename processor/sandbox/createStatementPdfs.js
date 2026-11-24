require('../models/db');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Period.findById('6230ae6c16a2530458f75ff2', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      async.waterfall([
        function (cb) {
          logger.info('Starting to Create Statement Files');
          period.createStatementFiles(db, bigQuery, client, (err, result) => {
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
      ], (err) => {
        if (err) {
          logger.info('Period Processing Errored');
          period.status = 'Errored';
          period.calculationError = err;
        } else {
          logger.info('Period Processing Complete');
          period.status = 'Complete';
          // period.processEndTime = new Date();
        }
        db.close();
        period.save((err) => {
          process.exit(-1);
        });
      });
    });
  });
});
