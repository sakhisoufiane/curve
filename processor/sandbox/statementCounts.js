require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');
const Statement = require('../models/statement');
const CalculateSales = require('../libs/calculation/period/calculateSales');
const CalculateContract = require('../libs/calculation/contract/calculateContract');
const PeriodStatementCreation = require('../libs/calculation/period/periodStatementCreation');

Period.findById('62fb788eef14ad2ce1c04469', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts(), (err, mongoClient) => {
      let generatePayments = false;
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup BigQuery connection
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      Statement.find({ periodId: period._id.toString() }, (err, statements) => {
        PeriodStatementCreation.statementSalesOutputCount(period, statements, bigQuery, (err, statementCounts) => {
          console.log(statementCounts);
        });
      });
    });
  });
});