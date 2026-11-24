/* eslint-disable no-await-in-loop */
const { logger, BigQuery, databaseUtils, utils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const fsPromise = require('node:fs/promises');
const { keyBy } = require('lodash');

const Filter = require('../filter');
const Report = require('../../models/report');
const Client = require('../../models/client');
const Payee = require('../../models/payee');
const SalesFile = require('../../models/salesFile');
const Cost = require('../../models/cost');
const CatalogueOverwritingData = require('../catalogueOverwritingData');
const FieldCatalogueMappings = require('./fieldCatalogueMappings');
const CollectData = require('../writeCsv/collectData');
const CollectDataMongo = require('../writeCsv/collectDataMongo');
const Exports = require('../exports');
const CsvExports = require('../exports/csv');
const GoogleStorage = require('../../controllers/googleStorage');
const ExportNotification = require('../exportNotification/exportNotification');
const Template = require('./template');

// Maximum length of Array parameters in BigQuery queries
// If this threshold is exceeded, a temp table will be used for filtering
// Required as BigQuery has a max query length of 10MB
const MAX_ARRAY_PARAM_SIZE = 100_000;

const { getExportBucketName } = require('./props');

/**
 * @param {Object} params
 * @param {string} params.reportId - ID of the Report to generate & export
 * @param {string} params.email - Email of the user to notify of the export
 * @param {number} params.limit - Maximum number of BigQuery rows to export, not required
 * @param
 */
async function createReport({
  reportId,
  email,
  maxArrayParamSize = MAX_ARRAY_PARAM_SIZE,
}) {
  const logKey = `${reportId} | Create Report |`;

  try {
    logger.info('Fetching Report:', reportId);
    const report = await Report.findById(reportId);
    if (!report) throw new Error(`No Report found with id ${reportId}`);

    const client = await getReportClient(report);
    if (!client) throw new Error(`No Client found with id ${report.clientId}`);

    const filter = await getFilter({ report, client });

    logger.debug(logKey, `Filter: ${JSON.stringify(filter, null, 2)}`);

    let s3Key;
    let fileLocation;

    if (filter === null) {
      // Build templates for the report (just need headers)
      const { originalTemplate } = await Template.getTemplates({ report });

      // Create a CSV write stream with headers only
      s3Key = buildFileKey(report);
      const { csvStream, fileLocation: fileLoc } = createCsvStream({
        fileKey: s3Key,
        template: originalTemplate,
        format: report.format,
      });
      fileLocation = fileLoc;

      // Close immediately - just a blank file with headers
      await CsvExports.closeStream(csvStream);
    } else {
      logger.info(logKey, 'Checking for any orphaned sales lines to delete');
      const bigQuery = createBigQueryClient(client);
      await clearOrphanedSalesLines({
        logKey,
        clientId: client._id.toString(),
        report,
        bigQuery,
      });

      // Set database table based on report table and client
      const table = getDatabaseTable({ report, client });
      logger.info(logKey, 'Using database table:', table);

      // Use MongoDB for costs
      if (table === 'costs') {
        logger.info(logKey, 'Using Mongo for data source');
        ({ fileLocation, s3Key } = await CustomReport.createReportFromDB({
          logKey,
          table,
          filter,
          client,
          report,
        }));
      } else {
        // Use BigQuery for anything else
        logger.info(logKey, 'Using BigQuery for data source');
        ({ fileLocation, s3Key } = await CustomReport.createReportFromBigQuery({
          logKey,
          bigQuery,
          table,
          filter,
          client,
          report,
          maxArrayParamSize,
        }));
      }

      logger.info(logKey, 'Finished writing all data to CSV file:', fileLocation);
    }
    logger.info(logKey, 'Uploading CSV file to S3:', s3Key);
    await new Promise((resolve, reject) => {
      fileManager.uploadToS3(s3Key, fileLocation, (err) => (err ? reject(err) : resolve()));
    });

    logger.info(logKey, 'Generating public link');
    const publicUrl = await new Promise((resolve, reject) => {
      fileManager.publicLink24Hours(s3Key, (err, url) => (err ? reject(err) : resolve(url)));
    });

    logger.info(logKey, 'Sending notification to user:', email);
    const fullClient = await Client.findById(report.clientId);
    await ExportNotification.sendReportExportNotification({
      reportName: report.name,
      url: publicUrl,
      client: fullClient,
      email,
    });
  } catch (err) {
    logger.error(logKey, 'Failed to create Custom Report', err);
    throw err;
  }
}

/**
 *
 * @param {Client} client - Client model instance
 * @description Creates a BigQuery client and returns it
 */
function createBigQueryClient(client) {
  return new BigQuery(databaseUtils.getBigQueryOpts(client));
}

/**
  * @param {Object} params
  * @param {} params.logKey - A key used for logging and traceability
  * @param {} params.filter - The filter object to apply to the query
  * @param {} params.client - Client model instance
  * @param {} params.report - Report model instance
  * @param {} params.table - The name of the table
 */
async function createReportFromDB({
  logKey,
  filter,
  client,
  report,
  table,
}) {
  // Get client mappings
  logger.info(logKey, 'Fetching client mapping data');
  const mappingData = await getClientMappingData({ report, client });

  // Build templates for the report
  const { originalTemplate, template } = await Template.getTemplates({ report, table });

  // Create a CSV write stream
  const s3Key = buildFileKey(report);
  const { csvStream, fileLocation, fileName } = createCsvStream({
    fileKey: s3Key,
    template: originalTemplate,
    format: report.format,
  });

  const group = Template.getGroup(template);
  const pipeline = [{ $match: filter }, { $group: group }];

  logger.info(logKey, 'Fetching Costs with aggregate query:', JSON.stringify(pipeline, null, 2));
  const costs = await Cost.aggregate(pipeline);

  // Map to the passed template
  logger.info(logKey, 'Mapping data to the report template:', costs.length);
  for (let line of costs) {
    // Flatten line
    line = CollectDataMongo.flattenLine(line);
    // Set catalogue IDs
    if (line.releaseIds) line.releaseId = line.releaseIds[0];
    if (line.trackIds) line.trackId = line.trackIds[0];
    // Map line to template
    line = Template.lineToTemplate(line, originalTemplate, mappingData, client, report.format);
    // Write formatted line to CSV file
    CsvExports.writeCsvLine(csvStream, line, { format: report.format });
  }

  // Close stream and wait for it to finish writing all data
  await CsvExports.closeStream(csvStream);

  return {
    fileName,
    fileLocation,
    s3Key,
  };
}

/**
 *
 * @param {Object} params
 * @param {string} params.logKey - A key used for logging and traceability
 * @param {BigQuery} params.bigQuery - The BigQuery instance to run queries on
 * @param {string} params.table - The name of the table
 * @param {Record<string, unknown>} params.filter - The filter object to apply to the query
 * @param {Client} params.client - Client model instance
 * @param {Report} params.report - Report model instance
 */
async function createReportFromBigQuery({
  logKey,
  bigQuery,
  table,
  filter,
  maxArrayParamSize,
  client,
  report,
}) {
  // Get client mappings
  logger.info(logKey, 'Fetching client mapping data');
  const mappingData = await getClientMappingData({ report, client });

  // Build templates for the report
  const { originalTemplate, template } = await Template.getTemplates({ report, table, bigQuery });

  // Create a CSV write stream
  const s3Key = buildFileKey(report);
  const { csvStream, fileLocation, fileName } = createCsvStream({
    fileKey: s3Key,
    template: originalTemplate,
    format: report.format,
  });

  const query = await buildQuery({ bigQuery, table, template, filter, maxArrayParamSize });
  logger.info(logKey, 'Query:', query.query);
  logger.info(logKey, 'Params:', query.params);

  const { gsFileName, gsFilePath } = await getGoogleStoragePath(client._id.toString());

  logger.info(logKey, 'Running export query');
  console.time('runExportQuery');
  await Exports.runExportQuery({
    bigQuery,
    googleStoragePath: gsFilePath,
    query,
  });
  console.timeEnd('runExportQuery');

  const exportBucketName = await getExportBucketName();
  const storage = new GoogleStorage(exportBucketName);
  const files = await storage.listAllFiles();
  const filesToDownload = files.filter((file) => file.name.includes(gsFileName));
  logger.info(logKey, 'Query export files to download:', filesToDownload.length);

  // If targetPeriod or foreignId are used, we need to query them from the DB (never set in BigQuery)
  let salesFilesById;
  const hasTargetPeriod = originalTemplate.some((item) => item.field === 'targetPeriod') || mappingData.hasTargetPeriod;
  const hasForeignId = originalTemplate.some((item) => item.field === 'foreignId') || mappingData.hasForeignId;
  if (hasTargetPeriod || hasForeignId) {
    const salesFiles = await SalesFile.find({ clientId: client._id.toString() }, { targetPeriod: 1, foreignId: 1 }).lean();
    salesFilesById = keyBy(salesFiles, (sf) => sf._id.toString());
  }

  for (const file of filesToDownload) {
    logger.info(logKey, `Downloading query export file: ${file.name}`);
    const localFile = `${appRootDir}/tmp/${file.name}`;
    await storage.downloadFile({ file: file.name, destination: localFile });

    logger.info(logKey, 'Writing export data to CSV file:', fileName);
    let index = 0;
    const data = await fsPromise.open(localFile);
    for await (const line of data.readLines()) {
      if (index > 0 && index % 100_000 === 0) logger.debug(logKey, 'Rows written to file:', index);
      const row = JSON.parse(line);

      // If report includes target period or foreign id, append that data from the corresponding Sales File (from the db)
      if (row.salesFileId && (hasTargetPeriod || hasForeignId)) {
        const salesFile = salesFilesById[row.salesFileId];
        if (salesFile && hasTargetPeriod) row.targetPeriod = salesFile.targetPeriod;
        if (salesFile && hasForeignId) row.foreignId = salesFile.foreignId;
      }

      const formattedRow = Template.lineToTemplate(row, originalTemplate, mappingData, client, report.format);
      CsvExports.writeCsvLine(csvStream, formattedRow, { format: report.format });
      index += 1;
    }

    // Delete the local export file now it's no longer needed
    fs.unlinkSync(localFile);
  }

  // Close stream and wait for it to finish writing all data
  await CsvExports.closeStream(csvStream);

  return {
    fileName,
    fileLocation,
    s3Key,
  };
}

/**
 * @param {report} report - Report model instance with clientId or payeeId field
 * @description Retrieves the Client associated with the Report
 */
async function getReportClient(report) {
  if (report.payeeId) {
    const payee = await Payee.findById(report.payeeId);
    return Client.findById(payee.clientId);
  }
  if (report.clientId) return Client.findById(report.clientId);
  throw new Error('A Client or Payee is required');
}

/**
 * @param {Object} params
 * @param {report} params.report - Report model instance
 * @param {client} params.client - Client model instance
 * @description Converts & returns Report filters to db filters
 */
async function getFilter({ report, client }) {
  const options = {
    client,
    payeeId: report.payeeId,
    table: report.table,
  };
  const filter = await new Promise((resolve, reject) => {
    Filter.filterToDbFilter(report.filters, options, (err, filter) => {
      if (err) reject(err);
      else resolve(filter);
    });
  });
  return filter;
}

/**
 * @param {Object} params
 * @param {logKey} params.logKey - Log prefix
 * @param {clientId} params.clientId - Client ID
 * @param {report} params.report - Report model instance
 * @param {bigQuery} params.bigQuery - BigQuery client
 * @description Deletes any sales lines not associated with a sales file
 */
async function clearOrphanedSalesLines({ logKey, clientId, report, bigQuery }) {
  if (report.table !== 'Sales Input' && report.table !== 'Income Data') return;

  const salesFiles = await SalesFile.distinct('_id', { clientId });
  if (salesFiles.length === 0) return;

  const salesFileIds = salesFiles.map((id) => id.toString());

  logger.info(logKey, 'Clearing down orphaned sales lines');
  const deleteResponse = await new Promise((resolve, reject) => {
    bigQuery.deleteData(bigQuery.inputTable, { salesFileId: { $nin: salesFileIds } }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
  logger.info(deleteResponse);
}

/**
 * @param {report} report - Report model instance with populated _id & name fields
 * @description Generates an S3 file key for the Report
 */
function buildFileKey(report) {
  return `reports/${report._id.toString()}/${utils.safeName(report.name)} ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
}

/**
 * @param {Object} params
 * @param {report} params.report - Report model instance with populated table field
 * @param {client} params.client - Client model instance with populated BigQuery fields
 * @description Maps a Report dataset (from the UI) to the data source table
 */
function getDatabaseTable({ report, client }) {
  if (report.table === 'Sales Input' || report.table === 'Income Data') {
    return client.bigQuerySalesTable;
  } if (report.table === 'Sales Output' || report.table === 'Sales' || report.table === 'Royalties') {
    return client.bigQueryPeriodSales;
  } if (report.table === 'Costs Input') {
    return 'costs';
  } if (report.table === 'Costs Output' || report.table === 'Costs') {
    return client.bigQueryPeriodCosts;
  }
  return report.table;
}

/**
 * @param {Object} params
 * @param {Report} params.report - Report model instance with populated filters field
 * @param {Client} params.client - Client model instance
 * @description Fetches mapping data for a client Report
 */
async function getClientMappingData({ report, client }) {
  const options = {
    formatDates: true,
    joinArraysToString: true,
  };
  const hasTargetPeriod = (report.filters ?? []).some((filter) => filter.hasOwnProperty('targetPeriod'));
  const hasForeignId = (report.filters ?? []).some((filter) => filter.hasOwnProperty('foreignId'));

  const mappingData = await new Promise((resolve, reject) => {
    CatalogueOverwritingData.get(client, options, (err, mappingData) => {
      if (err) reject(err);
      else resolve(mappingData);
    });
  });

  if (report.fields.map((field) => field.field).includes('workIsrcs')) getWorkIsrcs(mappingData);
  if (hasTargetPeriod) mappingData.hasTargetPeriod = true;
  if (hasForeignId) mappingData.hasForeignId = true;

  return mappingData;
}

/**
 * @param {{works: { workIsrcs: string[], catalogueTrackIds: string[] }[]}} catalogueData
 * @description Returns a joined string of catalogue track ids from a catalogue object
 */
function getWorkIsrcs(catalogueData) {
  if (catalogueData.works && Object.values(catalogueData.works).length > 0) {
    Object.values(catalogueData.works).forEach((work) => {
      work.workIsrcs = work.catalogueTrackIds
        ? work.catalogueTrackIds.map((trackId) => catalogueData.tracks[trackId] && catalogueData.tracks[trackId].catalogueIsrc).filter(Boolean).join(', ')
        : '';
    });
  }
}

/**
 * @param {Object} params
 * @param {string} params.fileKey - S3 file key
 * @param {{header: string}[]} params.template - Export template configuration
 * @param {string} params.format - Number separator option
 */
function createCsvStream({ fileKey, template, format }) {
  const fileName = fileKey.split('/').pop();
  const fileLocation = `${appRootDir}/tmp/${fileName}`;

  const headers = template.map((t) => t.header);
  const csvStream = fs.createWriteStream(fileLocation);
  CsvExports.writeCsvLine(csvStream, headers, { format, bom: true });

  return { csvStream, fileLocation, fileName };
}

/**
 * @param {Object} params
 * @param {BigQuery} params.bigQuery - BigQuery client
 * @param {{ field: string, type: string }[]} params.template
 * @param {Record<string, unknown>} params.filter
 * @param {string} params.table
 * @description Builds a BigQuery query based on the Report configuration
 */
async function buildQuery({ bigQuery, template, filter, table, maxArrayParamSize }) {
  const columns = CollectData.getSelectAndSumColumnArray(template, filter);
  removeColumnsBeingMappedToCatalogue(columns);
  const query = bigQuery.getAggregateQuery(
    table,
    columns.selectCols,
    columns.sumCols,
    'lines',
    filter,
    { offset: 0 },
  );

  let queryObj = { query, params: {} };
  queryObj = splitOutArrayParams(queryObj, 'releaseId');
  queryObj = splitOutArrayParams(queryObj, 'trackId');
  queryObj = splitOutArrayParams(queryObj, 'workId');
  queryObj = splitOutArrayParams(queryObj, 'salesFileId');

  // Check and convert any massive query params to temp tables
  // This prevents any BigQuery query size errors
  queryObj = await bigQuery.removeLargeParamValues(queryObj, {
    maxArrayParamSize,
    tempTablePrefix: 'reports_temp_query_param',
  });

  return queryObj;
}

/**
 * @param {{ selectCols: { column: string }[] }} columns
 */
function removeColumnsBeingMappedToCatalogue(columns) {
  if (!Array.isArray(columns.selectCols)) return;
  const fieldsToMapToCatalogueFlattened = Object.values(FieldCatalogueMappings.fieldsToMapToCatalogue).reduce((previousValue, currentValue) => [...previousValue, ...currentValue]);
  columns.selectCols = columns.selectCols.filter((col) => !fieldsToMapToCatalogueFlattened.includes(col.column));
}

/**
 * @param {{ query: string, params: Record<string, unknown> }} queryObj
 * @param {string} selector
 * @description Splits out array parameters in a BigQuery query and returns the updated query
 */
function splitOutArrayParams(queryObj, selector) {
  const occurrences = (queryObj.query.match(new RegExp(`${selector} IN`, 'g')) || []);
  if (occurrences.length > 0) {
    occurrences.forEach((item, idx) => {
      const subStr = queryObj.query.substr(queryObj.query.indexOf(`${selector} IN (`, idx));
      const arrayString = subStr.replace(new RegExp(`(${selector} IN \\()([^)]+)\\)(.*)`), '$2');
      const re = new RegExp(`(${selector} IN)( \\([^)]+)\\)`);
      queryObj.query = queryObj.query.replace(re, `$1 UNNEST(@${selector}${idx})`);
      queryObj.params[`${selector}${idx}`] = arrayString.replace(/[" ]/g, '').split(',');
    });
  }
  return queryObj;
}

/**
 * @param {String} clientId
 * @description Builds a Google Storage report file path for a client
 */
async function getGoogleStoragePath(clientId) {
  const exportBucketName = await getExportBucketName();
  const gsFileName = `${clientId}-${moment().format('x')}-report-`;
  const gsFilePath = `gs://${exportBucketName}/${gsFileName}*.json`;
  return { gsFileName, gsFilePath };
}

const CustomReport = {
  createReport,
  createReportFromDB,
  createReportFromBigQuery,
  createBigQueryClient,
  getReportClient,
  getFilter,
  clearOrphanedSalesLines,
  buildFileKey,
  getDatabaseTable,
  getClientMappingData,
  createCsvStream,
  buildQuery,
  removeColumnsBeingMappedToCatalogue,
  splitOutArrayParams,
  getGoogleStoragePath,
};

module.exports = CustomReport;
