/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Payee = require('../../../../models/payee');
const Client = require('../../../../models/client');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');

const PayeeBalanceHelpers = require('./helpers');
const ContractController = require('../../../../controllers/contract');

const PayeeBalanceTransfers = this;

/**
 * @private
 * Creates Transfer (To and From) for each payee from a Contract
 *
 * @param {Object} params.contract - Mongo Document for Contract
 * @param {Object} params.payee - Payee Object from Contract.payees
 * @param {Number} params.closingBalance - Closing Balance for Contract
 * @param {Object} params.period - Mongo Document for Period
 * @param {Object} params.statement - Mongo Document for Statement
 * @returns {Promise<void>}
 */
PayeeBalanceTransfers.setupTransfers = async ({ contract, payee, contractBalances, period, statement, homeCurrency, clientType }) => {
  // Vars
  const endDate = moment.utc(period.endDate).format();
  const { closingBalance, advanceRemaining } = contractBalances;
  const contractCurrency = contract.currency === 'Home Currency' ? homeCurrency : contract.currency;

  // Payee Closing Balance
  const payeeBalance = closingBalance * (payee.percentage / 100);

  // Handle missing Payee Currency
  const foundPayee = await Payee.findById(payee.payeeId);
  if (!foundPayee?.payeeBalanceCurrency) {
    await PayeeBalanceHelpers.addMissingCurrencyNote({ payee: foundPayee, period });
    return;
  }

  // Handle Payee Balance Conditions
  if (!Math.round(payeeBalance)) return; // No need to transfer an empty value, even when condition is 'Always'
  if (contract.payeeBalanceCondition === 'When Positive' && Math.round(payeeBalance) < 0 && clientType !== 'Distributor') return;

  // Handle Period Transfers
  await PayeeBalanceHelpers.createTransactions({
    payee: foundPayee,
    contract,
    period,
    statement,
    payeeBalance,
    contractCurrency,
    homeCurrency,
    endDate,
    clientType,
    closingBalance,
  });

  // Handle Advance Transfers
  if (Math.round(advanceRemaining) && contract.payeeBalanceCondition === 'Always' && contract.type === 'Profit Share - Flexible') {
    const advanceRemainingBalance = advanceRemaining * (payee.percentage / 100);

    await PayeeBalanceHelpers.createTransactions({
      payee: foundPayee,
      contract,
      period,
      statement,
      payeeBalance: advanceRemainingBalance,
      contractCurrency,
      homeCurrency,
      endDate,
      isAdvance: true,
      closingBalance,
      clientType,
    });
  }
};

/**
 * Sets Transactions for Contract to Payees
 *
 * @param {Object} params.clientType - Type of Client ['Distribution', 'Label', 'Publisher']
 * @param {Object} params.period - Mongo Document for Period
 * @param {Object} params.contractId - Only used when processing a single contract
 * @param {String} params.lastId - Last Contract ID from previous method call, used for pagination
 * @param {Number} Contract - Number of Contracts processed so far
 * @returns {Promise<void>}
 */
PayeeBalanceTransfers.create = async ({ clientType, period, statement, lastId, count = 0 }) => {
  const logKey = statement ? `Statement ${statement._id.toString()}` : `Period ${period._id.toString()}`;
  const limit = 1000;

  const query = {
    clientId: period.clientId,
    'payees.payeeId[0]': { $exists: true },
    payeeBalanceCondition: { $ne: 'Never' },
    active: true,
    accountingPeriod: period.accountingPeriodType,
  };

  if (statement) { query._id = statement.contractId; } // Only used when processing a single contract
  if (lastId) { query._id = { $gt: lastId }; } // Pagination, we only process 1000 contracts at a time

  const contracts = await Contract
    .find(query)
    .select('_id name type clientId openingBalance payees payeeBalanceCondition minPayout currency')
    .sort({ _id: 1 })
    .limit(limit);

  if (!contracts?.length) {
    logger.info(`${period._id.toString()} | Payee Balances | No contracts found`);
    return;
  }

  const { homeCurrency } = await Client.findById(period.clientId, 'homeCurrency');

  // Get Contract Closing Balance Date
  const periodEndDate = moment.utc(period.endDate).format();

  await eachLimit(contracts, 50, async (foundContract) => {
    const statement = await Statement
      .findOne({ clientId: foundContract.clientId, contractId: foundContract._id.toString(), periodId: period._id.toString() })
      .select('_id withholdingTax');

    if (!statement) return; // This contract is not part of the current period

    // Depending on the contract type (Royalty/Profit Share), we return an object containing an advanceRemaining and closingBalance
    const contractBalances = await ContractController.getCurrentBalance({ contract: foundContract, date: periodEndDate });

    for (const payee of foundContract.payees) {
      await PayeeBalanceTransfers.setupTransfers({
        payee,
        period,
        statement,
        clientType,
        homeCurrency,
        contractBalances,
        contract: foundContract,
      });
    }

    count += 1;
  });

  logger.info(`${logKey} | Payee Balances | Processed ${count} contracts`);

  if (contracts.length !== limit) return;

  // If there are more contract to process we call this function again with the last contract ID
  await PayeeBalanceTransfers.create({
    period,
    statement,
    lastId: contracts[contracts.length - 1]._id,
    count,
  });
};

module.exports = PayeeBalanceTransfers;
