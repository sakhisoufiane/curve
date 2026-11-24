require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Contract = require('../models/contract');
const Client = require('../models/client');
const Period = require('../models/period');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Statement.findById('5fb3c1bf90ec1649efb945fc', (err, statement) => {
    async.parallel({
      client(cb) {
        Client.findById(statement.clientId, cb);
      },
      period(cb) {
        Period.findById(statement.periodId, cb);
      },
      contract(cb) {
        Contract.findById(statement.contractId, cb);
      },
    }, (cb, results) => {
      statement.setTaxBasis(results.period, results.client, (err, result) => {
        logger.error(err);
        logger.info(result);
        process.exit(-1);
      });
    });
  });
});
