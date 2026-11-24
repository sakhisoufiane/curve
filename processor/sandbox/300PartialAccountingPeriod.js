require('../models/db');
const async = require('async');
const Client = require('../models/client');
const AccountingPeriod = require('../models/accountingPeriod');
const netsuite = require('../libs/accounting/netsuite');
const ObjectId = require('mongodb').ObjectId;
const { BigQuery, databaseUtils, logger } = require('@curveroyaltysystems/platform-shared-utils');

AccountingPeriod.findById('61b8ddef6ceb65001ea37c76', (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    const bigQueryOpts = databaseUtils.getBigQueryOpts(client)
    bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
    const bigQuery = new BigQuery(bigQueryOpts);
    async.waterfall([
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Files');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Files`);
        netsuite.createFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, uniqueValues) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { uniqueValues } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Adjustment Files');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Adjustment`);
        netsuite.createAdjustmentFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allAdjustmentsCsv: s3Key } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Unreported Sales File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Unreported Sales File`);
        netsuite.createUnreportedSalesCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Unreported Sales File' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
              $set: {
                unreportedSalesCsv: s3Key, suspenseNetAmount: output.suspenseNetAmount, suspenseGrossAmount: output.suspenseGrossAmount, suspenseLines: output.suspenseLines,
              },
            }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Suspense Summary Files
        logger.info('Creating Accounting Period Unreported Sales File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Unreported Sales File`);
        netsuite.createSuspenseSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Unreported Sales File' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Unreported Sales File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { suspenseSummaryCsv: s3Key } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Suspense Summary Files
        logger.info('Creating Accounting Period Adjustment Summary');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Adjustment Summary`);
        netsuite.createAdjustmentsSummaryCsv(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, output) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Adjustment Summary`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Accounting Period Adjustment Summary' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Adjustment Summary`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { adjustmentSummaryCsv: s3Key } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Mappings File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Mappings File`);
        netsuite.createMappingsCsv(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Mappings File' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { mappingsCsv: s3Key } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Mappings File');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Mappings File`);
        netsuite.createOutputsCsv(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Mappings File' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Mappings File`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allCalculatedSalesCsv: s3Key } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
      function (cb) {
        // Create Zip of Files
        logger.info('Creating Zip of Files');
        logger.info(`${accountingPeriod._id} Starting to Create Zip of Files`);
        netsuite.createZipOfFiles(accountingPeriod, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Zip of Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Zip of Files' } }).exec(() => {
              cb(err);
            });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Zip of Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { outputZip: s3Key, separatedFiles: accountingPeriod.separatedFiles, calculationStatus: 'Complete' } }).exec((err) => {
              cb(err);
            });
          }
        });
      },
    ], (err) => {
      if (err) {
        logger.error(`${accountingPeriod._id} Accounting Period Processing Errored`);
        logger.error(err);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationError: err, status: 'Errored' } }).exec(() => {
          console.log('Done');
        });
      } else {
        logger.info(`${accountingPeriod._id} Accounting Period Processing Complete`);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { processEndTime: new Date(), status: 'Complete' } }).exec(() => {
          console.log('Done');
        });
      }
    });
  });
});