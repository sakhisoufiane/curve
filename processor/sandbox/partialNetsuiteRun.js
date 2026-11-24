require('../models/db');
const { BigQuery, fileManager, logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const AccountingPeriod = require('../models/accountingPeriod');
const Client = require('../models/client');
const netsuite = require('../libs/accounting/netsuite');

const async = require('async');

const id = '60f700666b8a99001fd2386d';
AccountingPeriod.findById(id, (err, accountingPeriod) => {
  Client.findById(accountingPeriod.clientId, (err, client) => {
    // Setup BigQuery connection
    const bigQueryOpts = databaseUtils.getBigQueryOpts(client);
    bigQueryOpts.accountingTable = client.bigQueryAccountingPeriodSales;
    const bigQuery = new BigQuery(bigQueryOpts);
    async.waterfall([
      // function (cb) {
      //   // Update accountingPeriod to starting point
      //   AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
      //     $set: {
      //       processStartTime: new Date(), status: 'Processing', calculationStatus: 'Clearing Previous Data', runNo: accountingPeriod.runNo,
      //     },
      //   }).exec((err) => {
      //     cb(err);
      //   });
      // },
      // function (cb) {
      //   // Clear old data out and return periodIds to blank where required
      //   logger.info('Clearing old accountingPeriod data');
      //   accountingPeriod.clearPeriod(bigQuery, client, (err, result) => {
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Error in clearing previous data`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Successfully Cleared Old Accounting Period data`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Calculating Sales' } }).exec((err, ap) => {
      //         accountingPeriod = ap;
      //         cb(err);
      //       });
      //     }
      //   });
      // },
      // function (cb) {
      //   // Get Partition Nos
      //   bigQuery.getMultiDistinct(bigQuery.accountingTable, ['partitionNo'], { salesFileId: { $in: accountingPeriod.salesFilesIds } }, (err, values) => {
      //     if (err) {
      //       cb(err);
      //     } else if (values) {
      //       accountingPeriod.salesPartitionNos = values.map((item) => item.partitionNo);
      //       accountingPeriod.save((err) => {
      //         cb(err);
      //       });
      //     } else {
      //       cb();
      //     }
      //   });
      // },
      // function (cb) {
      //   // Calculate Sales
      //   logger.info(`${accountingPeriod._id} Starting to Calculate Sales`);
      //   logger.info('Calculating Sales');
      //   netsuite.calculateSales(AccountingPeriod, accountingPeriod, bigQuery, client, (err) => {
      //     logger.info(`${accountingPeriod._id} Completed Calculating Sales`);
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored in Calculating Sales`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Sales Calculation Errored' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Calculating Sales`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Flushing Catalogue Data to Output' } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
      // function (cb) {
      //   // Calculate Sales
      //   logger.info(`${accountingPeriod._id} Starting to Calculate Adjustment Sales`);
      //   logger.info('Calculating Sales');
      //   netsuite.calculateAdjustmentSales(AccountingPeriod, accountingPeriod, bigQuery, client, (err) => {
      //     logger.info(`${accountingPeriod._id} Completed Calculating Adjustment Sales`);
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored in Calculating Adjustment Sales`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Sales Calculation Errored' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Calculating Sales`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Getting Period Data' } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
      // function (cb) {
      //   // Get AccountingPeriod Data
      //   logger.info(`${accountingPeriod._id} Starting to Get Accounting Period Data`);
      //   logger.info('Getting AccountingPeriod Data');
      //   netsuite.getData(AccountingPeriod, accountingPeriod, bigQuery, (err, result) => {
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored In Getting Accounting Period Data`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Getting Accounting Period Data' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Getting Accounting Period Data`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Creating Accounting Period Files' } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
      // function (cb) {
      //   // Create Accounting Period Files
      //   logger.info('Creating Accounting Period Files');
      //   logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Files`);
      //   netsuite.createFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key, uniqueValues) => {
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { uniqueValues } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
      // function (cb) {
      //   // Create Accounting Period Files
      //   logger.info('Creating Accounting Period Adjustment Files');
      //   logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Adjustment`);
      //   netsuite.createAdjustmentFiles(AccountingPeriod, accountingPeriod, bigQuery, client, (err, s3Key) => {
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allAdjustmentsCsv: s3Key } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
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
      // function (cb) {
      //   // Create Accounting Period Files
      //   logger.info('Creating Accounting Period Mappings File');
      //   logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Mappings File`);
      //   netsuite.createMappingsCsv(accountingPeriod, (err, s3Key) => {
      //     if (err) {
      //       logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Mappings File`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Mappings File' } }).exec(() => {
      //         cb(err);
      //       });
      //     } else {
      //       logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Mappings File`);
      //       AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { mappingsCsv: s3Key } }).exec((err) => {
      //         cb(err);
      //       });
      //     }
      //   });
      // },
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
      console.log('Complete');
      accountingPeriod.save();
      // if (err) {
      //   logger.error(`${accountingPeriod._id} Accounting Period Processing Errored`);
      //   logger.error(err);
      //   AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationError: err, status: 'Errored' } }).exec(callback);
      // } else {
      //   logger.info(`${accountingPeriod._id} Accounting Period Processing Complete`);
      //   AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { processEndTime: new Date(), status: 'Complete' } }).exec(callback);
      // }
    });
  });
});
