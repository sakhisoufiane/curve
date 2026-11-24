const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const async = require('async');
const moment = require('moment');
const WriteCsv = require('../writeCsv/writeCsvObject');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');
const Period = require('../../models/period');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');

module.exports = {
  statements: {},
  contracts: {},
  payees: {},
  calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback) {
    const netsuiteCogs = this;
    async.waterfall([
      function (cb) {
        // Update accountingPeriod to starting point
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
          $set: {
            processStartTime: new Date(), status: 'Processing', calculationStatus: 'Clearing Previous Data', runNo: accountingPeriod.runNo,
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
        // Clear old data out and return periodIds to blank where required
        logger.info('Clearing old accountingPeriod data');
        accountingPeriod.clearPeriod(bigQuery, client, (err, result) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Error in clearing previous data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Successfully Cleared Old Accounting Period data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Calculating Sales' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Get AccountingPeriod Data
        logger.info(`${accountingPeriod._id} Starting to Get Accounting Period Data`);
        logger.info('Getting AccountingPeriod Data');
        netsuiteCogs.getData(AccountingPeriod, accountingPeriod, (err, result) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Getting Accounting Period Data' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Creating Accounting Period Files' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create Accounting Period Files
        logger.info('Creating Accounting Period Files');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Files`);
        netsuiteCogs.createFile(accountingPeriod, bigQuery, client, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { grossAmount: accountingPeriod.grossAmount, calculationStatus: 'Errored In Creating AccountingPeriod Files' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { grossAmount: accountingPeriod.grossAmount, allCalculatedSalesCsv: s3Key } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Create extra report
        logger.info('Creating Accounting Period Report');
        logger.info(`${accountingPeriod._id} Starting to Create Accounting Period Report`);
        netsuiteCogs.createReport(accountingPeriod, bigQuery, client, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Report`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating Accounting Period Report' } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Report`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { reportCsv: s3Key } })
              .then((accountingPeriod) => {
                cb(null, accountingPeriod);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          }
        });
      },
    ], (err) => {
      if (err) {
        logger.error(`${accountingPeriod._id} Accounting Period Processing Errored`);
        logger.error(err);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationError: err, status: 'Errored' } })
          .then((accountingPeriod) => {
            callback(null, accountingPeriod);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        logger.info(`${accountingPeriod._id} Accounting Period Processing Complete`);
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { processEndTime: new Date(), status: 'Complete' } })
          .then((accountingPeriod) => {
            callback(null, accountingPeriod);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    });
  },
  getData(AccountingPeriod, accountingPeriod, callback) {
    Period.findById(accountingPeriod.periodId, 'name grossAmount netAmount grossCosts netCosts')
      .then((period) => {
        if (period) {
          const values = {
            salesInputAmount: period.netAmount,
            grossAmount: 0,
          };
          AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: values })
            .then((accountingPeriod) => {
              callback(null, accountingPeriod);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        } else {
          callback(new Error(`Could not find period with ID ${accountingPeriod.periodId}`));
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createFile(accountingPeriod, bigQuery, client, callback) {
    const netsuiteCogs = this;
    // Setup CSV for Output
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id}.csv`;
    const mainCsv = new WriteCsv({ headers: ['ExternalID', 'Inv Reference', 'Subsidiary', 'Account', 'Debit', 'Credit', 'Customer Name', 'Memo', 'Memo1', 'Trans Date', 'Region', 'Description', 'Total Amount', 'Total Units', 'Artist', 'ReleaseCode', 'Configuration', 'ContractCode'], outputLocation });
    const mainCsvRows = [];
    // Reset Gross Amount
    accountingPeriod.grossAmount = 0;
    // Load Period
    Period.findById(accountingPeriod.periodId)
      .then((period) => {
        // Get Statements
        Statement.find({ clientId: client._id.toString(), periodId: accountingPeriod.periodId }, 'periodId contractId name netAmount')
          .then((statements) => {
            // Loop through statements
            async.eachSeries(statements, (statement, cb) => {
              // Get contract associated with statement
              Contract.findById(statement.contractId)
                .then((contract) => {
                  // Only report primaryContracts - so filter out any that aren't
                  if (contract && contract.primaryContract && contract.foreignId && contract.foreignId !== '' && statement.netAmount !== 0) {
                    // Add to accounting period net amount
                    accountingPeriod.grossAmount += statement.netAmount;
                    // Creates two rows, moving from one ledger to the other
                    // Debit Row
                    mainCsvRows.push([
                      `${period.year + period.accountingPeriod} Royalty Expense`,
                      `${period.year + period.accountingPeriod} Royalty Expense`,
                      '300 Entertainment',
                      contract.contractCategories && contract.contractCategories.includes('P&D') ? '50000-001 P&D Sales Distribution' : '50000-002 Royalty Expense',
                      statement.netAmount.toFixed(2),
                      null,
                      null,
                      `${period.year + period.accountingPeriod} Royalty Expense ${contract.foreignId} - ${contract.name}`,
                      null,
                      moment(accountingPeriod.accountingDate).format('MM/DD/YYYY'),
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      contract.foreignId,
                    ]);
                    // Credit Row
                    mainCsvRows.push([
                      `${period.year + period.accountingPeriod} Royalty Expense`,
                      `${period.year + period.accountingPeriod} Royalty Expense`,
                      '300 Entertainment',
                      contract.contractCategories && contract.contractCategories.includes('P&D') ? '21110-000 P&D Label Payable' : '21200-000 Royalty Payable',
                      null,
                      statement.netAmount.toFixed(2),
                      null,
                      `${period.year + period.accountingPeriod} Royalty Expense ${contract.foreignId} - ${contract.name}`,
                      null,
                      moment(accountingPeriod.accountingDate).format('MM/DD/YYYY'),
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      null,
                      contract.foreignId,
                    ]);
                    cb();
                  } else {
                    cb();
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            }, (err) => {
              // Write lines to CSV
              mainCsv.addData(mainCsvRows, () => {
                // Close File
                mainCsv.write((err, fileLocation) => {
                  if (err) {
                    callback(err);
                  } else {
                    // Set S3 Key
                    const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Output ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
                    // Upload to S3
                    fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
                      // Check file exists
                      if (fs.existsSync(outputLocation)) {
                        // Remove local file
                        fs.unlink(outputLocation, (err) => {
                          logger.info(`File deleted: ${outputLocation}`);
                          callback(err, s3Key, accountingPeriod.uniqueValues);
                        });
                      } else {
                        callback(err, s3Key, accountingPeriod.uniqueValues);
                      }
                    });
                  }
                });
              });
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createReport(accountingPeriod, bigQuery, client, callback) {
    const netsuiteCogs = this;
    // Setup CSV for Output
    const outputLocation = `${appRootDir}/tmp/${accountingPeriod._id}.csv`;
    const mainCsv = new WriteCsv({ headers: ['Contract', 'Contract Name', 'Contract Category', 'Distribution Channel', 'Total Sales', 'Total COGS', 'Rate', 'Total JE Sales', 'Est Cogs'], outputLocation });
    const mainCsvRows = [];
    async.parallel({
      contracts: (parallelCb) => {
        Contract.find({ clientId: accountingPeriod.clientId })
          .then((contracts) => {
            const contractMappings = {};
            contracts.forEach((contract) => {
              contractMappings[contract._id.toString()] = contract;
            });
            parallelCb(null, contractMappings);
          })
          .catch((err) => {
            logger.error(err);
            parallelCb(err);
          });
      },
      cogsData: (parallelCb) => {
        netsuiteCogs.getCogsData(accountingPeriod, client, bigQuery, parallelCb);
      },
      salesData: (parallelCb) => {
        netsuiteCogs.getSalesData(accountingPeriod, client, bigQuery, parallelCb);
      },
    }, (err, result) => {
      if (err) {
        callback(err);
      } else {
        netsuiteCogs.sortSalesDataForReport(client, result.salesData, result.contracts, (err, salesData) => {
          // logger.debug(salesData);
          result.cogsData.forEach((line) => {
            const contract = result.contracts[line.contractId] ? result.contracts[line.contractId] : {};
            if (contract && contract.primaryContract && contract.foreignId) {
              const totalSales = salesData[contract._id.toString()] ? salesData[contract._id.toString()][line.distributionChannel] : null;
              mainCsvRows.push([
                contract.foreignId,
                contract.name,
                contract.contractCategories[0],
                line.distributionChannel,
                line.homeCurrencyNetAmount,
                line.calculationOutput,
                ((line.calculationOutput / line.homeCurrencyNetAmount) * 100).toFixed(2),
                totalSales,
                line.calculationOutput,
              ]);
            }
          });
          // Write lines to CSV
          mainCsv.addData(mainCsvRows, () => {
            // Close File
            mainCsv.write((err, fileLocation) => {
              if (err) {
                callback(err);
              } else {
                // Set S3 Key
                const s3Key = `accountingPeriods/${accountingPeriod._id.toString()}/${accountingPeriod.name} Report ${moment().format('YYYYMMDDHHmmSSssss')}.csv`;
                // Upload to S3
                fileManager.uploadToS3(s3Key, outputLocation, (err, response) => {
                  // Check file exists
                  if (fs.existsSync(outputLocation)) {
                    // Remove local file
                    fs.unlink(outputLocation, (err) => {
                      logger.info(`File deleted: ${outputLocation}`);
                      callback(err, s3Key);
                    });
                  } else {
                    callback(err, s3Key);
                  }
                });
              }
            });
          });
        });
      }
    });
  },
  getCogsData(accountingPeriod, client, bigQuery, callback) {
    // Get data from BigQuery
    const selector = [
      { column: 'contractId', displayAs: 'contractId', isSelector: true, isGroupBy: true },
      { column: 'distributionChannel', displayAs: 'distributionChannel', isSelector: true, isGroupBy: true },
    ];
    const sumColumn = [
      { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' },
      { column: 'calculationOutput', displayAs: 'calculationOutput' },
    ];
    const filter = {
      periodId: accountingPeriod.periodId,
    };
    bigQuery.getAggregate(client.bigQueryPeriodSales, selector, sumColumn, 'lines', filter, {}, callback);
  },
  getSalesData(accountingPeriod, client, bigQuery, callback) {
    // Get data from BigQuery
    const selector = [
      { column: 'releaseId', displayAs: 'releaseId', isSelector: true, isGroupBy: true },
      { column: 'trackId', displayAs: 'trackId', isSelector: true, isGroupBy: true },
      { column: 'contractId', displayAs: 'contractId', isSelector: true, isGroupBy: true },
      { column: 'catType', displayAs: 'catType', isSelector: true, isGroupBy: true },
      { column: 'distributionChannel', displayAs: 'distributionChannel', isSelector: true, isGroupBy: true },
    ];
    const sumColumn = [
      { column: 'homeCurrencyGrossAmount', displayAs: 'homeCurrencyGrossAmount' },
      { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' },
    ];
    Period.findById(accountingPeriod.periodId, 'salesFilesIds')
      .then((period) => {
        const filter = {
          salesFileId: { $in: period.salesFilesIds },
        };
        bigQuery.getAggregate(client.bigQuerySalesTable, selector, sumColumn, 'lines', filter, {}, callback);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  sortSalesDataForReport(client, salesData, contracts, callback) {
    // Get catalogue mappings
    this.catalogueMappings(client, (err, mappings) => {
      // Prepare output object, to be structured as { contractId: { Digital: 123, Physical: 321 } }
      const output = {};
      // Loop through sales data
      salesData.forEach((line) => {
        // Get catalogue item
        let catalogueItem = {};
        if (line.catType === 'Release') {
          catalogueItem = mappings.releases[line.releaseId];
        } else if (line.catType === 'Track') {
          catalogueItem = mappings.tracks[line.trackId];
        } else if (line.catType === 'Work') {
          catalogueItem = mappings.works[line.workId];
        } else if (line.catType === 'Contract') {
          catalogueItem = { contractId: line.contractId };
        }
        // Find contract from catalogue item
        const contract = catalogueItem && contracts[catalogueItem.contractId] ? contracts[catalogueItem.contractId] : {};
        // Check if contract is a primary one and has a foreign ID
        if (contract && contract.primaryContract && contract.foreignId) {
          // Setup object if it doesn't exist
          output[contract._id.toString()] = output[contract._id.toString()] || {};
          // Setup distribution channel if it doesn't exist
          output[contract._id.toString()][line.distributionChannel] = output[contract._id.toString()][line.distributionChannel] || 0;
          output[contract._id.toString()][line.distributionChannel] += line.homeCurrencyNetAmount;
        }
      });
      callback(null, output);
    });
  },
  catalogueMappings(client, callback) {
    Contract.find({ clientId: client._id.toString(), primaryContract: true })
      .then((contracts) => {
        // Set up mappings for use against catalogue
        const contractMappings = {};
        contracts.forEach((contract) => { contractMappings[contract._id.toString()] = contract; });
        // Get catalogue with mappings
        const catalogueData = {
          releases: {}, tracks: {}, works: {}, contracts: contractMappings, salesFiles: {}, accounts: {},
        };
        async.parallel([
          function (cb) {
            Release.find({ clientId: client._id.toString() })
              .then((releases) => {
                // Loop through releases for mapping
                releases.forEach((release) => {
                  // Set catalogue object
                  catalogueData.releases[release._id.toString()] = {
                    title: release.title, version: release.version, artist: release.artist, identifier: release.catNo,
                  };
                  // Loop through contracts to get primary artist
                  release.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      // catalogueData.releases[release._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                      catalogueData.releases[release._id.toString()].contractId = right.contractId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            Track.find({ clientId: client._id.toString() })
              .then((tracks) => {
                // Loop through tracks for mapping
                tracks.forEach((track) => {
                  // Set catalogue object
                  catalogueData.tracks[track._id.toString()] = {
                    title: track.title, version: track.version, artist: track.artist, identifier: track.isrc,
                  };
                  // Loop through contracts to get primary artist
                  track.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      // catalogueData.tracks[track._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                      catalogueData.tracks[track._id.toString()].contractId = right.contractId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (cb) {
            Work.find({ clientId: client._id.toString() })
              .then((works) => {
                // Loop through tracks for mapping
                works.forEach((work) => {
                  // Set catalogue object
                  catalogueData.works[work._id.toString()] = { title: work.title, artist: work.composers, identifier: work.identifier };
                  // Loop through contracts to get primary artist
                  work.salesReturnsRights.forEach((right) => {
                    // When finding primary artist contract, add to catalogueData item
                    if (contractMappings[right.contractId]) {
                      // catalogueData.works[work._id.toString()].contractId = contractMappings[right.contractId].foreignId;
                      catalogueData.works[work._id.toString()].contractId = right.contractId;
                    }
                  });
                });
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
        ], (err) => {
          callback(err, catalogueData);
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
};
