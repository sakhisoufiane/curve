/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
const moment = require('moment');
const { eachLimit } = require('async');
const { default: axios } = require('axios');
const _ = require('lodash');

const logger = require('./logger');

const ExchangeRateLib = this;

async function getExchangeRateFromApi(currencyPair) {
  if (process.env.exchangeRateApiURL && process.env.exchangeRateApiKey) {
    const url = process.env.exchangeRateApiURL;
    const apiKey = process.env.exchangeRateApiKey;
    logger.info(`Searching for exchange rates on: ${url}`);
    const apiRequest = `${url}${currencyPair}&compact=ultra&apiKey=${apiKey}`;
    const response = await axios.get(apiRequest);
    if (response.status === 200) {
      return response.data[currencyPair];
    }
  }
  return null;
}

async function fetchRates({ exchangeRates, ExchangeRate }) {
  const output = {};
  // Check exchange rates are passed
  if (!exchangeRates || !Array.isArray(exchangeRates)) { throw Error('Requires an object of change rate pairs to be passed'); }

  for (const pair of exchangeRates) {
    // Check that the pairs are an array and that there's two currencies in it.
    if (!pair || !Array.isArray(pair) || pair.length !== 2) { throw Error('Currency pairs need to be an array'); }
    // Define the currency pair
    const currencyPair = `${pair[0]}_${pair[1]}`;
    // Get cached exchange rate from the database
    const exchangeRate = await ExchangeRate.findOne({
      currencyFrom: pair[0],
      currencyTo: pair[1],
      rate: { $exists: true },
      createdAt: { $gte: moment().startOf('day').format() },
    }, 'rate');
    if (exchangeRate?.rate) {
      logger.info(`Using cached rate for ${currencyPair}`);
      output[currencyPair] = exchangeRate.rate;
    } else {
      // Get the rate using the api
      logger.info(`Getting rate from api for ${currencyPair}`);
      const rate = await getExchangeRateFromApi(currencyPair);
      if (!rate) {
        throw Error('Could not retrieve exchange rates.');
      }
      output[currencyPair] = rate;
      logger.info(`Found exchange rates from api-service: ${currencyPair} === ${rate}`);
      // Save the fetched rate to the database
      new ExchangeRate({ currencyFrom: pair[0], currencyTo: pair[1], rate }).save();
    }
  }

  return output;
}

/**
 * Fetches Payee Currencies from Contracts and Payees
 *
 * @param {Object} params.client - Client Mongo Object
 * @param {Object} params.Contract - Contract Model
 * @param {Object} params.Payee - Payee Model
 *
 * @returns {Array} - Array of Currency Pairs [USD, GBP]
 */
const getPayeeCurrency = async ({ client, Contract, Payee }) => {
  const { homeCurrency } = client;

  const currencies = [];

  const contracts = await Contract.find({ clientId: client._id.toString(), 'payees.0': { $exists: true }, payeeBalanceCondition: { $ne: 'Never' } }).select('payees currency');
  if (!contracts?.length) return currencies;

  await eachLimit(contracts, 50, async (contract) => {
    const payeeIds = contract.payees.map((payee) => payee.payeeId);

    const payees = await Payee.find({ clientId: client._id.toString(), payeeId: { $in: payeeIds }, payeeBalanceCurrency: { $exists: true } }).select('payeeBalanceCurrency');
    if (!payees?.length) return;

    payees.forEach((payee) => {
      const contractCurrency = contract.currency === 'Home Currency' ? homeCurrency : contract.currency;

      if (payee.payeeBalanceCurrency) {
        currencies.push([payee.payeeBalanceCurrency, contractCurrency]);
        currencies.push([contractCurrency, payee.payeeBalanceCurrency]);
      }
    });
  });

  return currencies;
};

/**
 * Fetches PPD Currencies from Releases via priceCategoryDealerPrices
 *
 * @param {client} params.client - Client Mongo Object
 * @param {Object} params.Release - Release Model
 * @param {Object} params.Contract - Contract Model
 *
 * @returns {Array} - Array of Currency Pairs [USD, GBP]
 */
const getPpdCurrencies = async ({ client, Release, Contract }) => {
  const { homeCurrency } = client;

  const currencies = [];

  // We only need releases that have priceCategoryDealerPrices and salesReturnsRights
  const releases = await Release
    .find({
      clientId: client._id.toString(),
      'priceCategoryDealerPrices.0.currency': { $exists: true },
      'salesReturnsRights.0.contractId': { $exists: true },
    })
    .select('salesReturnsRights priceCategoryDealerPrices');

  if (!releases?.length) return currencies;

  await eachLimit(releases, 50, async (release) => {
    const contractIds = release.salesReturnsRights.map((salesRight) => salesRight.contractId);

    // Get Contracts that have currency and are in the release, we need to create pairs between those contract currencies and PPD Currency
    const contracts = await Contract.find({ clientId: client._id.toString(), _id: { $in: contractIds }, currency: { $exists: true } }).select('currency');
    if (!contracts?.length) return;

    for (const contract of contracts) {
      const contractCurrency = contract.currency === 'Home Currency' ? homeCurrency : contract.currency;

      for (const priceCategoryDealerPrice of release.priceCategoryDealerPrices) {
        // Create Currency Pairs To and From PPD Currency to Contract Currency
        if (priceCategoryDealerPrice?.currency && contractCurrency) {
          currencies.push([priceCategoryDealerPrice.currency, contractCurrency]);
          currencies.push([contractCurrency, priceCategoryDealerPrice.currency]);
        }
      }
    }
  });

  return currencies;
};

/**
 * Fetches Mechanical Deduction Term Currencies to Contract Currency Pairs
 *
 * @param {client} params.client - Client Mongo Object
 * @param {Object} params.Contract - Contract Model
 *
 * @returns {Array} - Array of Currency Pairs [USD, GBP]
 */
const getMechanicalCurrencies = async ({ client, Contract }) => {
  const { homeCurrency } = client;

  const currencies = [];

  // We only need contracts that have mechanicalTerms and currency
  const contracts = await Contract
    .find({
      clientId: client._id.toString(),
      'mechanicalTerms.0.currency': { $exists: true },
      currency: { $exists: true },
    })
    .select('mechanicalTerms currency');

  if (!contracts?.length) return currencies;

  for (const contract of contracts) {
    const contractCurrency = contract.currency === 'Home Currency' ? homeCurrency : contract.currency;

    for (const mechanicalTerm of contract.mechanicalTerms) {
      // Create Currency Pairs To and From Mechanical Term Currency
      if (mechanicalTerm?.currency && contractCurrency) {
        currencies.push([mechanicalTerm.currency, contractCurrency]);
        currencies.push([contractCurrency, mechanicalTerm.currency]);
      }
    }
  }

  return currencies;
};

/**
 * Loads Exchange Rates for Client Currencies, Mechanical Contract Currencies, PPD Currencies, and Payee Currencies
 *
 * @param {Object} params - Parameters
 * @param {String} params.clientId - Client ID
 * @param {Object} params.Client - Client Model
 * @param {Object} params.Contract - Contract Model
 * @param {Object} params.Payee - Payee Model
 * @param {Object} params.Release - Release Model
 * @param {Object} params.ExchangeRate - ExchangeRate Model
 *
 * @returns {Object} - Exchange Rates { 'USD': { 'GBP': 0.75, 'EUR': 0.85 }
 */
ExchangeRateLib.getExchangeRates = async ({ clientId, Client, Contract, Payee, Release, ExchangeRate }) => {
  const client = await Client.findById(clientId).select('features homeCurrency currency2 currency3 currency4');
  if (!client?.homeCurrency) throw new Error('Please ensure Home Currency is set against Client Settings');

  const clientCurrencies = [client.homeCurrency, client.currency2, client.currency3, client.currency4].filter(Boolean);

  let exchangeRatesRequests = [];
  // Create Currency Pairs from client Currencies
  clientCurrencies.forEach((currency) => {
    if (currency !== client.homeCurrency) {
      exchangeRatesRequests.push([client.homeCurrency, currency]);
      exchangeRatesRequests.push([currency, client.homeCurrency]);
    }
  });

  // Get Mechanical Contract Currency Pairs (Deduction Currency to Contract Currency)
  const mechanicalCurrencies = await getMechanicalCurrencies({ client, Contract });
  // Get PPD Currency Pairs (PPD Currency to Contract Currency)
  const ppdCurrencies = await getPpdCurrencies({ client, Release, Contract });

  // Merge Mechanical Contract Currency Pairs with Client Currencies, remove duplicates
  exchangeRatesRequests = [...new Set([...exchangeRatesRequests, ...mechanicalCurrencies, ...ppdCurrencies])];

  // Get Payee Currency Pairs (Payee Currency to Contract Currency)
  if (client.features.payeeBalances) {
    const payeeCurrencies = await getPayeeCurrency({ client, Contract, Payee });
    exchangeRatesRequests = [...new Set([...exchangeRatesRequests, ...payeeCurrencies])];
  }

  if (!exchangeRatesRequests.length) return;

  // Get Exchange Rates from API based of requesting pairs
  const rates = await fetchRates({ exchangeRates: exchangeRatesRequests, ExchangeRate });

  return rates;
};

/**
 * Loads Historical Rates for Client Home Currency against specified Currency Codes on Date
 *
 * @param {Object} params - Parameters
 * @param {String} params.clientId - Client ID
 * @param {Object} params.Client - Client Model
 * @param {Object} params.ExchangeRate - ExchangeRate Model
 * @param {string[]} params.currencyCodes - Array of Currency Codes
 * @param {string} params.date - Date to fetch historical rates in ISO format e.g. 2024-10-02
 *
 * @returns {{ currencyCode: string, rate: number }[]} - Exchange Rates [{ currencyCode: 'USD', rate: 1.2 }, ...]
 */
ExchangeRateLib.getHistoricalExchangeRates = async ({ clientId, Client, ExchangeRate, currencyCodes, date }) => {
  const client = await Client.findById(clientId).select('homeCurrency');

  if (!client?.homeCurrency) throw new Error('Please ensure Home Currency is set against Client Settings');
  if (!currencyCodes || currencyCodes?.length === 0) throw new Error('No currency codes specified');
  if (!date) throw new Error('No date specified');

  const isoDate = moment(date).format('YYYY-MM-DD');
  if (moment(date).isAfter(moment(), 'day')) {
    throw new Error('Historical rates cannot be retrieved for a future date');
  }

  // Attempt to fetch all cached rates first
  const filter = {
    currencyFrom: client.homeCurrency,
    currencyTo: { $in: currencyCodes },
    rate: { $exists: true },
    createdAt: {
      $gte: moment(date).startOf('day').toDate(),
      $lte: moment(date).endOf('day').toDate(),
    },
  };
  const cachedRates = await ExchangeRate.find(filter, 'currencyTo rate');
  const remainingRates = currencyCodes.filter((currencyCode) => cachedRates.findIndex((cachedRate) => cachedRate.currencyTo === currencyCode) === -1);

  const currencyPairs = remainingRates.map((currencyCode) => `${client.homeCurrency}_${currencyCode}`);
  const batchedRates = _.chunk(currencyPairs, 2);
  const apiRates = [];

  for (const batch of batchedRates) {
    const requestUrl = new URL(`${process.env.exchangeRateApiURL}${batch.join(',')}`);
    requestUrl.searchParams.append('compact', 'ultra');
    requestUrl.searchParams.append('apiKey', process.env.exchangeRateApiKey);
    requestUrl.searchParams.append('date', isoDate);
    const fullUrl = requestUrl.toString();

    logger.info('Getting uncached rates from api', { url: fullUrl.replace(process.env.exchangeRateApiKey, '<api-key>'), batch });
    try {
      const response = await axios.get(fullUrl);
      const { data } = response;

      for (const currencyPair in data) {
        if (!data?.[currencyPair]?.[isoDate]) continue;
        const rate = data[currencyPair][isoDate];
        const currencyTo = currencyPair.split('_')[1];
        apiRates.push({
          currencyTo,
          rate,
          failed: false,
        });
      }
    } catch (err) {
      // If we fail to retrieve the batch of rates, continue and set the rates to null
      // This means if one batch fails from a set we'll still retrieve the valid rates (for example non-supported currencies)
      logger.error(`Error fetching rates from API with url=${fullUrl}`, err);
      for (const currencyPair of batch) {
        const currencyTo = currencyPair.split('_')[1];
        apiRates.push({
          currencyTo,
          rate: null,
          failed: true,
        });
      }
    }
  }

  // Cache the newly fetched API rates (ignoring rates that failed to be retrieved)
  if (apiRates.length > 0) {
    const newCachedRates = apiRates.filter((rate) => !rate.failed).map((rate) => new ExchangeRate({
      currencyFrom: client.homeCurrency,
      currencyTo: rate.currencyTo,
      rate: rate.rate,
      createdAt: date,
    }));
    if (newCachedRates.length > 0) {
      try {
        await ExchangeRate.insertMany(newCachedRates);
      } catch (err) {
        logger.error('Failed to cache API rates to db, continuing...', err);
      }
    }
  }

  // Combine rates from both sources
  const combinedRates = [...cachedRates, ...apiRates].map((rate) => ({
    currencyCode: rate.currencyTo,
    rate: rate.rate,
  }));
  return combinedRates;
};

module.exports = ExchangeRateLib;
