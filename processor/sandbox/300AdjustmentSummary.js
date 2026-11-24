require('../models/db');
const Client = require('../models/client');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuite = require('../libs/accounting/netsuite');
const ObjectId = require('mongodb').ObjectId;
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

AccountingPeriod.findById('619ced3e887137002c3a7065', (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    const bigQueryOpts = databaseUtils.getBigQueryOpts(client)
    bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
    const bigQuery = new BigQuery(bigQueryOpts);
    netsuite.createAdjustmentsSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
      console.log(err);
      AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { adjustmentSummaryCsv: s3Key } }).exec((err) => {
        console.log('Complete');
      });
    });
  });
});