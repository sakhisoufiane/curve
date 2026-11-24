const async = require('async');
const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../../../../models/contract');
const Company = require('../../../../models/company');
const Statement = require('../../../../models/statement');
const Transaction = require('../../../../models/transaction');

const headlineFigures = require('../../../singleStatementHeadlineFigures');
const analysisFigures = require('../../../singleStatementAnalysisFigures');
const calculationHelper = require('../../../calculationHelper');
const ProfitShare = require('../../profitShare');
const balanceAtDate = require('../../contract/balanceAtDate');
const currenciesToPrefix = require('../../../currenciesToPrefix');
const { statementHelpers } = require('../statementHelpers');

const GetStatementData = {
  getData: (statement, db, bigQuery, client, period, callback) => {
    let companyId;
    let company = {};
    async.waterfall([
      function (cb) {
        // Update statement currency
        Contract.findById(statement.contractId)
          .then((contract) => {
            if (contract) {
              ({ companyId } = contract);
              statement.currency = contract.currency;
              statement.save()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              cb();
            }
          })
          .catch((err) => {
            logger.error(err);
            cb();
          });
      },
      function (cb) {
        if (companyId) {
          Company.findById(companyId)
            .then((found) => {
              company = found || {};
              cb();
            })
            .catch((err) => {
              logger.error(err);
              company = {};
              cb();
            });
        } else {
          cb();
        }
      },
      function (cb) {
        GetStatementData.getReleasedReserves(statement, period, cb);
      },
      function (cb) {
        GetStatementData.getHeadlineData(statement, db, bigQuery, client, company, cb);
      },
      function (cb) {
        GetStatementData.getWithheldReserves(statement, period).then(cb).catch(cb);
      },
      function (cb) {
        Statement.findById(statement._id)
          .then((found) => {
            statement = found;
            GetStatementData.getAnalysisData(statement, db, bigQuery, client, company, cb);
          })
          .catch((err) => {
            logger.error(err);
            // Project Bongo: Previously it would have been a runtime error because of passing null or undefined to getAnalysisData,
            // Not sure if we should pass the error to cb here or not. It is in other functions so yolo
            cb(err);
          });
      },
      function (cb) {
        GetStatementData.setContractFigures(statement, db, cb);
      },
      function (cb) {
        if (statement.contractType === 'Profit Share') {
          ProfitShare.profitShare100Negative(statement, period, cb);
        } else if (statement.contractType === 'Profit Share - Flexible') {
          ProfitShare.profitShareSplitNegative(statement, period, cb);
        } else {
          cb();
        }
      },
    ], callback);
  },
  getReleasedReserves: (statement, period, callback) => {
    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    const startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
    const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
    Transaction.find({
      clientId: statement.clientId, contractId: statement.contractId, date: { $gte: startDate, $lte: endDate }, isReserveRelease: true,
    })
      .then((transactions) => {
        let reservesReleased = 0;
        if (transactions) {
          async.each(transactions, (transaction, cb) => {
            reservesReleased += transaction.amount;
            cb();
          }, (err) => {
            Statement.findByIdAndUpdate(statement._id, { $set: { reservesReleased } })
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          });
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback();
      });
  },
  getWithheldReserves: async (statement, period) => {
    // We're adding calculated reserves from the sales lines against any manual reserves withheld
    const foundStatement = await Statement.findById(statement._id).select({ reservesWithheld: 1 }).lean();
    const statementReserves = foundStatement?.reservesWithheld || 0;
    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    const startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
    const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
    const transactions = await Transaction.find({
      periodId: period._id,
      clientId: statement.clientId,
      contractId: statement.contractId,
      date: { $gte: startDate, $lte: endDate },
      isReserveWithholding: true,
      userCreated: true,
    });
    if (!transactions?.length) return;

    let reservesWithheld = 0 + statementReserves;
    transactions.forEach((transaction) => {
      reservesWithheld += transaction.amount;
    });
    await Statement.findByIdAndUpdate(statement._id, { $set: { reservesWithheld } });
  },
  getHeadlineData: (incomingStatement, db, bigQuery, client, company, callback) => {
    Statement.findById(incomingStatement._id)
      .then((statement) => {
        if (!statement) {
          return callback(new Error(`Could not find statement with the ID ${incomingStatement._id}`));
        }
        Contract.findById(statement.contractId)
          .then((contract) => {
            if (!contract) {
              return callback(new Error(`Could not find contract with the ID ${statement.contractId} in getting headline data`));
            }

            const currencyMappings = currenciesToPrefix(client);
            const prefix = statement.currency === 'Home Currency' ? 'homeCurrency' : currencyMappings[statement.currency];

            const object = {
              db,
              bigQuery,
              salesOutputDatabaseTable: client.periodSalesDatabaseTable,
              costsOutputDatabaseTable: client.periodCostsDatabaseTable,
              outputFilter: { periodId: statement.periodId, contractId: statement.contractId },
              salesOutputFilter: { periodId: statement.periodId, contractId: statement.contractId, royaltyRate: { $ne: 0 } },
              costsFilter: { periodId: statement.periodId, contractId: statement.contractId },
              prefix,
            };

            if (statement.partitionNo && !contract.summaryContractTotals) {
              object.outputFilter.contractPartitionNo = statement.partitionNo;
              object.salesOutputFilter.contractPartitionNo = statement.partitionNo;
            }

            const suppressZeroValueInExport = company.suppressZeroValueInExport || client.suppressZeroValueInExport;

            // New filter logic to reflect correct requirements (CUR-4404):
            // - If the Net Payable is zero, but the Royalty Rate is not zero = Only hide these lines if the “Suppress 0 Value Royalties on CSV” option is enabled in the client settings
            // - If the Net Payable is zero, and the Royalty Rate is zero = Always hide
            // - If the Net Payable is not zero, and the Royalty Rate is zero = Don’t hide
            // contractCurrencyCalculationOutput is net payable

            object.salesOutputFilter = {
              ...object.salesOutputFilter,
              objectPercentage: { $ne: 0 },
              $and: [
                // Always exclude (0, 0)
                {
                  $or: [
                    { royaltyRate: { $ne: 0 } },
                    { contractCurrencyCalculationOutput: { $ne: 0 } },
                  ],
                },
                // Optionally exclude (≠0, 0) if suppression is enabled
                ...(suppressZeroValueInExport
                  ? [
                    {
                      $or: [
                        { contractCurrencyCalculationOutput: { $ne: 0 } },
                        { royaltyRate: 0 },
                      ],
                    },
                  ]
                  : []),
              ],
            };

            // Set display separated deductions from the company settings, fallback to the client
            let displaySeparatedDeductions = false;
            let customDeductionName;

            if (contract.companyId && contract.contractType !== 'Mechanical') {
              displaySeparatedDeductions = company.displaySeparatedDeductions === true;
              customDeductionName = company.customDeductionName;
            } else if (contract.contractType !== 'Mechanical') {
              displaySeparatedDeductions = client.displaySeparatedDeductions === true;
              customDeductionName = client.customDeductionName;
            }

            headlineFigures(object, (err, output) => {
              if (err) {
                callback(err);
              } else {
                const units = output.units ? output.units : 0;
                let grossAmount = output.grossRevenue ? output.grossRevenue : 0;
                const proRataGrossAmount = output.proRataGrossAmount ? output.proRataGrossAmount : 0;
                const netAmount = output.netPayout ? output.netPayout : 0;
                const grossCosts = output.grossCosts ? output.grossCosts : 0;
                const netCosts = output.netCosts ? output.netCosts : 0;
                const reservesWithheld = output.reservesWithheld ? output.reservesWithheld : 0;
                const withholdingTax = output.withholdingTax ? output.withholdingTax : GetStatementData.ensurePositive(statement.withholdingTax);
                const lines = output.lines ? output.lines : 0;
                const deductionAmount = output.deduction ? output.deduction : 0;

                // Set gross amount to pro rata amount for distributors
                if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
                  grossAmount = proRataGrossAmount;
                }

                Statement.findByIdAndUpdate(statement._id, {
                  $set: {
                    units,
                    grossAmount,
                    proRataGrossAmount,
                    netAmount,
                    grossCosts,
                    netCosts,
                    reservesWithheld,
                    withholdingTax,
                    lines,
                    deductionAmount,
                    salesFilesIds: output.salesFileIds,
                    costIds: output.costIds,
                    contractType: contract.type,
                    profitShareRate: contract.profitSharePercentage,
                    netOutput: netAmount - netCosts,
                    displaySeparatedDeductions,
                    customDeductionName,
                  },
                }).then(() => {
                  callback();
                }).catch((err) => {
                  callback(err);
                });
              }
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(new Error(`Could not find contract with the ID ${statement.contractId} in getting headline data`));
          });
      })
      .catch((err) => {
        logger.error(err);
        callback(new Error(`Could not find statement with the ID ${incomingStatement._id}`));
      });
  },
  getAnalysisData: (statement, db, bigQuery, client, company, callback) => {
    // Find contract
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in getting analysis data`));
        }
        // Prepare query for AnalysisFigures
        const object = {
          db,
          bigQuery,
          client,
          type: 'Statement',
          salesOutputDatabaseTable: client.periodSalesDatabaseTable,
          costsOutputDatabaseTable: client.periodCostsDatabaseTable,
          outputFilter: { periodId: statement.periodId, contractId: statement.contractId },
          salesOutputFilter: { periodId: statement.periodId, contractId: statement.contractId },
          costsFilter: { periodId: statement.periodId, contractId: statement.contractId },
          outputSalesValue: 'contractCurrencyCalculationOutput',
        };

        if (statement.partitionNo && !contract.summaryContractTotals) {
          object.outputFilter.contractPartitionNo = statement.partitionNo;
          object.salesOutputFilter.contractPartitionNo = statement.partitionNo;
        }

        const suppressZeroValueInExport = company.suppressZeroValueInExport || client.suppressZeroValueInExport;
        // New filter logic to reflect correct requirements (CUR-4404):
        // - If the Net Payable is zero, but the Royalty Rate is not zero = Only hide these lines if the “Suppress 0 Value Royalties on CSV” option is enabled in the client settings
        // - If the Net Payable is zero, and the Royalty Rate is zero = Always hide
        // - If the Net Payable is not zero, and the Royalty Rate is zero = Don’t hide
        // contractCurrencyCalculationOutput is net payable

        // Always exclude: Royalty Rate = 0 AND Net Payable = 0
        object.salesOutputFilter = {
          ...object.salesOutputFilter,
          objectPercentage: { $ne: 0 },
          $and: [
            // Always exclude (0, 0)
            {
              $or: [
                { royaltyRate: { $ne: 0 } },
                { contractCurrencyCalculationOutput: { $ne: 0 } },
              ],
            },
            // Optionally exclude (≠0, 0) if suppression is enabled
            ...(suppressZeroValueInExport
              ? [
                {
                  $or: [
                    { contractCurrencyCalculationOutput: { $ne: 0 } },
                    { royaltyRate: 0 },
                  ],
                },
              ]
              : []),
          ],
        };

        // Call AnalysisFigures
        analysisFigures(object, (err, output) => {
          if (err) {
            // Handle Errors
            callback(err);
          } else {
            // Set gross amount to pro rata amount for distributors
            if (output && output.gross && (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution')) {
              // Update fields to take pro-rata amount rather than gross amount
              ['territories', 'distributionChannels', 'configurations', 'sources', 'subSources', 'releases', 'tracks', 'works'].forEach((field) => {
                if (output.gross[field]) {
                  output.gross[field] = output.gross[field].map((item) => {
                    item.value = item.proRataGrossAmount;
                    return item;
                  });
                }
              });
            }
            // Limit to top 10,000 releases, tracks and works
            const analysis = statementHelpers.sortAndLimitCatalogueAnalysisData(output, 10_000);
            // Update Statement Data
            Statement.findByIdAndUpdate(statement._id, { $set: { analysis } })
              .then(() => {
                callback();
              })
              .catch((err) => {
                callback(err);
              });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in getting analysis data`));
      });
  },
  setContractFigures: (statement, db, callback) => {
    // Get associated contract
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in setting contract figures`));
        }
        // Get the statement partition No
        calculationHelper.generateContractPartitionNo(statement.periodId, statement.contractId, (err, partitionNo) => {
          // Get closing balance
          balanceAtDate(contract, statement.date, { excludeAdvance: false }, (err, balance) => {
          // Set statement type
            statement.contractType = contract.type;
            // Set profit share balance
            // const profitShareNetAmount = 0;
            if (statement.netOutput && contract.profitSharePercentage) {
              statement.profitShareNetAmount = statement.netOutput * (contract.profitSharePercentage / 100);
            }
            statement.profitShareRate = contract.profitSharePercentage;
            Statement.findByIdAndUpdate(statement._id, {
              $set: {
                partitionNo, contractType: statement.contractType, profitShareNetAmount: statement.profitShareNetAmount, profitShareRate: statement.profitShareRate,
              },
            }).then(() => {
              callback();
            }).catch((err) => {
              callback(err);
            });
          });
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in setting contract figures`));
      });
  },
  ensurePositive: (value) => {
    if (value && value < 0) {
      return 0 - value;
    }
    return value;
  },
};

module.exports = GetStatementData;
