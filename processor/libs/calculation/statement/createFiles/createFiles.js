const { logger, fileManager, createZip, utils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const getSymbolFromCurrency = require('currency-symbol-map');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();

const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const Payee = require('../../../../models/payee');
const Transaction = require('../../../../models/transaction');
const Report = require('../../../../models/report');

const customStatement = require('../../../statements/customStatements');
const writeCsv = require('../../../writeCsv');
const createPlatoonRevenueReport = require('../../../statements/customStatements/libs/platoonRevenueReport');
const pdfStatement = require('../../../statements/standardPdf');
const pdfTransactionStatement = require('../../../statements/statementOfAccount');
const pdfSelfBillingInvoice = require('../../../statements/selfBillingInvoice');
const pdfFeesInvoice = require('../../../statements/feesInvoice');
const getWorkIsrcs = require('../../../getWorkIsrcs');
const associatedAddToContractIds = require('../associatedAddToContractIds');
const getAssociatedTransactions = require('../../contract/getAssociatedTransactions');
const balanceAtDate = require('../../contract/balanceAtDate');
const statementDesignDataRequest = require('../../contract/statementDesignData');
const CatalogueOverwritingData = require('../../../catalogueOverwritingData');

const config = require('../../../../config.json');

const CreateFiles = {
  create: (incomingStatement, db, bigQuery, client, period, salesData, callback) => {
    let statementDesignData;
    Statement.findById(incomingStatement._id)
      .then((statement) => {
        logger.info(`${statement.periodId} ${statement._id} Creating Statement`);
        Contract.findById(statement.contractId)
          .then((contract) => {
            async.waterfall([
              function (cb) {
                Contract.findById(statement.contractId)
                  .then((contract) => {
                    statementDesignDataRequest(contract, (err, data) => {
                      statementDesignData = data;
                      cb(err);
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              },
              function (cb) {
                // Custom Statement Designs
                if (contract.statementDesign && ['Proper', 'Just Music', 'Late Night Tales', 'Topic', 'Drag City', 'Combined Plus Release Summary'].includes(contract.statementDesign)) {
                  async.parallel([
                    function (paraCb) {
                      logger.info(`${contract.statementDesign} statement design for contract ${contract._id.toString()}`);
                      CreateFiles.createCustomStatement(statement, bigQuery, client, period, contract, salesData, paraCb);
                    },
                    function (paraCb) {
                      if (client.statementDesign === 'Just Music' || client.statementDesign === 'Late Night Tales' || client.statementDesign === 'Drag City' || client.statementDesign === 'Combined Plus Release Summary') {
                        CreateFiles.createSalesCsv(statement, bigQuery, client, salesData, paraCb);
                      } else {
                        paraCb();
                      }
                    },
                    function (paraCb) {
                      if (client.statementDesign === 'Just Music' || client.statementDesign === 'Drag City' || client.statementDesign === 'Combined Plus Release Summary') {
                        CreateFiles.createCostsCsv(statement, bigQuery, client, paraCb);
                      } else {
                        paraCb();
                      }
                    },
                    function (paraCb) {
                      if (contract.statementDesign !== 'Combined Plus Release Summary') { return paraCb(); }

                      const closingGtMinpayout = !!(statement.closingBalance !== 0 && statement.closingBalance > contract.minPayout);
                      const autoPaymentTriggeredOrBlank = !!(statement.autoPaymentTriggered || !contract.autoPayment);
                      if (
                        // When payment is triggered
                        (contract.selfBilling && statement.autoPaymentTriggered)
                        // Or when self billing is configured and amount is over the min payment threshold
                        || (contract.selfBilling && ((closingGtMinpayout && autoPaymentTriggeredOrBlank) || client.clientType === 'Distributor'))
                      ) {
                        try {
                          CreateFiles.createSelfBillingPdf(statement, client, period, contract, paraCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Self Billing PDF`, e);
                          paraCb();
                        }
                      } else {
                        paraCb();
                      }
                    },
                    function (paraCb) {
                      if (!statementDesignData.suppressStatementOfAccount && contract.statementDesign === 'Combined Plus Release Summary') {
                        try {
                          CreateFiles.createTransactionPdf(statement, client, period, contract, paraCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction PDF`, e);
                          paraCb();
                        }
                      } else {
                        paraCb();
                      }
                    },
                  ], (err) => {
                    cb(err);
                  });
                } else {
                  // Standard Statement Designs
                  const asyncType = contract.statementDesign && contract.statementDesign.includes('Extended') ? async.series : async.parallel;
                  asyncType([
                    function (seriesCb) {
                      try {
                        CreateFiles.createPdf(statement, bigQuery, client, period, contract, salesData, seriesCb);
                      } catch (e) {
                        logger.error(`${statement.periodId} ${statement._id} Errored Creating PDF`, e);
                        seriesCb();
                      }
                    },
                    function (seriesCb) {
                      if (!statementDesignData.suppressStatementOfAccount) {
                        try {
                          CreateFiles.createTransactionPdf(statement, client, period, contract, seriesCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction PDF`, e);
                          seriesCb();
                        }
                      } else {
                        seriesCb();
                      }
                    },
                    function (seriesCb) {
                      if (!contract.selfBilling) return seriesCb();

                      const options = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeAdvance: true, excludeReserves: true, excludeStatementPayments: statement._id.toString() } : { excludeStatementPayments: statement._id.toString() };
                      const date = new Date(period.endDate);
                      date.setDate(date.getDate() + 1);

                      balanceAtDate(contract, date, options, (err, closingBalance) => {
                        if (err) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Self Billing PDF getting closing balance`, err);
                          return seriesCb();
                        }
                        const closingGtMinpayout = !!(closingBalance !== 0 && closingBalance > contract.minPayout);
                        const autoPaymentTriggeredOrBlank = !!(statement.autoPaymentTriggered || !contract.autoPayment);
                        if (
                          // When payment is triggered
                          statement.autoPaymentTriggered
                          // Or when self billing is configured and amount is over the min payment threshold
                          || (closingGtMinpayout && autoPaymentTriggeredOrBlank) || client.clientType === 'Distributor'
                        ) {
                          try {
                            CreateFiles.createSelfBillingPdf(statement, client, period, contract, seriesCb);
                          } catch (e) {
                            logger.error(`${statement.periodId} ${statement._id} Errored Self Billing PDF`, e);
                            seriesCb();
                          }
                        } else {
                          seriesCb();
                        }
                      });
                    },
                    function (seriesCb) {
                      if (contract.feesInvoice) {
                        try {
                          CreateFiles.createFeesInvoicePdf(statement, client, period, contract, seriesCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Fees Invoice PDF`, e);
                          seriesCb();
                        }
                      } else {
                        seriesCb();
                      }
                    },
                    function (seriesCb) {
                      try {
                        CreateFiles.createSalesCsv(statement, bigQuery, client, salesData, seriesCb);
                      } catch (e) {
                        logger.error(`${statement.periodId} ${statement._id} Errored Sales CSV`, e);
                        seriesCb();
                      }
                    },
                    function (seriesCb) {
                      if (client.clientType !== 'Publisher' && statement.periodType !== 'Mechanical') {
                        try {
                          CreateFiles.createCostsCsv(statement, bigQuery, client, seriesCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Costs CSV`, e);
                          seriesCb();
                        }
                      } else {
                        seriesCb();
                      }
                    },
                    function (seriesCb) {
                      if (contract.statementDesign === 'Platoon' && client.clientType !== 'Publisher' && statement.periodType !== 'Mechanical') {
                        try {
                          logger.info(`${statement.periodId} ${statement._id} Creating Platoon Report`);
                          createPlatoonRevenueReport(bigQuery, statement, salesData, seriesCb);
                        } catch (e) {
                          logger.error(`${statement.periodId} ${statement._id} Errored Custom Platoon Report`, e);
                          seriesCb();
                        }
                      } else {
                        seriesCb();
                      }
                    },
                  ], (err) => {
                    cb(err);
                  });
                }
              },
              function (cb) {
                CreateFiles.createZipOfFiles(statement, cb);
              },
            ], (err) => {
              if (err) {
                logger.error(`${statement.periodId} ${statement._id} Statement CreateFiles Error`, err);
              }
              callback(err);
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
  createCustomStatement: (statement, bigQuery, client, period, contract, salesData, callback) => {
    let narrowedSalesData = [];
    // Copy Analysis
    const analysis = JSON.parse(JSON.stringify(statement.analysis));
    // Delete Unrequired Figures
    if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
      delete analysis.net;
    } else {
      delete analysis.gross;
    }
    let statementDesignData; let transactions; let payee; let openingBalance; let closingBalance; let salesTemplate;
    async.waterfall([
      function (cb) {
        statementDesignDataRequest(contract, (err, data) => {
          statementDesignData = data;
          cb(err);
        });
      },
      function (cb) {
        Report.findById(statementDesignData.salesReportTemplate)
          .then((report) => {
            // Set template based on if report is present or not
            if (report) {
              salesTemplate = report.fields;
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        getAssociatedTransactions(contract, {}, (err, data) => {
          transactions = data;
          cb(err);
        });
      },
      function (cb) {
        if (statement.contractType !== 'Profit Share' && statement.contractType !== 'Profit Share - Flexible') {
          balanceAtDate(contract, period.startDate, (err, data) => {
            openingBalance = data;
            cb(err);
          });
        } else {
          openingBalance = statement.openingBalance;
          cb();
        }
      },
      function (cb) {
        if (statement.contractType === 'Profit Share' && client.name !== 'Drag City') {
          const date = new Date(period.endDate);
          date.setDate(date.getDate() + 1);
          balanceAtDate(contract, date, {
            excludeAdvance: true, excludeReserves: true, excludeStatementPayments: true, statementId: statement._id.toString(),
          }, (err, data) => {
            closingBalance = data;
            cb(err);
          });
        } else if (client.name === 'Drag City') {
          const date = new Date(period.endDate);
          date.setDate(date.getDate() + 1);
          balanceAtDate(contract, date, { excludeAdvance: true, excludeReserves: true }, (err, data) => {
            closingBalance = data;
            cb(err);
          });
        } else if (client.name === 'Warp Records') {
          if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
            const date = new Date(period.endDate);
            date.setDate(date.getDate() + 1);
            balanceAtDate(contract, date, { excludeAdvance: true, excludeReserves: true }, (err, data) => {
              closingBalance = data;
              cb(err);
            });
          } else {
            closingBalance = statement.closingBalance;
            cb();
          }
        } else {
          closingBalance = statement.closingBalance;
          cb();
        }
      },
      function (cb) {
        // TODO when multiple payees are added do we show all payee info on the one statements?
        Payee.findOne({ _id: new ObjectId(contract.payees?.[0]?.payeeId) })
          .then((foundPayee) => {
            if (foundPayee) { payee = foundPayee; }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        // Reduce sales data to only this statement where required
        if (salesData && Array.isArray(salesData)) {
          salesData.forEach((line) => {
            if (line[0] == contract.name) {
              narrowedSalesData.push(line);
            }
          });
          cb();
        } else if (salesData && salesData[contract.name]) {
          narrowedSalesData = salesData[contract.name];
          cb();
        } else if (salesData) {
          narrowedSalesData = [];
          cb();
        } else {
          narrowedSalesData = null;
          cb();
        }
      },
    ], (err) => {
      if (err) {
        logger.error(`${statement.periodId} ${statement._id} PDF Statement Errored`, err);
        callback();
      } else {
        const object = {
          statementType: statementDesignData.statementType,
          statementDesign: statementDesignData.statementDesign,
          s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)}`,
          accessKey: process.env.S3_access_key,
          secretAccessKey: process.env.S3_secret_key,
          region: process.env.S3_region,
          bucket: process.env.S3_bucket,
          logo: statementDesignData.logo,
          s3LogoPath: statementDesignData.s3LogoPath,
          address: statementDesignData.address,
          removeFooterImage: statementDesignData.removeFooterImage,
          year: period.year,
          companyName: statementDesignData.companyName,
          accountingPeriod: period.accountingPeriod,
          date: statement.date,
          startDate: period.startDate,
          periodName: period.name,
          payeeName: payee ? payee.name : null,
          contractName: contract.name,
          contractType: contract.type,
          salesTerms: contract.salesTerms,
          deductionsTerms: contract.deductionsTerms,
          mechanicalTerms: contract.mechanicalTerms,
          costsTerms: contract.costsTerms,
          clientType: client.clientType,
          analysis,
          homeCurrency: statement.currency === 'Home Currency' ? client.homeCurrency : statement.currency,
          currencySymbol: client.currencySymbol,
          dateFormat: client.dateFormat,
          grossAmount: statement.grossAmount,
          netAmount: statement.netAmount,
          grossCosts: statement.grossCosts,
          netCosts: statement.netCosts,
          netOutput: statement.netOutput,
          reservesWithheld: statement.reservesWithheld,
          reservesReleased: statement.reservesReleased,
          offsetColour: statementDesignData.colour,
          contactEmail: statementDesignData.contactEmail,
          customText: statementDesignData.statementCustomText,
          profitShareRate: statement.profitShareRate,
          profitShareNetAmount: statement.profitShareNetAmount,
          profitShareBalance: statement.profitShareBalance,
          profitShareUnrecoupedAdvanceStart: statement.profitShareUnrecoupedAdvanceStart,
          profitShareAdvanceRecouped: statement.profitShareAdvanceRecouped,
          proRataGrossAmount: statement.proRataGrossAmount,
          otherTransactions: statement.otherTransactions,
          payments: statement.payments,
          openingBalance,
          closingBalance,
          runNo: period.runNo,
          transactions: contract.transactions,
          bigQuery,
          salesData: narrowedSalesData,
          salesTable: client.periodSalesDatabaseTable,
          costsTable: client.periodCostsDatabaseTable,
          salesTemplate: salesTemplate || config.exportTemplates.statementSales,
          costsTemplate: config.exportTemplates.statementCosts,
          filter: {
            periodId: statement.periodId,
            contractId: statement.contractId,
            royaltyRate: { $ne: 0 },
            objectPercentage: { $ne: 0 },
          },
        };
        customStatement(object, (err, file) => {
          if (err) {
            logger.error(`${statement.periodId} ${statement._id} PDF Statement Errored`, err);
            callback();
          } else {
            logger.info(`${statement.periodId} ${statement._id} Created Statement: ${file}`);
            Statement.findByIdAndUpdate(statement._id, { $set: { customStatement: file } })
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback();
              });
          }
        });
      }
    });
  },
  createPdf: (statement, bigQuery, client, period, contract, salesData, callback) => {
    let payee = {};
    let contractIds = [statement.contractId];
    // Copy Analysis
    let analysis = JSON.parse(JSON.stringify(statement.analysis));
    // Delete Unrequired Figures
    if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
      delete analysis.net.tracks;
      delete analysis.net.releases;
    } else {
      delete analysis.gross;
    }
    // Ensure analysis exists
    if (!analysis || !analysis.net) {
      analysis = { gross: {}, net: {} };
    }
    let statementDesignData; let transactions; let openingBalance; let closingBalance; let transactionalClosingBalance; let salesTemplate;
    async.waterfall([
      function (cb) {
        statementDesignDataRequest(contract, (err, data) => {
          statementDesignData = data;
          cb(err);
        });
      },
      function (cb) {
        const options = {};
        if (contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible') {
          options.excludeAdvance = true;
        }

        // @tom - seems to me that this call is doing nothing and can be replaced with : cb();
        // (in fact the excludeAdvance logic above can be moved and this whole async step removed)
        getAssociatedTransactions(contract, options, (err, data) => {
          transactions = data;
          cb(err);
        });
      },
      function (cb) {
        if (statement.contractType !== 'Profit Share' && statement.contractType !== 'Profit Share - Flexible') {
          balanceAtDate(contract, period.startDate, (err, data) => {
            openingBalance = data;
            cb(err);
          });
        } else {
          openingBalance = statement.openingBalance;
          cb();
        }
      },
      function (cb) {
        if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
          const date = new Date(period.endDate);
          date.setDate(date.getDate() + 1);
          balanceAtDate(contract, date, { excludeAdvance: true, excludeReserves: true }, (err, data) => {
            closingBalance = data;
            cb(err);
          });
        } else {
          closingBalance = statement.closingBalance;
          cb();
        }
      },
      function (waterfallCb) {
        // Get transactional closing balance
        transactionalClosingBalance = openingBalance;
        if (contract.transactions.length > 0) {
          // Remove any future transactions
          contract.transactions = contract.transactions.map((transaction) => {
            // Set date to beginning of next day, to include all transactions
            const endDate = new Date(statement.date);
            endDate.setDate(endDate.getDate() + 1);
            endDate.setUTCHours(0, 0, 0, 0);
            if (transaction.date < endDate && transaction.date >= period.startDate) {
              return transaction;
            }
          }).filter(Boolean);
          // Get closing balance from last transaction in this time period
          if (contract.transactions[contract.transactions.length - 1]) { transactionalClosingBalance = contract.transactions[contract.transactions.length - 1].balance; }
          waterfallCb();
        } else {
          waterfallCb();
        }
      },
      function (waterfallCb) {
        // Get Select Fields
        let report;
        Report.findById(statementDesignData.salesReportTemplate)
          .then((foundReport) => {
            report = foundReport;
          })
          .catch((err) => {
            logger.error(err);
          })
          .finally(() => {
            // Set template baesd on if report is present or not
            if (report) {
              salesTemplate = report.fields;
              // Find index of contractName if it exists
              let index = -1;
              salesTemplate.forEach((item, itemIndex) => {
                if (item.field === 'contractName') {
                  index = itemIndex;
                }
              });
              if (index !== -1) { salesTemplate.splice(index, 1); }
              // Add contract name to start of custom reports
              salesTemplate.unshift({ field: 'contractName', header: 'Contract Name', type: 'Selector' });
            } else if (client.clientType === 'Publisher') {
              salesTemplate = config.exportTemplates.statementPublishing;
            } else if (period.contractType === 'Mechanical') {
              salesTemplate = config.exportTemplates.statementMechanicals;
            } else {
              salesTemplate = config.exportTemplates.statementSales;
            }
            waterfallCb();
          });
      },
      function (waterfallCb) {
        // Get Contracts transferring into the contract
        associatedAddToContractIds(statement, (err, associatedContractIds) => {
          // Add associatedContractIds to contractIds for filtering when no sales data is present - when statement is run singularly
          contractIds = contractIds.concat(associatedContractIds);
          Contract.find({ _id: associatedContractIds.map((id) => new ObjectId(id)) }, 'name')
            .then((contracts) => {
              // Create contract names array
              const contractNames = contracts.map((contract) => contract.name);
              waterfallCb(null, contractNames);
            })
            .catch((err) => {
              logger.error(err);
              waterfallCb(err);
            });
        });
      },
      function (contractNames, waterfallCb) {
        // Reduce sales data to only this statement where required
        if (salesData && Array.isArray(salesData)) {
          const output = [];
          salesData.forEach((line) => {
            contractNames.forEach((contractName) => {
              if (line[0] == contractName) {
                output.push(line);
              }
            });
          });
          salesData = output;
          waterfallCb();
        } else if (salesData) {
          const output = [];
          contractNames.forEach((contractName) => {
            if (salesData[contractName]) {
              salesData[contractName].forEach((line) => {
                output.push(line);
              });
            }
          });
          salesData = output;
          waterfallCb();
        } else {
          waterfallCb();
        }
      },
      function (waterfallCb) {
        // When client is using payee balance setup on contract we do not display the Payee Address incase of multiple addresses
        // If condition is set to Never, it means the client is using payee balances and therefore we do not display the payee address
        // If there are no payees, we also do not display the payee address, this is to mitigate any BSON errors from mongo if we pass an undefined ID
        if (contract.payeeBalanceCondition !== 'Never' || !contract.payees?.length) {
          payee = {};
          return waterfallCb();
        }

        Payee.findById(contract.payees?.[0]?.payeeId)
          .then((foundPayee) => {
            payee = foundPayee || {};
            waterfallCb();
          })
          .catch((err) => {
            logger.error(err);
            payee = {};
            waterfallCb();
          });
      },
    ], (err) => {
      if (err) {
        logger.error(`${statement.periodId} ${statement._id} PDF Statement Errored`, err);
        callback();
      } else {
        // Set currency symbol for mechanicals
        let { currencySymbol } = client;
        let { homeCurrency } = client;
        homeCurrency = contract.currency && contract.currency !== 'Home Currency' ? contract.currency : homeCurrency;
        currencySymbol = getSymbolFromCurrency(homeCurrency);
        const object = {
          periodType: statement.periodType,
          statementType: statementDesignData.statementType,
          statementDesign: statementDesignData.statementDesign,
          s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)}.pdf`,
          accessKey: process.env.S3_access_key,
          secretAccessKey: process.env.S3_secret_key,
          region: process.env.S3_region,
          bucket: process.env.S3_bucket,
          logo: statementDesignData.logo,
          s3LogoPath: statementDesignData.s3LogoPath,
          companyName: statementDesignData.companyName,
          address: statementDesignData.address,
          statementHeaderType: statementDesignData.statementHeaderType,
          removeFooterImage: statementDesignData.removeFooterImage,
          year: period.year,
          accountingPeriod: period.accountingPeriod,
          date: statement.date,
          startDate: period.startDate,
          periodName: period.name,
          contractName: contract.name,
          contractType: contract.type,
          clientType: client.clientType,
          suppressZeroValue: statementDesignData.suppressZeroValueInExport,
          analysis,
          homeCurrency,
          currencySymbol,
          dateFormat: client.dateFormat,
          grossAmount: statement.grossAmount,
          netAmount: statement.netAmount,
          grossCosts: statement.grossCosts,
          netCosts: statement.netCosts,
          netOutput: statement.netOutput,
          reservesWithheld: statement.reservesWithheld,
          reservesReleased: statement.reservesReleased,
          offsetColour: statementDesignData.colour,
          contactEmail: statementDesignData.contactEmail,
          customText: statementDesignData.statementCustomText,
          profitShareRate: statement.profitShareRate,
          profitShareNetAmount: statement.profitShareNetAmount,
          profitShareBalance: statement.profitShareBalance,
          profitShareUnrecoupedAdvanceStart: statement.profitShareUnrecoupedAdvanceStart,
          profitShareAdvanceRecouped: statement.profitShareAdvanceRecouped,
          feesInvoiceTaxAmount: statement.feesInvoiceTaxAmount,
          otherTransactions: statement.otherTransactions,
          payments: statement.payments,
          openingBalance,
          closingBalance,
          transactionalClosingBalance,
          runNo: period.runNo,
          transactions: contract.transactions,
          bigQuery,
          salesTable: client.periodSalesDatabaseTable,
          costsTable: client.periodCostsDatabaseTable,
          filter: {
            periodId: statement.periodId,
            contractId: { $in: contractIds },
            royaltyRate: { $ne: 0 },
            objectPercentage: { $ne: 0 },
          },
          salesData,
          salesTemplate,
          payeeName: payee.name,
          payeeAddress: payee.address,
          payeeCountry: payee.country,
          autoPayment: {
            triggerAutoPayment: statement.autoPaymentTriggered,
            reason: statement.autoPaymentNotTriggeredReason,
          },
          withholdingTax: statement.withholdingTax,
          deductionAmount: statement.deductionAmount,
          displaySeparatedDeductions: statement.displaySeparatedDeductions,
          customDeductionName: statement.customDeductionName,
          inTrial: !client.billing?.stripePaymentMethod && moment(client.createdAt).isSameOrAfter(moment().subtract(14, 'days').format()) && client.billing?.billingType === 'Card',
        };

        pdfStatement(object, (err, pdf) => {
          if (err) {
            logger.error(`${statement.periodId} ${statement._id} PDF Statement Errored:`, err);
            callback();
          } else {
            logger.info(`${statement.periodId} ${statement._id} Created PDF: ${pdf}`);
            Statement.findByIdAndUpdate(statement._id, { $set: { pdf } })
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          }
        });
      }
    });
  },
  createTransactionPdf: (statement, client, period, originalContract, callback) => {
    let closingBalance;
    let openingBalance;
    let payee;
    Contract.findById(originalContract._id)
      .then((contract) => {
        async.waterfall([
          function (waterfallCb) {
            const options = statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible' ? { excludeReserves: true, excludeReserveReleased: true } : { excludeReserveReleased: true };
            balanceAtDate(contract, period.startDate, options, (err, opening) => {
              closingBalance = opening;
              openingBalance = opening;
              waterfallCb(err);
            });
          },
          function (waterfallCb) {
            const options = statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible' ? { excludeReserveReleased: true } : {};
            getAssociatedTransactions(contract, options, waterfallCb);
          },
          function (waterfallCb) {
            if (contract.transactions.length > 0) {
              // Remove any future transactions
              contract.transactions = contract.transactions.map((transaction) => {
                // Set date to beginning of next day, to include all transactions
                const endDate = new Date(statement.date);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setUTCHours(0, 0, 0, 0);
                if (transaction.date < endDate && transaction.date >= period.startDate) {
                  return transaction;
                }
              }).filter(Boolean);
              // Get closing balance from last transaction in this time period
              if (contract.transactions[contract.transactions.length - 1]) { closingBalance = contract.transactions[contract.transactions.length - 1].balance; }
              waterfallCb();
            } else {
              waterfallCb();
            }
          },
          function (waterfallCb) {
            // When client is using payee balance setup on contract we do not display the Payee Address incase of multiple addresses
            // If condition is set to Never, it means the client is using payee balances and therefore we do not display the payee address
            // If there are no payees, we also do not display the payee address, this is to mitigate any BSON errors from mongo if we pass an undefined ID
            if (contract.payeeBalanceCondition !== 'Never' || !contract.payees?.length) {
              payee = {};
              return waterfallCb();
            }

            Payee.findById(contract.payees?.[0]?.payeeId)
              .then((foundPayee) => {
                payee = foundPayee || {};
                waterfallCb();
              })
              .catch((err) => {
                logger.error(err);
                payee = {};
                waterfallCb();
              });
          },
          function (waterfallCb) {
            statementDesignDataRequest(contract, waterfallCb);
          },
          function (statementDesignData, waterfallCb) {
            // Set currency symbol for mechanicals
            let { currencySymbol } = client;
            let { homeCurrency } = client;
            homeCurrency = contract.currency && contract.currency !== 'Home Currency' ? contract.currency : homeCurrency;
            currencySymbol = getSymbolFromCurrency(homeCurrency);
            const object = {
              statementType: statementDesignData.statementDesign,
              s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Statement of Account.pdf`,
              accessKey: process.env.S3_access_key,
              secretAccessKey: process.env.S3_secret_key,
              region: process.env.S3_region,
              bucket: process.env.S3_bucket,
              logo: statementDesignData.logo,
              s3LogoPath: statementDesignData.s3LogoPath,
              companyName: statementDesignData.companyName,
              address: statementDesignData.address,
              statementHeaderType: statementDesignData.statementHeaderType,
              removeFooterImage: statementDesignData.removeFooterImage,
              offsetColour: statementDesignData.colour,
              contactEmail: statementDesignData.contactEmail,
              customText: statementDesignData.statementOfAccountCustomText,
              year: period.year,
              accountingPeriod: period.accountingPeriod,
              periodName: `${period.accountingPeriod} ${period.year}`,
              contractName: contract.name,
              date: statement.date,
              homeCurrency,
              currencySymbol,
              dateFormat: client.dateFormat,
              transactions: contract.transactions,
              openingBalance,
              closingBalance,
              runNo: period.runNo,
              payeeName: payee.name,
              payeeAddress: payee.address,
              payeeCountry: payee.country,
              autoPayment: {
                triggerAutoPayment: statement.autoPaymentTriggered,
                reason: statement.autoPaymentNotTriggeredReason,
              },
              inTrial: !client.billing?.stripePaymentMethod && moment(client.createdAt).isSameOrAfter(moment().subtract(14, 'days').format()) && client.billing?.billingType === 'Card',
            };
            pdfTransactionStatement(object, (err, pdf) => {
              if (err) {
                logger.error(`${statement.periodId} ${statement._id} Statement of Account Errored`, err);
                waterfallCb();
              } else {
                logger.info(`${statement.periodId} ${statement._id} Created Statement of Account: ${pdf}`);
                Statement.findByIdAndUpdate(statement._id, { $set: { statementOfAccount: pdf } })
                  .then(() => {
                    waterfallCb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    waterfallCb();
                  });
              }
            });
          },
        ], callback);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  createSelfBillingPdf: (statement, client, period, contract, callback) => {
    statementDesignDataRequest(contract, (err, statementDesignData) => {
      let payee = {};
      // Project Bongo: Had to use a finally block to ensure payee is set before proceeding with promisifying
      // There will always be one payee in this scenario as self billing switch will be off when 'Never' is set
      Payee.findById(contract.payees?.[0]?.payeeId)
        .then((foundPayee) => {
          if (foundPayee) { payee = foundPayee; }
        })
        .catch((err) => {
          logger.error(err);
        })
        .finally(() => {
          // Get Opening Balance
          const options = statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible' ? { excludeAdvance: true, excludeReserves: true } : {};
          balanceAtDate(contract, period.startDate, options, (err, openingBalance) => {
            // Get Closing Balance
            const date = new Date(period.endDate);
            date.setDate(date.getDate() + 1);
            balanceAtDate(contract, date, { excludeAdvance: true, excludeReserves: true }, (err, closing) => {
              // Get any payments or VAT
              const startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
              const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
              // Project Bongo: Had to use a finally block to ensure logic remains the same without duplicating code
              let payments;
              Transaction.find({
                clientId: statement.clientId, contractId: statement.contractId, date: { $gte: startDate, $lte: endDate }, type: { $in: ['Payment', 'Tax'] },
              })
                .then((foundPayments) => {
                  payments = foundPayments;
                })
                .catch((err) => {
                  logger.error(err);
                })
                .finally(() => {
                  let closingBalance = client.clientType === 'Distributor' || contract.statementDesign === 'Distribution' ? statement.grossAmount : statement.closingBalance;
                  if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
                    closingBalance = statement.grossAmount;
                  } else if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
                    // Specific logic for self billing
                    if (statement.contractType === 'Profit Share - Flexible' && contract.selfBilling && openingBalance < contract.minPayout && closingBalance > contract.minPayout) {
                      closingBalance = closing;
                    } else {
                      closingBalance = openingBalance > 0 ? closing - openingBalance : closing;
                    }

                    payments.forEach((payment) => {
                      closingBalance -= payment.amount;
                    });
                  } else {
                    // This takes the tax basis as the input
                    closingBalance = statement.taxBasis;
                  }
                  // Set currency symbol
                  let { currencySymbol } = client;
                  let { homeCurrency } = client;
                  homeCurrency = contract.currency && contract.currency !== 'Home Currency' ? contract.currency : homeCurrency;
                  currencySymbol = getSymbolFromCurrency(homeCurrency);
                  const object = {
                    statementType: statementDesignData.statementDesign,
                    s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Self Billing Invoice.pdf`,
                    accessKey: process.env.S3_access_key,
                    secretAccessKey: process.env.S3_secret_key,
                    region: process.env.S3_region,
                    bucket: process.env.S3_bucket,
                    logo: statementDesignData.logo,
                    s3LogoPath: statementDesignData.s3LogoPath,
                    companyName: statementDesignData.companyName,
                    address: statementDesignData.address,
                    vatNo: statementDesignData.vatNo,
                    removeFooterImage: statementDesignData.removeFooterImage,
                    offsetColour: statementDesignData.colour,
                    contactEmail: statementDesignData.contactEmail,
                    year: period.year,
                    accountingPeriod: period.accountingPeriod,
                    periodName: `${period.accountingPeriod} ${period.year}`,
                    contractName: contract.name,
                    clientType: client.clientType,
                    date: period.accountingDate,
                    homeCurrency,
                    currencySymbol,
                    dateFormat: client.dateFormat,
                    payeeName: payee.name,
                    payeeAddress: payee.address,
                    payeeCountry: payee.country,
                    payeeVatNo: payee.vatNo,
                    selfBillingTaxText: payee.selfBillingTaxText && payee.selfBillingTaxText !== '' ? payee.selfBillingTaxText : client.selfBillingTaxText,
                    selfBillingTaxAmount: statement.selfBillingTaxAmount,
                    selfBillingTaxRate: statement.selfBillingTaxRate,
                    selfBillingInvoiceNo: statement.selfBillingInvoiceNo,
                    withholdingTaxAmount: statement.withholdingTax,
                    withholdingTaxRate: payee.withholdingTaxRate,
                    withholdingTaxWording: payee.withholdingTaxWording,
                    customText: statementDesignData.selfBillingTaxCustomText,
                    grossAmount: statement.grossAmount,
                    closingBalance,
                    runNo: period.runNo,
                    multiCurrency: ['Virgin Music UK', 'Virgin Music UK - Royalty Statements'].includes(client.name), // Only send multicurrency self billing for Virgin
                    exchangeRates: period.currencyExchangeRates,
                    suppressZeroTaxLine: statementDesignData.suppressZeroTaxLine,
                  };
                  pdfSelfBillingInvoice(object, (err, pdf) => {
                    if (err) {
                      logger.error(`${statement.periodId} ${statement._id} Self Billing Statement Errored`, err);
                      callback();
                    } else {
                      logger.info(`${statement.periodId} ${statement._id} Created Self Billing Invoice: ${pdf}`);
                      Statement.findByIdAndUpdate(statement._id, { $set: { selfBillingInvoice: pdf } })
                        .then(() => {
                          callback();
                        })
                        .catch((err) => {
                          logger.error(err);
                          callback();
                        });
                    }
                  });
                });
            });
          });
        });
    });
  },
  createFeesInvoicePdf: (statement, client, period, contract, callback) => {
    statementDesignDataRequest(contract, (err, statementDesignData) => {
      // There will always be one payee in this scenario as self billing switch will be off when 'Never' is set
      let payee = {};
      Payee.findById(contract.payees?.[0]?.payeeId)
        .then((foundPayee) => {
          if (foundPayee) { payee = foundPayee; }
        })
        .catch((err) => {
          logger.error(err);
        })
        .finally(() => {
          // Set currency symbol
          let { currencySymbol } = client;
          let { homeCurrency } = client;
          homeCurrency = contract.currency && contract.currency !== 'Home Currency' ? contract.currency : homeCurrency;
          currencySymbol = getSymbolFromCurrency(homeCurrency);
          const object = {
            statementType: statementDesignData.statementDesign,
            s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Fees Invoice.pdf`,
            accessKey: process.env.S3_access_key,
            secretAccessKey: process.env.S3_secret_key,
            region: process.env.S3_region,
            bucket: process.env.S3_bucket,
            logo: statementDesignData.logo,
            s3LogoPath: statementDesignData.s3LogoPath,
            companyName: statementDesignData.companyName,
            address: statementDesignData.address,
            vatNo: statementDesignData.vatNo,
            removeFooterImage: statementDesignData.removeFooterImage,
            offsetColour: statementDesignData.colour,
            contactEmail: statementDesignData.contactEmail,
            year: period.year,
            accountingPeriod: period.accountingPeriod,
            periodName: `${period.accountingPeriod} ${period.year}`,
            contractName: contract.name,
            date: period.accountingDate,
            homeCurrency,
            currencySymbol,
            dateFormat: client.dateFormat,
            payeeName: payee.name,
            payeeAddress: payee.address,
            payeeCountry: payee.country,
            payeeVatNo: payee.vatNo,
            grossAmount: statement.grossAmount,
            netAmount: statement.netAmount,
            grossCosts: statement.grossCosts,
            netCosts: statement.netCosts,
            selfBillingTaxText: client.selfBillingTaxText,
            feesInvoiceTaxAmount: 0 - statement.feesInvoiceTaxAmount,
            feesInvoiceTaxRate: statement.feesInvoiceTaxRate,
            feesInvoiceNo: statement.feesInvoiceNo,
            customText: statementDesignData.feesInvoiceCustomText,
            runNo: period.runNo,
            multiCurrency: ['Virgin Music UK', 'Virgin Music UK - Royalty Statements'].includes(client.name), // Only send multicurrency self billing for Virgin
            exchangeRates: period.currencyExchangeRates,
            suppressZeroTaxLine: statementDesignData.suppressZeroTaxLine,
            customFeesInvoiceTitle: statementDesignData.customFeesInvoiceTitle,
          };
          pdfFeesInvoice(object, (err, pdf) => {
            if (err) {
              logger.error(`${statement.periodId} ${statement._id} Fees Invoice Errored`, err);
              callback();
            } else {
              logger.info(`${statement.periodId} ${statement._id} Created Fees Invoice: ${pdf}`);
              Statement.findByIdAndUpdate(statement._id, { $set: { feesInvoice: pdf } })
                .then(() => {
                  callback();
                })
                .catch((err) => {
                  logger.error(err);
                  callback();
                });
            }
          });
        });
    });
  },
  createSalesCsv: (statement, bigQuery, client, salesData, callback) => {
    let statementDesignData;

    async.waterfall([
      function (cb) {
        Contract.findById(statement.contractId)
          .then((contract) => {
            statementDesignDataRequest(contract, (err, data) => {
              statementDesignData = data;
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Get Contracts transferring into the contract
        associatedAddToContractIds(statement, (err, contractIds) => {
          Contract.find({ _id: contractIds.map((id) => new ObjectId(id)) }, 'name')
            .then((contracts) => {
              const contractNames = contracts.map((contract) => contract.name);
              cb(null, contractIds, contractNames);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        });
      },
      function (contractIds, contractNames, cb) {
        // Reduce sales data to only this statement where required
        if (salesData && Array.isArray(salesData)) {
          const output = [];
          salesData.forEach((line) => {
            contractNames.forEach((contractName) => {
              if (line[0] == contractName) {
                output.push(line);
              }
            });
          });
          cb(null, contractIds, output);
        } else if (salesData) {
          const output = [];
          contractNames.forEach((contractName) => {
            if (salesData[contractName]) {
              salesData[contractName].forEach((line) => {
                output.push(line);
              });
            }
          });
          cb(null, contractIds, output);
        } else {
          cb(null, contractIds, null);
        }
      },
      function (contractIds, data, cb) {
        const filter = {
          periodId: statement.periodId,
          contractId: { $in: contractIds },
          objectPercentage: { $ne: 0 },
        };

        const alwaysKeep = {
          $or: [
            { royaltyRate: { $ne: 0 } },
            { contractCurrencyCalculationOutput: { $ne: 0 } },
          ],
        };

        if (statementDesignData.suppressZeroValueInExport) {
          filter.$and = [
            alwaysKeep,
            {
              $or: [
                { contractCurrencyCalculationOutput: { $ne: 0 } },
                { royaltyRate: 0 },
              ],
            },
          ];
        } else {
          filter.$and = [alwaysKeep];
        }

        // Add partitions to the filter from the included contract IDs - done here to allow for any associated add tos to be added first
        Statement.find({ clientId: statement.clientId, periodId: statement.periodId, contractId: { $in: filter.contractId.$in } }, 'partitionNo')
          .then((statements) => {
            // Set up array
            const partitionNos = [];
            // Loop through statements to get unique partition nos, including any null values - distinct in the DB does not return null values
            statements.forEach((statement) => {
              if (!partitionNos.includes(statement.partitionNo) && statement.partitionNo !== undefined) {
                partitionNos.push(statement.partitionNo);
              }
            });
            // Check for any null values
            if (partitionNos.indexOf(null) !== -1) {
              const partitionsWithoutNull = partitionNos.filter(Boolean);
              filter.$or3 = [{ contractPartitionNo: null }];
              if (partitionsWithoutNull.length > 0) {
                filter.$or3.push({ contractPartitionNo: { $in: partitionsWithoutNull } });
              }
            } else {
              filter.contractPartitionNo = { $in: partitionNos };
            }
            cb(null, contractIds, data, filter);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (contractIds, data, filter, cb) {
        let report;
        Report.findById(statementDesignData.salesReportTemplate)
          .then((foundReport) => {
            report = foundReport;
          })
          .catch((err) => {
            logger.error(err);
          })
          .finally(() => {
            // Set template based on if report is present or not
            const format = report?.format;

            // To account for company specific reports, we can remove the current data and query it again with the correct columns
            if ((report?._id.toString() !== client.salesReportTemplate) && data) { data = null; }

            let template;
            if (report) {
              template = report.fields;
              // Find index of contractName if it exists
              let index = -1;
              template.forEach((item, itemIndex) => {
                if (item.field === 'contractName') {
                  index = itemIndex;
                }
              });
              if (index !== -1) { template.splice(index, 1); }
              // Add contract name to start of custom reports
              template.unshift({
                field: 'contractName', header: 'Contract Name', type: 'Selector',
              });
            } else if (client.clientType === 'Publisher') {
              template = config.exportTemplates.statementPublishing;
            } else if (statement.periodType === 'Mechanical') {
              template = config.exportTemplates.statementMechanicals;
            } else {
              template = config.exportTemplates.statementSales;
            }

            // Get client mappings - not required when data is passed
            if (report && !data) {
              const options = {
                formatDates: true,
                joinArraysToString: true,
              };
              CatalogueOverwritingData.get(client, options, (err, mappingData) => {
                if (report.fields.map((field) => field.field).includes('workIsrcs')) {
                  mappingData = getWorkIsrcs(mappingData);
                }
                cb(err, template, contractIds, data, filter, mappingData, format);
              });
            } else {
              cb(null, template, contractIds, data, filter, null, format);
            }
          });
      },
      function (template, contractIds, data, filter, mappingData, format, cb) {
        if (data) {
          logger.debug(`${statement.periodId} ${statement._id} Data Size:`, data.length);
        }
        // Setup file name
        const fileName = client.clientType === 'Publisher' ? `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Income Export.csv` : `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Sales Export.csv`;
        // Build object for statement building
        const object = {
          bigQuery,
          databaseTable: client.bigQueryPeriodSales,
          filter,
          template,
          sort: { catalogueCatNo: 1, catalogueIsrc: 1, source: 1 },
          totalsRow: statementDesignData.statementIncludeTotalsRow,
          // We always want it disabled because the new filter logic will be applied from above when the suppression is applied
          suppressZeroValue: false,
          data,
          s3WriteKey: fileName,
          s3AccessKey: process.env.S3_access_key,
          s3SecretKey: process.env.S3_secret_key,
          s3Region: process.env.S3_region,
          s3Bucket: process.env.S3_bucket,
          mappingData,
          format,
        };
        writeCsv(object, (err, csv) => {
          if (err) {
            logger.error(`${statement.periodId} ${statement._id} Sales CSV Errored`, err);
            cb();
          } else {
            logger.info(`${statement.periodId} ${statement._id} Created Sales CSV: ${csv}`);
            Statement.findByIdAndUpdate(statement._id, { $set: { salesCsv: csv } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.error(err);
                cb();
              });
          }
        });
      },
    ], callback);
  },
  createCostsCsv: (statement, bigQuery, client, callback) => {
    let statementDesignData;
    async.series([
      (cb) => {
        Contract.findById(statement.contractId)
          .then((contract) => {
            statementDesignDataRequest(contract, (err, data) => {
              statementDesignData = data;
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      (cb) => {
        let report;
        Report.findById(statementDesignData.costsReportTemplate)
          .then((foundReport) => {
            report = foundReport;
          })
          .catch((err) => {
            logger.error(err);
          })
          .finally(() => {
            const template = report ? report.fields : config.exportTemplates.statementCosts;
            const format = report?.format;

            if (report) {
              // Find index of contractName if it exists
              let index = -1;
              template.forEach((item, itemIndex) => {
                if (item.field === 'contractName') {
                  index = itemIndex;
                }
              });
              if (index !== -1) { template.splice(index, 1); }
              // Add contract name to start of custom reports
              template.unshift({ field: 'contractName', header: 'Contract Name', type: 'Selector' });
            }
            // Get Contracts transferring into the contract
            associatedAddToContractIds(statement, (err, contractIds) => {
              // Build object for statement building
              const object = {
                bigQuery,
                databaseTable: client.bigQueryPeriodCosts,
                filter: { periodId: statement.periodId, contractId: { $in: contractIds } },
                template,
                totalsRow: statementDesignData.statementIncludeTotalsRow,
                suppressZeroValue: statementDesignData.suppressZeroValueInExport,
                s3WriteKey: `statements/${statement._id.toString()}/${utils.safeName(statement.name)} Costs Export.csv`,
                s3AccessKey: process.env.S3_access_key,
                s3SecretKey: process.env.S3_secret_key,
                s3Region: process.env.S3_region,
                s3Bucket: process.env.S3_bucket,
                format,
              };
              writeCsv(object, (err, csv) => {
                if (err) {
                  logger.error(`${statement._id} Costs CSV Errored`);
                  logger.error(err);
                  callback();
                } else {
                  logger.info(`${statement._id} Created Costs CSV: ${csv}`);
                  Statement.findByIdAndUpdate(statement._id, { $set: { costsCsv: csv } })
                    .then(() => {
                      cb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      cb(err);
                    });
                }
              });
            });
          });
      },
    ], callback);
  },
  createZipOfFiles: (statement, callback) => {
    logger.info(`${statement.periodId} ${statement._id} Creating Statement Zip`);
    Statement.findById(statement._id)
      .then((statement) => {
        async.waterfall([
          function (cb) {
            const files = [];
            if (statement.salesCsv) { files.push(statement.salesCsv); }
            if (statement.costsCsv) { files.push(statement.costsCsv); }
            if (statement.pdf) { files.push(statement.pdf); }
            if (statement.statementOfAccount) { files.push(statement.statementOfAccount); }
            if (statement.selfBillingInvoice) { files.push(statement.selfBillingInvoice); }
            if (statement.feesInvoice) { files.push(statement.feesInvoice); }
            if (statement.customStatement) { files.push(statement.customStatement); }
            if (statement.platoonRevenueReport) { files.push(statement.platoonRevenueReport); }
            cb(null, files);
          },
          function (files, cb) {
            const safeName = utils.safeName(statement.name);
            createZip.s3Files(files, process.env.S3_bucket, `${appRootDir}/tmp/${safeName} All Files ${moment().format('YYYYMMDDHHmmssSSS')}.zip`, (err, zipFile) => {
              if (err) {
                return cb(err);
              }
              fileManager.uploadToS3(`statements/${statement._id.toString()}/${safeName} All Files.zip`, zipFile, (err, key) => {
                fs.unlink(zipFile, () => {
                  Statement.findByIdAndUpdate(statement._id, { $set: { allFilesZip: key } })
                    .then(() => {
                      cb();
                    })
                    .catch((err) => {
                      cb(err);
                    });
                });
              });
            });
          },
        ], callback);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
};

module.exports = CreateFiles;
