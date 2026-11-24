/* eslint-disable max-len, no-unused-vars */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Client = require('../models/client');
const Period = require('../models/period');
const Contract = require('../models/contract');

const id1 = '5d0a1af9b28b1f52a637469e';
const id2 = '5d4b13749fd1c7294327e2d5';

Statement.find({ clientId: '5bc46730443a346b8ee8ceec', selfBillingInvoice: { $exists: true } }, (err, statements) => {
  logger.info('No of Statments:', statements.length);
  async.eachSeries(statements, (statement, cb) => {
    async.parallel({
      client(cb) {
        Client.findById(statement.clientId, cb);
      },
      period(cb) {
        Period.findById(statement.periodId, cb);
      },
      db(cb) {
        MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
          const db = mongoClient.db(databaseUtils.getMongoDBName());
          cb(err, db);
        });
      },
      contract(cb) {
        Contract.findById(statement.contractId, cb);
      },
    }, (err, results) => {
      // statement.createSalesCsv(results.db, results.client, function(err, result) {
      statement.createSelfBillingPdf(results.client, results.period, results.contract, (err, result) => {
        statement.createZipOfFiles(() => {
          cb();
        });
      });
    });
  }, (err) => {
    if (err) { logger.info(err); }
    process.exit(-1);
  });
});
