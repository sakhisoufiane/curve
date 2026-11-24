const { logger, BigQuery, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { AccountingPeriod: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const modelHistory = require('../libs/modelHistory');
const Client = require('./client');
const Task = require('./task');

const accountingPeriodSchema = schema;

accountingPeriodSchema.plugin(modelHistory, { mongoose, name: 'accountingPeriodPatches' });
accountingPeriodSchema.plugin(mongoosePaginate);

accountingPeriodSchema.post('init', (accountingPeriod) => {
  if (accountingPeriod.outputZip) {
    fileManager.publicS3Link(accountingPeriod.outputZip, (err, publicLink) => {
      accountingPeriod.outputZipPublicLink = publicLink;
    });
  }
  if (accountingPeriod.allCalculatedSalesCsv) {
    fileManager.publicS3Link(accountingPeriod.allCalculatedSalesCsv, (err, publicLink) => {
      accountingPeriod.allCalculatedSalesCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.allAdjustmentsCsv) {
    fileManager.publicS3Link(accountingPeriod.allAdjustmentsCsv, (err, publicLink) => {
      accountingPeriod.allAdjustmentsCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.unreportedSalesCsv) {
    fileManager.publicS3Link(accountingPeriod.unreportedSalesCsv, (err, publicLink) => {
      accountingPeriod.unreportedSalesCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.mappingsCsv) {
    fileManager.publicS3Link(accountingPeriod.mappingsCsv, (err, publicLink) => {
      accountingPeriod.mappingsCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.reportCsv) {
    fileManager.publicS3Link(accountingPeriod.reportCsv, (err, publicLink) => {
      accountingPeriod.reportCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.suspenseSummaryCsv) {
    fileManager.publicS3Link(accountingPeriod.suspenseSummaryCsv, (err, publicLink) => {
      accountingPeriod.suspenseSummaryCsvPublicLink = publicLink;
    });
  }
  if (accountingPeriod.adjustmentSummaryCsv) {
    fileManager.publicS3Link(accountingPeriod.adjustmentSummaryCsv, (err, publicLink) => {
      accountingPeriod.adjustmentSummaryCsvPublicLink = publicLink;
    });
  }
});

accountingPeriodSchema.pre('save', function (next) {
  const accountingPeriod = this;
  // Set partition no on first creation
  if (accountingPeriod.isNew) {
    this.setPartitionNo();
  }
  AccountingPeriod.findOne({ _id: { $ne: accountingPeriod._id }, clientId: accountingPeriod.clientId, locked: true }, 'accountingDate', { sort: { endDate: -1 }, limit: 1 })
    .then((previousPeriod) => {
      if (previousPeriod && accountingPeriod.accountingDate < previousPeriod.accountingDate) {
        next(new Error(`Accounting Period's accounting date should be after the last Accounting Period's accounting date (${moment(previousPeriod.endDate).format('MMMM Do YYYY')}).`));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(`Error finding previous accounting period: ${err}`);
      next();
    });
});

accountingPeriodSchema.methods.setPartitionNo = function () {
  // PartitionNo is set to number of months after Jan 2020
  const today = new Date();
  // Get year today and minus from 2020 to get no of years since 2020
  const yearDifference = today.getFullYear() - 2020;
  // Get today's month - this is 0 indexed
  const month = today.getMonth();
  // Add the two together using the 12 * years for each year that's passed
  this.partitionNo = (12 * yearDifference) + month;
};

accountingPeriodSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  this.clearPeriod(next);
});

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

accountingPeriodSchema.methods.calculate = function (callback) {
  const accountingPeriod = this;
  Client.findById(accountingPeriod.clientId, 'name')
    .then((client) => {
      Task.countDocuments({
        name: 'Process Accounting Period', clientId: accountingPeriod.clientId, status: { $in: ['Pending', 'In Progress'] }, 'value.accountingPeriodId': accountingPeriod._id.toString(),
      })
        .then((count) => {
          if (!count) {
            accountingPeriod.status = 'Processing';
            accountingPeriod.save()
              .then(() => {
                TaskHelpers.createTaskAndSendMessage(Task, {
                  name: 'Process Accounting Period', clientId: accountingPeriod.clientId, clientName: client.name, value: { accountingPeriodId: accountingPeriod._id.toString() },
                })
                  .then(() => {
                    callback();
                  })
                  .catch((err) => {
                    logger.error(`Error saving task in accountingPeriod.calculate: ${err}`);
                    callback(err);
                  });
              })
              .catch((err) => {
                logger.error(`Error saving accountingPeriod in accountingPeriod.calculate: ${err}`);
                callback(err);
              });
          } else {
            logger.info('Task already exists and is waiting to complete');
            callback(new Error('This task is already running - please wait until it has completed before running again'));
          }
        })
        .catch((err) => {
          logger.error(`Error counting Tasks in accountingPeriod.calculate with clientId '${accountingPeriod.clientId}': ${err}`);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(`Error finding client with clientId in accountingPeriod.calculate'${accountingPeriod.clientId}': ${err}`);
      callback(err);
    });
};

accountingPeriodSchema.methods.clearPeriod = function (callback) {
  const Contract = require('./contract');
  const accountingPeriod = this;
  logger.info(`${accountingPeriod._id.toString()} Clearing Accounting Period`);
  async.waterfall([
    function (cb) {
      // Remove files
      logger.info(`${accountingPeriod._id.toString()} Deleting Period Files`);
      accountingPeriod.deleteFiles((err) => {
        cb(err);
      });
    },
    function (cb) {
      // Delete sales data in DB
      logger.info(`${accountingPeriod._id.toString()} Clearing Accounting Period Sales Data`);
      Client.findById(accountingPeriod.clientId)
        .then((client) => {
          // Set up BigQuery
          const bigQuery = new BigQuery({
            datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, accountingTable: client.bigQueryAccountingPeriodSales, costsTable: client.bigQueryPeriodCosts,
          });
          // Call delete on DB table
          bigQuery.deleteData(bigQuery.accountingTable, { accountingPeriodId: accountingPeriod._id.toString() }, cb);
        })
        .catch((err) => {
          logger.error(`Error finding client in accountingPeriod.clearPeriod with clientId '${accountingPeriod.clientId}': ${err}`);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else {
      callback();
    }
  });
};

const AccountingPeriod = mongoose.model(name, accountingPeriodSchema);

module.exports = AccountingPeriod;
