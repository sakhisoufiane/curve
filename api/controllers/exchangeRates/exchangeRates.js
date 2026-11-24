const { ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');

async function getHistoricalExchangeRates({ curveUser, Client, ExchangeRate, currencyCodes, date }) {
  const exchangeRates = await ExchangeRateLib.getHistoricalExchangeRates({
    clientId: curveUser?.clientId,
    Client,
    ExchangeRate,
    currencyCodes,
    date,
  });

  // Convert direct rate to reciprocal rate e.g. 1 USD = 153 YEN {directRate} -> 1 / 153 = {reciprocalRate}
  // Always 1 as the rates are retrieved against the Home Currency
  const reciprocalRates = exchangeRates.map((exchangeRate) => {
    const reciprocalRate = (exchangeRate?.rate && exchangeRate.rate !== 0) ? 1 / exchangeRate.rate : null;
    return {
      ...exchangeRate,
      rate: reciprocalRate,
    };
  });

  return reciprocalRates;
}

module.exports = {
  getHistoricalExchangeRates,
};
