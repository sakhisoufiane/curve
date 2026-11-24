const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');

const ValidateSales = require('./validateSales');
const Validate = require('./validate');

const dateFormat = 'DD/MM/YYYY HH:mm:ss.SS';

module.exports = function (event, callback) {
  logger.info(`${event.salesFileId} Revalidating sales file: ${moment().format(dateFormat)}`);
  async.waterfall([
    function (cb) {
      logger.info(`${event.salesFileId} Calling ValidateSales.incompleteSales: ${moment().format(dateFormat)}`);
      // @TOM: I believe we should send a generic error to the user here. Otherwise a BigQuery error might be sent to user. Can you confirm please?
      ValidateSales.incompleteSales({ salesFileId: event.salesFileId, partitionNo: event.partitionNo }, event.bigQuery, event.templateSource, event.catalogue, event.currencies, event.exchangeRates, event.catalogueOverwritingData, event.overwriteFields, cb);
    },
    function (salesValidationData, cb) {
      logger.info(`${event.salesFileId} Calling Validate.getDatabaseData: ${moment().format(dateFormat)}`);
      Validate.getDatabaseData(event.salesFileId, event.bigQuery, (getDatabaseDataErr, result) => {
        if (getDatabaseDataErr) {
          logger.error(`${event.salesFileId} Error calling Validate.getDatabaseData: ${moment().format(dateFormat)}`, getDatabaseDataErr);
          cb(new Error('Validating data has errored, most likely due to an unexpected value. Check the file and template and try again.'));
        } else {
          cb(null, result, salesValidationData);
        }
      });
    },
  ], (waterFallErr, validationData, salesValidationData) => {
    if (waterFallErr) {
      logger.error(`${event.salesFileId} Error in waterfall: ${moment().format(dateFormat)}`, waterFallErr);
      callback(waterFallErr);
    } else if (validationData) {
      // Report back to API
      const valid = !validationData.invalidLines;
      callback(null, {
        units: forceNumber(validationData.units),
        netAmount: forceNumber(validationData.netAmount),
        homeCurrencyNetAmount: forceNumber(validationData.homeCurrencyNetAmount),
        grossAmount: forceNumber(validationData.grossAmount),
        homeCurrencyGrossAmount: forceNumber(validationData.homeCurrencyGrossAmount),
        lines: forceNumber(validationData.lines),
        invalidLines: forceNumber(validationData.invalidLines),
        valid,
        distributionChannels: salesValidationData.distributionChannels,
        configurations: salesValidationData.configurations,
        priceCategories: salesValidationData.priceCategories,
        territories: salesValidationData.territories,
        sources: salesValidationData.sources,
        subSources: salesValidationData.subSources,
        currencies: salesValidationData.currencies,
        currencyCodes: salesValidationData.currencyCodes,
        releases: uniqueObjectArray(salesValidationData.releases),
        tracks: uniqueObjectArray(salesValidationData.tracks),
        works: uniqueObjectArray(salesValidationData.works),
        contracts: uniqueObjectArray(salesValidationData.contracts),
        saleDate: salesValidationData.saleDate,
        transactionDate: salesValidationData.transactionDate,
      });
    } else {
      callback(waterFallErr, {});
    }
  });
};

function forceNumber(value) {
  if (isNaN(value) || value === 'NaN') {
    return 0;
  }
  return Number(value);
}

function uniqueObjectArray(array) {
  const object = {};
  // Map object values into a string onto an object
  array.forEach((item) => {
    let string = '';
    // Loop through object keys
    Object.keys(item).forEach((key) => {
      if (key !== 'source') {
        // Add value to string
        string += item[key];
      }
    });
    // Add to object
    object[string] = item;
  });
  // Return values
  return Object.values(object);
}
