/* eslint-disable max-len  */
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Transaction = require('../models/transaction');
const Contract = require('../models/contract');

const periodId = '5fefba6b5f90790015510505';
Period.findById(periodId, (err, period) => {
  Statement.find({ periodId }, (err, statements) => {
    async.eachSeries(statements, (statement, cb) => {
      Transaction.find({ statementId: statement._id.toString(), reserveReleased: true, date: { $gt: new Date(2020, 8, 1) } }, (err, transactions) => {
        if (statement.contractType === 'Profit Share' && statement.reservesWithheld && transactions.length == 0) {
          logger.info(statement.name);
          Contract.findById(statement.contractId, (err, contract) => {
            const date = new Date(period.endDate);
            // Get the contract type, and get months to add for each reserve period
            const dateAddArray = getDateAdd(period.accountingPeriod);
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
              logger.info(transaction);
              transaction.save((err) => {
                if (err) { logger.error(err); }
                index += 1;
                reserveCb(err);
              });
            }, cb);
          });
        } else {
          cb();
        }
      });
    }, () => {
      logger.info('Complete');
    });
  });
});

function getDateAdd(accountingPeriod) {
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
}
