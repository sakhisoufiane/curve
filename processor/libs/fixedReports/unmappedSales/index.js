const moment = require('moment');
const { eachLimit } = require('async');
const appRootDir = require('app-root-dir').get();
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');

const config = require('../../../config.json');
const WriteCsv = require('../../writeCsv/writeCsvObject');
const UnreportedSalesReportHelpers = require('./helpers');

const UnreportedSalesReport = this;

const Client = require('../../../models/client');
const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const SalesFile = require('../../../models/salesFile');

/**
 * Build SQL query for Big Query
 * @returns {Object} - Return Parameter object and SQL Query
 */
UnreportedSalesReport.buildQuery = async ({ period, catalogue, contract, bigQuery, template, partitionNos }) => {
  // Build Catalogue Query using catalogue above
  const { params, whereClause } = UnreportedSalesReportHelpers.buildWhereClause({ catalogue, contract, period, partitionNos });

  const select = template.map((column) => column.field);

  // Final build of SQL query, with catalogue data
  const query = `
    SELECT
      STRING_AGG(Output.contractId, ', ') as contractIds,
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Output.salesLineId
    FROM
      \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
    LEFT OUTER JOIN
      \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output
    ON
      (Output.salesLineId = Input.id)
    WHERE
      ${whereClause}
    GROUP BY
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Output.salesLineId
    LIMIT
      100000000;
  `;

  return { query, params };
};

/**
 * Builds Query, Stream Data and Writes/Creates CSV Report
 *
 * @param {Object} Contract, Period, Client, writeCsv, Template - Parameters
 */
UnreportedSalesReport.runReport = async ({ reportId, bigQuery, period, client, writeCsv, template }) => {
  const query = { clientId: client._id.toString(), accountingPeriod: period.accountingPeriodType, active: true };
  const contracts = await Contract.find(query, '_id clientId name');

  const salesFiles = await SalesFile.find({ _id: { $in: period.salesFilesIds } }, '_id partitionNo');

  // If there are no contracts, we should still return an empty csv file back to the user, otherwise the user won't be aware of any error with their setup
  if (contracts?.length > 0 && salesFiles?.length > 0) {
    logger.info(`${reportId} | Scanning ${contracts.length} for PeriodID: ${period._id.toString()}`);

    const partitionNos = [...new Set(salesFiles.map((salesFile) => salesFile.partitionNo))];

    let count = 0;
    await eachLimit(contracts, 10, async (contract) => {
      logger.info(`${reportId} | Fetching Data | Contract: ${contract._id.toString()} - ${contract.name} | ${count} of ${contracts.length}`);

      const catalogue = await UnreportedSalesReportHelpers.getCatalogue({ contract, clientId: client._id.toString() });

      // No need to continue the process for a contract with no catalogue
      if (!catalogue.releaseIds.length && !catalogue.trackIds.length && !catalogue.workIds.length) { return; }

      // Get SQL Query
      const query = await UnreportedSalesReport.buildQuery({ contract, catalogue, bigQuery, template, period, partitionNos });

      // Stream Data to CSV per contract
      logger.debug(`Running Query | Contract: ${contract._id.toString()} - ${contract.name}`);
      await UnreportedSalesReportHelpers.runQuery({ reportId, bigQuery, query, contract, writeCsv });

      count += 1;
    });
  }

  // Once all contracts from period have been looped through, finish the writing of the csv file
  logger.info(`${reportId} | Unmapped Sales Report | Writing File...`);
  await UnreportedSalesReportHelpers.write(writeCsv);
};

/**
 * Main Function to initialise report script
 *
 * @param {Object} params - { periodId, clientId }
 * @returns {String} - Return Report filePath for S3
 */
const unreportedSalesReport = {
  run: async (report) => {
    const { _id, filters } = report;

    const reportId = _id.toString();

    logger.info(`${reportId} | Unmapped Sales Report | Starting Script`);

    const periodId = filters?.[0]?.period; // Get Params from filter
    if (!periodId) throw new Error('No PeriodId parameter was passed');

    // Prepare params
    const period = await Period.findById(periodId, 'salesFilesIds accountingPeriodType');
    if (!period) throw new Error(`No Period found: ${periodId}`);

    const clientSelect = 'name clientType bigQueryDataset bigQueryBackupsDataset bigQuerySalesTable bigQueryPeriodSales bigQueryAccountingPeriodSales bigQueryPeriodCosts';
    const client = await Client.findById(report.clientId, clientSelect);
    if (!client) throw new Error(`No Client found: ${report.clientId}`);

    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));

    // Loading Standard Unreported Template used in main period
    const template = client.clientType === 'Publisher'
      ? config.exportTemplates.unreportedPublishing
      : config.exportTemplates.unreportedReport;

    // Init CSV Writer
    const timestamp = moment().format('X');
    const file = `Unreported Sales ${client._id.toString()} ${timestamp}.csv`;
    const outputLocation = `${appRootDir}/tmp/${file}`;
    const headers = ['Contract ID', 'Contract Name'].concat(template.map((column) => column.header));

    const writeCsv = new WriteCsv({ headers, outputLocation });

    // Main
    await UnreportedSalesReport.runReport({ reportId, bigQuery, period, client, writeCsv, template });
    return file;
  },
};

module.exports = unreportedSalesReport;
