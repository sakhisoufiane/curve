const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const Transaction = require('../../../../models/transaction');
const Client = require('../../../../models/client');
const PaymentGroup = require('../../../../models/paymentGroup');
const Payment = require('../../../../models/payment');

const balanceAtDate = require('../../contract/balanceAtDate');

// This works out the us net sales share of total net sales. Tilpalti applies this as Witholding Tax when making payments.
function getUsRevenuePercentage(statement) {
  if (!statement.analysis?.net?.territories?.length) { return 0; }

  const usNetSales = statement.analysis.net.territories.find((territory) => territory.type === 'US');
  if (!usNetSales?.value) { return 0; }

  const totalNetSales = statement.analysis.net.territories.reduce((acc, territory) => acc + territory.value, 0);
  const usRevenuePercentage = Number(((usNetSales.value / totalNetSales) * 100).toFixed(2));

  return usRevenuePercentage;
}

const AutoPayments = {
  create: (statement, period, generatePayments, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating auto payments`));
        }
        // Set date to end of day to catch all other transactions
        const accountingDate = new Date(period.endDate);
        accountingDate.setDate(accountingDate.getDate() + 1);
        AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (triggerAutoPayment, reason, closingBalance) => {
          Statement.findByIdAndUpdate(statement._id, { $set: { autoPaymentTriggered: triggerAutoPayment, autoPaymentNotTriggeredReason: reason } }).exec()
            .then(() => {
              if (triggerAutoPayment) {
                async.waterfall([
                  // Add Payment Transaction
                  (cb) => {
                    const transaction = new Transaction({
                      statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `Payment: ${period.name}`, date: statement.date, amount: 0 - closingBalance, type: 'Payment', isPayment: true, userCreated: false,
                    });
                    transaction.save()
                      .then((savedTransaction) => {
                        cb(null, savedTransaction?._id?.toString());
                      })
                      .catch((err) => {
                        logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction`, err);
                        cb(err);
                      });
                  },
                  // Create Payment and add it to Payment Group
                  (transactionId, cb) => {
                    // Skip if payments are disabled.
                    if (!generatePayments) { return cb(); }
                    // when payeeBalanceCondition is not Never, there could be multiple payees which is handled elsewhere
                    if (contract.payeeBalanceCondition !== 'Never') { return cb(); }
                    // Skip if 0 value
                    logger.debug(closingBalance);
                    if (!closingBalance) { return cb(); }
                    Client.findById(statement.clientId, 'homeCurrency features')
                      .then((client) => {
                        const currency = contract?.currency !== 'Home Currency' ? contract.currency : client.homeCurrency;
                        // Find/Create Payment Group associated to the period
                        PaymentGroup.findOne({ clientId: statement.clientId, periodId: statement.periodId })
                          .then((paymentGroup) => {
                            // Create Payment
                            const payment = new Payment({
                              clientId: statement.clientId,
                              statementId: statement._id.toString(),
                              contractId: contract._id.toString(),
                              payeeId: contract.payees?.[0]?.payeeId, // There will always be one payee when payeeBalanceCondition is Never
                              amount: closingBalance,
                              usRevenuePercentage: getUsRevenuePercentage(statement),
                              name: `Payment: ${period.name}`,
                              transactionId,
                              currency,
                              withholdingTaxAmount: statement.withholdingTax || 0,
                              withholdingTaxCurrency: currency,
                            });

                            if (!paymentGroup) {
                              // Create Payment Group
                              const newPaymentGroup = new PaymentGroup({ clientId: statement.clientId, periodId: statement.periodId, name: period.name });
                              newPaymentGroup.save()
                                .then((savedPaymentGroup) => {
                                  // Save Payment
                                  payment.paymentGroupId = savedPaymentGroup._id.toString();
                                  payment.save()
                                    .then(() => {
                                      cb();
                                    })
                                    .catch((err) => {
                                      logger.error(`Payment skipped being created: ${err}`);
                                      cb();
                                    });
                                })
                                .catch((err) => {
                                  cb(err);
                                });
                            } else {
                              // Save Payment
                              payment.paymentGroupId = paymentGroup._id.toString();
                              payment.save()
                                .then(() => {
                                  cb();
                                })
                                .catch((err) => {
                                  logger.error(`Payment skipped being created: ${err}`);
                                  cb();
                                });
                            }
                          })
                          .catch((err) => {
                            cb(err);
                          });
                      })
                      .catch((err) => {
                        cb(err);
                      });
                  },
                ], callback);
              } else {
                callback();
              }
            })
            .catch((err) => {
              logger.error(`Error updating statement auto payment status: ${err}`);
            });
        });
      })
      .catch((err) => {
        callback(err);
      });
  },
  triggerAutoPayment: (statement, contract, accountingDate, callback) => {
    let triggerAutoPayment = true;
    const options = statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible' ? { excludeReserves: true } : {};
    balanceAtDate(contract, accountingDate, options, (err, closingBalance) => {
      // Set min payment to 0 if none exists
      if (!contract.minPayout) { contract.minPayout = 0; }
      if (!contract.autoPayment) {
        callback(false, null, closingBalance);
      } else if (
        (!contract.autoPaymentConditions || contract.autoPaymentConditions.length === 0)
        && closingBalance - statement.withholdingTax > 0
        && closingBalance - statement.withholdingTax >= contract.minPayout
      ) {
        callback(true, null, closingBalance);
      } else if (
        closingBalance - statement.withholdingTax > 0
        && closingBalance - statement.withholdingTax >= contract.minPayout
      ) {
        // Check if balance is above minimum payment
        async.eachSeries(contract.autoPaymentConditions, (autoPayment, cb) => {
          if (autoPayment && autoPayment.contractId && autoPayment.condition) {
            // Get auto payment contract
            Contract.findById(autoPayment.contractId)
              .then((foundContract) => {
                if (!foundContract) {
                  cb();
                } else {
                  // Get the statement associated to this contract
                  Statement.findOne({ clientId: statement.clientId, contractId: foundContract._id.toString(), periodId: statement.periodId }, '_id')
                    .then((contractStatement) => {
                      const statementId = contractStatement ? contractStatement._id.toString() : null;

                      // Removed excludeTransferringStatement option, this was used to exclude the transferring statement from the balance calculation but resulted in invalid auto payments being triggered
                      const contractBalanceFilter = { excludeStatementPayments: true, statementId, excludeContractTransfersTos: true };

                      if (foundContract.type === 'Profit Share' || foundContract.type === 'Profit Share - Flexible') { contractBalanceFilter.excludeReserves = true; }
                      if (autoPayment.condition === 'Balance is Positive, Ignoring Advance') { contractBalanceFilter.excludeAdvance = true; }

                      // Get contract balanace at date
                      balanceAtDate(foundContract, accountingDate, contractBalanceFilter, (err, closingBalance) => {
                        if (closingBalance <= 0) { triggerAutoPayment = false; }
                        cb();
                      });
                    })
                    .catch((err) => {
                      logger.error(`Error finding statement for auto payment condition: ${err}`);
                      cb();
                    });
                }
              })
              .catch((err) => {
                logger.error(`Error finding contract for auto payment condition: ${err}`);
                cb();
              });
          } else {
            // No contract or conditon, trigger auto payment
            cb();
          }
        }, () => {
          if (triggerAutoPayment) {
            callback(triggerAutoPayment, null, closingBalance);
          } else {
            callback(triggerAutoPayment, 'Conditions Not Met', closingBalance);
          }
        });
      } else {
        // Minimun threshold not met
        triggerAutoPayment = false;
        callback(triggerAutoPayment, 'Threshold Not Met', closingBalance);
      }
    });
  },
};

module.exports = AutoPayments;
