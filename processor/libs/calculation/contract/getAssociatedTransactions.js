const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Transaction = require('../../../models/transaction');

module.exports = (contract, options, callback) => {
  let balance = contract.openingBalance;
  contract.transactions = [];
  if (!options) { callback = options; }
  const filter = { clientId: contract.clientId, contractId: contract._id };
  if (contract.type === 'Profit Share') {
    filter.isReserveRelease = { $ne: true };
    filter.isReserveWithholding = { $ne: true };
  }
  if (options && options.excludeAdvance) { filter.type = { $ne: 'Advance' }; }
  if (options && options.excludeReserveReleased) { filter.isReserveRelease = { $ne: true }; }
  Transaction.find(filter, null, { sort: { date: 1, createdAt: 1 } })
    .lean()
    .then((transactions) => {
      async.eachSeries(transactions, (transaction, cb) => {
        transaction.balance = balance + transaction.amount;
        contract.transactions.push(transaction);
        balance += transaction.amount;
        cb();
      }, () => {
        if (callback) {
          callback();
        } else {
          options();
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      if (callback) {
        callback();
      } else {
        options();
      }
    });
};
