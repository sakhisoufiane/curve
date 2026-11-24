require('dotenv').config();
require('../models/db');
const { MongoClient } = require('mongodb');
const Client = require('../models/client');
const Contract = require('../models/contract');
const lambda = require('../libs/lambda');

Client.findById('5d2d9f169d1f4f26150c6b6b', (err, client) => {
  if (err) {
    cb(err);
  } else {
    Contract.distinct('_id', { clientId: '5d2d9f169d1f4f26150c6b6b', contractType: 'Mechanical' }, (err, contractIds) => {
      MongoClient.connect(process.env.salesDatabaseUrl, { keepAlive: true, maxPoolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000, connectTimeoutMS: 3600000 }, (err, db) => {
        const data = {
          db,
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          costsDatabaseTable: 'costs',
          writeCostsDatabaseTable: client.periodCostsDatabaseTable,
          statementsDatabaseTable: 'statements',
          periodId: '5e766479381fd71d3ebedd33',
          contractIds: contractIds.map((contractId) => contractId.toString()),
        };
        // Request via lambda library
        lambda.clearPeriod(data, (err) => {
          cb(err);
        });
      });
    });
  }
});
