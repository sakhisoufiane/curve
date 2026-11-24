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
const collectData = require('../libs/writeCsv/collectData');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  // 5f828f0b41991d7210fd824f
  // 5f807cb8c050d8716bdef51e
  Statement.findById('60638d84ed3ad64df461d266', (err, statement) => {
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
      const bigQuery = new BigQuery({
        datasetName: results.client.bigQueryDataset, inputTable: results.client.bigQuerySalesTable, outputTable: results.client.bigQueryPeriodSales, costsTable: results.client.bigQueryPeriodCosts,
      });
      // let template = config.exportTemplates.statementSales;
      const template = config.exportTemplates.statementSales;
      const filter = { periodId: statement.periodId, contractId: statement.contractId, royaltyRate: { $ne: 0 } };
      // Get Data
      // collectData.getData(bigQuery, bigQuery.outputTable, filter, template, { catalogueCatNo: 1, catalogueIsrc: 1, source: 1 }, results.client.suppressZeroValueInExport, null, function(err, salesData) {
      // console.log("Sales Data:", salesData.length);
      // statement.createPdf(bigQuery, results.client, results.period, results.contract, salesData, function(err, result) {
      // results.contract.statementDesign = "Drag City";
      console.log(statement);
      statement.createCustomStatement(bigQuery, results.client, results.period, results.contract, null, (err, result) => {
        logger.error(err);
        logger.info(result);
        process.exit(-1);
      });
      // });
      // });
    });
  });
});
