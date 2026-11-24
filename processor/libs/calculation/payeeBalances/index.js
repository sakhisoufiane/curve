const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../../../models/client');

const PayeeBalanceTax = require('./libs/tax');
const PayeeBalanceTransfers = require('./libs/transfers');
const PayeeBalanceAutoPayments = require('./libs/autoPayments');

const PayeeBalanceController = this;

/**
 * Creates Payee Balance Transactions for a Period
 *
 * @param {Object} param.period - Mongo Document for Period
 * @param {Array} param.contract - Mongo Document for Contract, used for running a Statement
 * @param {String} param.statement - Mongo Document for Statement, used for reprocessing a Statement
 *
 * @returns {Promise<void>}
 */
PayeeBalanceController.createBalances = async ({ period, contract, statement }) => {
  if (!period && !statement) throw new Error('Period AND/OR Contract is required to run Payee Balances');

  const { clientType } = await Client.findById(period.clientId).select('clientType').catch(logger.error);
  if (!clientType) throw new Error('No clientType Found');

  // Create Period Transfers for each Payee
  await PayeeBalanceTransfers.create({
    clientType,
    period,
    statement, // If null, all balances will be created (For Period Run)
  });

  // Distribution Clients handle tax on the Contract Level
  if (clientType !== 'Distributor') {
    // Once all balances for payees have been updated, we can create tax transactions
    await PayeeBalanceTax.create({
      period,
      contract,
      statement, // If null, all balances will be created (For Period Run)
    });
  }

  // Once all balances for payees have been updated, we can create payment transactions
  await PayeeBalanceAutoPayments.create({
    period,
    contract,
    statement, // If null, all balances will be created (For Period Run)
  });
};

module.exports = PayeeBalanceController;
