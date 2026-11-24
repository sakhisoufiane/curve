require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5b38f116179d0a13b30d9e05', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.waterfall([
        function (cb) {
          period.deleteStatements(cb);
        },
        function (cb) {
          // Create statements
          logger.info('Starting to Create Statements');
          period.createStatements(db, client, (err, result) => {
            logger.info('Completed Creating Statements');
            if (err) {
              logger.info('Errored in Creating Statements');
              period.calculationStatus = 'Errored in Creating Statements';
              cb(err);
            } else {
              logger.info('Sucessfully Created Statements');
              period.calculationStatus = 'Setting Statement Data';
              period.save((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info('Starting to Get Statement Data');
          period.getStatementData(db, client, (err, result) => {
            if (err) {
              logger.info('Errored in Getting Statement Data');
              period.calculationStatus = 'Errored in Getting Statement Data';
              cb(err);
            } else {
              logger.info('Sucessfully Received Statement Data');
              period.calculationStatus = 'Creating Statement Files';
              period.save((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info('Starting to Create Transactions');
          period.createTransactions(db, client, (err, result) => {
            if (err) {
              logger.info('Errored in Getting Statement Data');
              period.calculationStatus = 'Errored in Getting Statement Data';
              cb(err);
            } else {
              cb();
            }
          });
        },
        function (cb) {
          logger.info('Starting to Create Statement Files');
          period.createStatementFiles(db, client, (err, result) => {
            if (err) {
              logger.info('Creating Statement Files Errored');
              period.calculationStatus = 'Creating Statement Files Errored';
              cb(err);
            } else {
              logger.info('Sucessfully Created Statement Files');
              period.calculationStatus = 'Creating Zip of All Statements';
              period.save((err) => {
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
        if (err) {
          logger.info('Period Processing Errored');
          period.status = 'Errored';
          period.calculationError = err;
        } else {
          logger.info('Period Processing Complete');
          period.status = 'Complete';
          period.processEndTime = new Date();
        }
        db.close();
        period.save((err) => {
          logger.error(err);
        });
      });
    });
  });
});
