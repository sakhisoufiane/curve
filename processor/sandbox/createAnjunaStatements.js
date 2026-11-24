require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
  keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
}, (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Period.findById('5e84d96c40e0300b542c7f06', (err, period) => {
    Client.findById(period.clientId, (err, client) => {
      Statement.find({ periodId: period._id.toString() }).limit(1000).skip(1200).exec((err, statements) => {
        // Handle Errors
        if (err) {
          logger.error(err);
        } else {
          // Loop through statements concurrently
          async.eachLimit(statements, client.concurrentStatementCreations, (statement, cb) => {
            // Create files for each statement
            statement.createFiles(db, client, period, (err) => {
              // Increment count
              Period.findByIdAndUpdate(period._id, { $inc: { completedCatalogueItems: 1 } }, { timestamps: false }).exec(() => {
                cb(err);
              });
            });
          }, (err) => {
            if (err) {
              logger.error(err);
            }
            logger.info('Complete');
          });
        }
      });
    });
  });
});
