const { promisify } = require('@curveroyaltysystems/platform-shared-utils/libs/promisify');
const IngestSalesFile = require('../../salesIngestion/ingestSalesFile');

const hasProRataAmount = (ingestionData) => !!ingestionData.proRataAmount;
const hasProRataTargetCell = (ingestionData) => ingestionData.overwriteFieldTargetCells?.some((cell) => cell?.field === 'proRataAmount') ?? false;

/**
 * Asynchronously retrieves the per-unit rate for sales data based on the provided parameters.
 *
 * @param {Object} params - The parameters required for calculating the per-unit rate.
 * @param {Object} params.ingestionData - Information related to data ingestion, including configuration values such as tab, startingLine, startingColumn, delimiter, characterSeparators, encoding, fileType, and salesFileId.
 * @param {string} params.file - The path to the sales file to be ingested and processed.
 * @param {Object} params.iTunesExchangeRates - The iTunes exchange rates used for currency conversion.
 * @param {Object} params.iTunesPerUnitRates - The iTunes per-unit rates for specific calculations.
 * @param {Array<string>} params.allowedKeys - The keys allowed for data validation during processing.
 * @param {Object} params.fieldTypes - Mapping of field types used in the sales data for validation and processing.
 * @param {Object} params.facebookPerUnitRates - Facebook's per-unit rates for specified computations.
 * @returns {Promise<Number>} A promise that resolves to the calculated per-unit rate after processing the provided sales data.
 * @throws Error Will throw an error if the sales file ingestion or rate calculation fails.
 */
const getPerUnitRate = async ({ ingestionData, file, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, facebookPerUnitRates }) => {
  const result = await promisify(
    IngestSalesFile.extractData,
    file,
    ingestionData.tab,
    ingestionData.startingLine,
    ingestionData.startingColumn,
    ingestionData.delimiter,
    ingestionData.characterSeparators,
    ingestionData.encoding,
    ingestionData.overwriteFieldTargetCells,
    ingestionData.fileType,
    ingestionData.salesFileId,
  );

  const data = result[0];
  const extractedOverwriteFields = result[2];

  // Copy the extracted pro rata amount to the ingestion data
  ingestionData.proRataAmount = extractedOverwriteFields.find((field) => field.field === 'proRataAmount')?.value;

  const chunked = IngestSalesFile.chunk(data, 10000);
  const [perUnitRate] = await promisify(
    IngestSalesFile.setPerUnitRate,
    ingestionData,
    chunked,
    iTunesExchangeRates,
    iTunesPerUnitRates,
    allowedKeys,
    fieldTypes,
    facebookPerUnitRates,
  );
  return perUnitRate;
};

module.exports = { hasProRataAmount, hasProRataTargetCell, getPerUnitRate };
