const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');

const Contract = require('../../../models/contract');
const Statement = require('../../../models/statement');
const Transaction = require('../../../models/transaction');

const balanceAtDate = require('../contract/balanceAtDate');

const ProfitShare = {
  profitShare100Negative: (statement, period, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        async.waterfall([
          function (cb) {
            ProfitShare.profitShareFigures(statement, period, contract, cb);
          },
          function (cb) {
            // Calculation
            const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
            const startingBalanceAfterPayments = statement.openingBalance + statement.payments;
            const output = startingBalanceAfterPayments + thisPeriod;
            statement.profitShareRate = statement.profitShareRate ? statement.profitShareRate : 0;
            statement.profitShareAdvanceRecouped = 0;
            if (output > 0) {
              // When positive, multiply by profit share amount
              statement.profitShareBalance = output;
              if (statement.openingBalance < 0) {
                statement.profitShareNetAmount = output * statement.profitShareRate / 100;
              } else {
                statement.profitShareNetAmount = (output - statement.openingBalance - statement.payments) * statement.profitShareRate / 100;
              }
              if (statement.profitShareNetAmount + statement.otherTransactions < 0) {
                statement.profitShareAdvanceRecouped = 0;
              } else if (statement.profitShareNetAmount + statement.otherTransactions > 0 - statement.profitShareUnrecoupedAdvanceStart) {
                statement.profitShareAdvanceRecouped = 0 - statement.profitShareUnrecoupedAdvanceStart;
              } else if (statement.profitShareUnrecoupedAdvanceStart) {
                // Set Opening Balance amount to be added to advance recoupment - only when positive
                const positiveOpeningBalanceAfterPayments = startingBalanceAfterPayments > 0 ? startingBalanceAfterPayments : 0;
                statement.profitShareAdvanceRecouped = statement.profitShareNetAmount + statement.otherTransactions + positiveOpeningBalanceAfterPayments;
              }
            } else if (output <= 0 && statement.payments != 0 && (Math.round(0 - statement.payments) != Math.round(statement.openingBalance))) {
              // Payment and negative balance - should remove payment from balance - a nuance
              // This is to remove the payments from the balance and thus calculation
              const negativeValueShared = (output - startingBalanceAfterPayments) * statement.profitShareRate / 100;
              if (negativeValueShared > (0 - startingBalanceAfterPayments)) {
                // Values are opening balance in the negative, plus the extra
                statement.profitShareBalance = negativeValueShared;
                statement.profitShareNetAmount = negativeValueShared;
              } else {
                // Then get anything over opening balance amount, to be held at 100% in the negative
                const extraHeldAt100Percent = (startingBalanceAfterPayments + negativeValueShared) / statement.profitShareRate * 100;
                // Values are opening balance in the negative, plus the extra
                statement.profitShareBalance = 0 - startingBalanceAfterPayments + extraHeldAt100Percent;
                statement.profitShareNetAmount = 0 - startingBalanceAfterPayments + extraHeldAt100Percent;
              }
              // statement.profitShareBalance = output;
              // statement.profitShareNetAmount = output - statement.payments;
            } else if (output <= 0 && Math.round(statement.openingBalance) == Math.round(0 - statement.payments)) {
              // Opening balance paid off - and a negative balance within this period
              // Keep negative balance at 100%
              statement.profitShareBalance = output;
              statement.profitShareNetAmount = thisPeriod;
            } else if (output <= 0 && statement.openingBalance > 0 && 0 - statement.openingBalance <= output * statement.profitShareRate / 100) {
              // Share split should be deducted from opening balance
              statement.profitShareBalance = output;
              statement.profitShareNetAmount = thisPeriod * statement.profitShareRate / 100;
            } else if (output <= 0 && statement.openingBalance > 0 && 0 - statement.openingBalance > output * statement.profitShareRate / 100) {
              // Share split should be deducted from opening balance, and remainder recouped at 100%
              // Get negative values at profit share rate
              const negativeValueShared = (output - statement.openingBalance) * statement.profitShareRate / 100;
              if (negativeValueShared > (0 - statement.openingBalance)) {
                // Values are opening balance in the negative, plus the extra
                statement.profitShareBalance = negativeValueShared;
                statement.profitShareNetAmount = negativeValueShared;
              } else {
                // Then get anything over opening balance amount, to be held at 100% in the negative
                const extraHeldAt100Percent = (statement.openingBalance + negativeValueShared) / statement.profitShareRate * 100;
                // Values are opening balance in the negative, plus the extra
                statement.profitShareBalance = 0 - statement.openingBalance + extraHeldAt100Percent;
                statement.profitShareNetAmount = 0 - statement.openingBalance + extraHeldAt100Percent;
              }
            } else if (statement.profitShareUnrecoupedAdvanceStart && statement.otherTransactions > 0) {
              // Set Opening Balance amount to be added to advance recoupment - only when positive
              const positiveOpeningBalanceAfterPayments = startingBalanceAfterPayments > 0 ? startingBalanceAfterPayments : 0;
              // Find out contract's final balance after any cross contract transfers
              const advanceRecouped = statement.profitShareNetAmount + statement.otherTransactions + positiveOpeningBalanceAfterPayments;

              // If the Income + Costs + Transfers + Opening Balance + Payments is less than 0, then there is nothing to go against the advance
              if (advanceRecouped < 0) {
                // When negative, do not split
                statement.profitShareBalance = output;
                statement.profitShareNetAmount = output;
                return cb();
              }

              // When output is negative but there is some positive income from balance transfer and and advance exists
              statement.profitShareBalance = output;
              if (statement.openingBalance < 0) {
                statement.profitShareNetAmount = output * statement.profitShareRate / 100;
              } else {
                statement.profitShareNetAmount = (output - statement.openingBalance - statement.payments) * statement.profitShareRate / 100;
              }
              statement.profitShareAdvanceRecouped = advanceRecouped;
            } else {
              // When negative, do not split
              statement.profitShareBalance = output;
              statement.profitShareNetAmount = output;
            }
            cb();
          },
          function (cb) {
            // Closing balance
            if (statement.netAmount === 0 && statement.netCosts === 0) {
              statement.closingBalance = statement.openingBalance + statement.payments;
            } else {
              statement.closingBalance = statement.profitShareNetAmount - statement.profitShareAdvanceRecouped;
            }
            cb();
          },
        ], (err) => {
          statement.save()
            .then(() => {
              callback();
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  profitShareSplitNegative: (statement, period, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        async.waterfall([
          function (cb) {
            ProfitShare.profitShareFigures(statement, period, contract, cb);
          },
          function (cb) {
            // Calculation
            statement.profitShareRate = contract.profitSharePercentage ? contract.profitSharePercentage : 0;
            statement.profitShareAdvanceRecouped = 0;
            const thisPeriod = statement.netAmount - statement.netCosts + statement.reservesReleased - statement.reservesWithheld;
            const splitPeriodBy = thisPeriod * (statement.profitShareRate / 100);
            statement.profitShareBalance = statement.openingBalance + statement.payments + splitPeriodBy;
            statement.profitShareNetAmount = splitPeriodBy;

            // Advance should only be recouped when profitShareBalance (opening balance + payments + income + costs && after artist split) is positive
            if (statement.profitShareUnrecoupedAdvanceStart !== 0 && (statement.profitShareBalance + statement.otherTransactions) > 0) {
              if (statement.profitShareNetAmount + statement.otherTransactions < 0) {
                statement.profitShareAdvanceRecouped = 0;
              } else if (statement.profitShareBalance + statement.otherTransactions > 0 - statement.profitShareUnrecoupedAdvanceStart) {
                statement.profitShareAdvanceRecouped = 0 - statement.profitShareUnrecoupedAdvanceStart;
              } else {
                statement.profitShareAdvanceRecouped = statement.profitShareBalance + statement.otherTransactions;
              }
            }
            cb();
          },
          function (cb) {
            // Closing balance
            if (statement.netAmount === 0 && statement.netCosts === 0) {
              statement.closingBalance = statement.openingBalance + statement.payments;
            } else {
              // was statement.profitShareNetAmount
              statement.closingBalance = statement.profitShareBalance - statement.profitShareAdvanceRecouped;
            }
            cb();
          },
        ], (err) => {
          statement.save()
            .then(() => {
              callback();
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  profitShareFigures: (statement, period, contract, callback) => {
    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    const startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
    const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
    async.waterfall([
      function (cb) {
        // Opening balance
        balanceAtDate(contract, period.startDate, { excludeAdvance: true, excludeReserves: true }, (err, balance) => {
          statement.openingBalance = balance;
          cb();
        });
      },
      function (cb) {
        // Total Unrecouped Advance
        Transaction.find({
          clientId: statement.clientId, contractId: statement.contractId, date: { $lte: endDate }, type: { $in: ['Advance', 'Advance Recoupment'] },
        })
          .then((transactions) => {
            statement.profitShareUnrecoupedAdvanceStart = 0;

            transactions.forEach((transaction) => { statement.profitShareUnrecoupedAdvanceStart += transaction.amount; });

            // When an advance is applied and recouped within the same period, we need to save the recouped and unrecouped amounts against the statement
            // This is so we can display this recoupment on the PDF and headline fields
            let advancesThisPeriod = 0;
            let advanceRecoupedThisPeriod = 0;

            // We want to split out the transactions amounts into advance and advance recoupments, but making sure they are transactions within the period dates.
            transactions.forEach((transaction) => {
              const transactionDate = moment.utc(transaction.date).endOf('day').subtract(1, 'day').format();

              if (transactionDate >= startDate && transactionDate <= endDate) {
                if (transaction.type === 'Advance') { advancesThisPeriod += transaction.amount; }
                if (transaction.type === 'Advance Recoupment') { advanceRecoupedThisPeriod += transaction.amount; }
              }
            });

            // We only want to target advances applied and recouped this period
            // 0 values on both these vars indicate nothing was added this period
            if (!advancesThisPeriod && !advanceRecoupedThisPeriod) { return cb(); }

            // If the collected amounts = 0, we can confirm that an advance was applied and recouped within the same period,
            // therefore we can set the profitShareUnrecoupedAdvanceStart as the advancesThisPeriod
            // and let the profit share functions (profitShare100Negative or profitShareSplitNegative) take care of the statement profit-share recouped and net-profit fields
            if (advancesThisPeriod + advanceRecoupedThisPeriod === 0) {
              statement.profitShareUnrecoupedAdvanceStart = advancesThisPeriod;
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Payments
        Transaction.find({
          clientId: statement.clientId, contractId: statement.contractId, date: { $lte: endDate, $gte: startDate }, type: 'Payment', isReserveRelease: { $ne: true }, isReserveWithholding: { $ne: true },
        })
          .then((transactions) => {
            statement.payments = 0;
            transactions.forEach((transaction) => { statement.payments += transaction.amount; });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Total Other Transactions
        Transaction.find({
          clientId: statement.clientId, contractId: statement.contractId, date: { $lte: endDate, $gte: startDate }, type: { $in: ['Contract Payment', 'Other', 'Transfer To', 'Transfer From', 'Royalties', 'Negative Balance Transfer Adjustment'] }, isReserveRelease: { $ne: true }, isReserveWithholding: { $ne: true },
        })
          .then((transactions) => {
            statement.otherTransactions = 0;
            transactions.forEach((transaction) => { statement.otherTransactions += transaction.amount; });
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], callback);
  },
  createTransactions: (statement, period, callback) => {
    // This function is required in order to include transfers in any advance recoupment
    // It removes the originally created transactions and recreates, as the original ones are required to create the transfers - urgh
    // Profit Share Transactions
    if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
      // Remove previously created transactions to not double account
      Transaction.deleteMany({ clientId: period.clientId, name: { $not: { $regex: /Tax/ } }, statementId: statement._id.toString(), type: { $nin: ['Contract Payment', 'Transfer To', 'Transfer From', 'Reserves Released'] } })
        .then(() => {
          // Update Figures for any transfers
          getProfitShareFigures(statement, period, () => {
            async.parallel([
              function (paraCb) {
                // Advance recoupment
                if (statement.profitShareAdvanceRecouped) {
                  const transaction = new Transaction({
                    statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Advance Recoupment', type: 'Advance Recoupment', date: statement.date, userCreated: false, amount: statement.profitShareAdvanceRecouped,
                  });
                  transaction.save()
                    .then(() => {
                      paraCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      paraCb(err);
                    });
                } else {
                  paraCb();
                }
              },
              function (paraCb) {
                // Negative Balance Recoupment
                if (statement.contractType === 'Profit Share' && statement.openingBalance < 0 && statement.closingBalance > 0) {
                  // Payments are always added against the artist share and not the overall balance, so we need to include this in the final balance after split.
                  // In future, clients should not be adding payments this way. Instead they should use an advance instead. We are adding a ticket to prevent this on save of a transaction.
                  const paymentWithArtistSplit = (statement.payments / 100) * statement.profitShareRate;
                  const transaction = new Transaction({
                    statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Negative Balance Recoupment', type: 'Negative Balance Recoupment', date: statement.date, userCreated: false, amount: 0 - (statement.openingBalance + paymentWithArtistSplit),
                  });
                  transaction.save()
                    .then(() => {
                      paraCb();
                    })
                    .catch((err) => {
                      logger.error(err);
                      paraCb(err);
                    });
                } else {
                  paraCb();
                }
              },
              function (paraCb) {
                // Output
                let value = statement.profitShareNetAmount - statement.profitShareAdvanceRecouped;
                if (statement.openingBalance < 0 && value > 0) {
                  // value += statement.openingBalance;
                } else if (statement.contractType === 'Profit Share' && statement.openingBalance < 0) {
                  value -= statement.openingBalance;
                }
                const transaction = new Transaction({
                  statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: period.name, date: statement.date, userCreated: false, amount: value,
                });
                transaction.save()
                  .then(() => {
                    paraCb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    paraCb(err);
                  });
              },
            ], callback);
          });

          function getProfitShareFigures(statement, period, callback) {
            // Set the right profitShare method based on contract type
            if (statement.contractType === 'Profit Share') {
              ProfitShare.profitShare100Negative(statement, period, callback);
            } else {
              ProfitShare.profitShareSplitNegative(statement, period, callback);
            }
          }
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      callback();
    }
  },
  manageNegativeBalanceFromTransfers: (statement, period, callback) => {
    async.waterfall([
      function (cb) {
        // Get contract associated with Statement
        Contract.findById(statement.contractId)
          .then((contract) => {
            if (contract) {
              cb(null, contract);
            } else {
              callback(new Error('Contract does not exist associated with this statement'));
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (contract, cb) {
        // Get final balance
        const date = new Date(statement.date);
        date.setDate(date.getDate() + 1);
        balanceAtDate(contract, date, { excludeAdvance: true, excludeReserves: true }, (err, balance) => {
          balance = parseFloat(balance.toFixed(2));
          cb(err, contract, balance);
        });
      },
      function (contract, balance, cb) {
        // Check if balance is positive
        if ((balance >= 0 && balance - statement.otherTransactions > 0) || statement.otherTransactions === 0 || (balance === 0 && statement.otherTransactions >= 0)) {
          // Return from function if positive or no transfers
          callback();
        } else {
          // Get value that requires transferring - if the transaction is less than the negative balance, do the whole transaction, otherwise do the negative balance
          // This allows for partial recoupment from a positive balance, and then doing the rest against the negative balance
          let valueToTransfer = 0;
          const otherTransactions = statement.otherTransactions + statement.withholdingTax;
          if (otherTransactions > balance) {
            valueToTransfer = otherTransactions;
          } else {
            valueToTransfer = balance;
          }
          cb(null, valueToTransfer, contract, balance);
        }
      },
      function (valueToTransfer, contract, balance, cb) {
        if (contract.type === 'Profit Share' && balance >= 0) {
          valueToTransfer = (0 - (balance - statement.otherTransactions)) * (1 - (contract.profitSharePercentage / 100));
          const transaction = new Transaction({ statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Negative Balance Transfer Adjustment', type: 'Negative Balance Transfer Adjustment', date: statement.date, userCreated: false, amount: valueToTransfer });
          transaction.save()
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else if (contract.type === 'Profit Share' && valueToTransfer < 0) {
          // Turns the balance deduction into an advance
          async.parallel([
            function (paraCb) {
              // Create Balancing value
              const transaction = new Transaction({ statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Negative Balance Adjustment', type: 'Negative Balance Adjustment', date: statement.date, userCreated: false, amount: 0 - valueToTransfer });
              transaction.save()
                .then(() => {
                  paraCb();
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            },
            function (paraCb) {
              // Create advance addition
              const transaction = new Transaction({ statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Transaction to Advance', type: 'Advance', date: statement.date, userCreated: false, amount: valueToTransfer });
              transaction.save()
                .then(() => {
                  paraCb();
                })
                .catch((err) => {
                  logger.error(err);
                  paraCb(err);
                });
            },
          ], cb);
        } else if (contract.type === 'Profit Share' && valueToTransfer > 0 && contract.profitSharePercentage) {
          // Adjust the value for the negative amount - eg. assumed this is the artists share, so needs to be adjusted to be equal to 100%
          const percentageValue = valueToTransfer / contract.profitSharePercentage;
          const inversePercentage = 100 - contract.profitSharePercentage;
          valueToTransfer = percentageValue * inversePercentage;
          // If balance + transfer value crosses into positive, we need to split once in profit based on contract rate
          const balanceAfterTransfer = balance + valueToTransfer;
          let profitSplit = 0;
          let profitSplitDeduction = 0;
          if (balanceAfterTransfer > 0) {
            // Get the split on the positive amount
            profitSplit = balanceAfterTransfer * contract.profitSharePercentage / 100;
            // Get the difference, to deduct from the transaction
            profitSplitDeduction = balanceAfterTransfer - profitSplit;
          }
          let transactionName = 'Negative Balance Transfer Adjustment';
          if (profitSplitDeduction !== 0) {
            transactionName = 'Negative Balance Transfer Adjustment (Once in profit, split at profit share rate)';
          }
          const transaction = new Transaction({ statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: transactionName, type: 'Negative Balance Transfer Adjustment', date: statement.date, userCreated: false, amount: valueToTransfer - profitSplitDeduction });
          transaction.save()
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
      },
    ], (err) => {
      if (err) {
        callback(err);
      } else if (statement.contractType === 'Profit Share') {
        ProfitShare.profitShare100Negative(statement, period, callback);
      } else if (statement.contractType === 'Profit Share - Flexible') {
        ProfitShare.profitShareSplitNegative(statement, period, callback);
      } else {
        callback();
      }
    });
  },
  /**
   * Check if any payments have been made for Profit Share contracts when balance is positive and set the payments on the statement
   * We display the set value on the statement.
   *
   * @param {Object} params.statement - Statement object
   * @param {Object} params.period - Period object
   *
   * @returns {Promise<Void>}
   */
  checkProfitSharePayments: async ({ statement, period }) => {
    const foundStatement = await Statement.findById(statement._id).catch(logger.error);
    if (!foundStatement) throw new Error(`Statement ${statement._id} not found`);

    if (!['Profit Share', 'Profit Share - Flexible'].includes(statement.contractType)) return; // Only for Profit Share contracts

    const startDate = moment.utc(period.startDate).format();

    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();

    const transactions = await Transaction
      .find({
        clientId: statement.clientId,
        contractId: statement.contractId,
        date: { $lte: endDate, $gte: startDate },
        type: 'Payment',
        isReserveRelease: { $ne: true },
        isReserveWithholding: { $ne: true },
      })
      .select('amount')
      .catch(logger.error);

    if (!transactions?.length) return;

    const payments = transactions.reduce((acc, transaction) => acc + (transaction.amount || 0), 0);
    statement.payments = payments;
    await statement.save().catch(logger.error);
  },
};

module.exports = ProfitShare;
