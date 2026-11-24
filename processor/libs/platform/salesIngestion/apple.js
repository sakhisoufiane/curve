const async = require('async');
const { logger } = require('@curveroyaltysystems/logger');
const { promisify } = require('@curveroyaltysystems/platform-shared-utils');
const IngestSalesFile = require('../../salesIngestion/ingestSalesFile');
const iTunesSpecifics = require('../../salesIngestion/iTunesSpecifics');
const Mapper = require('../../salesIngestion/mapper');

const isAppleFile = (ingestionData) => ['Apple Music', 'iTunes', 'iTunes Match', 'Beats', 'Apple DJ'].includes(ingestionData.fileType);
const isITunesMatchFile = (ingestionData) => ingestionData.fileType === 'iTunes Match';

/**
 * Updates the given ingestionData with exchange rates from the Apple Financial File
 * @param {*} ingestionData The data collected to send to the Platform API. Should contain a customAdditionalFile property
 * @param {string} salesFileId The ID of the Sales File we are ingesting
 * @return {Promise<void>} A Promise. Resolves once the ingestionData has been updated with any found exchange rates
 */
const updateFinancialReportExchangeRates = async (ingestionData, salesFileId) => {
  const data = await promisify(
    IngestSalesFile.processAppleFinancialFile,
    ingestionData.customAdditionalFile,
    salesFileId,
    ingestionData.exchangeRates,
  );
  const [iTunesRequiredExchangeRates, exchangeRates, isMissingFile] = data;
  // TODO: What purpose do iTunesRequiredExchangeRates serve?
  if (isMissingFile) {
    throw new Error(`No financial report found at ${ingestionData.customAdditionalFile}`);
  }
  if (!exchangeRates) {
    throw new Error('Failed to get exchange rates reading Apple Financial File');
  }

  ingestionData.iTunesExchangeRates = exchangeRates;
};

/**
 * Processes an iTunes Match file, to extract the each of the per-unit rates for each territory.
 *
 * @param {object} event - object with information for sales ingestion
 * @param {string} file - File path to data file
 * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
 * @param {object} fieldTypes - Field types from Big Query
 * @return {Promise<Object.<string, number>>} A promise, containing a dictionary of territories to the per-unit rate for that territory
 */
const processITunesMatchFile = async ({ event, file, allowedKeys, fieldTypes }) => {
  logger.info(`${event.salesFileId} Platform iTunes Match: Getting data from main file`);
  const [data] = await promisify(IngestSalesFile.extractData, file, event.tab, event.startingLine, event.startingColumn, event.delimiter, event.characterSeparators, event.encoding, null, event.fileType, event.salesFileId)
    .catch((e) => {
      throw new Error(`${event.salesFileId} Platform iTunes Match: Error getting data from main file`, { cause: e });
    });

  logger.info(`${event.salesFileId} Platform iTunes Match: Getting Revenue Totals by Territory`);
  const [revenuesPerTerritory] = await promisify(iTunesSpecifics.getRevenueTotalsByTerritory, data)
    .catch((e) => {
      throw new Error(`${event.salesFileId} Platform iTunes Match: Error getting Revenue Totals by territory`, { cause: e });
    });

  logger.info(`${event.salesFileId} Platform iTunes Match: Getting total units per territory`);
  const chunked = IngestSalesFile.chunk(data, 10000);

  // Get total units per territory
  const unitsPerTerritory = {};

  await async.eachOfLimit(chunked, 3, async (chunk, idx) => {
    logger.info(`${event.salesFileId} Platform iTunes Match: Processing chunk ${idx} - Calling Mapper.arrayToTemplate`);

    try {
      const [dataForDatabase] = await promisify(Mapper.arrayToTemplate.bind(Mapper), chunk, event, null, null, null, allowedKeys, fieldTypes, event.currencies, event.exchangeRates, null);

      logger.info(`${event.salesFileId} Platform iTunes Match: Processing chunk ${idx} - Add total units by territory to unitsPerTerritory array`);
      dataForDatabase.forEach((line) => {
        if (line.units) {
          unitsPerTerritory[line.territory] = unitsPerTerritory[line.territory] || 0;
          unitsPerTerritory[line.territory] += line.units;
        }
      });
    } catch (e) {
      throw new Error(`${event.salesFileId} Platform iTunes Match: Processing chunk ${idx} - Error while calling Mapper.arrayToTemplate`, { cause: e });
    }
  });

  // Set per unit rates for ingestion
  logger.info(`${event.salesFileId} Platform iTunes Match: Setting per unit rates for ingestion`);
  const perUnitRates = {};
  Object.keys(revenuesPerTerritory).forEach((key) => {
    if (revenuesPerTerritory[key] && unitsPerTerritory[key]) {
      perUnitRates[key] = revenuesPerTerritory[key] / unitsPerTerritory[key];
    }
  });
  return perUnitRates;
};

module.exports = { isAppleFile, isITunesMatchFile, updateFinancialReportExchangeRates, processITunesMatchFile };
