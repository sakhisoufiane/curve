const { logger, fileManager, createZip, utils } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../writeCsv/writeCsvObject');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Statement = require('../../models/statement');
const Period = require('../../models/period');

module.exports = {
  statements: {},
  contracts: {},
  payees: {},
  calculate(AccountingPeriod, accountingPeriod, client, bigQuery, callback) {
    const xeroLedger = this;
    async.waterfall([
      function (cb) {
        // Update accountingPeriod to starting point
        AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, {
          $set: {
            processStartTime: new Date(), status: 'Processing', calculationStatus: 'Clearing Previous Data', runNo: accountingPeriod.runNo,
          },
        })
          .then(() => {
            cb();
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
              .then(() => {
                cb(err);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Successfully Cleared Old Accounting Period data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Calculating Sales' } })
              .then(() => {
                cb();
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
        xeroLedger.getData(AccountingPeriod, accountingPeriod, (err, result) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Getting Accounting Period Data' } })
              .then(() => {
                cb(err);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Getting Accounting Period Data`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Creating Accounting Period Files' } })
              .then(() => {
                cb();
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
        xeroLedger.createFiles(accountingPeriod, bigQuery, client, (err, s3Key) => {
          if (err) {
            logger.error(`${accountingPeriod._id} Errored In Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { calculationStatus: 'Errored In Creating AccountingPeriod Files' } })
              .then(() => {
                cb(err);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            logger.info(`${accountingPeriod._id} Sucessfully Completed Creating Accounting Period Files`);
            AccountingPeriod.findByIdAndUpdate(accountingPeriod._id, { $set: { allCalculatedSalesCsv: s3Key } })
              .then(() => {
                cb();
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
            grossAmount: period.grossAmount,
            netAmount: period.netAmount,
            grossCosts: period.grossCosts,
            netCosts: period.netCosts,
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
  createFiles(accountingPeriod, bigQuery, client, callback) {
    const xeroLedger = this;
    // Get catalogue data
    xeroLedger.getCatalogueItems(accountingPeriod, (err) => {
      if (err) {
        callback(err);
      } else {
        async.parallel({
          purchases(cb) {
            xeroLedger.purchasesCsv(accountingPeriod, bigQuery, client, cb);
          },
          sales(cb) {
            xeroLedger.salesCsv(accountingPeriod, bigQuery, client, cb);
          },
          transactions(cb) {
            xeroLedger.transactionsCsv(accountingPeriod, bigQuery, client, cb);
          },
        }, (err, output) => {
          // Create Zip
          createZip.localFiles([output.purchases, output.sales, output.transactions], `${appRootDir}/tmp/${accountingPeriod._id.toString()}.zip`, (err, zipFile) => {
            // Sanitize filename
            const safeName = utils.safeName(accountingPeriod.name);
            // Upload to S3
            fileManager.uploadToS3(`accountingPeriods/${accountingPeriod._id.toString()}/${safeName} Output.zip`, zipFile, (err, key) => {
              if (err) {
                callback(err);
              } else {
                // Remove Local Zip
                fs.unlink(zipFile, () => {
                  // Return S3 key to callback
                  callback(null, key);
                });
              }
            });
          });
        });
      }
    });
  },
  getCatalogueItems(accountingPeriod, callback) {
    const xeroLedger = this;
    async.parallel({
      statements(cb) {
        Statement.find({ clientId: accountingPeriod.clientId, periodId: accountingPeriod.periodId }, 'name contractId selfBillingInvoiceNo feesInvoiceNo reservesWithheld reservesReleased netAmount')
          .then((statements) => {
            statements.forEach((statement) => {
              xeroLedger.statements[statement.contractId] = statement;
            });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      contracts(cb) {
        Contract.find({ clientId: accountingPeriod.clientId }, 'name payees foreignId')
          .then((contracts) => {
            contracts.forEach((contract) => {
              xeroLedger.contracts[contract._id.toString()] = contract;
            });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      payees(cb) {
        Payee.find({ clientId: accountingPeriod.clientId }, 'name foreignId country selfBillingTaxRate feesInvoiceTaxRate vatNo')
          .then((payees) => {
            payees.forEach((payee) => {
              xeroLedger.payees[payee._id.toString()] = payee;
            });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    }, callback);
  },
  purchasesCsv(accountingPeriod, bigQuery, client, callback) {
    const xeroLedger = this;
    // Setup CSV Writer
    // Sanitize filename
    const safeName = utils.safeName(accountingPeriod.name);
    const outputLocation = `${appRootDir}/tmp/${safeName} Purchases.csv`;
    // Create CSV Object
    const csvWriter = new WriteCsv({ headers: ['*ContactName', 'EmailAddress', 'POAddressLine1', 'POAddressLine2', 'POAddressLine3', 'POAddressLine4', 'POCity', 'PORegion', 'POPostalCode', 'POCountry', '*InvoiceNumber', 'Reference', '*InvoiceDate', '*DueDate', 'Total', 'InventoryItemCode', '*Description', '*Quantity', '*UnitAmount', 'Discount', '*AccountCode', '*TaxType', 'TaxAmount', 'TrackingName1', 'TrackingOption1', 'TrackingName2', 'TrackingOption2', 'Currency', 'BrandingTheme'], outputLocation });
    // Prepare output array
    const csvRows = [];
    // Get Data
    xeroLedger.getDataForPurchases(accountingPeriod, bigQuery, client, (err, data) => {
      Object.keys(data).forEach((contractId) => {
        const statement = xeroLedger.statements[contractId];
        const feesInvoiceNo = statement?.feesInvoiceNo ? `${statement.feesInvoiceNo}` : null;
        const contract = xeroLedger.contracts[contractId];
        // Default to the first payee for this process
        const payee = contract && contract.payees?.length ? xeroLedger.payees[contract.payees?.[0]?.payeeId] : {};
        // Set due date to 45 days after
        const dueDate = new Date(accountingPeriod.accountingDate);
        dueDate.setDate(dueDate.getDate() + 45);
        // Get VAT wording
        let vatWording = 'No VAT';
        if (payee && payee.feesInvoiceTaxRate && payee.country === 'GB') {
          vatWording = '20% (VAT on Expenses)';
        } else if (payee && payee.vatNo && payee.country !== 'GB') {
          vatWording = 'Reverse Charge Expenses (20%)';
        }
        Object.keys(data[contractId].sales).forEach((key) => {
          csvRows.push([
            `'${contract.name}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            feesInvoiceNo,
            statement._id.toString(),
            moment(accountingPeriod.accountingDate).format('DD/MM/YYYY'),
            moment(dueDate).format('DD/MM/YYYY'),
            null,
            null,
            `${moment(accountingPeriod.accountingDate).format('MMMM YY')} Sales`,
            1,
            data[contractId].sales[key].calculationInput - data[contractId].sales[key].calculationOutput,
            null,
            key,
            vatWording,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]);
        });
        Object.keys(data[contractId].costs).forEach((key) => {
          csvRows.push([
            `'${contract.name}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            feesInvoiceNo,
            statement._id.toString(),
            moment(accountingPeriod.accountingDate).format('DD/MM/YYYY'),
            moment(dueDate).format('DD/MM/YYYY'),
            null,
            null,
            `${moment(accountingPeriod.accountingDate).format('MMMM YY')} Sales`,
            1,
            data[contractId].costs[key].calculationOutput,
            null,
            key,
            vatWording,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]);
        });
      });
      async.waterfall([
        function (cb) {
          // Add Data to CSV
          csvWriter.addData(csvRows, cb);
        },
        function (cb) {
          // Write CSV
          csvWriter.write(cb);
        },
      ], callback);
    });
  },
  getDataForPurchases(accountingPeriod, bigQuery, client, callback) {
    async.parallel({
      sales(cb) {
        bigQuery.getAggregate(bigQuery.outputTable, 'contractId, distributionChannel', [{ column: 'calculationInput', displayAs: 'calculationInput' }, { column: 'calculationOutput', displayAs: 'calculationOutput' }], 'lines', { periodId: accountingPeriod.periodId }, { orderBy: 'contractId' }, cb);
      },
      costs(cb) {
        bigQuery.getAggregate(bigQuery.costsTable, 'contractId, type', [{ column: 'amount', displayAs: 'amount' }, { column: 'calculationOutput', displayAs: 'calculationOutput' }], 'lines', { periodId: accountingPeriod.periodId }, { orderBy: 'contractId' }, cb);
      },
    }, (err, data) => {
      if (err) {
        callback(err);
      } else {
        // Set up mappings from client
        const salesMappings = {};
        if (client.accountingPeriodMappings.distributionFees) {
          client.accountingPeriodMappings.distributionFees.forEach((item) => {
            salesMappings[item.from] = item.to;
          });
        }
        const costsMappings = {};
        if (client.accountingPeriodMappings.costs) {
          client.accountingPeriodMappings.costs.forEach((item) => {
            costsMappings[item.from] = item.to;
          });
        }
        // Organise data by statement
        const output = {};
        // Loop through sales and add them to output object by contractId
        data.sales.forEach((item) => {
          output[item.contractId] = output[item.contractId] || { sales: {}, costs: {} };
          const mapping = salesMappings[item.distributionChannel] ? salesMappings[item.distributionChannel] : item.distributionChannel;
          output[item.contractId].sales[mapping] = output[item.contractId].sales[mapping] || { calculationInput: 0, calculationOutput: 0 };
          output[item.contractId].sales[mapping].calculationInput += item.calculationInput;
          output[item.contractId].sales[mapping].calculationOutput += item.calculationOutput;
        });
        // Loop through costs and add them to output object by contractId
        data.costs.forEach((item) => {
          output[item.contractId] = output[item.contractId] || { sales: {}, costs: {} };
          const mapping = costsMappings[item.type] ? costsMappings[item.type] : item.type;
          output[item.contractId].costs[mapping] = output[item.contractId].costs[mapping] || { calculationOutput: 0 };
          output[item.contractId].costs[mapping].calculationOutput += item.calculationOutput;
        });
        callback(null, output);
      }
    });
  },
  salesCsv(accountingPeriod, bigQuery, client, callback) {
    const xeroLedger = this;
    // Setup CSV Writer
    // Sanitize filename
    const safeName = utils.safeName(accountingPeriod.name);
    const outputLocation = `${appRootDir}/tmp/${safeName} Sales.csv`;
    // Create CSV Object
    const csvWriter = new WriteCsv({ headers: ['*ContactName', 'EmailAddress', 'POAddressLine1', 'POAddressLine2', 'POAddressLine3', 'POAddressLine4', 'POCity', 'PORegion', 'POPostalCode', 'POCountry', '*InvoiceNumber', '*InvoiceDate', '*DueDate', 'Total', 'InventoryItemCode', 'Description', '*Quantity', '*UnitAmount', '*AccountCode', '*TaxType', 'TaxAmount', 'TrackingName1', 'TrackingOption1', 'TrackingName2', 'TrackingOption2', 'Currency'], outputLocation });
    // Prepare output array
    const csvRows = [];
    // Get Data
    xeroLedger.getDataForSales(accountingPeriod, bigQuery, client, (err, data) => {
      Object.keys(data).forEach((contractId) => {
        const statement = xeroLedger.statements[contractId];
        const selfBillingInvoiceNo = statement?.selfBillingInvoiceNo ? `${statement.selfBillingInvoiceNo}` : null;
        const contract = xeroLedger.contracts[contractId];
        // Default to the first payee for this process
        const payee = contract && contract.payees?.length ? xeroLedger.payees[contract.payees?.[0]?.payeeId] : {};
        // Set due date to 45 days after
        const dueDate = new Date(accountingPeriod.accountingDate);
        dueDate.setDate(dueDate.getDate() + 45);
        // Get VAT wording
        let vatWording = 'No VAT';
        if (payee && payee.selfBillingTaxRate && payee.country === 'GB') {
          vatWording = '20% (VAT on Income)';
        } else if (payee && payee.selfBillingTaxRate === 0 && payee.country !== 'GB') {
          vatWording = 'Zero Rated EC Services';
        }
        Object.keys(data[contractId]).forEach((key) => {
          csvRows.push([
            `'${contract.name}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            selfBillingInvoiceNo,
            moment(accountingPeriod.accountingDate).format('DD/MM/YYYY'),
            moment(dueDate).format('DD/MM/YYYY'),
            null,
            null,
            `${moment(accountingPeriod.accountingDate).format('MMMM YY')} Sales`,
            1,
            data[contractId][key].calculationInput,
            key,
            vatWording,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]);
        });
        if (statement.reservesWithheld) {
          csvRows.push([
            `'${contract.name}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            selfBillingInvoiceNo,
            moment(accountingPeriod.accountingDate).format('DD/MM/YYYY'),
            moment(dueDate).format('DD/MM/YYYY'),
            null,
            null,
            `${moment(accountingPeriod.accountingDate).format('MMMM YY')} Sales`,
            1,
            0 - statement.reservesWithheld,
            638,
            'No VAT',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]);
        }
        if (statement.reservesReleased) {
          csvRows.push([
            `'${contract.name}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            selfBillingInvoiceNo,
            moment(accountingPeriod.accountingDate).format('DD/MM/YYYY'),
            moment(dueDate).format('DD/MM/YYYY'),
            null,
            null,
            `${moment(accountingPeriod.accountingDate).format('MMMM YY')} Sales`,
            1,
            statement.reservesReleased,
            638,
            'No VAT',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ]);
        }
      });
      async.waterfall([
        function (cb) {
          // Add Data to CSV
          csvWriter.addData(csvRows, cb);
        },
        function (cb) {
          // Write CSV
          csvWriter.write(cb);
        },
      ], callback);
    });
  },
  getDataForSales(accountingPeriod, bigQuery, client, callback) {
    bigQuery.getAggregate(bigQuery.outputTable, 'contractId, distributionChannel', [{ column: 'calculationInput', displayAs: 'calculationInput' }, { column: 'calculationOutput', displayAs: 'calculationOutput' }], 'lines', { periodId: accountingPeriod.periodId }, { orderBy: 'contractId' }, (err, sales) => {
      // Set up mappings from client
      const salesMappings = {};
      if (client.accountingPeriodMappings.distributionChannels) {
        client.accountingPeriodMappings.distributionChannels.forEach((item) => {
          salesMappings[item.from] = item.to;
        });
      }
      // Organise data by statement
      const output = {};
      // Loop through sales and add them to output object by contractId
      sales.forEach((item) => {
        output[item.contractId] = output[item.contractId] || {};
        const mapping = salesMappings[item.distributionChannel] ? salesMappings[item.distributionChannel] : item.distributionChannel;
        output[item.contractId][mapping] = output[item.contractId][mapping] || { calculationInput: 0, calculationOutput: 0 };
        output[item.contractId][mapping].calculationInput += item.calculationInput;
        output[item.contractId][mapping].calculationOutput += item.calculationOutput;
      });
      callback(null, output);
    });
  },
  transactionsCsv(accountingPeriod, bigQuery, client, callback) {
    const xeroLedger = this;
    // Setup CSV Writer
    // Sanitize filename
    const safeName = utils.safeName(accountingPeriod.name);
    const outputLocation = `${appRootDir}/tmp/${safeName} Transactions.csv`;
    // Create CSV Object
    const csvWriter = new WriteCsv({ headers: ['Royalty Period', 'Royaltor Code', 'Royaltor Name', 'Contract Code', 'Name', 'TransType Code', 'TransType Description', 'Description', 'Amount', 'Recoup %', 'Recoup Amount', 'Currency Code', 'Date', 'Ref.'], outputLocation });
    // Prepare output array
    const csvRows = [];
    // Get Data
    xeroLedger.getDataForTransactions(accountingPeriod, bigQuery, client, (err, data) => {
      Object.keys(xeroLedger.statements).forEach((contractId) => {
        const statement = xeroLedger.statements[contractId];
        const contract = xeroLedger.contracts[contractId];
        // Default to the first payee for this process
        const payee = contract && contract.payees?.length ? xeroLedger.payees[contract.payees?.[0]?.payeeId] : {};
        if (data[contractId]) {
          data[contractId].forEach((line) => {
            csvRows.push([
              moment(accountingPeriod.accountingDate).format('MM/YYYY'),
              payee.foreignId,
              payee.name,
              contract.foreignId,
              contract.name,
              line.type,
              line.type,
              line.description,
              0 - line.amount,
              100,
              0 - line.calculationOutput,
              '£',
              line.date && line.date.value ? moment(line.date.value).format('DD/MM/YYYY') : null,
              line.catalogueCatNo,
            ]);
          });
        }
        if (statement.reservesWithheld) {
          csvRows.push([
            moment(accountingPeriod.accountingDate).format('MM/YYYY'),
            payee.foreignId,
            payee.name,
            contract.foreignId,
            contract.name,
            'RESE',
            'RESERVES HELD',
            'RESERVES HELD',
            0 - statement.reservesWithheld,
            100,
            0 - statement.reservesWithheld,
            '£',
            null,
            null,
          ]);
        }
        if (statement.reservesReleased) {
          csvRows.push([
            moment(accountingPeriod.accountingDate).format('MM/YYYY'),
            payee.foreignId,
            payee.name,
            contract.foreignId,
            contract.name,
            'RELE',
            'RESERVES RELEASED',
            'RESERVES RELEASED',
            statement.reservesReleased,
            100,
            statement.reservesReleased,
            '£',
            null,
            null,
          ]);
        }
        if (statement.netAmount) {
          csvRows.push([
            moment(accountingPeriod.accountingDate).format('MM/YYYY'),
            payee.foreignId,
            payee.name,
            contract.foreignId,
            contract.name,
            'ROYS',
            'ROYALTY EARNINGS',
            'ROYALTY EARNINGS',
            statement.netAmount,
            100,
            statement.netAmount,
            '£',
            null,
            null,
          ]);
        }
      });
      async.waterfall([
        function (cb) {
          // Add Data to CSV
          csvWriter.addData(csvRows, cb);
        },
        function (cb) {
          // Write CSV
          csvWriter.write(cb);
        },
      ], callback);
    });
  },
  getDataForTransactions(accountingPeriod, bigQuery, client, callback) {
    bigQuery.getData(bigQuery.costsTable, ['contractId', 'type', 'description', 'amount', 'calculationOutput', 'catalogueCatNo', 'date'], { periodId: accountingPeriod.periodId }, {}, (err, data) => {
      // Organise data by statement
      const output = {};
      data.forEach((item) => {
        output[item.contractId] = output[item.contractId] || [];
        output[item.contractId].push(item);
      });
      callback(null, output);
    });
  },
};
