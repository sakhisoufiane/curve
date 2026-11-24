require('../models/db');
const Client = require('../models/client');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuite = require('../libs/accounting/netsuite');
const ObjectId = require('mongodb').ObjectId;
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

AccountingPeriod.findById('61fc0ac7058481012c16f8fa', (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    const bigQueryOpts = databaseUtils.getBigQueryOpts(client)
    bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
    const bigQuery = new BigQuery(bigQueryOpts);
    netsuite.calculateAdjustmentSales(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
      console.log('Complete');
    });
  });
});