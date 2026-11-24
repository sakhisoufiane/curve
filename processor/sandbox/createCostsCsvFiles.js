require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Client = require('../models/client');
const Period = require('../models/period');

const id = '5d76b9ffd7d26d707602772d';

Period.findById(id, (err, period) => {
  async.parallel({
    client(cb) {
      Client.findById(period.clientId, cb);
    },
    db(cb) {
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
        const db = mongoClient.db(databaseUtils.getMongoDBName());
        cb(err, db);
      });
    },
  }, (cb, results) => {
    Statement.find({ periodId: id }, (err, statements) => {
      async.eachSeries(statements, (statement, statementCb) => {
        statement.createCostsCsv(results.db, results.client, (err, result) => {
          statement.createZipOfFiles(() => {
            statementCb();
          });
        });
      }, (err) => {
        logger.error(err);
        logger.info('Complete');
        process.exit(-1);
      });
    });
  });
});
