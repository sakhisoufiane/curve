const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Transaction = require('../models/transaction');

const ContractController = this;

/**
 * Returns current Contract Balance OR Advance Remaining (if Profit-Share Deal)
 *
 * @param {Object} params.contract - Mongo Document for Contract
 * @param {{ getAdvanceRemaining: Boolean, isProfitShare: Boolean }} params.options - Options to change balance query
 * @param {Date} params.date - Date to determine when to count contract balance up to
 * @returns {Promise<Float>} returns current balance
 */
ContractController.balanceAtDate = async ({ contract, options, date }) => {
  let openingBalance = contract.openingBalance || 0;

  // Set time to end of previous day to catch all transactions from that day
  const filter = { clientId: contract.clientId, contractId: contract._id.toString(), date: { $lte: date } };

  if (options?.getAdvanceRemaining) {
    openingBalance = 0;
    filter.type = { $in: ['Advance', 'Advance Recoupment'] };
  }

  if (options?.isProfitShare) {
    filter.type = { $nin: ['Advance', 'Advance Recoupment'] };
    filter.isReserveWithholding = { $ne: true };
    filter.isReserveRelease = { $ne: true };
  }

  const transactions = await Transaction.find(filter, null, { sort: { date: 1 } }).catch(logger.error);
  if (!transactions?.length) return openingBalance;

  const balance = transactions.reduce((acc, transaction) => transaction.amount + acc, openingBalance);

  return balance;
};

/**
 * Returns current Contract Balance & Advance Remaining (if Profit-Share Deal)
 *
 * @param {Object} params.contract - Mongo Document for Contract
 * @param {Date} params.date - Date to determine when to count contract balance up to
 * @returns {Promise<{ closingBalance: Float, advanceRemaining: Float }>} returns { closingBalance, advanceRemaining }
 */
ContractController.getCurrentBalance = async ({ contract, date }) => {
  // Config
  const options = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { isProfitShare: true } : {};
  // Return current balance
  const closingBalance = await ContractController.balanceAtDate({ contract, options, date });
  const advanceRemaining = await ContractController.balanceAtDate({ contract, options: { getAdvanceRemaining: true }, date });

  return { closingBalance, advanceRemaining };
};

module.exports = ContractController;
