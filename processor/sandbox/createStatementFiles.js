/* eslint-disable max-len, no-unused-vars */
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Contract = require('../models/contract');
const Client = require('../models/client');
const Period = require('../models/period');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  Statement.findById('65e1e4fdd90e0bf9457e3efa', (err, statement) => {
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
    }, (cb, results) => {
      const bigQuery = new BigQuery({
        datasetName: results.client.bigQueryDataset, inputTable: results.client.bigQuerySalesTable, outputTable: results.client.bigQueryPeriodSales, costsTable: results.client.bigQueryPeriodCosts,
      });
      statement.createFiles(results.db, bigQuery, results.client, results.period, null, (filesErr) => {
        if (filesErr) {
          logger.error('createFiles error', filesErr);
          process.exit(-1);
        } else {
          statement.createZipOfFiles((zipErr) => {
            if (zipErr) {
              logger.error('createZipOfFiles error', zipErr);
              process.exit(-1);
            } else {
              statement.save(() => {
                logger.error(zipErr);
                logger.info('Complete');
                process.exit(-1);
              });
            }
          });
        }
      });
    });
  });
});
