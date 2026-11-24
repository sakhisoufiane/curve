const moment = require('moment');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CalculationHelpers } = require('../../calculation/helpers');

const { logKey } = require('./config');

const UnmappedHelpers = this;

/**
 * Builds the query to run in BigQuery and export JSON files to Google Storage
 *
 * @param {Object} param - The parameters to build the query
 * @param {import('../../../models/salesFile')[]} param.salesFiles - Array of salesFiles
 * @param {import('../../../models/period')} param.period - Period document
 * @param {import('@curveroyaltysystems/platform-shared-utils').BigQuery} param.bigQuery - BigQuery instance
 * @param {Array} param.template - Template array
 * @param {string} param.gsPath - Google Storage path
 *
 *
 * @returns {String} - The query to run in BigQuery
 * @example
 * const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
 * const UnmappedHelpers = require('./helper');
 *
 * // params
 * const salesFiles = { _id: '123', partitionNo: 1 };
 * const period = { _id: '123' };
 * const bigQuery = new BigQuery();
 * const template = [{ field: 'fieldName', name: 'Field Name' }];
 * const gsPath = 'gs://my-bucket-name/my-file.json';
 *
 * const query = UnmappedHelpers.buildQuery({ salesFiles, period, bigQuery, template, statementPartitionNos, gsPath });
 * console.log(query);
 * // OUTPUT: EXPORT DATA OPTIONS( uri='gs://my-bucket-name/my-file.json', overwrite=true, format='JSON') AS SELECT STRING_AGG(Output.contractId, ', ') AS contractIds, fieldName AS 'Field Name', Output.salesLineId FROM `datasetName.inputTable` Input LEFT OUTER JOIN `datasetName.outputTable` Output ON (Output.salesLineId = Input.id) WHERE Input.partitionNo IN (1) AND Input.salesFileId IN ('123') AND status = 'Complete' GROUP BY fieldName, Output.salesLineId
 */
UnmappedHelpers.buildQuery = async ({ salesFiles, period, bigQuery, template, gsPath, client, excludedSalesFiles }) => {
  const FilteredInputTableKey = 'FilteredInput';
  const FilteredOutputTableKey = 'FilteredOutput';

  const select = template.map((column) => column.field);

  let salesPartitionNos = salesFiles.map((sf) => sf.partitionNo);
  if (client.features?.suspense) {
    // Merge resolvedGroupSalesPartitionNos into salesPartitionNos ONLY when feature flag is set
    salesPartitionNos = [...new Set([...salesPartitionNos, ...period.resolvedGroupSalesPartitionNos])];
  }
  const salesFileIds = salesFiles.map((sf) => sf._id.toString());
  const queryObj = await CalculationHelpers.buildMainQuery({ client, period, bigQuery, salesFileIds, processType: 'UnmappedSalesReport' }).catch((buildQueryErr) => {
    logger.error(`${period._id} Error building main query in UnmappedHelpers.buildQuery`, buildQueryErr);
    throw new Error(buildQueryErr);
  });
  queryObj.status = 'Complete';

  // Check if there are any Sales Files or Resolved Group Sales Files with no partition number
  if (!salesPartitionNos.some((pt) => !pt)) {
    queryObj.partitionNo = { $in: salesPartitionNos };
  }

  const filteredInputTable = `
    WITH ${FilteredInputTableKey} AS (
      SELECT *
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\`
      WHERE ${bigQuery.filterFromObject(queryObj)}
    ),
  `;

  let outputSalesFilesIds = salesFiles.map((sf) => sf._id.toString());
  if (client?.features?.suspense && period.resolvedGroupSalesFileIds?.length) {
    // outputSalesFilesIds already have excludedSalesFiles removed, so only need to filter out from resolvedGroupSalesFileIds
    const resolvedGroupSalesFileIdsFiltered = excludedSalesFiles?.length ? period.resolvedGroupSalesFileIds.filter((id) => !excludedSalesFiles.includes(id)) : period.resolvedGroupSalesFileIds;
    outputSalesFilesIds = [...new Set([...outputSalesFilesIds, ...resolvedGroupSalesFileIdsFiltered])];
  }

  const filteredOutputTable = `
    ${FilteredOutputTableKey} AS (
      SELECT *
      FROM \`${bigQuery.datasetName}.${bigQuery.outputTable}\`
      WHERE salesFileId IN (${outputSalesFilesIds.map((sfId) => `'${sfId}'`).join(', ')})
    )
  `;

  const query = `
    ${filteredInputTable}\n
    ${filteredOutputTable}\n
    SELECT
      STRING_AGG(Output.contractId, ', ') AS contractIds,
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Input.id,
      Output.salesLineId
    FROM ${FilteredInputTableKey} AS Input
    LEFT OUTER JOIN ${FilteredOutputTableKey} AS Output
    ON
      (Output.salesLineId = Input.id)
    GROUP BY
      ${bigQuery.formatJoinColumnsSelect('Input', select)},
      Input.id,
      Output.salesLineId
  `;

  return `
    EXPORT DATA OPTIONS(
      uri='${gsPath}',
      overwrite=true,
      format='AVRO',
      compression='DEFLATE',
      use_avro_logical_types=False
    ) AS ${query}
  `;
};

/**
 * Runs a query in BigQuery, promise wrapper
 * @param {Object} param - The parameters to run the query
 * @param {import('@curveroyaltysystems/platform-shared-utils').BigQuery} param.bigQuery - BigQuery instance
 * @param {string} param.query - The query to run
 * @param {string} param.reportId - The reportId
 *
 * @throws {Error} Throws an error if the query cannot be run
 * @returns {Promise<void>}
 *
 * @example
 * const UnmappedHelpers = require('./helper');
 * const Client = require('../../../models/client');
 * const { BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
 *
 * const client = await Client.findById(clientId);
 * const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
 *
 * const query = 'SELECT * FROM table';
 * const data = await UnmappedHelpers.queryJob({ bigQuery, query, reportId: '826ssdfad21384asd82734g });
 */
UnmappedHelpers.queryJob = ({ bigQuery, query, reportId }) => new Promise((resolve, reject) => {
  logger.info(`${reportId} | ${logKey} | Running Query: ${query}`);

  bigQuery.query(query, (err, response) => {
    if (err) {
      logger.error(`${reportId} | ${logKey} | Error running query: ${err}`);
      reject(err);
    } else {
      logger.info(`${reportId} | ${logKey} | Query ran successfully`, response);
      resolve();
    }
  });
});

UnmappedHelpers.formatDate = (date) => (moment(date).isValid() ? moment(date).format('MM/DD/YYYY') : date);

/**
 * Formats a row for the CSV file
 *
 * @param {Object} param - The parameters to format the row
 * @param {import('../../../model/contract')} param.contract - The contract document
 * @param {Object} param.row - The row data
 * @param {Array} param.template - The template array
 * @param {boolean} param.periodFile - If the file is a period file
 *
 * @returns {Array} - The formatted row
 */
UnmappedHelpers.formatRow = ({ contract, row, template, periodFile }) => {
  delete row.contractIds;
  const fields = template.map(({ field }) => field);
  const salesLine = fields.map((key) => row[key]);

  if (periodFile) return [salesLine];

  const formattedRow = [contract._id.toString(), contract.name].concat(salesLine);
  return [formattedRow];
};

/**
 * Adds a row to the CSV file, Promise Wrapper
 * @param {Object} param - The parameters to add data to the CSV file
 * @param {import('../../writeCsv/writeCsvObject')} param.writeCsv - WriteCsv instance
 * @param {Array} param.sales - Array of sales data to add
 *
 * @throws {Error} Throws an error if the data cannot be added to the CSV file
 * @returns {Promise<void>}
 *
 * @example
 * const UnmappedHelpers = require('./helper');
 * const WriteCsv = require('../../writeCsv/writeCsvObject');
 *
 * const writeCsv = new WriteCsv();
 * await UnmappedHelpers.addToFile({ writeCsv, sales });
 */
UnmappedHelpers.addToFile = ({ writeCsv, sales }) => {
  const promise = new Promise((resolve, reject) => {
    writeCsv.addData(sales, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return promise;
};

/**
 * Writes the CSV file, Promise Wrapper
 * @param {import('../../writeCsv/writeCsvObject')} param.writeCsv - WriteCsv instance
 *
 * @returns {Promise<void>}
 *
 * @example
 * const UnmappedHelpers = require('./helper');
 * const WriteCsv = require('../../writeCsv/writeCsvObject');
 *
 * const writeCsv = new WriteCsv();
 * await UnmappedHelpers.write(writeCsv);
 */
UnmappedHelpers.write = (writeCsv) => {
  const promise = new Promise((resolve, reject) => {
    writeCsv.write((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  return promise;
};

module.exports = UnmappedHelpers;
