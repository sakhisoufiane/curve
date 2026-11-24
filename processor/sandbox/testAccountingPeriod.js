require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const AccountingPeriod = require('../models/accountingPeriod');
const Client = require('../models/client');
const xeroLedger = require('../libs/accounting/xeroLedger');
// 5ffcc17d7e639a01405bfdd4
// 60075ced540253590c68047b
// 601adb88ca69f33de9533bf0
// 601c6b4dba0e384f81755f0f
AccountingPeriod.findById('6096ffadd7ed5e001f5a9e35', (err, accountingPeriod) => {
  // Client.findById(accountingPeriod.clientId, function(err, client) {
  /// / Setup BigQuery connection
  // let bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts, accountingTable: client.bigQueryAccountingPeriodSales });
  // xeroLedger.createFiles(accountingPeriod, bigQuery, client, function(err, output) {
  // console.log(err);
  // console.log(output);
  // });
  // });
  accountingPeriod.calculate((err) => {
    logger.error(err);
    logger.debug('Complete');
  });
});
