require('../models/db');
const async = require('async');
const { BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const CalculateSales = require('../libs/calculation/period/calculateSales');
const Period = require('../models/period');
const Contract = require('../models/contract');
const Statement = require('../models/statement');
const Client = require('../models/client');

Statement.findById('63360dbd7dfdd32bcf7a326c', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Contract.findById(statement.contractId, (err, contract) => {
      Client.findById(statement.clientId, (err, client) => {
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        const mainQuery = {
          salesFileId: { $in: period.salesFilesIds },
          $or: [],
        };
        CalculateSales.breakDownLargeBatches(period, contract, 200000000, bigQuery, mainQuery, { runType: 'main' }, (err) => {
          
        });
      });
    });
  });
});