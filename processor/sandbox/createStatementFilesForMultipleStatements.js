
/* eslint-disable max-len, no-unused-vars */
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Contract = require('../models/contract');
const Client = require('../models/client');
const Period = require('../models/period');

function runByStatementId(id, callback) {
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
    Statement.findById(id, (err, statement) => {
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
        statement.createFiles(results.db, bigQuery, results.client, results.period, null, (err) => {
          statement.createZipOfFiles(() => {
            statement.status = 'Pending';
            statement.save(() => {
              callback();
            });
          });
        });
      });
    });
  });

}

const ids = ['61e9ec5f1c5a9701615ad18b', '61eafd2cfcfd6102983ebab0', '61eafd68fcfd6102983ebb5d', '61eafd80c3fba0074305321b', '61eaffb6daa39903a12b97bd', '61eaffd7c3fba00743053c87', '61eaffeb49dd03013c388007', '61eb0009c3fba00743053db3', '61eb002149dd03013c388144', '61eb18bfdaa39903a12bd509', '61eb1bfcc3fba0074305ab01', '61eb1de3fcfd6102983f0d39', '61eb1dfefcfd6102983f0d8b', '61eb1f68daa39903a12be368', '61eb200549dd03013c392068', '61eb202cfcfd6102983f1178', '61eb2048fcfd6102983f11d3', '61eb228a49dd03013c392604', '61eb238449dd03013c3926c5', '61eb23a049dd03013c392702', '61eb23bffcfd6102983f16bd', '61eb251849dd03013c392999', '61eb269ec3fba0074305bf1d', '61eb271cc3fba0074305c012', '61f9a8389840000022f1a5ba', '61f9a9e29840000022f1ec3e'];

async.eachLimit(ids, 3, (id, cb) => {
  Statement.findOne({ periodId: '61f8826c531ff51bc039c6f4', contractId: id }, (err, statement) => {
    runByStatementId(statement._id.toString(), cb);
  });
}, (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Complete');
  }
})