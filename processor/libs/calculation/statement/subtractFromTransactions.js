const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');
const Statement = require('../../../models/statement');
const Period = require('../../../models/period');

const getTransactionExchangeRateData = require('./getTransactionExchangeRateData');
const balanceAtDate = require('../contract/balanceAtDate');
const Autopayments = require('./autoPayments');

const SubtractFromTransactions = {
  create: (statement, client, period, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`));
        }
        async.waterfall([
          function (waterfallCb) {
            // Opening Balance
            // Get options
            const balanceOptions = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeReserves: true } : {};
            // Load balance
            balanceAtDate(contract, period.startDate, balanceOptions, waterfallCb);
          },
          function (openingBalance, waterfallCb) {
            // Closing Balance
            // Get date after closing balance
            const date = new Date(statement.date);
            date.setDate(date.getDate() + 1);
            // Get closing balance
            const balanceOptions = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeReserves: true } : {};
            balanceAtDate(contract, date, balanceOptions, (err, closingBalance) => {
              waterfallCb(err, openingBalance, closingBalance);
            });
          },
        ], (err, openingBalance, closingBalance) => {
          // Loop thorugh cross contracts
          async.each(contract.crossContracts, (crossContract, cb) => {
            // { condition: “Positive/Negative/Always”, process: “Add/Subtract”, contractId: “234”, percentage: "100" }
            async.waterfall([
              // Check if the transaction should be created
              (wcb) => {
                const accountingDate = new Date(period.endDate);
                accountingDate.setDate(accountingDate.getDate() + 1);

                if (crossContract
                  && crossContract.process === 'Subtract From'
                  && (crossContract.condition === 'Always'
                    || crossContract.condition === 'Always transfer Income'
                    || crossContract.condition === 'Always transfer Income and Costs'
                    || crossContract.condition === 'Always transer Income and Costs'
                    || crossContract.condition === 'Always transfer Income, Costs and Reserves'
                    || crossContract.condition === 'Always transfer Balance Minus Opening'
                    || (crossContract.condition === 'Positive' && closingBalance > 0)
                    || (crossContract.condition === 'Balance is Greater Than Minimum Payout' && closingBalance > contract.minPayout)
                    || (crossContract.condition === 'Balance Minus Opening is Positive' && closingBalance - openingBalance > 0)
                    || (crossContract.condition === 'Income is Positive' && statement.netAmount > 0)
                    || (crossContract.condition === 'Income and Costs are Positive' && statement.netAmount - statement.netCosts > 0)
                    || (crossContract.condition === 'Income, Costs and Reserves are Positive' && statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld > 0)
                    || (crossContract.condition === 'Negative' && closingBalance < 0)
                    || (crossContract.condition === 'Balance Minus Opening is Negative' && closingBalance - openingBalance < 0)
                    || (crossContract.condition === 'Income is Negative' && statement.netAmount < 0)
                    || (crossContract.condition === 'Income and Costs are Negative' && statement.netAmount - statement.netCosts < 0)
                    || (crossContract.condition === 'Income, Costs and Reserves are Negative' && statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld < 0)
                  )
                ) {
                  // Create transaction if not tied auto payments being triggered
                  if (!crossContract.whenAutoPaymentTriggered) {
                    wcb(null, true);
                  } else {
                    // Otherwise check that the auto payment has been triggered
                    Autopayments.triggerAutoPayment(statement, contract, accountingDate, (triggerAutoPayment) => {
                      wcb(null, triggerAutoPayment);
                    });
                  }
                } else {
                  wcb(null, false);
                }
              },
              (createTransaction, wcb) => {
                if (createTransaction) {
                  Contract.findById(crossContract.contractId)
                    .then((contractToCrossTo) => {
                      if (!contractToCrossTo) {
                        return wcb(new Error(`Could not find contract with ID ${crossContract.contractId}`));
                      }

                      const foundContractType = (contractToCrossTo.contractType === 'Mechanical') ? 'Mechanical' : 'Artist';
                      const contractType = (contract.contractType === 'Mechanical') ? 'Mechanical' : 'Artist';
                      // If the cross contracts don't have matching accounting periods or types => Add warning to the calculation notes
                      if (contract?.accountingPeriod === contractToCrossTo?.accountingPeriod && foundContractType === contractType) {
                        // Get amount depending on deduction amount
                        let amount = 0;
                        if (crossContract.condition === 'Positive' || crossContract.condition === 'Negative' || crossContract.condition === 'Always' || crossContract.condition === 'Balance is Greater Than Minimum Payout') {
                          amount = closingBalance;
                        } else if (crossContract.condition === 'Always transfer Balance Minus Opening' || crossContract.condition === 'Balance Minus Opening is Positive' || crossContract.condition === 'Balance Minus Opening is Negative') {
                          amount = closingBalance - openingBalance;
                        } else if (crossContract.condition === 'Always transfer Income' || crossContract.condition === 'Income is Positive' || crossContract.condition === 'Income is Negative') {
                          amount = statement.netAmount;
                        } else if (crossContract.condition === 'Always transfer Income and Costs' || crossContract.condition === 'Income and Costs are Positive' || crossContract.condition === 'Income and Costs are Negative') {
                          amount = statement.netAmount - statement.netCosts;
                        } else if (crossContract.condition === 'Always transfer Income, Costs and Reserves' || crossContract.condition === 'Income, Costs and Reserves are Positive' || crossContract.condition === 'Income, Costs and Reserves are Negative') {
                          amount = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
                        }
                        // Multiple netOutput by percentage if present
                        amount = crossContract.percentage ? amount * parseFloat(crossContract.percentage) / 100 : amount;
                        // Make negative if subtract in process
                        amount = 0 - amount;
                        // Get Statement to associate transaction - if contractToCrossTo has incorrect accounting period or contract type the statement will never exist under the periodId provided below.
                        Statement.findOne({ clientId: statement.clientId, periodId: period._id.toString(), contractId: contractToCrossTo._id.toString() })
                          .then((statementToCrossTo) => {
                            if (!statementToCrossTo) {
                              wcb(new Error(`Could not find statement to associate cross contract transaction with - ${statement}`));
                            } else {
                              // Get exchange rate data
                              const transactionExchangeRateData = getTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
                              // Create transaction
                              const transaction = new Transaction({
                                statementId: statementToCrossTo._id,
                                clientId: statement.clientId,
                                contractId: contractToCrossTo._id,
                                sourceContractId: contract._id.toString(),
                                name: transactionExchangeRateData.name,
                                type: 'Contract Payment',
                                transferringStatementId: statement._id.toString(),
                                date: statement.date,
                                userCreated: false,
                                amount: transactionExchangeRateData.amount,
                              });
                              transaction.save()
                                .then((transaction) => {
                                  wcb(null, transaction);
                                })
                                .catch((err) => {
                                  logger.error(err);
                                  wcb(err);
                                });
                            }
                          })
                          .catch((err) => {
                            logger.error(err);
                            wcb(new Error(`Could not find statement to associate cross contract transaction with - ${statement}`));
                          });
                      } else {
                        const message = {
                          type: 'Contract Error',
                          message: 'Cross contract should only be attached to a contract with the same accounting period and contract type',
                          runNo: period.runNo,
                          documentId: contract._id.toString(),
                          documentName: contract.name,
                          documentType: 'Contract',
                        };
                        Period.findByIdAndUpdate(period._id, { $push: { calculationNotes: message } }, { safe: true, upsert: true })
                          .then(() => {
                            wcb();
                          })
                          .catch((periodFindErr) => {
                            logger.error(periodFindErr);
                            wcb(periodFindErr);
                          });
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      wcb(new Error(`Could not find contract with ID ${crossContract.contractId}`));
                    });
                } else {
                  wcb();
                }
              },
            ], cb);
          }, callback);
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`));
      });
  },
};

module.exports = SubtractFromTransactions;
