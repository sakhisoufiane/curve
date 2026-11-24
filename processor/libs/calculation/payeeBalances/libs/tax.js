const moment = require('moment');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Payee = require('../../../../models/payee');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');

const PayeeController = require('../../../../controllers/payee');
const PayeeTransaction = require('../../../../models/payeeTransaction');

const PayeeBalanceTax = this;

/**
 * Creates Tax Transaction for Payee
 *
 * @param {Object} params.payee - Payee Object from Mongo
 * @param {Object} params.period - Period Object from Mongo
 * @param {Boolean} params.isWithholding - If the Tax is a Withholding Tax
 * @returns {Promise<void>}
 */
PayeeBalanceTax.setTax = async ({ payee, period, isWithholding }) => {
  const periodEndDate = moment.utc(period.endDate).format();
  const periodStartDate = moment.utc(period.startDate).format();

  const openingBalance = await PayeeController.balanceAtDate({ payee, date: periodStartDate });
  const closingBalance = await PayeeController.balanceAtDate({ payee, date: periodEndDate });

  // If total balance is less than the minimum payout, we don't create a tax transaction
  if (Math.round(closingBalance) < payee.minPayout) return; // Minimum Payout will always default to 0 if blank

  // Only Apply Tax to what has been earn't this period, we assume previous balances have already been paid out
  const taxBasis = closingBalance - openingBalance;

  const taxRate = isWithholding ? payee.withholdingTaxRate : payee.selfBillingTaxRate;

  const taxAmount = taxBasis * (taxRate / 100);

  // Transaction Titles For Payee Transaction
  const withholdingTaxTitle = payee.withholdingTaxWording || 'Withholding Tax';
  const transactionTitle = isWithholding ? withholdingTaxTitle : 'Tax';

  const transaction = new PayeeTransaction({
    clientId: payee.clientId,
    name: `${payee.name} - ${period.name} ${transactionTitle} (${taxRate}%)`,
    periodId: period._id.toString(),
    payeeId: payee._id.toString(),
    date: periodEndDate,
    amountInOriginalCurrency: isWithholding ? -taxAmount : taxAmount,
    amountInPayeeCurrency: isWithholding ? -taxAmount : taxAmount,
    currency: payee.payeeBalanceCurrency,
    originalCurrency: payee.payeeBalanceCurrency,
    type: 'Tax',
    userCreated: false,
  });

  await transaction.save();
};

/**
 * Any Payees with a selfBillingTaxRate will have a tax transaction created for the period
 *
 * @param {Objects} params.period - Mongo Document for Period
 * @param {String} params.lastId - Last Payee Id from previous run, used for pagination
 * @param {Array} params.contract - Mongo Document for Contract, used for running a Statement
 * @returns {Promise<void>}
 */
PayeeBalanceTax.create = async ({ period, lastId, contract, statement }) => {
  const logKey = statement ? `Statement ${statement._id.toString()}` : `Period ${period._id.toString()}`;

  logger.info(`${logKey} | Creating Payee Tax Transfers 💲`);

  const limit = 1000;

  // Find any payees with a selfBillingTaxRate OR withholdingTaxRate has been set
  const query = {
    clientId: period.clientId,
    payeeBalanceCurrency: { $exists: true },
    $or: [
      {
        selfBilling: true,
        selfBillingTaxRate: { $exists: true },
      },
      {
        withholdingTaxRate: { $exists: true },
      },
    ],
  };

  if (contract) { query._id = { $in: contract.payees.map((payee) => payee.payeeId) }; } // When reprocessing a Statement, this will be used
  if (lastId) { query._id = { $gt: lastId }; } // Pagination, we only process 1000 payees at a time

  const payees = await Payee
    .find(query)
    .select('_id name clientId payeeBalanceCurrency minPayout selfBillingTaxRate selfBillingTaxText withholdingTaxRate withholdingTaxWording')
    .sort({ _id: 1 })
    .limit(limit);

  if (!payees?.length) return;

  await eachLimit(payees, 50, async (payee) => {
    const contract = await Contract
      .findOne({ clientId: payee.clientId, 'payees.payeeId': payee._id.toString(), active: true, accountingPeriod: period.accountingPeriodType })
      .select('_id')
      .catch(logger.error);

    if (!contract) return; // Check if payee is relevant to the period

    const statement = await Statement
      .findOne({ clientId: payee.clientId, contractId: contract._id.toString(), periodId: period._id.toString() })
      .select('_id')
      .catch(logger.error);

    if (!statement) return; // Confirming that a Statement has been created for the period

    if (payee.withholdingTaxRate) {
      await PayeeBalanceTax.setTax({ payee, period, isWithholding: true });
    }

    // Self Billing Tax Is Created After any Withholding Tax is applied
    await PayeeBalanceTax.setTax({ payee, period });
  });

  if (payees.length === limit) {
    await PayeeBalanceTax.create({ period, lastId: payees[payees.length - 1]._id, contract });
  }
};

module.exports = PayeeBalanceTax;
