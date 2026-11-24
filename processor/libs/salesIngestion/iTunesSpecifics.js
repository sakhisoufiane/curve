/**
 * @module iTunesSpecifics
 */
const { fileOpener, logger } = require('@curveroyaltysystems/platform-shared-utils');
const AppSettings = require('../../models/appSettings');

module.exports = {
  /**
   * Gets exchange rates from the supplied Financial File
   *
   * * Calls `callback(err, result, bankAccountCurrencies)` with
   *   * `result` containing the extracted exchange rates
   *   * `bankAccountCurrencies` containing all currencies required by the iTunes Sales Data file
   * * Calls `callback(err, result, bankAccountCurrencies)` with an `err` message if an error occurs
   *
   * @param {string} localFile - File path to data file
   * @param {object[]} exchangeRates - Exchange Rates from Sales File applied to client currencies
   * @param {function(string, object, string[])} callback - A callback that handles the response
   */
  getExchangeRates(localFile, exchangeRates, callback) {
    const iTunesSpecifics = this;
    const result = {};
    const exchangeRatesObj = iTunesSpecifics.prepareExchangeRates(exchangeRates);
    const validateNumber = (value) => (Number.isNaN(value) ? 0 : value);

    // Get data
    iTunesSpecifics.readFile(localFile, async (err, loadedFile) => {
      if (err) {
        logger.error(`Error while reading iTunes financial file '${localFile}'`, err);
        return callback(new Error('There was an error reading the financial file. Please check the attached financial file is valid.'));
      }

      if (!loadedFile?.data?.length) {
        return callback(new Error('No data contained in financial file. Please check the attached financial file is valid.'));
      }

      const { data, monthAndYear } = loadedFile;

      // Get Indexes of values from header
      const firstLine = data.shift();
      let preTaxIndex = firstLine.indexOf('Pre-Tax Subtotal');
      if (!preTaxIndex || preTaxIndex === -1) {
        preTaxIndex = firstLine.indexOf('Earned');
      }
      const proceedsIndex = firstLine.indexOf('Proceeds');
      const bankAccountIndex = firstLine.indexOf('Bank Account Currency');
      const totalOwedIndex = firstLine.indexOf('Total Owed');
      const withholdingTaxIndex = firstLine.indexOf('Withholding Tax');

      // Setup an array for all bank account currencies
      const bankAccountCurrencies = [];

      // Get AppSettings for alternate calculation
      const appSettings = await AppSettings.findOne().catch(logger.error);
      if (!appSettings) return callback(new Error('Failed to load AppSettings.'));

      const useAlternateCalculation = appSettings.appleSalesAltCalculationMonths?.includes(monthAndYear);

      data.forEach((line) => {
        if (line[0] && line[0] !== 'Territory (Currency)' && line[0] !== 'Country or Region (Currency)') {
          // Add currency to array if it doesn't already exist
          if (line[bankAccountIndex] && line[bankAccountIndex] !== 'Bank Account Currency' && bankAccountCurrencies.indexOf(line[bankAccountIndex]) === -1) {
            bankAccountCurrencies.push(line[bankAccountIndex]);
          }
          // Get currect key
          const key = iTunesSpecifics.getCurrency(line[0]);

          if (key) {
            // Calculate exchange rate
            let exchangeRate;

            // Standard Calculation
            if (!useAlternateCalculation) {
              const preTax = validateNumber(line[preTaxIndex]);
              const exchangeRateDenominator = preTax === 0 ? 1 : preTax;
              exchangeRate = line[proceedsIndex] / exchangeRateDenominator;
            }

            // Alternate Calculation
            if (useAlternateCalculation) {
              const withholdingTax = validateNumber(line[withholdingTaxIndex]);
              const totalOwed = validateNumber(line[totalOwedIndex]);
              const exchangeRateDenominator = withholdingTax > 0 ? totalOwed : (totalOwed - withholdingTax);
              exchangeRate = line[proceedsIndex] / (exchangeRateDenominator === 0 ? 1 : exchangeRateDenominator);
            }

            // Calculate by further exchange rates from passed exchange rates
            if (exchangeRatesObj && bankAccountIndex && exchangeRatesObj[line[bankAccountIndex]]) {
              exchangeRate *= exchangeRatesObj[line[bankAccountIndex]];
            }

            // Set as part of result
            result[key] = exchangeRate;
          }
        }
      });
      // Remove any set exchange rates
      Object.keys(exchangeRatesObj).forEach((value) => {
        if (bankAccountCurrencies.indexOf(value) !== -1) {
          bankAccountCurrencies.splice(bankAccountCurrencies.indexOf(value), 1);
        }
      });
      if (Object.keys(result).length === 0) {
        callback(new Error('No exchange rates contained in financial file. Please check the attached financial file is valid.'));
      } else {
        callback(err, result, bankAccountCurrencies);
      }
    });
  },

  /**
   * Uses fileOpener to read the file and return tabulated data
   *
   * * Calls `callback(err, { data, monthAndYear })` with `data` containing the tabulated data extracted from the file, starting at line 2
   * * Calls `callback(err, { data, monthAndYear })` with `monthAndYear` containing the month and year from the first line of the file
   * * Calls `callback(err, { data, monthAndYear })` with an `err` message if an error occurs
   *
   * @param {string} localFile - File path to data file
   * @param {function(string, array[])} callback - A callback that handles the response
   */
  readFile(localFile, callback) {
    // Extract data from file
    const options = { tab: 0, delimiter: null, encoding: null };
    fileOpener.extractData(localFile, options, (err, totalTabs, data) => {
      if (err) {
        callback(err);
      } else {
        // Extract Month and Year from first line
        const monthAndYear = data?.[0]?.[0]?.split('(')[1]?.slice(0, -1);

        // Data starts at line 2
        data.splice(0, 2);
        callback(null, { data, monthAndYear });
      }
    });
  },

  /**
   * Extracts currency code from string
   *
   * @param {string} string - contains currency string obtained from file, e.g. "Sweden (SEK)", "Americas (USD)"
   * @returns {string} currency code, e.g. "SEK", "Americas USD"
   */
  getCurrency(string) {
    // Specifics for two different USD types
    if (string === 'Rest of World (USD)') {
      return 'ROW USD';
    } if (string === 'Americas (USD)') {
      return 'Americas USD';
    } if (string === 'Latin America and the Caribbean (USD)') {
      return 'Latam Caribbean USD';
    }
    // eg. Sweden (SEK)
    // Extract currency code from within brackets
    const split = string.split('(')[1];
    const currencyCodeFromBrackets = split && split.split(')')[0];
    return currencyCodeFromBrackets;
  },

  /**
   * Gets revenue totals by Territory, used for iTunes Match files
   *
   * * Calls `callback(err, result)` with `result` containing the Revenues per Territory
   *
   * @param {array} data - Sales Data
   * @param {function(string, object[])} callback - A callback that handles the response
   */

  // TODO: Turn this into a function that returns a value, rather than using a callback?
  getRevenueTotalsByTerritory(data, callback) {
    const result = {};
    let startingIndex = 0;
    // Get starting index of data
    data.forEach((line, index) => { if (line[0] === 'Country Of Sale') { startingIndex = index; } });
    const dataForUse = data.splice(startingIndex + 1, data.length);
    // Get revenues per line
    dataForUse.forEach((line) => {
      result[line[0]] = parseFloat(line[10]);
    });
    callback(null, result);
  },

  /**
   * Prepares the Exchange Rates, only selecting those that are set against the Home Currency, returning them structured as an object
   *
   * @param {object[]} exchangeRates - Exchange Rates from Sales File applied to client currencies
   * @returns {object} An object of Exchange Rates, e.g. { "USD": 1.128027, ... }
   */
  prepareExchangeRates(exchangeRates) {
    const result = {};
    if (exchangeRates) {
      // Loop through exchange rates
      exchangeRates.forEach((exchangeRate) => {
        if (exchangeRate.to === 'Home Currency') {
          result[exchangeRate.from] = exchangeRate.rate;
        }
      });
    }
    return result;
  },
};
