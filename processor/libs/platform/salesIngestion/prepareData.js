const { fileManager, BigQuery, promisify, CurveError } = require('@curveroyaltysystems/platform-shared-utils');
const { logger } = require('@curveroyaltysystems/logger');
const IngestSalesFile = require('../../salesIngestion/ingestSalesFile');
const { isAppleFile, isITunesMatchFile, updateFinancialReportExchangeRates, processITunesMatchFile } = require('./apple');
const { isFacebookFile, getPerProductionRates } = require('./facebook');
const { hasProRataAmount, hasProRataTargetCell, getPerUnitRate } = require('./proRata');
const { detectFileType } = require('./fileTypeDetector');

const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
const MAPPING_KEY_REGEX_FILTER = '[^0-9a-zA-Z- (),_\'#"]';

const fieldsToCleaningPattern = {
  isrc: '[^0-9a-zA-Z(),_\'#"]',
  catNo: '[^0-9a-zA-Z- (),_\'#"]',
  barcode: '[^0-9a-zA-Z- (),_\'#"]',
  originalIdentifier: '[^0-9a-zA-Z- (),_\'#"]',
  iswc: '[^0-9a-zA-Z- (),_\'#"]',
  tunecode: '[^0-9a-zA-Z- (),_\'#"]',
  contractIdentifier: '[^0-9a-zA-Z- (),_\'#"]',
  songCode: '[^0-9a-zA-Z- (),_\'#"]',
};

/** @typedef {import('../../../models/salesFile').SalesFile} SalesFile */
/** @typedef {import('../../catalogueOverwritingData').ExternalCatalogueMapping} ExternalCatalogueMapping */
/** @typedef {import('../../catalogueOverwritingData').CatalogueMapping} CatalogueMapping */

/**
 * Prepare the data required for the Platform to ingest the Sales File
 * @param {SalesFile} salesFile The sales file to ingest
 * @param {string} taskId The task ID from the processor
 * @param {string} localFile Path to the sales file stored locally
 * @return {TaskDefinition} The task definition
 */
const prepareData = async (salesFile, taskId, localFile) => {
  logger.info(`Platform: Preparing salesFile '${salesFile._id.toString()}' platform task body.`);

  const ingestionData = await getIngestionData(salesFile);
  const detectionResult = await detectFileType(ingestionData, localFile);

  const link = await getPublicLink(salesFile, ingestionData);

  await updatePreDefinitionEdgeCases(ingestionData, salesFile, localFile);

  return getDefinition(ingestionData, localFile, link, salesFile, taskId, detectionResult);
};

function getAllowedKeysAndFieldTypes() {
  const schema = getBigQuerySchema();
  const allowedKeys = schema.map((item) => {
    if (item.mode !== 'REPEATED') {
      return item.name;
    }
  })
    .filter(Boolean);

  const fieldTypes = {};
  schema.forEach((field) => {
    fieldTypes[field.name] = field.type;
  });

  return {
    allowedKeys,
    fieldTypes,
  };
}

/**
 * Update the ingestion data with any edge cases not covered by the initial data load
 * @param {*} ingestionData The ingestion data to update
 * @param {SalesFile} salesFile The sales file to update
 * @param {string} localFile Path to the sales file stored locally
 * @return {Promise<void>} A promise. Resolves once the data has been updated
 */
const updatePreDefinitionEdgeCases = async (ingestionData, salesFile, localFile) => {
  try {
    if (isAppleFile(ingestionData) && ingestionData.customAdditionalFile) {
      await updateFinancialReportExchangeRates(ingestionData, salesFile._id);
    }

    if (isITunesMatchFile(ingestionData)) {
      const { allowedKeys, fieldTypes } = getAllowedKeysAndFieldTypes();

      // Kinda hacky, but when we run gather the data, we need all the original catalogue mappings. Re-create the data here
      const [freshIngestionData] = await promisify(IngestSalesFile.ingestionProcessData, salesFile, false, false);
      ingestionData.unitRatesPerTerritory = await processITunesMatchFile({
        event: freshIngestionData,
        file: localFile,
        allowedKeys,
        fieldTypes,
      });
    }

    if (isFacebookFile(ingestionData) && ingestionData.customAdditionalFile) {
      ingestionData.unitRatesPerTerritory = await getPerProductionRates({ ingestionData, salesFileId: salesFile._id.toString() });
      // Rows in a Facebook sales file won't contain units, if the number of units is under 100 (for privacy reasons). Set the default to 50 in this case.
      salesFile.overwriteFields.units = 50;
    }

    if (hasProRataAmount(ingestionData) || hasProRataTargetCell(ingestionData)) {
      const { allowedKeys, fieldTypes } = getAllowedKeysAndFieldTypes();

      ingestionData.perUnitRate = await getPerUnitRate({
        ingestionData,
        file: localFile,
        iTunesExchangeRates: ingestionData.iTunesExchangeRates,
        iTunesPerUnitRates: ingestionData.unitRatesPerTerritory,
        allowedKeys,
        fieldTypes,
        facebookPerUnitRates: ingestionData.unitRatesPerTerritory,
      });
    }
  } catch (e) {
    throw new Error(`${salesFile._id.toString()} Platform: Error trying to update sales file pre-definition`, { cause: e });
  }
};

/**
 * Get the data required to ingest the Sales File
 * @param {SalesFile} salesFile The Sales File to ingest
 * @return {Promise<*>} A promise containing the data required for ingestion
 */
const getIngestionData = async (salesFile) => {
  logger.info(`Platform: Preparing ingestion data for sales file: ${salesFile._id}`);

  let result;
  try {
    result = await promisify(IngestSalesFile.ingestionProcessData, salesFile, true, false);
  } catch (e) {
    throw new Error(`Platform: Error running ingestionProcessData for salesFile: ${salesFile}`, { cause: e });
  }

  if (!result?.length) {
    throw new Error(`Platform: ingestionProcessData did not return any data for salesFile: ${salesFile}`);
  }

  return result[0];
};

/**
 * Returns a public link giving access to the data to ingest
 * @param {SalesFile} salesFile The Sales File to ingest
 * @param {*} ingestionData The data required for ingestion
 * @return {Promise<string>} The public URL
 */
const getPublicLink = async (salesFile, ingestionData) => {
  logger.info(`Platform: Generating public link for sales file: ${salesFile._id}`);

  let result;
  try {
    result = await promisify(fileManager.publicLink7Days, ingestionData.key);
  } catch (e) {
    throw new Error(`Attempt to create Signed URL failed for: ${salesFile}. URL: ${ingestionData.key}`, { cause: e });
  }

  if (!result?.length) {
    throw new Error(`publicLink7Days did not return any data for salesFile: ${salesFile}`);
  }

  return result[0];
};

/**
 * The information required by the Platform API to run a Task
 * @typedef {Object} TaskDefinition
 * @property {InputConfigDefinition} inputConfig All the information needed to load and read a file to ingest
 * @property {InputColumnSchemaDefinition[]} inputSchema Information on what columns exist in the file, and how to read them
 * @property {TransformationDefinition[]} transformations All the transformations needed to execute to normalize the data for ingestion
 * @property {{fileType: string}} outputConfig All the information needed to write out the file
 * @property {OutputColumnSchema[]} outputSchema Information on what columns exist in the output, and how to write them
 */

/**
 * Creates a Platform Task Definition, instructing the Platform to ingest the sales file
 * @param {*} ingestionData The data required to ingest the sales file
 * @param {string} filePath The path to the file stored locally
 * @param {string} link A public link to the file to ingest
 * @param {SalesFile} salesFile The Sales File to ingest
 * @param {string} taskId The task ID of the currently running task
 * @param {FileDetectionResult} detectionResult The results of autodetection on the file
 * @return {TaskDefinition} A Task Definition to send to the Platform
 */
const getDefinition = (ingestionData, filePath, link, salesFile, taskId, detectionResult) => {
  logger.info(`Platform: Creating definition for sales file: ${salesFile._id}`);
  const definition = { };
  definition.inputConfig = getInputConfig(ingestionData, filePath, link, salesFile, detectionResult);
  definition.inputSchema = getInputSchema(ingestionData);
  definition.transformations = getTransformations(ingestionData, salesFile);
  definition.outputSchema = getOutputSchema();
  definition.outputConfig = getOutputConfig(salesFile.clientId, taskId);
  return definition;
};

/**
 * @typedef {Object} InputConfigDefinition
 * @property {FileTypeDefinition} fileType Information on what is contained in the file to ingest
 * @property {FileSourceDefinition} fileSource Information on how to retrieve the file to ingest
 * @property {DefaultValueDefinition[]} defaultValues A list of default values to use
 */

/**
 * Generate a definition describing how to read the file to ingest
 * @param {*} ingestionData The data prepared to describe how to ingest the file
 * @param {string} filePath The path to the file stored locally
 * @param {string} link A public URL pointing to the file to ingest
 * @param {SalesFile} salesFile The Mongo document describing the Sales File to ingest
 * @param {FileDetectionResult} detectionResult The results of autodetection on the file
 * @return {InputConfigDefinition} The Input Config definition to upload to the Platform API
 */
const getInputConfig = (ingestionData, filePath, link, salesFile, detectionResult) => {
  const fileType = getFileTypeConfig(salesFile, filePath, ingestionData, detectionResult);
  const fileSource = getFileSourceConfig(salesFile, 'URL', link);
  const defaultValues = getDefaultValues(ingestionData, salesFile);

  return {
    fileType,
    fileSource,
    defaultValues,
  };
};

/**
 * Defines how to read the file to ingest
 * @typedef {Object} FileTypeDefinition
 * @property {string} type The type name of the file type
 * @property {Number} [startingRow] The number of header rows in the file to skip. If not set, no rows will be skipped
 * @property {Number} [startingColumn] The number of columns in the file to skip. If not set, no columns will be skipped.
 * @property {string} [encoding] The file encoding. Defaults to UTF-8. Not used for Excel file types
 * @property {Number} [tab] The tab of the file to read. Defaults to the first tab. Not used for non-Excel file types.
 */

/**
 * Creates a File Type definition, defining how to read the file sent for ingestion, to send to the Platform API.
 * @param {SalesFile} salesFile The Sales File to ingest
 * @param {string} filePath The path to the file stored locally
 * @param {*} ingestionData The ingestion data
 * @param {FileDetectionResult} detectionResult The results of autodetection on the file
 * @return {FileTypeDefinition} The file type definition
 */
const getFileTypeConfig = (salesFile, filePath, ingestionData, detectionResult) => {
  const fileType = detectionResult.type;
  switch (fileType) {
    case 'TXT':
    case 'TSV':
    case 'CSV':
      return {
        type: fileType,
        startingRow: ingestionData.startingLine,
        startingColumn: ingestionData.startingColumn,
        encoding: mapEncoding(detectionResult.encoding),
        delimiter: mapDelimiter(fileType, detectionResult.delimiter),
      };
    case 'Fixed-width':
      return {
        type: 'TXT',
        startingRow: ingestionData.startingLine,
        startingColumn: ingestionData.startingColumn,
        encoding: mapEncoding(detectionResult.encoding),
        indexSeparated: true,
      };
    case 'CRD':
      return {
        type: 'CRD',
      };
    case 'XLS':
    case 'XLSB':
    case 'XLSX':
      return {
        type: detectionResult.type,
        startingRow: ingestionData.startingLine,
        startingColumn: ingestionData.startingColumn,
        tab: ingestionData.tab,
      };
    default:
      throw new Error(`Unknown file type detected: '${fileType}' for sales file: ${salesFile}`);
  }
};

/**
 * When the encoding is persisted in the back-end, it may be stored in lowercase, without special characters ("UTF-8" becomes "utf8").
 * This needs to be mapped back.
 * @param {string} [encoding] The stored encoding
 * @return {string | undefined} The encoding value for the Platform
 */
const mapEncoding = (encoding) => {
  if (encoding) {
    const normalizedEncoding = encoding.toLowerCase().replace('-', '');
    if (normalizedEncoding === 'utf8') {
      return 'UTF-8';
    }
    if (normalizedEncoding === 'utf16' || normalizedEncoding === 'utf16le') {
      return 'UTF-16';
    }
    if (normalizedEncoding === 'latin1' || normalizedEncoding === 'iso88591') {
      return 'ISO-8859-1';
    }
    throw new Error(`Unsupported encoding type ${encoding}`);
  }
};

/**
 * Map a delimiter from the Curve format to the Platform format. Also validates that the delimiter is valid
 * @param {string} fileType The file type
 * @param {string} [delimiter] The delimiter, if known
 * @return {string | undefined} The mapped delimiter
 */
const mapDelimiter = (fileType, delimiter) => {
  if (!delimiter) return;
  if (delimiter === '\\t') return '\t';

  // Validation check - If we are processing CSV, we cannot currently handle multiple characters as a delimiter
  if (fileType === 'CSV' && delimiter.length > 1) {
    throw new CurveError({
      message: 'Sales Ingestion process cannot handle multiple characters for CSV processing',
      statusCode: 'INVALID_DELIMITER',
    });
  }

  return delimiter;
};

/**
 * A definition of where to read the file from
 * @typedef {Object} FileSourceDefinition
 * @property {string} type The type name
 * @property {string} url A URL pointing to the file to ingest
 */

/**
 * Creates a File Source definition, defining where to read the data from, to send to the Platform API.
 * @param {SalesFile} salesFile The Sales File we are ingesting
 * @param {string} source The name of the type of the source. Currently only 'URL' is supported.
 * @param {string} link The public URL of the file to ingest
 * @return {FileSourceDefinition} A definition of the source of the file
 */
const getFileSourceConfig = (salesFile, source, link) => {
  switch (source.toUpperCase()) {
    case 'URL':
      return {
        type: source,
        url: link,
      };
    case 'GCS':
      throw new Error('GCS files from curve are currently not supported');
    default:
      throw new Error(`Unknown source detected: '${source}' for sales file: ${salesFile}`);
  }
};

/**
 * @typedef {Object} DefaultValueDefinition
 * @property {string} field The name of the field use this default value for
 * @property {string} dataType The type of the data to push
 * @property {string} [location] Used for Target Cells. If the data should come from the file, this represents the location to find the field. Should be in Excel format (e.g. B3 represents the second column, third row)
 * @property {*} [value] The value. Required, unless a location to lookup is defined.
 * @property {string} [dateFormat] The format of the date, if the value is a date.
 */
/**
 * The format of a Target Cell coming from the Prepare Data step
 * @typedef {Object} TargetCell
 * @property {string} field The name of the field to load the target cell data to
 * @property {string} type The type of data to expect in the cell.
 * @property {string} cell The location of the cell. Should be in Excel format (e.g. B3 represents the second column, third row)
 */

/**
 * Create a list of default value definitions with the data from prepared for ingestion
 * @param {*} ingestionData The prepared data to convert to definitions
 * @param {SalesFile} salesFile The Sales File we are ingesting
 * @return {DefaultValueDefinition[]} A list of default value definitions
 */
const getDefaultValues = (ingestionData, salesFile) => {
  const defaultValues = [];

  // Parse all defaults out of template first
  addDefaults(defaultValues, ingestionData.overwriteFields);

  // Overwrite any template defaults with salesFile specific defaults
  addDefaults(defaultValues, salesFile.overwriteFields);

  // Add any target cells after we've added default values (if target cell not found, then default will be used as fallback)
  addTargetCells(defaultValues, ingestionData.overwriteFieldTargetCells);

  // Overwrite any template defaults with salesFile specific defaults
  addTargetCells(defaultValues, salesFile.overwriteFieldTargetCells);

  // Add salesFileId so our sales lines can be mapped back to the sale file they came from
  pushDefaultValue(defaultValues, 'salesFileId', 'String', salesFile._id.toString());

  // Add partitionNo to the lines. For older files, this may not be set. May be 0 (for files uploaded in Jan 2020)
  if (salesFile.partitionNo !== null && salesFile.partitionNo !== undefined) {
    pushDefaultValue(defaultValues, 'partitionNo', 'Number', salesFile.partitionNo);
  }

  return defaultValues;
};

/**
 * Reads the defaultMap and appends Default Value definitions to the given array
 * @param {DefaultValueDefinition[]} defaultValuesArray The default values to append to
 * @param {Object.<string, *>} defaultMap A map of default values to process
 */
const addDefaults = (defaultValuesArray, defaultMap) => {
  if (!defaultMap) return;

  for (const [key, value] of Object.entries(defaultMap)) {
    if (value && typeof value === 'number') {
      pushDefaultValue(defaultValuesArray, key, 'Number', value);
    } else if (value && typeof value === 'string') {
      pushDefaultValue(defaultValuesArray, key, 'String', value);
    } else if (value && typeof value === 'object') {
      const date = new Date(value);
      if (date.toString() !== 'Invalid Date') {
        let dateString = date.toISOString();
        dateString = dateString.substring(0, dateString.indexOf('T'));
        pushDefaultValue(defaultValuesArray, key, 'Date', dateString);
      }
    } else if (value && typeof value === 'boolean') {
      pushDefaultValue(defaultValuesArray, key, 'Boolean', value);
    } else if (value) {
      logger.debug(`Platform: New type detected when setting defaults: ${typeof value}`);
    }
  }
};

/**
 * Update the list of default value definitions with the target cells coming from the prepare data phase.
 * @param {DefaultValueDefinition[]} defaultValuesArray The array of default value definitions to update
 * @param {TargetCell[]} [targetCells] The list of target cells to convert to default value definitions
 */
const addTargetCells = (defaultValuesArray, targetCells) => {
  if (!targetCells) return;
  for (const entry of targetCells) {
    pushTargetCell(defaultValuesArray, entry.field, entry.type, entry.cell);
  }
};

/**
 * Push a new default value to the list, or update an existing default value if one with that key name already exists
 * @param {DefaultValueDefinition[]} defaultValues The list of default values to add or update
 * @param {string} key The name of the field to add/update
 * @param {string} type The type of the data
 * @param {*} value The value to add
 */
const pushDefaultValue = (defaultValues, key, type, value) => {
  defaultValues.push({
    field: key,
    dataType: type,
    value,
  });
};

/**
 * Push a new target cell definition to the default values list, or update an existing default value if one with that key name already exists.
 * No value will be pushed if the given key, type or cellLocation are falsey.
 * @param {DefaultValueDefinition[]} defaultValues The list of default values to add or update
 * @param {string} [key] The name of the field to add/update
 * @param {string} [type] The type of the data
 * @param {string} [cellLocation] The location of the target cell to add to the default value
 */
const pushTargetCell = (defaultValues, key, type, cellLocation) => {
  if (!key || !type || !cellLocation) return;
  const typeMapping = mapCurveColumnTypeToPlatformType(type);
  defaultValues.push({
    field: key,
    dataType: typeMapping.type,
    location: cellLocation,
    dateFormat: typeMapping.dateFormat,
  });
};

/**
 * Describes a field in an input column
 * @typedef {Object} InputFieldSchemaDefinition
 * @property {string} type The type of the field
 * @property {string} [name] The name of the field. Not required if the field is Ignored, or Anonymous
 * @property {string} [dateFormat] If the field is a date type, this defines the format. If not specified, ISO-8601 will be assumed
 * @property {string} [cleaningPattern] Optional regex pattern used to clean the source value
 */

/**
 * Describes a column in the input data
 * @typedef {Object} InputColumnSchemaDefinition
 * @property {InputFieldSchemaDefinition[]} fields The fields extracted from this source column
 * @property {number} [characters] The width of the column for fixed-width inputs
 */

/**
 * Get the schema defining all the input columns.
 * @param {*} ingestionData The ingestion data
 * @return {InputColumnSchemaDefinition[]} A list of the columns in the file
 */
const getInputSchema = (ingestionData) => {
  // Gather all the indexes of all the columns we want to access from user-defined calculations
  const anonymousIndexes = [
    ...getCalculationInputColumns(ingestionData),
    ...getCalculationConditionColumns(ingestionData),
    ...getCalculationEquationColumns(ingestionData),
  ];

  const template = ingestionData.template ?? [];
  return template.map(({ type, field, characters }, index) => {
    // Types and field names may be labelled as Ignored, or may be null, blank or undefined. Make this null for consistency
    if (!type || type.toUpperCase() === 'IGNORE') {
      type = null;
    }
    if (!field || field.toUpperCase() === 'IGNORE') {
      field = null;
    }

    // If there is no type or field name, and they aren't referred to in a user calculation, then ignore them
    if ((!type || !field) && !anonymousIndexes.includes(index + 1)) {
      return { type: 'Ignore', characters };
    }

    const fields = [];
    if (field) {
      const cleaningPattern = fieldsToCleaningPattern[field];
      fields.push({
        name: field,
        cleaningPattern,
        type: mapCurveColumnTypeToPlatformType(type),
      });
    }

    // If a user wants to ignore a field, but they are referring to them from calculations by index, then mark them as anonymous
    if (anonymousIndexes.includes(index + 1)) {
      fields.push({
        name: createColumnFieldName(index),
        type: { type: 'String' },
      });
    }

    return {
      fields,
      characters,
    };
  });
};

/**
 * Maps the definition of a column type to the Platforms equivalent
 * @param {string} type The type name in Curve
 * @return {{type: string, dateFormat: string | undefined}} An object containing the equivalent Platform type name, and optionally a date format
 */
const mapCurveColumnTypeToPlatformType = (type) => {
  if (!type) throw new Error('Cannot map blank type');
  if (type.substring(0, 4).toUpperCase() === 'DATE') {
    return {
      type: 'Date',
      dateFormat: extractDateFormat(type),
    };
  }
  if (type.toUpperCase() === 'NUMBER COMMA DECIMAL') {
    return { type: 'Number Comma Separated' };
  }
  return { type };
};

/**
 * Extract the format from a date type name
 * @param {string} type
 * @return {string | undefined}
 */
const extractDateFormat = (type) => {
  if (type) {
    const dateColumnSplit = type.split(' ');
    if (dateColumnSplit.length > 1) {
      // This will catch date's with types like 'Date: DD/MM/YYYY'
      return dateColumnSplit[1];
    }
  }
  // It's possible here we have a no format date.
  return undefined;
};

/**
 * Find any column indexes that might be defined in user-defined calculations, for reading in data for the calculation
 * @param ingestionData The ingestion data
 * @return {Number[]} A list of column indexes
 */
const getCalculationInputColumns = (ingestionData) => ingestionData?.calculation
  ?.map((calculation) => calculation.calculation)
  ?.filter((calculation) => calculation.valueType === 'Column')
  ?.map((calculation) => calculation.value)
  ?? [];

/**
 * Find any column indexes that might be defined in user-defined calculations, for running conditions to validate if a calculation should be run or not
 * @param ingestionData The ingestion data
 * @return {Number[]} A list of column indexes
 */
const getCalculationConditionColumns = (ingestionData) => ingestionData?.calculation
  ?.flatMap((calculation) => calculation.conditions ?? [])
  ?.filter((condition) => condition.inputType === 'Column')
  ?.map((condition) => condition.if)
  ?? [];

/**
 * Find any column indexes that might be defined in user-defined calculations, for gathering data for running inner calculations
 * (or as the Platform calls them, Equations)
 * @param ingestionData The ingestion data
 * @return {Number[]} A list of column indexes
 */
const getCalculationEquationColumns = (ingestionData) => ingestionData?.calculation
  ?.map((calculation) => calculation.calculation)
  ?.flatMap((calculation) => calculation.calculations ?? [])
  ?.filter((condition) => condition.valueType === 'Column')
  ?.map((condition) => condition.value)
  ?? [];

/**
 * A Transformation Definition is one of many types of Transformations that the Platform can run
 * @typedef {CalculationDefinition |
 *  DiscardDefinition |
 *  GenerateUuidDefinition |
 *  SearchAndReplaceDefinition |
 *  CopyDefinition |
 *  SimpleMappingDefinition |
 *  HierarchicalMappingDefinition |
 *  SwitchDefaultDefinition |
 *  CurveDataRowValidationDefinition |
 *  ExchangeRateTransformationDefinition |
 *  CurveReturnsHandlerDefinition |
 *  TitleMapperTransformationDefinition |
 *  CurveCatalogueOverwritingDataDefinition |
 *  CurveUserMappingV2Definition |
 *  CalculationGroupDefinition |
 *  PositiveNegativeDefinition |
 *  CurveCopyFieldsDefinition
 * } TransformationDefinition
 */

/**
 * Gathers a list of every transformation we have to execute to ingest the data
 * @param {*} ingestionData The data prepared for ingestion
 * @param {SalesFile} salesFile The Sales File we are ingesting
 * @return {TransformationDefinition[]} A list of transformations to run, to process the data for ingestion
 */
const getTransformations = (ingestionData, salesFile) => {
  const returnsHandler = createReturnsHandler();
  const unitRatesPerTerritoryMappings = getUnitRatesPerTerritoryMappings({ unitRatesPerTerritory: ingestionData.unitRatesPerTerritory });
  const specialAmountCalculations = getSpecialAmountCalculations(ingestionData);

  const calculations = getCalculations(ingestionData);
  const firstMappingPhaseTransformations = getUserMappings(ingestionData, salesFile, 1);

  const positiveNegativeTransformation = createPositiveNegativeTransformation();

  let secondMappingPhaseTransformations = [];
  if (calculations.post.length > 0) {
    secondMappingPhaseTransformations = getUserMappings(ingestionData, salesFile, 2);
  }

  const exchangeRateTransformation = getExchangeRateTransformation();

  const multiplierTransformation = getMultiplierTransformation();

  const statusMappingTransformation = getStatusMapping();

  const idGenerationMapping = getIdGenerationMapping();
  return [
    returnsHandler,
    ...unitRatesPerTerritoryMappings,
    ...specialAmountCalculations,
    ...createCalculationGroup('Run pre-transformation user calculations', calculations.pre),
    ...firstMappingPhaseTransformations,
    positiveNegativeTransformation,
    ...createITunesExchangeRateTransformations(ingestionData.iTunesExchangeRates),
    ...createProRataTransformations(ingestionData),
    ...createCalculationGroup('Run post-transformation user calculations', calculations.post),
    ...secondMappingPhaseTransformations,
    exchangeRateTransformation,
    multiplierTransformation,
    statusMappingTransformation,
    idGenerationMapping,
  ];
};

/**
 * Converts a list of transformations into a group
 * @param {string} name The name of the transformation
 * @param {Array<CalculationDefinition | DiscardDefinition>} [transformations] The transformations to add to the group
 * @return {CalculationGroupDefinition[]} An array containing the transformation group, or empty if there are no transformations in the group
 */
const createCalculationGroup = (name, transformations) => {
  if (arrayEmpty(transformations)) return [];
  return [{
    type: 'CurveTransformationGroup',
    name,
    transformations,
  }];
};

/**
 * Create transformations that will copy over any data from one field to another
 * @param {*} ingestionData The data prepared for the ingestion
 * @param {Number} round - What run number we are currently on
 * @return {CurveCopyFieldsDefinition[]} A list of copy transformations to move the data
 */
const createCopyFieldsTransformation = ({ ingestionData, round }) => {
  const copyFields = ingestionData.catalogue?.copyFields;
  if (arrayEmpty(copyFields)) return [];
  return [{
    type: 'CurveCopyFields',
    name: `Copy fields: Round ${round}`,
    directives: copyFields.map(({ from, to }) => ({ from, to })),
  }];
};

/**
 * Defines a calculation to run on the Platform
 * @typedef {Object} CalculationDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'Calculation', or for special returns handling, 'CurveReturnsNetAmountCalculation')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} [inputValueFieldName] Indicates the name of the field to be used to get the data to input into the transformation
 * @property {*} [inputFixedValue] Sets a fixed value to be input into the transformation
 * @property {string} outputField The name of the field to output the result to
 * @property {boolean} [replaceOutputValue=false] Indicates whether any existing data in the output field should be overwritten
 * @property {EquationDefinition[]} equations A list of equations to run for this calculation
 * @property {ToDateResultMappingDefinition} [resultMapping] Defines how to map the result of the calculation to a field. Null if no additional mapping is required
 */

/**
 * Defines how to map the result of a calculation to a date
 * @typedef {Object} ToDateResultMappingDefinition
 * @property {string} type The type of transformation (in this case, 'ToDate')
 * @property {string} [dateFormat] The format of the date
 */

/**
 * Defines a transformation to discard rows from a file
 * @typedef {Object} DiscardDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'Discard')
 * @property {ConditionDefinition} condition The condition to check to see if the row should be dropped
 */

/**
 * Defines a transformation, which clones a line from the sales file, and allows a number of calculations to be run on the new line
 * @typedef {Object} SplitDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {ConditionDefinition} [condition] The condition to check to see if the row should be split
 * @property {CalculationDefinition[]} [calculations] The calculations to be run against the new row
 */

/**
 * Defines a transformation, that is actually a group of other transformations. Transformations grouped in this way have faster execution
 * times and avoid metrics overload.
 * @typedef {Object} CalculationGroupDefinition
 * @property {string} type The name of this transformation (in this case, 'CurveTransformationGroup')
 * @property {string} name The name of the group. Used for debugging purposes
 * @property {Array<CalculationDefinition | DiscardDefinition>} transformations The condition to check to see if the row should be split
 */

/**
 * Converts our Calculations to a set of Transformation Definitions, split by whether to run the calculations before or after the
 * mappings have been performed
 * @param {*} ingestionData Our data generated for ingestion, containing the calculations
 * @return {{pre: Array<CalculationDefinition | DiscardDefinition>, post: Array<CalculationDefinition | DiscardDefinition>}}
 */
const getCalculations = (ingestionData) => {
  const calculations = { pre: [], post: [] };

  if (arrayEmpty(ingestionData.calculation)) return calculations;

  ingestionData.calculation.forEach((calculation, index) => {
    const mapped = mapCalculation(calculation, index);
    if (mapped) {
      pushCalculation(calculations, calculation, mapped);
    }
  });
  return calculations;
};

const mapCalculation = (calculation, index) => {
  // Skip rows are valid if the output field is set
  if (calculation.outputField === 'Skip Row') {
    return createSkipRow(calculation);
  }

  if (!calculationValid(calculation, index)) return null;

  if (calculation.outputField === 'returnNetAmount') {
    return createReturnsNetAmountCalculation(calculation);
  }

  return createCalculation(calculation);
};

/**
 * Check if a calculation has all the fields required to be run
 * @param {any} calculation The condition to check
 * @param {Number} index The index of the condition in the list
 * @return {boolean} True if the calculation is valid, false otherwise
 */
const calculationValid = (calculation, index) => {
  if (!calculation.outputField) {
    logger.info(`Calculation: ${calculation} at index: ${index} has no output field`);
    return false;
  }

  const innerCalculation = calculation.calculation;
  if (!innerCalculation?.valueType) {
    logger.info(`Calculation: ${calculation} at index: ${index} has no value type`);
    return false;
  }

  if ((innerCalculation?.valueType === 'Field' || innerCalculation?.valueType === 'Column') && !innerCalculation?.value) {
    logger.info(`Calculation: ${calculation} at index: ${index} has requires a value but none is set`);
    return false;
  }

  return true;
};

/**
 * Create a "Skip Row" transformation
 * @param calculation
 * @return {DiscardDefinition}
 */
const createSkipRow = (calculation) => {
  const condition = getCalculationCondition(calculation);
  // Edge-case - If we try to discard a row based on a column, and the value of that column is invalid, don't drop the row
  condition?.conditions
    ?.filter((subCondition) => subCondition.type.toUpperCase() === 'ISBLANK')
    ?.forEach((subCondition) => {
      subCondition.evaluateInvalidToFalse = true;
    });

  return {
    type: 'Discard',
    condition,
  };
};

/**
 * Create a ReturnsNetAmountCalculation
 * @param calculation
 * @return {CalculationDefinition}
 */
const createReturnsNetAmountCalculation = (calculation) => ({
  type: 'CurveReturnsNetAmountCalculation',
  outputField: calculation.outputField,
  replaceOutputValue: true,
  ...getInputValueObject(calculation.calculation),
  condition: getCalculationCondition(calculation),
  equations: [...getEquations(calculation.calculation.calculations ?? [])],
});

/**
 * Create a Calculation
 * @param {any} calculation
 * @return {CalculationDefinition}
 */
const createCalculation = (calculation) => ({
  type: 'Calculation',
  outputField: calculation.outputField,
  replaceOutputValue: true,
  ...getInputValueObject(calculation.calculation),
  condition: getCalculationCondition(calculation),
  equations: [...getEquations(calculation.calculation.calculations ?? [])],
  cleaningPattern: fieldsToCleaningPattern[calculation.outputField],
  resultMapping: getResultMapping(calculation),
});

/**
 * Add a calculation to the response. Calculations can be run before or after the mapping phase, so we split up the calculations accordingly
 * @param {{pre: TransformationDefinition[], post: TransformationDefinition[]}} calculations The user-defined calculation object we are appending to
 * @param {any} calculation The base calculation
 * @param {TransformationDefinition} calculationObject The calculation to append
 */
const pushCalculation = (calculations, calculation, calculationObject) => {
  let doPre = false;
  let doPost = false;

  if (calculation.calculateAfterMapping) {
    // Modern rule - If calculateAfterMapping is set to true, then we should only run it after mapping, not before
    doPost = true;
  } else if (calculation.calculation.valueType !== 'Field'
      || ['retailPrice', 'perUnitRate', 'salePrice'].includes(calculation.outputField)
      || arrayEmpty(calculation.calculation.calculations)) {
    /*
     * Otherwise, we default to legacy logic.
     * We run all calculation before the mapping.
     * We also run the calculations after mapping too, if:
     *  We are not reading from a 'Field' (data in a column or value cannot change during mapping, so re-running does nothing)
     *  or we are writing to the 'retailPrice', 'perUnitRate' or 'salePrice' field (check with Tom or Michael why)
     *  or there are no calculations - We are just copying data from one field to another (running sums risks double accounting)
     */
    doPre = true;
    doPost = true;
  } else {
    doPre = true;
  }

  if (doPre) {
    calculations.pre.push(calculationObject);
  }
  if (doPost) {
    calculations.post.push(calculationObject);
  }
};

/**
 * Given a calculation, read the condition information and output a Condition Definition usable by the Platform
 * @param {*} calculation A calculation schema
 * @return {ConditionDefinition} The condition to execute
 */
const getCalculationCondition = (calculation) => {
  // If we have a non-always condition add it to the object.
  if (calculation.conditionType === 'Any' || calculation.conditionType === 'All') {
    return {
      type: calculation.conditionType === 'Any' ? 'Or' : 'And',
      conditions: getConditions(calculation.conditions),
    };
  }
  return undefined;
};

/**
 * Converts the value type of our calculation to the correct field name for a Calculation Definition
 * @param {*} calculation Our calculation
 * @return {{inputValueFieldName : string}|{inputFixedValue: string}} The mapped field
 */
const getInputValueObject = (calculation) => {
  const { value } = calculation;
  if (calculation.valueType === 'Value') {
    // Sometimes valid templates will contain blank values. Replace these with empty strings.
    return { inputFixedValue: value ?? '' };
  }
  if (calculation.valueType === 'Field') {
    if (!value) throw new Error(`Calculation ${calculation} is missing required field name`);
    return { inputValueFieldName: value };
  }
  if (calculation.valueType === 'Column') {
    if (!value) throw new Error(`Calculation ${calculation} is missing required column index`);

    // Platform takes 0-based indexes
    const field = createColumnFieldName(value - 1);
    return { inputValueFieldName: field };
  }
  throw new Error(`${calculation}' does not a valid value type`);
};

/**
 * Convert a list of our conditions to a list of Condition Definitions for the Platform
 * @param conditions Our conditions
 * @return {ConditionDefinition[]} A list of condition definitions for the Platform API
 */
const getConditions = (conditions) => conditions
  .filter((condition, index) => conditionValid(condition, index))
  .map((condition) => getCondition(condition));

/**
 * Check if a condition has all the fields required to be evaluated
 * @param {any} condition The condition to check
 * @param {Number} index The index of the condition in the list
 * @return {boolean} True if the condition is valid, false otherwise
 */
const conditionValid = (condition, index) => {
  if (!condition.inputType) {
    logger.info(`Condition: ${condition} at index: ${index} does not have an input type`);
    return false;
  }
  if (!condition.comparison) {
    logger.info(`Condition: ${condition} at index: ${index} does not have an comparison`);
    return false;
  }

  if ((condition.inputType === 'Field' || condition.inputType === 'Column') && !condition.if) {
    logger.info(`Condition: ${condition} at index: ${index} does not have a value, which is required`);
    return false;
  }

  return true;
};

/**
 * Defines a condition that should be run to check if a transformation should be executed
 * @typedef {Object} BasicConditionDefinition
 * @property {string} type The type of condition
 * @property {boolean} [not=false] Indicates whether the condition should be inverted or not
 * @property {string} [leftValueFieldName] Indicates the name of the field to be used on the left side of the condition
 * @property {*} [leftFixedValue] Sets a fixed value to be used on the left side of the condition
 * @property {*} [rightValue] Sets a fixed value to be used on the right side of the condition. Not used for contains checks
 * @property {boolean} [caseInsensitive=false] Indicates whether a comparison should be case-insensitive. Only used for equals checks
 */
/**
 * Defines a group of conditions, and a logical operator to group them
 * @typedef {Object} GroupedConditionDefinition
 * @property {string} type The type of group this condition group is (And, Or)
 * @property {ConditionDefinition[]} conditions A list of conditions to execute
 */
/**
 * Defines a condition that should be run to check if a transformation should be executed
 * @typedef {(BasicConditionDefinition|GroupedConditionDefinition)} ConditionDefinition
 */

/**
 * Converts our condition information to a condition to send to the Platform API
 * @param {*} condition The condition from the prepare data stage
 * @return {ConditionDefinition} The definition of the condition to send to the Platform API
 */
const getCondition = (condition) => {
  const type = getTypeFromComparison(condition.comparison);

  // Don't set rightValue if our condition type does not support a rightValue
  let rightValue;
  if (type !== 'IsBlank' && type !== 'IsNotBlank') {
    rightValue = condition.value;
  }

  const newCondition = {
    type,
    rightValue,
  };

  if (condition.inputType === 'Value') {
    newCondition.leftFixedValue = condition.if ?? '';
  } else if (condition.inputType === 'Field') {
    newCondition.leftValueFieldName = condition.if;
  } else if (condition.inputType === 'Column') {
    // Remember to shift the user columns (base 1) to Platform columns (base 0)
    newCondition.leftValueFieldName = createColumnFieldName(condition.if - 1);
  } else {
    throw new Error(`InputType of '${condition.inputType}' required to be one of ['Column', 'Value', 'Field']'`);
  }
  return newCondition;
};

/**
 * Convert a comparison type from our type naming convention to the Platform naming convention
 * @param {string} comparison The name of the comparison
 * @return {string} The equivalent name in the Platform
 */
const getTypeFromComparison = (comparison) => {
  switch (comparison) {
    case 'Greater Than':
      return 'GreaterThan';
    case 'Greater Than or Equal To':
      return 'GreaterThanorEqualTo';
    case 'Less Than':
      return 'LessThan';
    case 'Less Than or Equal To':
      return 'LessThanorEqualTo';
    case 'Does Not Contain':
      return 'DoesNotContain';
    case 'Is Not Blank':
      return 'IsNotBlank';
    case 'Is Blank':
      return 'IsBlank';
    case 'Does Not Equal':
      return 'NotEquals';
    case 'Equals':
      return 'Equals';
    case 'Contains':
      return 'Contains';
    default:
      throw new Error(`Unrecognized comparison: ${comparison}`);
  }
};

/**
 * Defines a series of equations to run on some input data
 * @typedef {Object} EquationDefinition
 * @property {string} calculationType The type of calculation to run. Values are: addition, subtraction, multiplication, division, left, right, concatenation
 * @property {string} [equationValueFieldName] Indicates the field name of the field to be used on the right side of the equation
 * @property {string|Number} [equationFixedValue] Sets a fixed value to be used on the right side of the equation
 */

/**
 * Convert a list of calculations into a list of Equation Definitions for the Platform
 * @param {*[]} calculations A list of calculations to convert
 * @return {EquationDefinition[]} A list of Equation Definitions
 */
const getEquations = (calculations) => calculations
  .filter((calculation, index) => equationValid(calculation, index))
  .map((calculation) => getEquation(calculation));

/**
 * Check if an equation has all the fields required to be evaluated
 * @param {any} equation The equation to check
 * @param {Number} index The index of the condition in the list
 * @return {boolean} True if the equation is valid, false otherwise
 */
const equationValid = (equation, index) => {
  if (!equation.function) {
    logger.info(`Equation: ${equation} at index: ${index} has no function set`);
    return false;
  }
  if (!equation.valueType) {
    logger.info(`Equation: ${equation} at index: ${index} has no value type set`);
    return false;
  }

  if ((equation.valueType === 'Field' || equation.valueType === 'Column') && !equation.value) {
    logger.info(`Equation: ${equation} at index: ${index} requires a value`);
    return false;
  }
  return true;
};

/**
 * Convert a calculation to an Equation definition
 * @param calculation The calculation to convert
 * @return {EquationDefinition} The Equation definition created from this calculation
 */
const getEquation = (calculation) => ({
  ...getEquationValueObject(calculation),
  calculationType: getMappedCalculationType(calculation),
});

/**
 * Generate a partial Equation around the value type of the calculation
 * @param calculation The calculation to convert
 * @return {{equationValueFieldName: string}|{equationFixedValue: string}} An object containing the field name, column index, or fixed value
 */
const getEquationValueObject = (calculation) => {
  if (calculation.valueType === 'Value') {
    // Sometimes valid templates will contain blank values. Replace these with empty strings.
    return { equationFixedValue: calculation.value ?? '' };
  }
  if (calculation.valueType === 'Field') {
    if (!calculation.value) throw new Error(`Calculation ${calculation} is missing required field name`);
    return { equationValueFieldName: calculation.value };
  }
  if (calculation.valueType === 'Column') {
    if (!calculation.value) throw new Error(`Calculation ${calculation} is missing required column index`);
    // Platform takes 0-based indexes
    return { equationValueFieldName: createColumnFieldName(calculation.value - 1) };
  }
  throw new Error(`Calculation.valueType of '${calculation.valueType}' required to be one of ['Column', 'Value', 'Field']'`);
};

/**
 * Maps our calculation type naming to the Platforms naming convention
 * @param {*} calculation The calculation
 * @return {string} The name of the calculation to run
 */
const getMappedCalculationType = (calculation) => {
  if (calculation.function === 'Concatenate') {
    return 'Concatenation';
  }
  if (calculation.function === 'Minus') {
    return 'Subtraction';
  }
  if (calculation.function === 'Divide') {
    return 'Division';
  }
  if (calculation.function === 'Multiply') {
    return 'Multiplication';
  }
  return calculation.function;
};

/**
 * Maps our calculation type naming to the Platforms naming convention
 * @param {*} calculation The calculation
 * @return {ToDateResultMappingDefinition | undefined} The mechanism to map the result of the calculation
 */
const getResultMapping = (calculation) => {
  if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].includes(calculation.outputField)) {
    return {
      type: 'ToDate',
      dateFormat: extractDateFormat(calculation.dateFormat),
    };
  }
};

/**
 * Generates a list of all the mappings we need to perform on a sales line, such as mapping catalogue elements, exchange rates, territories, configurations, channels etc.
 * @param {*} ingestionData The data prepared for ingestion
 * @param {SalesFile} salesFile The sales file we are ingesting
 * @param {Number} round - What run number we are currently on
 * @return {TransformationDefinition[]} A series of transformations to run, to map all the fields
 */
const getUserMappings = (ingestionData, salesFile, round) => {
  const copyFieldsTransformations = createCopyFieldsTransformation({ ingestionData, round });

  const userMappings = createUserMappingsTransformation({
    round,
    territories: ingestionData.catalogue?.territories,
    configurations: ingestionData.catalogue?.configurations,
    distributionChannels: ingestionData.catalogue?.distributionChannels,
    priceCategories: ingestionData.catalogue?.priceCategories,
    positiveNegatives: ingestionData.catalogue?.positiveNegatives,
    sources: ingestionData.catalogue?.sources,
    subSources: ingestionData.catalogue?.subSources,
    currencies: ingestionData.catalogue?.currencies,
    targetCurrencies: createTargetCurrencies(ingestionData),
    exchangeRates: getExchangeRates(ingestionData.exchangeRates),
  });

  const catTypeMapping = getCatTypeMapping(round);

  const workMappings = getWorkMappings(
    ingestionData.catalogue?.works,
    ingestionData.catalogue?.externalWorks,
    ingestionData.catalogue?.workExceptions,
    ingestionData.templateSource,
    round,
  );

  const labelMappings = getLabelMappings(
    ingestionData.catalogue?.tracks,
    ingestionData.catalogue?.externalTracks,
    ingestionData.catalogue?.trackExceptions,
    ingestionData.catalogue?.releases,
    ingestionData.catalogue?.externalReleases,
    ingestionData.catalogue?.releaseExceptions,
    round,
  );
  const contractMappings = getContractMappings(ingestionData.catalogue?.contracts, ingestionData.catalogue?.externalContracts, round);

  const catalogueOverwritingDataMapping = getCatalogueOverwritingDataMapping(
    ingestionData.catalogueOverwritingData,
    ingestionData.overwriteFields,
    round,
  );

  return [
    ...copyFieldsTransformations,
    ...userMappings,
    catTypeMapping,
    ...workMappings,
    ...labelMappings,
    ...contractMappings,
    ...catalogueOverwritingDataMapping,
  ];
};

/**
 * Get an array of all the currency names the client uses
 * @param {any} ingestionData The ingestion data
 * @return {string[]} The list of names of currencies the client uses
 */
const createTargetCurrencies = (ingestionData) => {
  const rtn = ['Home Currency'];

  const currencies = ingestionData.currencies ?? {};
  if (currencies.currency2) {
    rtn.push(currencies.currency2);
  }
  if (currencies.currency3) {
    rtn.push(currencies.currency3);
  }
  if (currencies.currency4) {
    rtn.push(currencies.currency4);
  }
  return rtn;
};

/**
 * Creates the Transformation Definition to run territory, configuration, channel, price, pos/neg, source, sub-source, currency and exchange rate mappings.
 * @typedef {Object} CurveUserMappingV2Definition
 * @property {string} type The type of transformation (In this case, 'CurveUserMapping')
 * @property {string} name The name of the transformation. Used for debugging.
 * @property {Object.<string, string>} [territories] Key-value mappings containing territories
 * @property {Object.<string, string>} [configurations] Key-value mappings containing configurations
 * @property {Object.<string, string>} [distributionChannels] Key-value mappings containing distributionChannels
 * @property {Object.<string, string>} [priceCategories] Key-value mappings containing priceCategories
 * @property {Object.<string, string>} [positiveNegatives] Key-value mappings containing positiveNegatives
 * @property {Object.<string, string>} [sources] Key-value mappings containing sources
 * @property {Object.<string, string>} [subSources] Key-value mappings containing subSources
 * @property {Object.<string, string>} [currencies] Key-value mappings containing currencies
 * @property {string[]} [targetCurrencies] A list of all currencies that the customer supports
 * @property {Object.<string, Object.<string, Number>>} [exchangeRates] Key-value mappings containing currencies to exchange rates
 */

/**
 * Creates User-defined Mappings in the processor
 * @param {Number} round The current round index
 * @param {Object.<string, string>} [territories] Key-value mappings containing territories
 * @param {Object.<string, string>} [configurations] Key-value mappings containing configurations
 * @param {Object.<string, string>} [distributionChannels] Key-value mappings containing distributionChannels
 * @param {Object.<string, string>} [priceCategories] Key-value mappings containing priceCategories
 * @param {Object.<string, string>} [positiveNegatives] Key-value mappings containing positiveNegatives
 * @param {Object.<string, string>} [sources] Key-value mappings containing sources
 * @param {Object.<string, string>} [subSources] Key-value mappings containing subSources
 * @param {Object.<string, string>} [currencies] Key-value mappings containing currencies
 * @param {string[]} targetCurrencies A list of currencies the customer supports
 * @param {Object.<string, Object.<string, Number>>} [exchangeRates] A map of "from" currency name, to a map of "to" currency name, which points to the rate
 * @return {CurveUserMappingV2Definition[]}
 */
const createUserMappingsTransformation = ({
  round,
  territories,
  configurations,
  distributionChannels,
  priceCategories,
  positiveNegatives,
  sources,
  subSources,
  currencies,
  targetCurrencies,
  exchangeRates,
}) => {
  if (
    objectEmpty(territories)
    && objectEmpty(configurations)
    && objectEmpty(distributionChannels)
    && objectEmpty(priceCategories)
    && objectEmpty(positiveNegatives)
    && objectEmpty(sources)
    && objectEmpty(subSources)
    && objectEmpty(currencies)
    && objectEmpty(exchangeRates)
  ) return [];

  return [{
    type: 'CurveUserMappingV2',
    name: `Map User-defined mappings. Round: ${round}`,
    territories,
    configurations,
    distributionChannels,
    priceCategories,
    positiveNegatives,
    sources,
    subSources,
    currencies,
    targetCurrencies,
    exchangeRates,
  }];
};

/**
 * Creates the Transformation Definition for a generated UUIDv4
 * @typedef {Object} GenerateUuidDefinition
 * @property {string} type The type of transformation (In this case, 'GenerateUUID')
 * @property {string} [name] The name of the transformation. Used for debugging.
 * @property {string} outputField The name of the field to output the UUID to
 * @property {string} [replaceOutputValue=false] Whether or not to replace any existing values in the output field
 * @property {string} [condition] A condition to check for whether to execute this transformation or not. Will execute always if not set.
 */

/**
 * Return a transformation to generate a UUID for our database primary key
 * @return {GenerateUuidDefinition} The Definition
 */
const getIdGenerationMapping = () => ({
  name: 'Generate primary key',
  type: 'GenerateUUID',
  outputField: 'id',
});

/**
 * Creates a Transformation Definition, which runs a Search and Replace function. All data in a field matching a regex will be replaced by the given replacement string
 * @typedef {Object} SearchAndReplaceDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'SearchAndReplace')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} [inputValueFieldName] Indicates the name of the field to be used to get the data to input into the transformation
 * @property {*} [inputFixedValue] Sets a fixed value to be input into the transformation
 * @property {string} outputField The name of the field to output the result to
 * @property {boolean} [replaceOutputValue=false] Indicates whether any existing data in the output field should be overwritten
 * @property {string} regex The regex to run against the input value
 * @property {string} replacement The replacement string to replace any values matched by the regex
 */
/**
 * Creates a Transformation Definition, which copies data from one field to another.
 * @typedef {Object} CopyDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'Copy')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} [inputValueFieldName] Indicates the name of the field to be used to get the data to be copied
 * @property {*} [inputFixedValue] Sets a fixed value to copy into the output
 * @property {string} outputField The name of the field to output to
 * @property {boolean} [replaceOutputValue=false] Indicates whether any existing data in the output field should be overwritten
 */
/**
 * Creates a Transformation Definition, which copies data from one field to another.
 * @typedef {Object} CurveCopyFieldsDefinition
 * @property {string} type The type of transformation (in this case, 'CurveCopyFields')
 * @property {string} name The name of the calculation. Used for debugging purposes
 * @property {{from: string, to:string}[]} directives A list of objects, representing which field to copy, and where to copy the data to
 *
 */
/**
 * Defines how to output some data
 * @typedef {Object} OutputConfiguration
 * @property {string} outputField The name of the field to output to
 * @property {boolean} [replaceOutputValue=false] Indicates whether any existing data in the output field should be overwritten
 */
/**
 * Used to identify where to source input data from
 * @typedef {Object} ValueIdentifier
 * @property {string} [fieldName] Indicates the name of the field to be used to get the input data
 * @property {*} [fixedValue] Sets a fixed value to use as the input data
 */
/**
 * Defines where to locate mapping information for a Simple Mapping. Typically used in cases where mappings are so large they cannot be posted to the Platform API.
 * @typedef {Object} ExternalSimpleMapping
 * @property {FileSourceDefinition} fileSource Information on where to source a mappings file from
 * @property {FileTypeDefinition} fileType Information on how to read the file containing the mappings
 * @property {InputColumnSchemaDefinition[]} inputColumnSchemas A schema describing what information (input keys, output values) is contained in the file
 * @property {string} [keyFieldName] Indicates the name of the field to be used to get the input data
 * @property {*} [keyFixedValue] Sets a fixed value to use as the input data
 * @property {ValueIdentifier[]} valueIdentifiers A list of identifiers describing how to get the output values
 */
/**
 * Creates a Transformation Definition, which runs a mapping. The input data will be checked against the provided mappings, and the found mapping values will be pushed to the output fields.
 * If the data is not found as a key in the map, null will be pushed to the output.
 * @typedef {Object} SimpleMappingDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'SimpleMapping')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} [inputValueFieldName] Indicates the name of the field to be used to get the data to use as a mapping key
 * @property {*} [inputFixedValue] Sets a fixed value to use as a mapping key
 * @property {OutputConfiguration[]} outputConfigurations A list of output configurations. A mapping points to multiple values, so each output configuration defines which element of the mapping value
 * @property {CatalogueMapping} [mappings] A map of mappings to use in this transformation. Each key maps to multiple output values
 * @property {ExternalSimpleMapping} [externalMappings] A configuration defining where to get mapping data from
 * @property {string} [regex] A regex to run against each key. Any matches will be removed from the key
 */
/**
 * Defines where to locate mapping information for a Hierarchical Mapping. Typically used in cases where mappings are so large they cannot be posted to the Platform API.
 * @typedef {Object} ExternalHierarchicalMapping
 * @property {FileSourceDefinition} fileSource Information on where to source a mappings file from
 * @property {FileTypeDefinition} fileType Information on how to read the file containing the mappings
 * @property {InputColumnSchemaDefinition[]} inputColumnSchemas A schema describing what information (input keys, output values) is contained in the file
 * @property {string[]} context A list of field names from where to gather input data from
 * @property {ValueIdentifier[]} valueIdentifiers A list of identifiers describing how to get the output values
 */
/**
 * Creates a Transformation Definition, which runs a hierarchical mapping. The series of input data will gathered, and used to iteratively scan down a hierarchy of mappings to find the
 * mapping values that will be pushed to the list of output fields.
 * If the data is not found as a key in the map, null will be pushed to the output.
 * @typedef {Object} HierarchicalMappingDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'HierarchicalMapping')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} [inputValueFieldName] Indicates the name of the field to be used to get the data to use as the final mapping key
 * @property {*} [inputFixedValue] Sets a fixed value to use as the final mapping key
 * @property {OutputConfiguration[]} outputConfigurations A list of output configurations. A mapping points to multiple values, so each output configuration defines which element of the mapping value
 * @property {CatalogueMapping} [mappings] A map of mappings to use in this transformation. Each set of keys map to multiple output values
 * @property {ExternalHierarchicalMapping} [externalMappings] A configuration defining where to get mapping data from
 * @property {string[]} context A list of field names to be used to create a list of input data from each row, for use as mapping keys
 */

/**
 * Modifies a partial catalogue mapping with external mapping information
 * @param {*} catalogueMapping The mapping to modify
 * @param {ExternalCatalogueMapping} externalCatalogue The external catalogue to apply to the Mapping Definition
 * @param {string} [secondaryKeyFieldName] Any secondary key names
 */
const createBigMappings = (catalogueMapping, externalCatalogue, secondaryKeyFieldName) => {
  const mapping = {
    fileSource: {
      type: 'URL',
      url: externalCatalogue.url,
    },
    fileType: {
      type: 'CSV',
    },
    inputColumnSchemas: externalCatalogue.fields,
  };

  const fieldNames = externalCatalogue.fields.map((field) => field.field);
  if (fieldNames.length <= 2) {
    mapping.keyFieldName = fieldNames[0];
  } else {
    mapping.context = fieldNames.slice(0, -1);

    catalogueMapping.type = 'HierarchicalMapping';
    catalogueMapping.context = [catalogueMapping.inputValueFieldName];
    catalogueMapping.inputValueFieldName = secondaryKeyFieldName;
  }
  mapping.valueIdentifiers = [{ fieldName: fieldNames[fieldNames.length - 1] }];

  catalogueMapping.externalMappings = mapping;
};

/**
 * Defines a Transformation Definition which executes a Switch statement. Each mapping will be evaluated in turn, and if the condition
 * in the mapping evaluates to true, that mapping value will be output to the given output field. If no conditions evaluate to true,
 * the default value will be used instead
 * @typedef {Object} SwitchDefaultDefinition
 * @property {string} [name] The name of the transformation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'SwitchDefault')
 * @property {ConditionDefinition} [condition] The condition to check before executing the transformation. Will assume the transformation is always executed if not set
 * @property {string} outputField The name of the field to output the result to
 * @property {boolean} [replaceOutputValue=false] Indicates whether any existing data in the output field should be overwritten
 * @property {{condition: Condition, value: *}} mappings The mappings to evaluate
 * @property {*} [defaultValue] The default value to use if the none of the mappings evaluate. Null will be pushed to the output field if this is not set
 */

/**
 * Generate a series of Transformation Definitions to execute a series of catalogue mappings for Works.
 * @param {CatalogueMapping} [works] The Works catalogue data
 * @param {ExternalCatalogueMapping} [externalWorks] The external works catalogue information
 * @param {{identifier: string, title: string, output: string}[]} [workExceptions] Any exception rules for works, to help differentiate two works with the same key
 * @param {string} [templateSource] The source of the template. Used to map to the correct society.
 * @param {Number} round - What run number we are currently on
 * @return {TransformationDefinition[]} A list of transformations to correctly map the Work to a Work ID
 */
const getWorkMappings = (works, externalWorks, workExceptions, templateSource, round) => [
  createTitleMappingTransformation(round),
  ...createWorkMappingTransformation(works, externalWorks, workExceptions, templateSource, round),
];

/**
 * Defines an object that describes a Track mapping exception. Tracks matching the ISRC should only match to the track ID if the track name contains the phrase
 * @typedef {Object} TrackException
 * @property {string} isrc The ISRC of the track listing
 * @property {string} trackNamePrefix The start of the track name
 * @property {string} trackId The ID of the track in our catalogue
 */
/**
 * Defines an object that describes a Release mapping exception. Releases matching the Cat No should only match to the release ID if the release name contains the phrase
 * @typedef {Object} ReleaseException
 * @property {string} catNo The Cat No of the track listing
 * @property {string} releaseNamePrefix The start of the release name
 * @property {string} releaseId The ID of the release in our catalogue
 */
/**
 * Defines an object that describes a Work mapping exception. Works matching the Identifier should only match to the work ID if the work name contains the phrase
 * @typedef {Object} WorkException
 * @property {string} identifier The Original Identifier of the work
 * @property {string} workNamePrefix The start of the work name
 * @property {string} workId The ID of the work in our catalogue
 */
/**
 * Defines a definition of where to load an external file from to read in Catalogue data into Beam
 * @typedef {Object} ExternalCatalogueDefinition
 * @property {FileSourceDefinition} fileSource Details about the source of the file
 * @property {FileTypeDefinition} fileType Details about how to read the file
 * @property {InputColumnSchemaDefinition[]} inputColumnSchemas Column data about what's contained in the file
 */
/**
 * Defines a Transformation which will execute Track and Release mappings on the pipeline
 * @typedef {Object} CurveLabelCatalogueMappingDefinition
 * @property {TrackException[]} trackExceptions A list of all the track exceptions
 * @property {Object.<string, string>} [trackConfig] An object, containing key-value pairs, mapping ISRC's (and aliases) to trackIds
 * @property {ExternalCatalogueDefinition} [trackExternalConfig] An object describing how to access track information stored externally
 * @property {ReleaseException[]} releaseExceptions A list of all the release exceptions
 * @property {Object.<string, Object.<string, string>>} [releaseConfig] An object, with keys containing catNo's and barcodes, mapped to an object with keys containing distribution source (if set) to a release ID
 * @property {ExternalCatalogueDefinition} [releaseExternalConfig] An object describing how to access release information stored externally
 * @property {Number} round The index of the number of times this is being executed
 */

/**
 * Sets up the mappings for Tracks and Releases
 * @param {CatalogueMapping} [tracks] The Tracks catalogue data
 * @param {ExternalCatalogueMapping} [externalTracks] The external tracks catalogue information
 * @param {*[]} trackExceptions A list of exception rules for mapping tracks to the correct track ID
 * @param {CatalogueMapping} [releases] The release catalogue data
 * @param {ExternalCatalogueMapping} [externalReleases] Information about any release catalogue stored externally
 * @param {*[]} releaseExceptions Any release exceptions that may exist
 * @param {Number} round - What run number we are currently on
 * @return {CurveLabelCatalogueMappingDefinition[]} The transformation
 */
const getLabelMappings = (tracks, externalTracks, trackExceptions, releases, externalReleases, releaseExceptions, round) => {
  const mappedTrackExceptions = arrayEmpty(trackExceptions) ? undefined : getTrackExceptions(trackExceptions);
  const trackExternalConfig = !externalTracks ? undefined : createExternalConfig(externalTracks);
  const mappedReleaseExceptions = arrayEmpty(releaseExceptions) ? undefined : getReleaseExceptions(releaseExceptions);
  const releaseConfig = convertNestedMappings(releases);
  const releaseExternalConfig = !externalReleases ? undefined : createExternalConfig(externalReleases);

  if (
    arrayEmpty(mappedTrackExceptions)
    && objectEmpty(tracks)
    && !trackExternalConfig
    && arrayEmpty(mappedReleaseExceptions)
    && objectEmpty(releaseConfig)
    && !releaseExternalConfig
  ) {
    return [];
  }

  return [{
    type: 'CurveLabelCatalogue',
    trackExceptions: mappedTrackExceptions,
    trackConfig: tracks,
    trackExternalConfig,
    releaseExceptions: mappedReleaseExceptions,
    releaseConfig,
    releaseExternalConfig,
    round,
  }];
};

/**
 * Maps Track Exceptions from the Client table to Track Exceptions in Beam
 * @param {{isrc: string, title: string, output: string}[]} trackExceptions The track exceptions from the catalogue
 * @return {TrackException[]}
 */
const getTrackExceptions = (trackExceptions) => trackExceptions
  .filter((exception) => exception.isrc && exception.title && exception.output)
  .map((exception) => ({
    isrc: exception.isrc,
    trackNamePrefix: exception.title,
    trackId: exception.output,
  }));

/**
 * Maps Release Exceptions from the Client table to Release Exceptions in Beam
 * @param {{catNo: string, title: string, output: string}[]} releaseExceptions
 * @return {ReleaseException[]}
 */
const getReleaseExceptions = (releaseExceptions) => releaseExceptions
  .filter((exception) => exception.catNo && exception.title && exception.output)
  .map((exception) => ({
    catNo: exception.catNo,
    releaseNamePrefix: exception.title,
    releaseId: exception.output,
  }));

/**
 * Maps Work Exceptions from the Client table to Work Exceptions in Beam
 * @param {{identifier: string, title: string, output: string}[]} workExceptions
 * @return {WorkException[]}
 */
const getWorkExceptions = (workExceptions) => workExceptions
  .filter((exception) => exception.identifier && exception.title && exception.output)
  .map((exception) => ({
    identifier: exception.identifier,
    workNamePrefix: exception.title,
    workId: exception.output,
  }));

/**
 * Convert an External Catalogue Mapping from Curve into a Catalogue Definition readable by the Platform
 * @param {ExternalCatalogueMapping} externalCatalogueMapping
 * @return {ExternalCatalogueDefinition}
 */
const createExternalConfig = (externalCatalogueMapping) => ({
  fileSource: {
    type: 'GCS',
    inputFileBucketLocation: externalCatalogueMapping.inputFileBucketLocation,
    inputFileName: externalCatalogueMapping.inputFileName,
  },
  fileType: {
    type: 'CSV',
  },
  inputColumnSchemas: externalCatalogueMapping.fields,
});

/**
 * Convert Release or Work mappings from the Curve style to the Platform style. This mainly involves nested values into
 * an object if they are not already set.
 * @param {Object.<string, any>} [catalogue]
 * @return {Object.<string, Object.<string, string>> | undefined}
 */
const convertNestedMappings = (catalogue) => {
  if (objectEmpty(catalogue)) return;

  const rtn = {};

  for (const [key, value] of Object.entries(catalogue)) {
    if (typeof value === 'string' || value instanceof String) {
      rtn[key] = { _default: value };
    } else {
      const newValue = {};
      for (const [channel, releaseId] of Object.entries(value)) {
        if (channel && channel !== 'null') {
          newValue[channel] = releaseId;
        } else {
          newValue._default = releaseId;
        }
      }
      rtn[key] = newValue;
    }
  }

  return rtn;
};

/**
 * Create a Simple Mapping Transformation definition, which converts a catalogue with no nesting into a mapping transformation
 * @param {CatalogueMapping} [catalogue] The catalogue to map
 * @param {ExternalCatalogueMapping} [externalCatalogue] The externally defined catalogue
 * @param {string} inputValueFieldName The name of the field to read for the mapping keys
 * @param {string} outputField The name of the field to push the output to
 * @param {ConditionDefinition} [condition] A condition to check before running the transformation
 * @param {string} [regex] Any regex search-and-replace we want to run against the keys. Any matches groups will be removed
 * @param {Number} round - What run number we are currently on
 * @return {SimpleMappingDefinition} The transformation to run for the mapping
 */
const getSimpleIdMapping = (catalogue, externalCatalogue, inputValueFieldName, outputField, condition, regex, round) => {
  const simpleIdMapping = {
    name: `Catalogue mapping: ${inputValueFieldName} to ${outputField}: Round ${round}`,
    type: 'SimpleMapping',
    inputValueFieldName,
    outputConfigurations: [{ outputField, replaceOutputValue: true }],
    regex,
  };

  if (condition) {
    simpleIdMapping.condition = condition;
  }

  if (catalogue) {
    simpleIdMapping.mappings = wrapValueInArray(catalogue);
  } else if (externalCatalogue) {
    createBigMappings(simpleIdMapping, externalCatalogue);
  }

  return simpleIdMapping;
};

/**
 * Create the Transformation Definitions necessary to perform a contract mapping
 * @param {CatalogueMapping} [contracts] The contract catalogue data
 * @param {ExternalCatalogueMapping} [externalContracts] Information about any contract catalogue stored externally
 * @param {Number} round - What run number we are currently on
 * @return {TransformationDefinition[]} A list of transformation definitions to execute
 */
const getContractMappings = (contracts, externalContracts, round) => {
  const mappings = [];
  const contractCondition = getContractIdBlankCondition();
  if (contracts || externalContracts) mappings.push(getSimpleIdMapping(contracts, externalContracts, 'contractIdentifier', 'contractId', contractCondition, MAPPING_KEY_REGEX_FILTER, round));
  return mappings;
};

/**
 * Returns a Condition Definition checking if the contractId field is blank
 * @return {BasicConditionDefinition} The condition definition for checking if the contractId field is blank
 */
const getContractIdBlankCondition = () => ({
  type: 'isBlank',
  leftValueFieldName: 'contractId',
});

/**
 * Defines a Transformation which handle rows with Returns data. Returns information will either be mapped to Credit information
 * (Return Units -> Units, Return Net Amount -> Net Amount and Return Gross Amount -> Gross Amount), or if both Credit and Debit
 * information is present, the row will be split.
 * @typedef {Object} CurveReturnsHandlerDefinition
 * @property {string} type The Transformation type (in this case, 'CurveReturnsHandler')
 * @property {string} [name] The name of the transformation
 */

/**
 * Creates a CurveReturnsHandler Transformation, to handle rows containing Returns information. Any rows containing Returns Units,
 * Returns Net Amount or Returns Gross Amount should be split into a separate row to be reported separately.
 * @return {CurveReturnsHandlerDefinition} The transformation to run to handle returns
 */
const createReturnsHandler = () => ({
  type: 'CurveReturnsHandler',
});

/**
 * Creates a TitleMapperTransformation, which will generate the "titleMapper" field, a concatenation of work title and parties,
 * that can be used to almost uniquely identify a Work
 * @typedef {Object} TitleMapperTransformationDefinition
 * @property {string} [name] The name of the calculation. Used for debugging purposes
 * @property {string} type The type of transformation (in this case, 'CurveTitleMapperCreator')
 */

/**
 * Creates a transformation, whose job is to build up the "titleMapper" (A series of fields appended together which should hopefully uniquely identify a Work)
 * @param {Number} round - What run number we are currently on
 * @return {TitleMapperTransformationDefinition} The Transformation Definition to execute to build the title mapper
 */
const createTitleMappingTransformation = (round) => ({
  name: `Create title mapper: Round ${round}`,
  type: 'CurveTitleMapperCreator',
});

/**
 * Runs mappings of Works identifiers to Work IDs in our catalogue
 * @typedef {Object} WorkMappingTransformationDefinition
 * @property {string} type The type of transformation (in this case, 'CurvePublisherCatalogue')
 * @property {Object.<String, Object.<String, String>>} [works] An object, with keys containing ISWCs, identifiers, tunecodes and songCodes, mapped to an object with keys containing the society (or "_default" if there is no associated society) to a work ID
 * @property {ExternalCatalogueDefinition} [externalWorks] An object describing how to access work information stored externally
 * @property {WorkException[]} [workExceptions] A list of all the Work Exceptions
 * @property {string} [templateSource] The source of the template. Used to map to the correct society.
 * @property {Number} round The index of the number of times this is being executed
 */

/**
 * Creates a custom transformation to execute Works mappings
 * @param {CatalogueMapping} [works] A mapping of key, to a map of each society to their workId
 * @param {ExternalCatalogueMapping} [externalWorks] Information about where to retrieve externally stored Works
 * @param {{identifier: string, title: string, output: string}[]} [workExceptions] Any exception rules for works, to help differentiate two works with the same key
 * @param {string} [templateSource] The source of the template. Used to map to the correct society.
 * @param {Number} round The round number
 * @return {WorkMappingTransformationDefinition[]}
 */
const createWorkMappingTransformation = (works, externalWorks, workExceptions, templateSource, round) => {
  if (objectEmpty(works) && !externalWorks) return [];
  const mappedWorkExceptions = arrayEmpty(workExceptions) ? undefined : getWorkExceptions(workExceptions);
  return [{
    type: 'CurvePublisherCatalogue',
    society: templateSource,
    workConfig: convertNestedMappings(works),
    workExternalConfig: externalWorks != null ? createExternalConfig(externalWorks) : undefined,
    workExceptions: mappedWorkExceptions,
    round,
  }];
};

/** @typedef {import('../../catalogueOverwritingData').ExternalCatalogueMapping} ExternalCatalogueMapping */

/**
 * Sets various fields based on the mapped Work, Release or Track
 * @typedef {Object} CurveCatalogueOverwritingDataDefinition
 * @property {string} type The type of transformation (in this case, 'CurveCatalogueOverwritingDataTransformation')
 * @property {Number} round The round index
 * @property {ExternalCatalogueMapping} releaseInfo Information about an externally stored data set of Releases
 * @property {ExternalCatalogueMapping} tracksInfo Information about an externally stored data set of Tracks
 * @property {ExternalCatalogueMapping} worksInfo Information about an externally stored data set of Works
 * @property {boolean} overwriteDistributionChannel Marks whether a Release Sales line should have it's Distribution Channel overwritten by the value set in the Release
 * @property {boolean} overwriteConfiguration Marks whether a Release Sales line should have it's Configuration overwritten by the value set in the Release
 * @property {boolean} overwritePriceCategory Marks whether a Release Sales line should have it's Price Category overwritten by the value set in the Release
 * @property {boolean} overwriteTrackPriceCategory Marks whether a Track Sales line should have it's Price Category overwritten by the value set in the Release
 */

/**
 * Creates a transformation, whose job is to map found work IDs, release IDs and track IDs, back to the catalogue,
 * in order to add information from the catalogue to the sales lines for reporting
 * @param {*} catalogueOverwritingData The catalogue overwriting data from the prepare data stage
 * @param {*} overwriteFields Information about which fields to overwrite from the user configuration
 * @param {Number} round - What run number we are currently on
 * @return {CurveCatalogueOverwritingDataDefinition[]} A transformation which will apply catalogue data to the sales lines
 */
const getCatalogueOverwritingDataMapping = (catalogueOverwritingData, overwriteFields, round) => {
  if (
    !catalogueOverwritingData?.externalReleases
    && !catalogueOverwritingData?.externalTracks
    && !catalogueOverwritingData?.externalWorks
  ) return [];

  return [{
    type: 'CurveCatalogueOverwritingDataTransformation',
    round,
    releaseInfo: catalogueOverwritingData.externalReleases,
    tracksInfo: catalogueOverwritingData.externalTracks,
    worksInfo: catalogueOverwritingData.externalWorks,
    overwriteDistributionChannel: overwriteFields?.overwriteDistributionChannelWithCatalogue,
    overwriteConfiguration: overwriteFields?.overwriteConfigWithCatalogue,
    overwritePriceCategory: overwriteFields?.overwritePriceCategoryWithCatalogue,
    overwriteTrackPriceCategory: overwriteFields?.overwriteTrackPriceCategoryWithCatalogue,
  }];
};

/**
 * Create Simple Mapping Definitions to map the exchange rates from our ingestion data, and from the sales file, from the currency in the data
 * @param {{from: string, to: string, rate: Number}[]} [exchangeRates] The exchange rates from our ingestion data
 * @return {Object<string, Object.<string, Number>> | undefined} A map of each "from" currency, to a map of each "to" currency, to the exchange rate
 */
const getExchangeRates = (exchangeRates) => {
  if (!exchangeRates) return;

  const mappings = { };
  exchangeRates
    .filter((rate) => rate.from && rate.to && rate.rate)
    .forEach((exchangeRate) => {
      if (!mappings[exchangeRate.from]) {
        mappings[exchangeRate.from] = {};
      }

      mappings[exchangeRate.from][exchangeRate.to] = exchangeRate.rate;
    });
  return mappings;
};

/**
 * A transformation that takes the exchange rate field (if exists) on a row and applies it to the various amounts
 * @typedef {Object} ExchangeRateTransformationDefinition
 * @property {string} type The type of transformation (in this case "CurveExchangeRate")
 * @property {string} [name] The name of the transformation
 */

/**
 * Apply any user-provided exchange rate to all the sales and costs fields
 * @return {ExchangeRateTransformationDefinition} The transformations to execute to apply the exchange rate
 */
const getExchangeRateTransformation = () => ({
  type: 'CurveExchangeRate',
  name: 'Apply exchange rate',
});

/**
 * Given a dictionary of unit rates per territory, create a list of transformations that will insert these into the perUnitRate column of the data.
 * This data is typically scraped from Facebook and iTunes Match supplemental financial files and summary data
 * @param {Object.<string, number>} [unitRatesPerTerritory] A dictionary of territory codes to the value of a unit
 * @return {SimpleMappingDefinition[]} The transformations to execute
 */
const getUnitRatesPerTerritoryMappings = ({ unitRatesPerTerritory }) => {
  if (!objectEmpty(unitRatesPerTerritory)) {
    return [{
      name: 'Map unit rates per territory',
      type: 'SimpleMapping',
      inputValueFieldName: 'originalTerritory',
      outputConfigurations: [{ outputField: 'perUnitRate' }],
      mappings: wrapValueInArray(unitRatesPerTerritory),
    }];
  }
  return [];
};

/**
 * Generate calculations to determine the Net or Gross Amount, in the case we are processing a Facebook or iTunes Match file where we have determined the per-unit rate
 * @param ingestionData The ingestion data
 * @return {CalculationDefinition[]}
 */
const getSpecialAmountCalculations = (ingestionData) => {
  const transformations = [];
  if (isFacebookFile(ingestionData) || isITunesMatchFile(ingestionData)) {
    transformations.push({
      name: 'Calculate Gross Amount from Unit Rate per Territory',
      type: 'Calculation',
      outputField: 'grossAmount',
      replaceOutputValue: true,
      condition: {
        type: 'IsBlank',
        leftValueFieldName: 'grossAmount',
      },
      inputValueFieldName: 'perUnitRate',
      equations: [{
        equationValueFieldName: 'units',
        calculationType: 'Multiplication',
      }],
    });
  }
  if (isITunesMatchFile(ingestionData)) {
    transformations.push({
      name: 'Calculate Net Amount from Unit Rate per Territory',
      type: 'Calculation',
      outputField: 'netAmount',
      replaceOutputValue: true,
      condition: {
        type: 'IsBlank',
        leftValueFieldName: 'netAmount',
      },
      inputValueFieldName: 'perUnitRate',
      equations: [{
        equationValueFieldName: 'units',
        calculationType: 'Multiplication',
      }],
    });
  }
  return transformations;
};

/**
 * Generates a Transformation Definition which calculates the category type of the Sales line based on the present data.
 * E.g, if a line has a catNo, and no ISRC, it represents the sale of some release.
 * @param {Number} round - What run number we are currently on
 * @return {SwitchDefaultDefinition} The transformation definition of how to determine the category type
 */
const getCatTypeMapping = (round) => ({
  name: `Determine category type: Round ${round}`,
  type: 'SwitchDefault',
  outputField: 'catType',
  condition: { type: 'isBlank', leftValueFieldName: 'catType' },
  replaceOutputValue: true,
  defaultValue: null,
  mappings: [{
    value: 'Work',
    condition: {
      type: 'or',
      conditions: getWorkDefaultCatTypeConditions(),
    },
  },
  {
    value: 'Track',
    condition: {
      type: 'isNotBlank',
      leftValueFieldName: 'isrc',
    },
  },
  {
    value: 'Release',
    condition: {
      type: 'or',
      conditions: getReleaseDefaultCatTypeConditions(),
    },
  },
  {
    value: 'Contract',
    condition: {
      type: 'isNotBlank',
      leftValueFieldName: 'contractIdentifier',
    },
  }],
});

/**
 * Generates a list of Condition Definitions, where if one of the conditions evaluates to true, this indicates the
 * sale line represents royalties on a Work.
 * @return {ConditionDefinition[]} A list of condition definitions to be grouped in an 'Or' to mark it as a Work
 */
const getWorkDefaultCatTypeConditions = () => [
  {
    type: 'isNotBlank',
    leftValueFieldName: 'originalIdentifier',
  },
  {
    type: 'isNotBlank',
    leftValueFieldName: 'tunecode',
  },
  {
    type: 'isNotBlank',
    leftValueFieldName: 'iswc',
  },
  {
    type: 'isNotBlank',
    leftValueFieldName: 'songCode',
  },
  {
    type: 'isNotBlank',
    leftValueFieldName: 'originalWorkTitle',
  },
  {
    type: 'isNotBlank',
    leftValueFieldName: 'originalComposers',
  },
];

/**
 * Generates a list of Condition Definitions, where if one of the conditions evaluates to true, this indicates the
 * sale line represents royalties on a Release.
 * @return {ConditionDefinition[]} A list of condition definitions to be grouped in an 'Or' to mark it as a Release
 */
const getReleaseDefaultCatTypeConditions = () => [{
  type: 'isNotBlank',
  leftValueFieldName: 'catNo',
},
{
  type: 'isNotBlank',
  leftValueFieldName: 'barcode',
}];

/**
 * A transformation that takes the multiplier field (if exists) on a row and applies it to the various amounts
 * @typedef {Object} MultiplierTransformationDefinition
 * @property {string} type The type of transformation (in this case "CurveMultiplier")
 * @property {string} [name] The name of the transformation
 */

/**
 * Apply any user-provided multiplier to all the sales and costs fields
 * @return {MultiplierTransformationDefinition} The transformations to execute to apply the multiplier
 */
const getMultiplierTransformation = () => ({
  type: 'CurveMultiplier',
  name: 'Apply multiplier',
});

/**
 * A transformation that takes the positive/negative field (if exists) on a row and negatives the Net and Gross amount fields if it's Negative
 * @typedef {Object} PositiveNegativeDefinition
 * @property {string} type The type of transformation (in this case "CurvePositiveNegative")
 * @property {string} name The name of the transformation
 */

/**
 * Creates a new transformation that takes the positive/negative field (if exists) on a row and negatives the Net and Gross amount fields if it's Negative
 * @return {PositiveNegativeDefinition}} The transformation to do the conversion
 */
const createPositiveNegativeTransformation = () => ({ type: 'CurvePositiveNegative', name: 'Perform Positive-Negative inversion' });

/**
 * A transformation that applies the exchange rate based on the currency and territory, from data extracted
 * from an iTunes Financial Summary
 * @typedef {Object} CurveITunesExchangeRateTransformationDefinition
 * @property {string} type The type of transformation (in this case "CurveITunesExchangeRates")
 * @property {string} name The name of the transformation
 * @property {Object.<string, string>} exchangeRatesByRegion An exchange rate by a currency and region name
 */

/**
 * Creates a transformation which will apply iTunes Exchange Rates to the rows
 * @param {Object.<string, string>} [iTunesExchangeRates] The exchange rates retrieved from the iTunes financial file
 * @return {CurveITunesExchangeRateTransformationDefinition[]} The transformation, or an empty array
 */
const createITunesExchangeRateTransformations = (iTunesExchangeRates) => {
  const filteredRates = filterITunesExchangeRates(iTunesExchangeRates);
  if (objectEmpty(filteredRates)) return [];
  return [{
    type: 'CurveITunesExchangeRates',
    name: 'Apply iTunes Exchange Rates',
    exchangeRatesByRegion: filteredRates,
  }];
};

/**
 * Filter out any values that are null, undefined or NaN
 * @param {Object.<string, string>} rates The exchange rates retrieved from the iTunes financial file
 * @returns {Object.<string, string>} The filtered object
 */
const filterITunesExchangeRates = (rates) => Object.entries(rates ?? {})
  .filter(([_, value]) => value)
  .reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

/**
 * Creates transformations for pro-rata calculations when there's a pro-rata amount in the ingestion data.
 * This function sets up three calculations:
 * 1. Sets the per-unit rate field with the value from ingestionData
 * 2. Calculates the net amount by multiplying units by the per-unit rate
 * 3. Calculates the gross amount by multiplying units by the per-unit rate
 *
 * @param {Object} ingestionData - The data prepared for ingestion, containing perUnitRate if pro-rata is applicable
 * @return {CalculationGroupDefinition[]} An array of transformation definitions for pro-rata calculations, or an empty array if not applicable
 */
const createProRataTransformations = (ingestionData) => {
  if (ingestionData.perUnitRate && Number.isFinite(ingestionData.perUnitRate)) {
    return [{
      type: 'CurveTransformationGroup',
      name: 'Use Pro-Rata calculated per-unit rate',
      transformations: [
        {
          type: 'Calculation',
          name: 'Set per-unit rate',
          outputField: 'perUnitRate',
          replaceOutputValue: true,
          inputFixedValue: ingestionData.perUnitRate,
          equations: [],
        },
        {
          type: 'Calculation',
          name: 'Calculate net amount',
          outputField: 'netAmount',
          replaceOutputValue: true,
          inputValueFieldName: 'units',
          equations: [
            {
              calculationType: 'Multiplication',
              equationFixedValue: ingestionData.perUnitRate,
            },
          ],
        },
        {
          type: 'Calculation',
          name: 'Calculate gross amount',
          outputField: 'grossAmount',
          replaceOutputValue: true,
          inputValueFieldName: 'units',
          equations: [
            {
              calculationType: 'Multiplication',
              equationFixedValue: ingestionData.perUnitRate,
            },
          ],
        },
      ],
    }];
  }
  return [];
};

/**
 * Defines a CurveDataRowValidationDefinition, which runs a validation check on each Sales Line, to verify all the
 * relevant fields are set
 * @typedef {Object} CurveDataRowValidationDefinition
 * @property {string} type The type of transformation (in this case, 'CurveDataRowValidator')
 */
/**
 * Generates a Transformation Definition, whose job is to determine whether the sales line is valid or not. Sales lines will be marked as "Complete" or "Incomplete",
 * if mappings have been successful and royalty amounts are not invalid.
 * @return {CurveDataRowValidationDefinition} A transformation to validate the sales line
 */
const getStatusMapping = () => ({
  name: 'Determine status',
  type: 'CurveDataRowValidator',
});

/**
 * Defines the information required to output a column of data
 * @typedef {Object} OutputColumnSchema
 * @property {string} name The name of the column
 * @property {string} type The data type stored in this column
 * @property {string} [dateFormat] If the type is 'Date', this is the date format of the stored data
 */

/**
 * Gathers a list of columns the platform needs to return, to upload the transformed data to BigQuery
 * @return {OutputColumnSchema[]} The output schema, listing all the columns required
 */
const getOutputSchema = () => {
  const schema = getBigQuerySchema();
  schema.forEach((column) => {
    for (const key in column) {
      if (!['name', 'type', 'format', 'mode'].includes(key)) {
        delete column[key];
      } else if (key === 'name') {
        column.field = column[key];
        delete column[key];
      } else if (key === 'format') {
        column.dateFormat = column[key];
        delete column[key];
      }
    }
    // Check if type is a date and we are missing a dateFormat
    if (column.type === 'DATE' && !(column.dateFormat)) {
      column.dateFormat = DEFAULT_DATE_FORMAT;
    } else if (column.type === 'STRING') {
      column.type = 'VARCHAR';
    } else if (column.type === 'FLOAT') {
      column.type = 'NUMERIC';
    }

    if (column.mode) {
      if (column.mode === 'REPEATED') {
        column.type += '[]';
      }
      delete column.mode;
    }
  });
  return schema;
};

/**
 * Returns the configuration defining how and where to output the file
 * @param {string} clientId The ID of the client
 * @param {string} taskId The ID of the task
 * @return {{fileType: string}} The output configuration
 */
const getOutputConfig = (clientId, taskId) => {
  const nowString = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const outputBucket = process.env.SALES_INGESTION_OUTPUTS_BUCKET;

  return {
    fileType: 'json',
    type: 'Sharded GCS',
    bucketName: outputBucket,
    fileNamePrefix: `convertedOutput/${clientId}/${taskId}-${nowString}`,
  };
};

// May need to consider actually adding this back instead of hard coding outputSchema
const getBigQuerySchema = () => {
  const bigQuery = new BigQuery({});
  return [...bigQuery.inputSchema];
};

/**
 * Convert the column index to an internal field name.
 * @param {Number} idx The index
 * @return {string} The name of the field
 */
const createColumnFieldName = (idx) => `__col${idx}`;

/**
 * Wraps the values of the given object in an array
 * @param {Object.<string, *>} obj The input map of values to wrap
 * @return {Object.<string, *[]>} The wrapped mappings
 */
const wrapValueInArray = (obj) => {
  if (!obj) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(obj)
      .map(([key, value]) => [key, [value]]),
  );
};

/**
 * Utility method to determine if an array is null, undefined or empty.
 * @param {Array<any> | null | undefined} array The array to test
 * @return {boolean} True if the array is undefined, null or empty. False otherwise.
 */
const arrayEmpty = (array) => !array || array.length === 0;

/**
 * Utility method to determine if an object is null, undefined or empty.
 * @param {null | undefined | Object} object The object to test
 * @return {boolean} True if the object is undefined, null or empty. False otherwise.
 */
const objectEmpty = (object) => !object || Object.keys(object).length === 0;

module.exports = prepareData;
