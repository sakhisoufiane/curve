const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');

const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');
const Payee = require('../../../models/payee');
const Statement = require('../../../models/statement');

const AutoPayments = require('./autoPayments');
const InvoiceNos = require('./invoiceNos');
const balanceAtDate = require('../contract/balanceAtDate');

const TaxAmounts = {
  createByStage: (statement, stage, period, client, callback) => {
    // Get contract
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (contract) {
          // Check contract has a Add To crossContract associated with it
          let containsCrossContractTo = false;
          contract.crossContracts.forEach((crossContract) => {
            if (crossContract.process === 'Add To') {
              containsCrossContractTo = true;
            }
          });
          // Decide based on stage, and whether there are transfers to another contract, whether tax amounts should be set
          if ((containsCrossContractTo && stage === 'Early') || (!containsCrossContractTo && stage === 'Late')) {
            TaxAmounts.create(statement, period, client, callback);
          } else {
            callback();
          }
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(`${statement.periodId} | ${statement._id} | TaxAmounts.createByStage | Could not find contract with statement.contractId: ${statement.contractId}`, err);
        callback();
      });
  },
  create: (statement, period, client, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (contract?.payeeBalanceCondition === 'Never' || client.clientType === 'Distributor') {
          // Only create tax amounts when there is only one payee, tax for multiple payees will be handled on payee balance
          let payee;
          Payee.findById(contract.payees?.[0]?.payeeId)
            .then((foundPayee) => {
              payee = foundPayee;
            })
            .catch((err) => {
              logger.error(`${statement.periodId} | ${statement._id} | TaxAmounts.create | Error finding payee with contract.payees[0].payeeId: ${contract.payees?.[0]?.payeeId}`, err);
            })
            .finally(() => {
              // When reprocessing individual statements, we need to check if selfBillingRate is null from a payee changing.
              if (payee?.selfBillingTaxRate === null) {
                payee.selfBillingTaxRate = 0;
              }
              async.waterfall([
                function (cb) {
                  // Set Self Billing Invoice No
                  if (contract.selfBilling) {
                    InvoiceNos.setSelfBillingInvoiceNo(statement, cb);
                  } else {
                    cb();
                  }
                },
                function (cb) {
                  // Set Fees Invoice No
                  if (contract.feesInvoice) {
                    InvoiceNos.setFeesInvoiceNo(statement, cb);
                  } else {
                    cb();
                  }
                },
                function (cb) {
                  TaxAmounts.setTaxBasis(statement, period, client, cb);
                },
                function (cb) {
                  if (contract.deductWithholding) {
                    // Withholding Taxes
                    let withholdingAmount = 0;
                    const withholdingTaxWording = (payee && payee.withholdingTaxWording && payee.withholdingTaxWording !== '') ? payee.withholdingTaxWording : 'Withholding Tax';
                    let withholdingTaxWordingTransaction = `${withholdingTaxWording}: ${period.name}`;
                    // Turn withholding tax calculated from contract terms into a negative number
                    if (statement.withholdingTax) {
                      withholdingAmount = 0 - statement.withholdingTax;
                    } else if (payee && payee.withholdingTaxRate && statement.taxBasis > 0) {
                      withholdingAmount = 0 - (statement.taxBasis * payee.withholdingTaxRate / 100);
                      withholdingTaxWordingTransaction = `${withholdingTaxWording} (${payee.withholdingTaxRate}%): ${period.name}`;
                    }
                    // Write transaction if withholding needs to be taken
                    if (withholdingAmount !== 0) {
                      const transaction = new Transaction({
                        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: withholdingTaxWordingTransaction, date: statement.date, amount: withholdingAmount, type: 'Withholding Tax', userCreated: false,
                      });
                      transaction.save()
                        .then(() => {
                          // Set withholding onto client
                          statement.withholdingTax = withholdingAmount;
                          cb();
                        })
                        .catch((err) => {
                          logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction`, err);
                          cb(err);
                        });
                    } else {
                      cb();
                    }
                  } else {
                    statement.withholdingTax = 0;
                    cb();
                  }
                },
                function (cb) {
                  if (contract.selfBilling && (payee?.selfBillingTaxRate || payee?.selfBillingTaxRate === 0)) {
                    // Self Billing
                    const transactionAmount = payee.selfBillingTaxRate ? statement.taxBasis * payee.selfBillingTaxRate / 100 : 0;
                    statement.selfBillingTaxAmount = transactionAmount;
                    statement.selfBillingTaxRate = payee.selfBillingTaxRate ? payee.selfBillingTaxRate : 0;
                    if (transactionAmount != 0) {
                      const transaction = new Transaction({
                        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `Tax (${statement.selfBillingTaxRate}%): ${period.name}`, date: statement.date, type: 'Tax', amount: transactionAmount, userCreated: false,
                      });
                      transaction.save()
                        .then(() => {
                          cb();
                        })
                        .catch((err) => {
                          logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction`, err);
                          cb(err);
                        });
                    } else {
                      cb();
                    }
                  } else {
                    cb();
                  }
                },
                function (cb) {
                  // Fees Invoice
                  if (contract.feesInvoice && payee) {
                    const feesAmount = statement.grossAmount - statement.netAmount + statement.netCosts;
                    const feesTaxAmount = payee.feesInvoiceTaxRate ? 0 - (feesAmount * payee.feesInvoiceTaxRate / 100) : 0;
                    statement.feesInvoiceTaxAmount = feesTaxAmount;
                    statement.feesInvoiceTaxRate = payee.feesInvoiceTaxRate ? payee.feesInvoiceTaxRate : 0;
                    if (feesTaxAmount != 0) {
                      const transaction = new Transaction({
                        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `Tax on Fees (${statement.feesInvoiceTaxRate}%): ${period.name}`, date: statement.date, amount: feesTaxAmount, userCreated: false,
                      });
                      transaction.save()
                        .then(() => {
                          cb();
                        })
                        .catch((err) => {
                          logger.error(`${statement.periodId} ${statement._id} Errored Creating Transaction`, err);
                          cb(err);
                        });
                    } else {
                      cb();
                    }
                  } else {
                    cb();
                  }
                },
              ], (err) => {
                if (err) {
                  callback(err);
                } else {
                  statement.save()
                    .then(() => {
                      callback();
                    })
                    .catch((err) => {
                      logger.error(err);
                      callback(err);
                    });
                }
              });
            });
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(`${statement.periodId} | ${statement._id} | TaxAmounts.create | Could not find contract with statement.contractId: ${statement.contractId}`, err);
        callback();
      });
  },
  setTaxBasis: (statement, period, client, callback) => {
    // Prepare balances if none found
    let openingBalance = 0; let closingBalance = 0; let payments; let previousStatement;
    // Set end date
    const date = new Date(period.endDate);
    date.setDate(date.getDate() + 1);
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (contract) {
          async.waterfall([
            function (cb) {
              // Get previous statement
              Statement.find({ clientId: statement.clientId, contractId: statement.contractId, _id: { $ne: statement._id }, date: { $lt: statement.date } }, 'closingBalance taxBasis')
                .limit(1)
                .sort({ date: -1 })
                .then((result) => {
                  previousStatement = result?.[0];
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb();
                });
            },
            function (cb) {
              // Get Opening Balance
              balanceAtDate(contract, period.startDate, (err, balance) => {
                openingBalance = balance;
                cb(err);
              });
            },
            function (cb) {
              // Get Closing balance
              balanceAtDate(contract, date, (err, closing) => {
                closingBalance = closing;
                cb(err);
              });
            },
            function (cb) {
              // Get any payments
              const startDate = moment.utc(period.startDate).endOf('day').subtract(1, 'day').format();
              const endDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
              Transaction.find({
                clientId: statement.clientId, contractId: statement.contractId, date: { $gte: startDate, $lte: endDate }, type: 'Payment',
              })
                .then((foundPayments) => {
                  payments = foundPayments;
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
            function (cb) {
              // When client is a distributor, or statement design is set to Distribution, it should be based on gross amount
              if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
                statement.taxBasis = statement.grossAmount;
                cb();
              } else if (closingBalance >= contract.minPayout) {
                // Total payment amounts
                let paymentAmounts = 0;
                payments.forEach((payment) => {
                  paymentAmounts += payment.amount;
                });
                // We're using the tax basis from the previous statement in case a payment hasn't been made on the last period, this way we're taxing on the total amount from this period and the previous one
                let taxBasisFromPreviousStatement = 0;
                // When opening balance is greater than the minimum payment threshold
                if (openingBalance > 0 && openingBalance >= contract.minPayout) {
                  // Remove payments from balance
                  if (parseFloat(openingBalance).toFixed(2) != 0 - parseFloat(paymentAmounts).toFixed(2) && openingBalance + paymentAmounts > 0 && paymentAmounts != 0) {
                    // This removes the opening balance, and then the difference between opening and payments
                    // closingBalance -= openingBalance;
                    closingBalance -= (openingBalance + paymentAmounts);
                  } else if (parseFloat(openingBalance).toFixed(2) != 0 - parseFloat(paymentAmounts).toFixed(2) && paymentAmounts == 0) {
                    // This is where opening balance is above min payment threshold, and there are no payments
                    closingBalance -= openingBalance;
                  }
                  // Get the tax basis from the previous statement
                  // If the previous statement's tax basis is 0, that means we haven't applied any tax on the income from the previous period, we should be doing it now based on
                  // the previous period's colsing balance
                  if (previousStatement?.taxBasis === 0) {
                    taxBasisFromPreviousStatement = previousStatement?.closingBalance || 0;
                  }
                }
                if (contract.autoPayment && contract.autoPaymentConditions && contract.autoPaymentConditions.length > 0) {
                  const accountingDate = new Date(period.endDate);
                  accountingDate.setDate(accountingDate.getDate() + 1);
                  AutoPayments.triggerAutoPayment(statement, contract, accountingDate, (triggerAutoPayment, reason, autoPaymentClosing) => {
                    // Set taxBasis
                    if (!triggerAutoPayment) {
                      statement.taxBasis = 0;
                    } else {
                      statement.taxBasis = client.features.enableAutoPaymentTaxBasisFix ? autoPaymentClosing : autoPaymentClosing + taxBasisFromPreviousStatement;
                    }
                    cb();
                  });
                } else {
                  statement.taxBasis = closingBalance + taxBasisFromPreviousStatement;
                  cb();
                }
              } else {
                // Set taxBasis to 0
                statement.taxBasis = 0;
                cb();
              }
            },
          ], (err) => {
            if (err) {
              // Handle errors
              callback(err);
            } else {
              // Save statement with updated taxBasis
              statement.save()
                .then(() => {
                  callback();
                })
                .catch((err) => {
                  logger.error(err);
                  callback(err);
                });
            }
          });
        } else {
          // Just return without setting tax basis
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback();
      });
  },
};

module.exports = TaxAmounts;
