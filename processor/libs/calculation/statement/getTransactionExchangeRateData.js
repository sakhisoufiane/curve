const getCrossContractBaseName = (period, contract, contractToCrossTo) => `${period.year} ${period.accountingPeriod} - ${contract.name} to ${contractToCrossTo.name}`;

const getTransactionExchangeRateData = (client, period, statement, contract, contractToCrossTo, amount) => {
  const exchangeRateData = { name: getCrossContractBaseName(period, contract, contractToCrossTo), amount };
  // Only change name/amount when different currencies
  if (contract.currency !== contractToCrossTo.currency) {
    let exchangeRate = 0;
    // Get exchange rate, leave at 0 if not found.
    period.currencyExchangeRates.forEach((currencyPair) => { if (currencyPair && currencyPair.from === contract.currency && currencyPair.to === contractToCrossTo.currency) { exchangeRate = currencyPair.rate; } });
    // Update transaction amount to account for the exchange rate
    exchangeRateData.amount *= exchangeRate;
    // Get the name of the currency to display on the transaction
    let displayCurrency = contract.currency;
    if (displayCurrency === 'Home Currency') { displayCurrency = client.homeCurrency ? client.homeCurrency : ''; }
    // Update transaction name
    exchangeRateData.name += `: ${amount.toFixed(2)}${displayCurrency} @ ${exchangeRate.toFixed(2)}`;
    // Add message when no exchange rate is found on the period.
    if (exchangeRate === 0) { exchangeRateData.name += ' - No exchange rate set.'; }
  }
  return exchangeRateData;
};

module.exports = getTransactionExchangeRateData;
module.exports.getCrossContractBaseName = getCrossContractBaseName;
