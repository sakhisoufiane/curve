const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Period = require('../../../../models/period');
const Transaction = require('../../../../models/transaction');
const PayeeTransaction = require('../../../../models/payeeTransaction');

const PayeeBalanceHelpers = this;

/**
 * If there is no currency set for a Payee, we add a note to the Period to notify the user
 *
 * @param {Object} params.period - Mongo Document for Period
 * @param {Object?} params.payee - Mongo Document for Payee
 *
 * @returns {Promise<void>}
 */
PayeeBalanceHelpers.addMissingCurrencyNote = async ({ period, payee }) => {
  const note = {
    type: 'Missing Currency',
    message: 'No Payee Balance Transaction Currency Set. Please check if there is a currency for this payee and if there is an exchange rate set against the period',
    runNo: period.runNo,
    documentType: 'Payee',
    documentId: payee._id.toString(),
    documentName: payee.name,
  };

  await Period.findByIdAndUpdate(period._id, { $push: { calculationNotes: note } }, { safe: true, upsert: true }).catch(logger.error);
};

/**
 * Finds Contract to Payee Currency Conversion Rate
 *
 * @param {Number} params.amount - Original Payee Balance Amount (in Contract Currency)
 * @param {String} params.fromCurrency - Contact Currency Code
 * @param {String} params.toCurrency - Payee Currency Code
 * @param {Object} params.period - Mongo Document for Period
 * @param {String} params.homeCurrency - Client Home Currency Code
 * @returns {Number}
 */
PayeeBalanceHelpers.currencyConversion = ({ amount, fromCurrency, toCurrency, period, homeCurrency }) => {
  const { currencyExchangeRates } = period;
  if (fromCurrency === toCurrency) return amount;

  const currencies = currencyExchangeRates.map((currency) => ({
    ...currency,
    from: currency.from === 'Home Currency' ? homeCurrency : currency.from,
    to: currency.to === 'Home Currency' ? homeCurrency : currency.to,
  }));

  const currencyPair = currencies.find((currency) => currency.from === fromCurrency && currency.to === toCurrency);
  if (!currencyPair) return null;

  const rate = amount * currencyPair.rate;

  return rate;
};

/**
 * Created AddTo and SubtractFrom Transactions for Payee and Contract
 *
 * @param {Object} params.payee - Payee Object from Mongo
 * @param {Object} params.contract - Contract Object from Mongo
 * @param {Object} params.period - Period Object from Mongo
 * @param {Object} params.statement - Statement Object from Mongo
 * @param {Number} params.payeeBalance - Payee Balance Amount
 * @param {String} params.contractCurrency - Contract Currency Code
 * @param {String} params.homeCurrency - Client Home Currency Code
 * @param {Date} params.endDate - End Date of Period Date
 * @param {Boolean?} params.isAdvance - Is Advance Transfer
 * @returns {Promise<void>}
 */
PayeeBalanceHelpers.createTransactions = async ({ payee, contract, period, statement, payeeBalance, contractCurrency, homeCurrency, endDate, isAdvance, clientType, closingBalance }) => {
  const convertedBalance = PayeeBalanceHelpers.currencyConversion({
    amount: payeeBalance,
    fromCurrency: contractCurrency,
    toCurrency: payee.payeeBalanceCurrency,
    period,
    homeCurrency,
  });

  const transactionHeader = isAdvance ? 'Advance Payee Transfer' : 'Payee Transfer';

  const transactionTitle = contractCurrency === payee.payeeBalanceCurrency
    ? `${transactionHeader}: ${payee.name}`
    : `${transactionHeader}: ${payee.name}: ${-Math.round(convertedBalance * 100) / 100}${payee.payeeBalanceCurrency} @ ${Math.round((convertedBalance / payeeBalance) * 100) / 100}`;

  // Handle Missing Currencies
  if (convertedBalance === null) {
    await PayeeBalanceHelpers.addMissingCurrencyNote({ payee, period });
    return;
  }

  // Handle Distribution Clients With Tax
  const distributionBalance = closingBalance - statement.withholdingTax; // Check if any amount is payable after WHT is applied
  if (clientType === 'Distributor' && distributionBalance > 0 && distributionBalance >= contract.minPayout) {
    const payeeTransaction = new PayeeTransaction({
      clientId: contract.clientId,
      name: `${contract.name} - ${period.name}`,
      contractId: contract._id.toString(),
      payeeId: payee._id.toString(),
      statementId: statement._id.toString(),
      periodId: period._id.toString(),
      date: endDate,
      amountInOriginalCurrency: payeeBalance < 0 ? 0 - payeeBalance : payeeBalance, // We can flip the value of this because the amount minus any wht is positive
      amountInPayeeCurrency: convertedBalance < 0 ? 0 - convertedBalance : convertedBalance, // We can flip the value of this because the amount minus any wht is positive
      currency: payee.payeeBalanceCurrency,
      originalCurrency: contractCurrency,
      userCreated: false,
      published: false,
      type: 'Period Transfer',
    });
    await payeeTransaction.save();

    const transaction = new Transaction({
      clientId: contract.clientId,
      contractId: contract._id,
      statementId: statement._id.toString(),
      name: transactionTitle,
      payeeId: payee._id.toString(),
      date: endDate,
      amount: 0 - payeeBalance, // Remove balance with contract currency
      userCreated: false,
    });

    await transaction.save();
    return;
  }

  const payeeTransaction = new PayeeTransaction({
    clientId: contract.clientId,
    name: `${contract.name} - ${period.name}`,
    contractId: contract._id.toString(),
    payeeId: payee._id.toString(),
    statementId: statement._id.toString(),
    periodId: period._id.toString(),
    date: endDate,
    amountInOriginalCurrency: payeeBalance,
    amountInPayeeCurrency: convertedBalance,
    currency: payee.payeeBalanceCurrency,
    originalCurrency: contractCurrency,
    userCreated: false,
    published: false,
    type: isAdvance ? 'Advance' : 'Period Transfer',
  });

  await payeeTransaction.save();

  const transaction = new Transaction({
    clientId: contract.clientId,
    contractId: contract._id,
    statementId: statement._id.toString(),
    name: transactionTitle,
    payeeId: payee._id.toString(),
    date: endDate,
    amount: -payeeBalance, // Remove balance with contract currency
    userCreated: false,
  });

  await transaction.save();
};

module.exports = PayeeBalanceHelpers;
