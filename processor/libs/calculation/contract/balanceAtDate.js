const async = require('async');
const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Transaction = require('../../../models/transaction');

module.exports = (contract, date, options, callback) => {
  let balance = contract.openingBalance || 0;
  if (!callback) { callback = options; }
  // Set time to end of previous day to catch all transactions from that day
  const endOfDate = moment.utc(date).endOf('day').subtract(1, 'day').format();
  const filter = { clientId: contract.clientId, contractId: contract._id, date: { $lte: endOfDate } };
  if (options && options.excludeAdvance) { filter.type = { $nin: ['Advance', 'Advance Recoupment'] }; }
  if (options && options.excludeReserves) {
    filter.isReserveWithholding = { $ne: true };
    filter.isReserveRelease = { $ne: true };
  }
  if (options && options.excludeContractPayments && filter.type) {
    filter.type.$nin.push('Contract Payment');
  } else if (options && options.excludeContractPayments) {
    filter.type = { $ne: 'Contract Payment' };
  }
  // Exclude all transfers
  if (options && options.excludeContractTransfers && filter.type) {
    filter.type.$nin.push('Transfer From');
    filter.type.$nin.push('Transfer To');
  } else if (options && options.excludeContractTransfers) {
    filter.type = { $nin: ['Transfer From', 'Transfer To'] };
  }
  // Exclude just transfer tos
  if (options && options.excludeContractTransferTos && filter.type) {
    filter.type.$nin.push('Transfer To');
  } else if (options && options.excludeContractTransfersTos) {
    filter.type = { $nin: ['Transfer To'] };
  }
  if (options && options.excludeTransferringStatement) { filter.transferringStatementId = { $ne: options.excludeTransferringStatement }; }
  // This is any auto payments made this period - needed if comparing other contracts to this one after this one has run
  if (options && options.excludeStatementPayments && options.statementId) {
    filter.$or = [{ isPayment: { $ne: true } }, { statementId: { $ne: options.statementId } }];
  }

  Transaction.find(filter, null, { sort: { date: 1 } })
    .lean()
    .then((transactions) => {
      async.eachSeries(transactions, (transaction, cb) => {
        if (moment.utc(transaction.date).format() < endOfDate) { balance += transaction.amount; }
        cb();
      }, (err) => {
        if (callback) {
          callback(err, balance);
        } else {
          options(err, balance);
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      if (callback) {
        callback(err);
      } else {
        options(err);
      }
    });
};
