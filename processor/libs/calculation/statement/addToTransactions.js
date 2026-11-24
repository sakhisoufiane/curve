const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');
const Statement = require('../../../models/statement');
const Period = require('../../../models/period');

const getTransactionExchangeRateData = require('./getTransactionExchangeRateData');
const { getCrossContractBaseName } = require('./getTransactionExchangeRateData');
const balanceAtDate = require('../contract/balanceAtDate');
const Autopayments = require('./autoPayments');

const AddToTransactions = {
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
          function (openingBalance, closingBalance, waterfallCb) {
            // Get Withholding and VAT transactions associated with statements
            let withholdingAmount = 0;
            let vatAmount = 0;
            Transaction.find({ statementId: statement._id.toString() })
              .then((transactions) => {
                if (transactions) {
                  transactions.forEach((transaction) => {
                    if (transaction.type === 'Withholding Tax') {
                      withholdingAmount += transaction.amount;
                    } else if (transaction.type === 'Tax') {
                      vatAmount += transaction.amount;
                    }
                  });
                  waterfallCb(null, openingBalance, closingBalance, withholdingAmount, vatAmount);
                } else {
                  waterfallCb();
                }
              })
              .catch((err) => {
                logger.error(`Error finding transactions in addToTransactions with statement id ${statement._id}: ${err.message}`, err);
                waterfallCb(err);
              });
          },
        ], (err, openingBalance, closingBalance, withholdingAmount, vatAmount) => {
          async.each(contract.crossContracts, (crossContract, cb) => {
            // { condition: “Positive/Negative/Always”, process: “Add/Subtract”, contractId: “234”, percentage: "100" }
            async.waterfall([
              // Check if the transaction should be created
              (wcb) => {
                const accountingDate = new Date(period.endDate);
                accountingDate.setDate(accountingDate.getDate() + 1);

                if (crossContract
                  && crossContract.process === 'Add To'
                  && (crossContract.condition === 'Always'
                    || crossContract.condition === 'Always transfer Income'
                    || crossContract.condition === 'Always transfer Income and Costs'
                    || crossContract.condition === 'Always transer Income and Costs'
                    || crossContract.condition === 'Always transfer Income, Costs and Reserves'
                    || (crossContract.condition === 'Balance is Greater Than Minimum Payout' && closingBalance > contract.minPayout)
                    || crossContract.condition === 'Always transfer Balance Minus Opening'
                    || (crossContract.condition === 'Positive' && closingBalance > 0)
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
                        wcb(new Error(`Could not find contract with ID ${crossContract.contractId}`));
                      } else {
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
                        // Get Statement to associate transaction
                        Statement.findOne({ clientId: statement.clientId, periodId: period._id.toString(), contractId: contractToCrossTo._id.toString() })
                          .then((statementToCrossTo) => {
                            if (!statementToCrossTo) {
                              logger.error(`${statement.periodId} ${statement._id} Could not find statement to associate cross contract transaction with`);
                              wcb();
                            } else {
                              async.waterfall([
                                function (waterfallCb) {
                                  // Create transaction
                                  const transactionExchangeRateData = getTransactionExchangeRateData(client, period, statement, contract, contractToCrossTo, amount);
                                  const transaction = new Transaction({
                                    statementId: statementToCrossTo._id,
                                    clientId: statement.clientId,
                                    contractId: contractToCrossTo._id,
                                    transferringStatementId: statement._id.toString(),
                                    sourceContractId: contract._id.toString(),
                                    name: transactionExchangeRateData.name,
                                    type: 'Transfer From',
                                    date: statement.date,
                                    userCreated: false,
                                    amount: transactionExchangeRateData.amount - withholdingAmount - vatAmount,
                                  });
                                  transaction.save()
                                    .then(() => {
                                      waterfallCb();
                                    })
                                    .catch((err) => {
                                      logger.error(`Error saving transaction for cross contract ${crossContract.contractId} in addToTransactions: ${err.message}`, err);
                                      waterfallCb(err);
                                    });
                                },
                                function (waterfallCb) {
                                  // Create Withholding Tax Transaction
                                  if (withholdingAmount) {
                                    const transaction = new Transaction({ statementId: statementToCrossTo._id, clientId: statement.clientId, contractId: contractToCrossTo._id, transferringStatementId: statement._id.toString(), name: `${statement.name} - Withholding Tax`, type: 'Transfer From', date: statement.date, userCreated: false, amount: withholdingAmount });
                                    transaction.save()
                                      .then(() => {
                                        waterfallCb();
                                      })
                                      .catch((err) => {
                                        logger.error(`Error saving withholding tax transaction for cross contract ${crossContract.contractId} in addToTransactions: ${err.message}`, err);
                                        waterfallCb(err);
                                      });
                                  } else {
                                    waterfallCb();
                                  }
                                },
                                function (waterfallCb) {
                                  // Create VAT Tax Transaction
                                  if (vatAmount) {
                                    const transaction = new Transaction({ statementId: statementToCrossTo._id, clientId: statement.clientId, contractId: contractToCrossTo._id, transferringStatementId: statement._id.toString(), name: `${statement.name} - Tax`, type: 'Transfer From', date: statement.date, userCreated: false, amount: vatAmount });
                                    transaction.save()
                                      .then(() => {
                                        waterfallCb();
                                      })
                                      .catch((err) => {
                                        logger.error(`Error saving VAT tax transaction for cross contract ${crossContract.contractId} in addToTransactions: ${err.message}`, err);
                                        waterfallCb(err);
                                      });
                                  } else {
                                    waterfallCb();
                                  }
                                },
                                function (waterfallCb) {
                                  // Remove from main statement if Add To
                                  const transaction = new Transaction({
                                    statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, destinationContractId: contractToCrossTo._id.toString(), name: `${getCrossContractBaseName(period, contract, contractToCrossTo)}`, type: 'Transfer To', date: statement.date, userCreated: false, amount: 0 - amount,
                                  });
                                  transaction.save()
                                    .then(() => {
                                      waterfallCb();
                                    })
                                    .catch((err) => {
                                      logger.error(`Error saving transaction for cross contract ${crossContract.contractId} in addToTransactions: ${err.message}`, err);
                                      waterfallCb(err);
                                    });
                                },
                              ], wcb);
                            }
                          })
                          .catch((err) => {
                            logger.error(`${statement.periodId} ${statement._id} Could not find statement to associate cross contract transaction with`, err);
                            wcb();
                          });
                      }

                      if (contractToCrossTo) {
                        // If the cross contracts don't have matching accounting periods or types => Add warning to the calculation notes
                        // This is happening synchronously and we don't have to include it in the if else statement
                        const foundContractType = (contractToCrossTo.contractType === 'Mechanical') ? 'Mechanical' : 'Artist';
                        const contractType = (contract.contractType === 'Mechanical') ? 'Mechanical' : 'Artist';

                        if (contract?.accountingPeriod !== contractToCrossTo?.accountingPeriod || foundContractType !== contractType) {
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
                              logger.debug(`Add cross contract mismatch error note to period ${period._id.toString()}`);
                            })
                            .catch((err) => {
                              logger.error(err);
                            });
                        }
                      }
                    })
                    .catch((err) => {
                      logger.error(`Error finding contract with ID ${crossContract.contractId} in addToTransactions: ${err.message}`, err);
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
        logger.error(`Error finding contract by statement id ${statement._id}: ${err.message}`, err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating subtract from transactions`));
      });
  },
};

module.exports = AddToTransactions;
