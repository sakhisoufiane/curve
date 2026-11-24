require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Statement = require('../models/statement');
const Client = require('../models/client');

const ids = [
  '626da3fec2e92f0025f1c12f',
  '626da3fec2e92f0025f1c121',
  '626da3fec2e92f0025f1c122',
  '626da3fec2e92f0025f1c11c',
  '626da3fec2e92f0025f1c11d',
  '626da3fec2e92f0025f1c11e',
  '626da3fec2e92f0025f1c12c',
  '626da3fec2e92f0025f1c120',
  '626da3fec2e92f0025f1c123',
  '626da3fec2e92f0025f1c125',
  '626da3fec2e92f0025f1c12b',
  '626da3fec2e92f0025f1c126',
  '626da3fec2e92f0025f1c124',
  '626da3fec2e92f0025f1c11b',
  '626da3fec2e92f0025f1c11a',
  '626da3fec2e92f0025f1c12e',
  '626da3fec2e92f0025f1c12d'
];

const deleteStatementsFromClient = (statementIds) => {
  Statement.find({ _id: { $in: statementIds } }, (err, statements) => {
    if (err) {
      logger.error(err);
      process.exit(0);
    }

    Client.findById(statements[0].clientId, (err, client) => {
      if (err) {
        logger.error(err);
        process.exit(0);
      }
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      async.eachLimit(statements, 5, (statement, cb) => {
        // Remove lines from BigQuery
        const filter = { periodId: statement.periodId, contractId: statement.contractId };
        bigQuery.deleteData(bigQuery.outputTable, filter, (err) => {
          if (err) {
            return cb(err);
          }
          // Remove statement using remove to ensure pre-remove process called
          statement.deleteOne((err) => {
            if (err) {
              return cb(err);
            }
            cb();
          });
        });
      }, (eachLimitErr) => {
        if (eachLimitErr) {
          logger.error(eachLimitErr);
          process.exit(0);
        }
        logger.debug('Statements deletion complete');
        process.exit(0);
      });
    });
  });
};

deleteStatementsFromClient(ids);
