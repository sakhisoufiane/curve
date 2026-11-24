const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const PayeeTransaction = require('../models/payeeTransaction');

const PayeeController = this;

/**
 * Returns current Payee Balance
 *
 * @param {Object} params.payee - Mongo Document for Payee
 * @param {Date} params.date - Date to determine when to count Payee balance up to
 * @returns {Promise<Float>} returns current payee closing balance
 */
PayeeController.balanceAtDate = async ({ payee, date }) => {
  const openingBalance = payee.openingBalance || 0;

  const transactions = await PayeeTransaction.find({ payeeId: payee._id.toString(), date: { $lte: date } }).sort({ date: 1 }).catch(logger.error);
  if (!transactions?.length) return openingBalance;

  const balance = transactions.reduce((currentBalance, transaction) => transaction.amountInPayeeCurrency + currentBalance, openingBalance);

  return balance;
};

module.exports = PayeeController;
