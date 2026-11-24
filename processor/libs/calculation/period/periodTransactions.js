const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const _ = require('lodash');
const { ObjectId } = require('mongodb');

const Statement = require('../../../models/statement');
const Contract = require('../../../models/contract');

const StatementTransactions = require('../statement/statementTransactions');
const SubtractFromTransactions = require('../statement/subtractFromTransactions');
const AddToTransactions = require('../statement/addToTransactions');
const TaxAmounts = require('../statement/taxAmounts');
const ProfitShare = require('../profitShare');
const setClosingBalance = require('../statement/closingBalance');
const AutoPayments = require('../statement/autoPayments');

const PeriodTransactions = {
  create: (period, db, client, generatePayments, callback) => {
    const { recalculation } = period;
    // Get all statements ordered regardless of recalculation
    Statement.find({ clientId: period.clientId, periodId: period._id.toString() })
      .then((statements) => {
        // Needs to be looped through multiple times, as it needs to happen in the following order to ensure transactions and the right totals are in place for each stage
        PeriodTransactions.orderStatements(statements, (err, orderedStatements) => {
          if (err) {
            logger.error(`${period._id} Errored in Ordering Statements`, err);
            callback(err);
          }

          // Only create transaction data for modified contracts when running partial (unless recalc contains modified sales files, then process all)
          if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
            logger.info(`${period._id} Only creating period transactions for ${recalculation.contractIds}`);
            orderedStatements = _.filter(orderedStatements, (o) => recalculation.contractIds.includes(o.contractId));
          }

          async.waterfall([
            function (waterfallCb) {
              logger.debug('Creating Transactions');
              async.each(orderedStatements, (statement, cb) => {
                StatementTransactions.create(statement, client, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              if (client?.features?.dmp) return waterfallCb();
              logger.debug('Creating Subtract From Transactions');
              async.eachSeries(orderedStatements, (statement, cb) => {
                SubtractFromTransactions.create(statement, client, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Early Tax Transactions');
              async.eachSeries(orderedStatements, (statement, cb) => {
                TaxAmounts.createByStage(statement, 'Early', period, client, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              if (client?.features?.dmp) return waterfallCb();
              logger.debug('Creating Add To Transactions');
              async.eachSeries(orderedStatements, (statement, cb) => {
                AddToTransactions.create(statement, client, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Late Tax Transactions');
              async.eachSeries(orderedStatements, (statement, cb) => {
                TaxAmounts.createByStage(statement, 'Late', period, client, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Profit Share Transactions');
              async.each(orderedStatements, (statement, cb) => {
                ProfitShare.createTransactions(statement, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Closing Balance');
              async.each(orderedStatements, (statement, cb) => {
                setClosingBalance(statement, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Autopayments');
              async.eachLimit(orderedStatements, 5, (statement, cb) => {
                AutoPayments.create(statement, period, generatePayments, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              logger.debug('Creating Negatives Transfers');
              async.each(orderedStatements, (statement, cb) => {
                ProfitShare.manageNegativeBalanceFromTransfers(statement, period, (err) => {
                  cb();
                });
              }, waterfallCb);
            },
            function (waterfallCb) {
              // Profit Shares

              // When Statement is Profit Share and balance is positive, we need to set any payments
              // manageNegativeBalanceFromTransfers is where statement.payments get set, but this only happens when balance is negative
              // We use statement.payments to display the payments on the statement PDF
              async.each(orderedStatements, (statement, eachCb) => {
                ProfitShare.checkProfitSharePayments({ statement, period }).then(eachCb).catch(eachCb);
              }, waterfallCb);
            },
          ], callback);
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  orderStatements: (statements, callback) => {
    if (!Array.isArray(statements)) {
      callback(new Error('Requires an array to be passed'));
    } else {
      // Flush out any null values
      statements = statements.filter(Boolean);
      // Get contract IDs from statements
      const contractIds = statements.map((statement) => ObjectId.createFromHexString(statement.contractId));
      // Get contracts
      Contract.find({ _id: { $in: contractIds } }, { crossContracts: 1 })
        .then((contracts) => {
          // Sort by no of crossContracts, getting those without cross contracts first
          contracts.sort((a, b) => a.crossContracts.length - b.crossContracts.length);
          // Sort into order
          const sortedContractIds = [];
          contracts.forEach((contract) => {
            let earliestIndex = sortedContractIds.length;
            if (contract.crossContracts?.length > 0) {
              contract.crossContracts.forEach((crossContract) => {
                // Set earliest index to put this contract sooner than any others
                const currentIndex = sortedContractIds.indexOf(crossContract.contractId);
                if (currentIndex < earliestIndex) { earliestIndex = currentIndex; }
              });
            }

            // Make sure we're not adding the contractId to index -1
            if (earliestIndex < 0) { earliestIndex = 0; }

            sortedContractIds.splice(earliestIndex, 0, contract._id.toString());
          });
          // Set statements into contract order
          const output = [];
          statements.forEach((statement) => {
            // Get index of contract
            const index = sortedContractIds.indexOf(statement.contractId);
            // Set statement into contract
            output[index] = statement;
          });
          callback(null, output);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  },
};

module.exports = PeriodTransactions;
