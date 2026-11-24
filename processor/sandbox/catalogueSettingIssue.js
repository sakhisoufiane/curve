require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Statement.findById('5d76d9468335e60e1bf7b17f', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Client.findById(statement.clientId, (err, client) => {
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
        const db = mongoClient.db(databaseUtils.getMongoDBName());
        period.setCatalogueData(db, client, (err, result) => {
          if (err) {
            logger.error(err);
          } else {
            logger.info(result);
          }
          process.exit(-1);
        });
      });
    });
  });
});
