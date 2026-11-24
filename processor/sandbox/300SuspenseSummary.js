require('../models/db');
const Client = require('../models/client');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuite = require('../libs/accounting/netsuite');
const ObjectId = require('mongodb').ObjectId;
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

AccountingPeriod.findById('6166fbd7a625d8002471d192', (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    const bigQueryOpts = databaseUtils.getBigQueryOpts(client)
    bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
    const bigQuery = new BigQuery(bigQueryOpts);
    netsuite.createSuspenseSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
      AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { suspenseSummaryCsv: s3Key } }).exec((err) => {
        console.log('Complete');
      });
    });
  });
});