const { promisify } = require('@curveroyaltysystems/platform-shared-utils/libs/promisify');
const IngestSalesFile = require('../../salesIngestion/ingestSalesFile');

const isFacebookFile = (ingestionData) => ingestionData.fileType === 'Facebook';

/**
 * Extract the per-unit rates from a Facebook Financial File, and update the ingestion data with that information
 *
 * @param {*} ingestionData - S3 path to Apple Financial File
 * @param {string} salesFileId - Sales File id
 * @return {Promise<Object.<string, number>>} A promise, containing a dictionary of territories to the per-unit rate for that territory
 */
const getPerProductionRates = async ({ ingestionData, salesFileId }) => {
  const results = await promisify(IngestSalesFile.processFacebookFinancialFile, ingestionData.customAdditionalFile, salesFileId);
  if (results.length > 1 && results[1]) {
    throw new Error(`No financial report found at ${ingestionData.customAdditionalFile} for salesFileId: ${salesFileId}`);
  }
  if (results.length < 1) {
    throw new Error(`Failed to get financial data for salesFileId: ${salesFileId}`);
  }
  return results[0];
};

module.exports = { isFacebookFile, getPerProductionRates };
