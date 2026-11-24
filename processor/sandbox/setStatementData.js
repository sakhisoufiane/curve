require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

const statementBatches = 500;

Period.findById('5e7b03fd243b0337a3f465e2', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      period.statementBatches((err, rounds) => {
      // Loop through batches
        async.eachSeries(rounds, (round, roundCb) => {
        // Find statements in batch
          Statement.find({ periodId: period._id.toString() }).limit(statementBatches).skip(round * statementBatches).exec((err, statements) => {
          // Handle Errors
            if (err) {
              roundCb(err);
            } else {
            // Run 5 statements concurrently
              async.eachLimit(statements, 5, (statement, cb) => {
              // Get data for each statemment
                if (!statement.grossAmount) {
                  statement.getData(db, client, period, cb);
                } else {
                  cb();
                }
              }, roundCb);
            }
          });
        }, (err) => {
          logger.error(err);
          logger.info('Complete');
        });
      });
    });
  });
});
