/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
const chunk = require('chunk');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const Process = require('./process');
const config = require('../../../config.json');
const Catalogue = require('./catalogue');
const { logKey, BUCKET_NAME, CONCURRENY_LIMIT } = require('./config');
const WriteCsv = require('../../writeCsv/writeCsvObject');
const UnmappedHelpers = require('./helper');
const { SuspenseHelpers } = require('../../calculation/helpers');

const Period = require('../../../models/period');
const Client = require('../../../models/client');
const SalesFile = require('../../../models/salesFile');
const GoogleStorage = require('../../../controllers/googleStorage');

const UnmappedSalesReport = this;

/**
 * Create the Unmapped Sales Report
 *
 * @param {Object} params - Params object
 * @param {string} params.reportId - ReportId
 * @param {import('@curveroyaltysystems/platform-shared-utils').BigQuery} params.bigQuery - BigQuery instance
 * @param {Period} params.period - Period document
 * @param {Client} params.client - Client document
 * @param {import('../../writeCsv/writeCsvObject')} params.writeCsv - WriteCsv instance
 * @param {Array} params.template - Template array
 * @param {Boolean} params.periodFile - set to true if this is a report to be attached to a period
 *
 * @throws {Error} - If no salesFiles are found, or no statements are found, or if no Catalogue is found, or if no Contracts are found
 * @returns {Promise<void>}
 */
UnmappedSalesReport.createReport = async ({ reportId, bigQuery, period, client, writeCsv, template, periodFile, excludedSalesFiles, logKey }) => {
  logger.info(`${reportId} | ${logKey} | Loading Sales Files`);
  const salesFileIds = excludedSalesFiles?.length ? period.salesFilesIds.filter((id) => !excludedSalesFiles.includes(id)) : period.salesFilesIds;

  const salesFiles = await SalesFile
    .find({ _id: { $in: salesFileIds } })
    .select('_id partitionNo')
    .lean()
    .catch(logger.error);
  if (!salesFiles?.length) {
    logger.info(`${reportId} | ${logKey} | No Sales Files found`);
    if (!(client.features?.suspense && period.resolvedGroupIds.length)) {
      return;
    }
  }

  logger.info(`${reportId} | ${logKey} | Loading Catalogue`);
  const { contracts, catalogue } = await Catalogue.loadCatalogue({ logKey, clientId: client._id.toString(), period, periodFile });

  const filename = `${bigQuery.datasetName}-${moment().format('x')}-export-`;
  const gsPath = `gs://${BUCKET_NAME}/${filename}*.avro`;

  // Create Sales Lines filter table for for suspense / resolved sales groups filtering when building main filter
  await SuspenseHelpers.createSalesLinesFilterTable({ client, period, bigQuery, processType: 'UnmappedSalesReport' });

  const query = await UnmappedHelpers.buildQuery({ salesFiles, period, bigQuery, template, gsPath, client, excludedSalesFiles });

  logger.info(`${reportId} | ${logKey} | Running Query on BigQuery`);
  console.time(`${reportId} | ${logKey} | Query Time`);
  await UnmappedHelpers.queryJob({ bigQuery, query, reportId });
  console.timeEnd(`${reportId} | ${logKey} | Query Time`);

  // Delete Sales Lines filter table
  await SuspenseHelpers.deleteSalesLinesFilterTable({ client, period, bigQuery, processType: 'UnmappedSalesReport' });

  const storage = new GoogleStorage(BUCKET_NAME);
  const files = await storage.getFilteredFiles({ key: filename });
  if (!files?.length) {
    logger.info(`${reportId} | ${logKey} | No files found from Query`);
    return;
  }

  logger.debug(`${files.length} files to process`);

  const batches = chunk(files, CONCURRENY_LIMIT); // 20 files per batch

  const fileCount = files.length;

  logger.info(`${reportId} | ${logKey} | Processing ${files.length} batches`);
  for (const batch of batches) {
    const promises = batch.map((file) => Process.processBatch({
      client,
      file,
      template,
      writeCsv,
      reportId,
      catalogue,
      contracts,
      fileCount,
      periodFile,
    }));
    await Promise.all(promises);
  }
};

/**
 * Run the Unmapped Sales Report
 *
 * @param {import('../../../models/report')} report - Report document
 * .. extended with
 * @param {Boolean} report.periodFile - set to true if this is a report to be attached to a period
 *
 * @throws {Error} - If clientId is missing, or reportId is missing, or no period is found, or no client is found
 * @returns {Promise<string>} - Local file path
 *
 * @example
 * const report = await Report.findById(reportId);
 * const file = await UnmappedSalesReport.run(report);
 * console.log(file); 'app/processor/tmp/Unreported Sales 1234567890.csv'
 */
UnmappedSalesReport.run = async (report) => {
  const { _id, filters, clientId, periodFile } = report;

  if (!clientId) throw new Error('ClientId is missing from report document');

  if (!_id) throw new Error('No ReportId parameter was passed');
  const reportId = _id.toString();

  logger.info(`${reportId} | ${logKey} | Starting Script`);

  const periodId = filters?.[0]?.period; // Get Params from filter
  if (!periodId) throw new Error('No PeriodId parameter was passed');

  const period = await Period.findById(periodId, 'salesFilesIds resolvedGroupSalesFileIds resolvedGroupIds resolvedGroupSalesPartitionNos accountingPeriodType year accountingPeriod').catch(logger.error);
  if (!period) throw new Error(`No Period found: ${periodId}`);

  const clientSelect = 'name clientType bigQueryDataset bigQueryBackupsDataset bigQuerySalesTable bigQueryPeriodSales bigQueryAccountingPeriodSales bigQueryPeriodCosts features';
  const client = await Client.findById(clientId, clientSelect).catch(logger.error);
  if (!client) throw new Error(`No Client found: ${clientId}`);

  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

  // Loading Standard Unreported Template used in main period
  const template = client.clientType === 'Publisher'
    ? config.exportTemplates.unreportedPublishing
    : config.exportTemplates.unreportedReport;

  const timestamp = moment().format('X');
  const file = `Unreported Sales ${client._id.toString()} ${timestamp}.csv`;
  const outputLocation = `${appRootDir}/tmp/${file}`;
  const headers = periodFile ? template.map((column) => column.header) : ['Unreported Contract ID', 'Unreported Contract Name'].concat(template.map((column) => column.header));

  const writeCsv = new WriteCsv({ headers, outputLocation });
  await UnmappedSalesReport.createReport({
    logKey,
    reportId,
    bigQuery,
    period,
    client,
    writeCsv,
    template,
    periodFile,
    excludedSalesFiles: filters?.[0]?.excludedSalesFiles,
  });

  logger.info(`${reportId} | ${logKey} | Writing CSV`);
  await UnmappedHelpers.write(writeCsv);

  return file;
};

module.exports = UnmappedSalesReport;
