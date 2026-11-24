const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');

const StatementTransactions = {
  create: (statement, client, period, callback) => {
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating transactions`));
        }
        async.waterfall([
          (cb) => StatementTransactions.mainTransaction(statement, period, client, contract, cb),
          (cb) => StatementTransactions.reserveWithheld(statement, period, cb),
          (cb) => StatementTransactions.futureReserveReleases(statement, period, contract, cb),
          (cb) => StatementTransactions.profitShare(statement, period, cb),
          (cb) => StatementTransactions.distribution(statement, contract, client, period, cb),
        ], callback);
      })
      .catch((err) => {
        logger.error(`Error creating transactions for statement ${statement._id}`, err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in creating transactions`));
      });
  },
  getDateAdd: (accountingPeriod) => {
    if (accountingPeriod === 'H1') {
      return [184, 181, 184, 181, 184, 181, 184, 181];
    } if (accountingPeriod === 'H2') {
      return [181, 184, 181, 184, 181, 184, 181, 184];
    } if (accountingPeriod === 'Q1') {
      return [91, 92, 92, 90, 91, 92, 92, 90, 91, 92, 92, 90];
    } if (accountingPeriod === 'Q2') {
      return [92, 92, 90, 91, 92, 92, 90, 91, 92, 92, 90, 91];
    } if (accountingPeriod === 'Q3') {
      return [92, 90, 91, 92, 92, 90, 91, 92, 92, 90, 91, 92];
    } if (accountingPeriod === 'Q4') {
      return [90, 91, 92, 92, 90, 91, 92, 92, 90, 91, 92, 92];
    } if (accountingPeriod === 'M1') {
      return [28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31];
    } if (accountingPeriod === 'M2') {
      return [31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28];
    } if (accountingPeriod === 'M3') {
      return [30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31];
    } if (accountingPeriod === 'M4') {
      return [31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30];
    } if (accountingPeriod === 'M5') {
      return [30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31];
    } if (accountingPeriod === 'M6') {
      return [31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30];
    } if (accountingPeriod === 'M7') {
      return [31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31];
    } if (accountingPeriod === 'M8') {
      return [30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31];
    } if (accountingPeriod === 'M9') {
      return [31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30];
    } if (accountingPeriod === 'M10') {
      return [30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31];
    } if (accountingPeriod === 'M11') {
      return [31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30];
    } if (accountingPeriod === 'M12') {
      return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    } if (accountingPeriod.includes('Y')) {
      return [365];
    }
    return [0];
  },
  mainTransaction: (statement, period, client, contract, cb) => {
    // Create one for statement
    const transaction = new Transaction({
      statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: period.name, date: statement.date, userCreated: false,
    });

    if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
      if (statement.contractType !== 'Profit Share' && statement.contractType !== 'Profit Share - Flexible') {
        transaction.amount = statement.grossAmount;
        transaction.name += ' Sales';
        transaction.save()
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(`${statement.periodId} ${statement._id} Errored Creating Main Transaction`, err);
            cb(err);
          });
      } else {
        cb();
      }
    } else if (statement.contractType !== 'Profit Share' && statement.contractType !== 'Profit Share - Flexible') {
      transaction.amount = statement.netOutput;
      transaction.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`${statement.periodId} ${statement._id} Errored Creating Main Transaction`, err);
          cb(err);
        });
    } else {
      cb();
    }
  },
  reserveWithheld: (statement, period, cb) => {
    if (statement.reservesWithheld && statement.reservesWithheld > 0) {
      // Create Reserve Withheld
      const transaction = new Transaction({
        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `${period.name} Reserves Withheld`, type: 'Reserves Withheld', date: statement.date, amount: 0 - statement.reservesWithheld, userCreated: false, isReserveWithholding: true,
      });
      transaction.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`${statement.periodId} ${statement._id} Errored Creating Reserve Witheld Transaction`, err);
          cb(err);
        });
    } else {
      cb();
    }
  },
  futureReserveReleases: (statement, period, contract, cb) => {
    if (statement.reservesWithheld && statement.reservesWithheld > 0) {
      // Return Reserves for future periods
      // Get period end date
      const date = new Date(period.endDate);
      // Get the contract type, and get months to add for each reserve period
      const dateAddArray = StatementTransactions.getDateAdd(period.accountingPeriod);
      let index = 0;
      async.eachSeries(contract.reserves, (reserve, reserveCb) => {
        // Loop through and add one period for each, creating transaction the amount
        // If reserve is null - eg. there is no value in the reserve field
        if (!reserve || reserve == null || !reserve.rate) { reserve = { rate: 0 }; }
        // Set date based on next number of days specified in array
        let dateAddValue = dateAddArray[index];
        dateAddValue = dateAddValue || 0;
        date.setDate(date.getDate() + dateAddValue);
        // Set Amount
        let amount = statement.reservesWithheld * parseFloat(reserve.rate) / 100;
        if (isNaN(amount)) { amount = 0; }
        const transaction = new Transaction({
          statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `${period.name} Reserves Released @ ${reserve.rate}%`, type: 'Reserves Released', date, amount, userCreated: false, isReserveRelease: true,
        });
        transaction.save()
          .then(() => {
            index += 1;
            reserveCb();
          })
          .catch((err) => {
            logger.error(`${statement.periodId} ${statement._id} Errored Creating Future Reserve Releases`, err);
            index += 1;
            reserveCb(err);
          });
      }, cb);
    } else {
      cb();
    }
  },
  profitShare: (statement, period, cb) => {
    // Profit Share Transactions
    if (statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible') {
      async.parallel([
        (cb) => StatementTransactions.profitShareAdvanceRecoupment(statement, cb),
        (cb) => StatementTransactions.profitShareNegativeBalanceRecoupment(statement, cb),
        (cb) => StatementTransactions.profitShareOutput(statement, period, cb),
      ], (err) => {
        cb(err);
      });
    } else {
      cb();
    }
  },
  profitShareAdvanceRecoupment: (statement, cb) => {
    // Advance recoupment
    if (statement.profitShareAdvanceRecouped) {
      const transaction = new Transaction({
        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Advance Recoupment', type: 'Advance Recoupment', date: statement.date, userCreated: false, amount: statement.profitShareAdvanceRecouped,
      });
      transaction.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`${statement.periodId} ${statement._id} Errored Creating Profit Share Advance Recoupment Transaction`, err);
          cb(err);
        });
    } else {
      cb();
    }
  },
  profitShareNegativeBalanceRecoupment: (statement, cb) => {
    // Negative Balance Recoupment
    if (statement.contractType === 'Profit Share' && statement.openingBalance < 0 && statement.closingBalance > 0) {
      const transaction = new Transaction({
        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: 'Negative Balance Recoupment', date: statement.date, userCreated: false, amount: 0 - statement.openingBalance,
      });
      transaction.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`${statement.periodId} ${statement._id} Errored Creating Profit Share Negative Balance Recoupment Transaction`, err);
          cb(err);
        });
    } else {
      cb();
    }
  },
  profitShareOutput: (statement, period, cb) => {
    // Output
    let value = statement.profitShareNetAmount - statement.profitShareAdvanceRecouped;
    if (statement.openingBalance < 0 && value <= 0) {
      value -= statement.openingBalance;
    }
    const transaction = new Transaction({
      statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: period.name, date: statement.date, userCreated: false, amount: value,
    });
    transaction.save()
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(`${statement.periodId} ${statement._id} Errored Creating Profit Share Output Transaction`, err);
        cb(err);
      });
  },
  distribution: (statement, contract, client, period, cb) => {
    // Distribution Specific Transactions
    if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
      async.waterfall([
        (cb) => StatementTransactions.distributionFee(statement, period, client, cb),
        (cb) => StatementTransactions.distributionCosts(statement, period, cb),
        (cb) => StatementTransactions.distributionMechanicalDeductions(statement, period, cb),
      ], cb);
    } else {
      cb();
    }
  },
  distributionFee: (statement, period, client, cb) => {
    let amount = statement.netAmount - statement.grossAmount;
    if (statement.mechanicalDeduction && !Number.isNaN(statement.mechanicalDeduction)) {
      amount += statement.mechanicalDeduction;
    }
    const customValue = client.customFeesInvoiceTitle ? `${period.name} ${client.customFeesInvoiceTitle}` : `${period.name} Distribution Fees`;
    const feesTransaction = new Transaction({ statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: customValue, amount, date: statement.date, userCreated: false });
    feesTransaction.save()
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(`${statement.periodId} ${statement._id} Errored Creating Distribution Fee Transaction`, err);
        cb(err);
      });
  },
  distributionCosts: (statement, period, cb) => {
    const costsTransaction = new Transaction({
      statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `${period.name} Costs`, amount: 0 - statement.netCosts, date: statement.date, userCreated: false,
    });
    costsTransaction.save()
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(`${statement.periodId} ${statement._id} Errored Creating Distribution Costs Transaction`, err);
        cb(err);
      });
  },
  distributionMechanicalDeductions: (statement, period, cb) => {
    if (statement.mechanicalDeduction && !Number.isNaN(statement.mechanicalDeduction)) {
      const mechanicalDeductionTransaction = new Transaction({
        statementId: statement._id, clientId: statement.clientId, contractId: statement.contractId, name: `${period.name} Mechanical Deductions`, amount: 0 - statement.mechanicalDeduction, date: statement.date, userCreated: false,
      });
      mechanicalDeductionTransaction.save()
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(`${statement.periodId} ${statement._id} Errored Creating Distribution Mechanical Deduction Transaction`, err);
          cb(err);
        });
    } else {
      cb();
    }
  },
};

module.exports = StatementTransactions;
