/**
 * @module facebookSpecifics
 */

const { logger, fileOpener } = require('@curveroyaltysystems/platform-shared-utils');

module.exports = {
  /**
   * Extracts Per Production Rates from Facebook Financial File
   *
   * * Calls `callback(err, rates)` with `rates` containing the extracted Per Production Rates, e.g. {"AR":0.0010846872761023025, "AU":0.0062251494203212, ...}
   * * Calls `callback(err, rates)` with an `err` message if an error occurs
   *
   * @param {string} localFile - File path to data file
   * @param {function(Error, Object.<string, number>)} callback - A callback that handles the response
   */
  getPerProductionRates(localFile, callback) {
    const facebookSpecifics = this;
    const rates = {};
    // Get data
    facebookSpecifics.readFile(localFile, (err, data) => {
      if (err) {
        logger.error(`Error while reading Facebook financial file '${localFile}'`, err);
        return callback(new Error('There was an error reading the financial file. Please check the attached financial file is valid.'));
      }
      if (!data || data.length === 0) {
        return callback(new Error('No data contained in financial file. Please check the attached financial file is valid.'));
      }

      // Get Indexes of values from header
      const firstLine = data.shift();
      const countryIndex = firstLine.indexOf('Country');
      const rateIndex = firstLine.indexOf('Per Production Rate');
      data.forEach((line) => {
        const country = line[countryIndex];
        if (country) {
          // Set as part of result
          rates[country] = line[rateIndex];
        }
      });
      logger.debug(`Facebook - Per Production Rates: ${JSON.stringify(rates)}`);
      callback(null, rates);
    });
  },

  /**
   * Uses fileOpener to read the file and return tabulated data
   *
   * * Calls `callback(err, data)` with `data` containing the tabulated data extracted from the file, starting at line 6
   * * Calls `callback(err, data)` with an `err` message if an error occurs
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
        data.splice(0, 6); // startingLine: 6
        callback(null, data);
      }
    });
  },
};
