require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5e5e7e7bbdb09339fe86b70d', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    console.time('Running');
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.waterfall([
        function (cb) {
          // Set Catalogue Names to Output Data
          logger.info(`${period._id} Starting Flushing Catalogue Data to Output`);
          period.setContractDataToOutputSales(db, client, (err) => {
            logger.info(`${period._id} Completed Flushing Catalogue Data to Output`);
            if (err) {
              logger.error(`${period._id} Flushing Catalogue Data to Output Errored`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Flushing Catalogue Data to Output Errored' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Completed Flushing Catalogue Data to Output`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Getting Period Data' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
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
        function (cb) {
          // Create Period Files
          logger.info(`${period._id} Starting to Create Period Files`);
          period.createFiles(db, client, (err, result) => {
            if (err) {
              logger.error(`${period._id} Errored In Creating Period Files`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored In Creating Period Files' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Completed Creating Period Files`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statements' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          // Create statements
          logger.info(`${period._id} Starting to Create Statements`);
          period.createStatements(db, client, (err, result) => {
            logger.info(`${period._id} Completed Creating Statements`);
            if (err) {
              logger.error(`${period._id} Errored in Creating Statements`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Creating Statements' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Created Statements`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Setting Statement Data' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info(`${period._id} Starting to Get Statement Data`);
          period.getStatementData(db, client, (err, result) => {
            if (err) {
              logger.error(`${period._id} Errored in Getting Statement Data`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting Statement Data' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Received Statement Data`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files', completedCatalogueItems: 0 } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info(`${period._id} Starting to Create Transactions`);
          period.createTransactions(db, client, (err, result) => {
            if (err) {
              logger.error(`${period._id} Errored in Creating Transactions`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Creating Transactions' } }).exec(() => {
                cb(err);
              });
            } else {
              cb();
            }
          });
        },
        function (cb) {
          logger.info(`${period._id} Starting to Set Summary Statement Values`);
          period.setSummaryStatementHeadlineAndAnalysis(db, client, (err, result) => {
            if (err) {
              logger.error(`${period._id} Errored in Creating Transactions`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Summary Statement Values' } }).exec(() => {
                cb(err);
              });
            } else {
              cb();
            }
          });
        },
        function (cb) {
          logger.info(`${period._id} Starting to Create Statement Files`);
          period.createStatementFiles(db, client, (err, result) => {
            if (err) {
              logger.error(`${period._id} Creating Statement Files Errored`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } }).exec(() => {
                cb(err);
              });
            } else {
              logger.info(`${period._id} Sucessfully Created Statement Files`);
              Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } }).exec((err) => {
                cb(err);
              });
            }
          });
        },
        function (cb) {
          logger.info(`${period._id} Updating Sales Files Statuses`);
          period.setSalesFileStatuses((err) => {
            cb();
          });
        },
      ], (err) => {
        db.close();
        if (err) {
          logger.error(`${period._id} Period Processing Errored`);
          logger.error(err);
          Period.findByIdAndUpdate(period._id, { $set: { calculationError: err, status: 'Errored' } }).exec(() => {
            logger.info('Complete');
          });
        } else {
          logger.info(`${period._id} Period Processing Complete`);
          Period.findByIdAndUpdate(period._id, { $set: { processEndTime: new Date(), status: 'Complete' } }).exec(() => {
            logger.info('Complete');
          });
        }
      });
    });
  });
});
