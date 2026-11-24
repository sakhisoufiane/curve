const { BigQuery, fileManager, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { AccountingPeriod: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const async = require('async');
const Client = require('./client');
const xeroLedger = require('../libs/accounting/xeroLedger');
const netSuite = require('../libs/accounting/netsuite');
const netSuiteCogs = require('../libs/accounting/netsuiteCogs');

const accountingPeriodSchema = schema;

accountingPeriodSchema.plugin(mongoosePaginate);

accountingPeriodSchema.methods.calculate = function (callback) {
  const accountingPeriod = this;
  accountingPeriod.runNo += 1;
  Client.findById(accountingPeriod.clientId)
    .then((client) => {
      // Setup BigQuery connection
      const bigQueryOpts = databaseUtils.getBigQueryOpts(client);
      bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
      const bigQuery = new BigQuery(bigQueryOpts);
      if (client.accountingSystem === 'Xero - Ledger') {
        xeroLedger.calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback);
      } else if (client.accountingSystem === 'Netsuite' && accountingPeriod.outputType === 'COGS') {
        netSuiteCogs.calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback);
      } else if (client.accountingSystem === 'Netsuite') {
        netSuite.calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback);
      } else {
        callback(new Error(`${accountingPeriod._id} - No Accounting System configured.`));
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

accountingPeriodSchema.methods.clearPeriod = function (bigQuery, client, callback) {
  const accountingPeriod = this;
  async.parallel([
    function (cb) {
      // Remove files
      accountingPeriod.deleteFiles(cb);
    },
    function (cb) {
      // Clear AccountingPeriod Values
      AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
        $set: {
          grossAmount: 0,
          netAmount: 0,
          lines: 0,
          adjustmentGrossAmount: 0,
          adjustmentNetAmount: 0,
          adjustmentLines: 0,
          suspenseGrossAmount: 0,
          suspenseNetAmount: 0,
          suspenseLines: 0,
          allCalculatedSalesCsv: null,
          allAdjustmentsCsv: null,
          suspenseCsv: null,
          analysis: {},
          uniqueValues: {},
          separatedFiles: [],
        },
      })
        .then((accountingPeriod) => {
          cb(null, accountingPeriod);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      // Remove data from output table
      bigQuery.deleteData(bigQuery.accountingTable, { accountingPeriodId: accountingPeriod._id.toString() }, cb);
    },
  ], callback);
};

accountingPeriodSchema.methods.deleteFiles = function (callback) {
  const accountingPeriod = this;
  async.parallel([
    function (cb) {
      if (accountingPeriod.allCalculatedSalesCsv) {
        fileManager.deleteFromS3(accountingPeriod.allCalculatedSalesCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (accountingPeriod.allAdjustmentsCsv) {
        fileManager.deleteFromS3(accountingPeriod.allAdjustmentsCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (accountingPeriod.unreportedSalesCsv) {
        fileManager.deleteFromS3(accountingPeriod.unreportedSalesCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (accountingPeriod.mappingsCsv) {
        fileManager.deleteFromS3(accountingPeriod.mappingsCsv, cb);
      } else {
        cb();
      }
    },
  ], callback);
};

let AccountingPeriod = mongoose.model(name, accountingPeriodSchema);

module.exports = AccountingPeriod;
