/* eslint-disable max-len, no-unused-vars */
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');
const Contract = require('../models/contract');
const Client = require('../models/client');
const Period = require('../models/period');
const config = require('../config.json');
const CreateStatementFiles = require('../libs/calculation/statement/createFiles');
const { processFile } = require('../libs/salesIngestion/ingestSalesFile');
const StatementController = require('../libs/calculation/statementController');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Statement.findById('65e1e4fdd90e0bf9457e3efa', (err, statement) => {
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
      // statement.profitShareFigures(results.period, function() {
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(results.client));
      // let template = config.exportTemplates.statementSales;
      // let template = config.exportTemplates.statementPublishing;
      // let filter = { periodId: statement.periodId, contractId: statement.contractId, royaltyRate: { "$ne": 0 } };
      // let collectData = require('../libs/writeCsv/collectData');
      // Get Data
      // collectData.getData(bigQuery, bigQuery.outputTable, filter, template, { catalogueCatNo: 1, catalogueIsrc: 1, source: 1 }, results.client.suppressZeroValueInExport, null, function(err, salesData) {
      // console.log("Sales Data:", salesData.length);
      // StatementController.getStatementData(statement, results.period, results.client, db, bigQuery, (err, salesData) => {
        CreateStatementFiles.create(statement, db, bigQuery, results.client, results.period, null, (err, output) => {
          console.error(err);
          console.log('Complete');
          process.exit(-1);
        });
      // });
    });
  });
});
