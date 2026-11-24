require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');
const Statement = require('../models/statement');

const statementIds = ['5b1421b3dbc77063419f0f7b', '5b1421b3dbc77063419f0f7c'];
Period.findById('5b0d2a8718eb8a5ceb103964', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.eachSeries(statementIds, (statementId, cb) => {
        Statement.findById(statementId, (err, statement) => {
          statement.createFiles(db, client, period, (err) => {
            cb();
          });
        });
      }, (err) => {
        logger.info('Done');
      });
    });
  });
});
