/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Payee = require('../../../../models/payee');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const PayeeTransaction = require('../../../../models/payeeTransaction');

const PayeeController = require('../../../../controllers/payee');

const PayeeBalanceAutoPayments = this;

/**
 * Creates AutoPayments Transactions for Payee
 *
 * @param {Object} params.period - Mongo Document for Period
 * @param {Array} params.contract - Mongo Document for Contract, used for running a Statement
 * @param {String} params.lastId - Last Payee Id from previous run, used for pagination
 * @param {Number} params.count - Count of Payees processed
 * @returns {Promise<void>}
 */
PayeeBalanceAutoPayments.create = async ({ period, contract, statement, lastId, count = 0 }) => {
  const logKey = statement ? `Statement ${statement._id.toString()}` : `Period ${period._id.toString()}`;
  logger.info(`${logKey} | Creating Payee AutoPayments 💰`);

  const limit = 1000;

  const query = { clientId: period.clientId, autoPayment: true, payeeBalanceCurrency: { $exists: true } };

  if (contract) { query._id = { $in: contract.payees.map((payee) => payee.payeeId) }; } // When reprocessing a Statement, this will be used
  if (lastId) { query._id = { $gt: lastId }; } // Pagination, we only process 1000 payees at a time

  const payees = await Payee
    .find(query)
    .select('_id name clientId minPayout openingBalance payeeBalanceCurrency')
    .sort({ _id: 1 })
    .limit(limit)
    .catch(logger.error);

  if (!payees?.length) {
    logger.info(`${period._id.toString()} | Payee Payments | No payees found`);
    return;
  }

  const periodEndDate = moment.utc(period.endDate).format();

  await eachLimit(payees, 50, async (payee) => {
    // We only want to target payees that have a contract with the same accounting period as the period we are processing
    const contractQuery = { clientId: payee.clientId, 'payees.payeeId': payee._id.toString(), active: true, accountingPeriod: period.accountingPeriodType };
    const foundContract = await Contract.findOne(contractQuery).select('_id').catch(logger.error);
    if (!foundContract) return;

    const statement = await Statement.findOne({ clientId: payee.clientId, contractId: foundContract._id.toString(), periodId: period._id.toString() }).select('_id').catch(logger.error);
    if (!statement) return; // Confirm there is an associated statement

    const closingBalance = await PayeeController.balanceAtDate({ payee, date: periodEndDate });
    if (Math.round(closingBalance) <= payee.minPayout) return; // Minimum Payout will always default to 0 if blank

    const payment = new PayeeTransaction({
      clientId: payee.clientId,
      name: `${payee.name} - ${period.name} Payment`,
      periodId: period._id.toString(),
      payeeId: payee._id.toString(),
      date: periodEndDate,
      amountInOriginalCurrency: -closingBalance,
      amountInPayeeCurrency: -closingBalance,
      currency: payee.payeeBalanceCurrency,
      originalCurrency: payee.payeeBalanceCurrency,
      userCreated: false,
      published: false,
      type: 'Payment',
    });

    await payment.save();
    count += 1;
  });

  logger.info(`${period._id.toString()} | Payee Balances - AutoPayments | Processed ${count} payees`);

  if (payees.length !== limit) return;

  await PayeeBalanceAutoPayments.create({
    period,
    contract,
    lastId: payees[payees.length - 1]._id,
    count,
  });
};

module.exports = PayeeBalanceAutoPayments;
