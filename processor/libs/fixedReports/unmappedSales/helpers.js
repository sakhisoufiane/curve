const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');

const Work = require('../../../models/work');
const Track = require('../../../models/track');
const Release = require('../../../models/release');

const UnreportedSalesReportHelpers = this;

/**
 * Build Where Clause as part of the main SQL query used to load data.
 * @returns {Object} - Return Parameter object and Where Clause Query (String)
 */
UnreportedSalesReportHelpers.buildWhereClause = ({ catalogue, contract, period, partitionNos }) => {
  const conditions = [];
  const params = { contractIds: [contract._id.toString()] };

  conditions.push('(Output.salesLineId IS NULL OR Output.salesLineId IS NOT NULL)');

  // Build array of SQL Strings for each Cat Type
  const catalogueConditions = [];
  if (catalogue.releaseIds.length > 0) {
    params.releaseIds = catalogue.releaseIds;
    catalogueConditions.push("(Input.releaseId IN UNNEST(@releaseIds) AND (Input.catType = 'Release'))");
  }

  if (catalogue.trackIds.length > 0) {
    params.trackIds = catalogue.trackIds;
    catalogueConditions.push("(Input.trackId IN UNNEST(@trackIds) AND Input.catType = 'Track')");
  }

  if (catalogue.workIds.length > 0) {
    params.workIds = catalogue.workIds;
    catalogueConditions.push("(Input.workId IN UNNEST(@workIds) AND (Input.catType = 'Work'))");
  }

  // Add current period sales file ids, to only target the current period parameter
  if (period.salesFilesIds.length > 0 && catalogueConditions.length > 0) {
    conditions.push('Input.salesFileId IN UNNEST(@salesFileIds)');
    params.salesFileIds = period.salesFilesIds;
  }

  if (catalogueConditions.length > 0) {
    const catalogueClause = catalogueConditions.join(' OR ');
    conditions.push(`(${catalogueClause})`);
  }

  // Add ending String to Where Clause array
  conditions.push("status = 'Complete'");

  if (partitionNos?.length) {
    params.partitionNos = partitionNos;
    conditions.push('Input.partitionNo IN UNNEST(@partitionNos)');
  }

  // Join query array into a string
  const whereClause = conditions.join(' AND ');
  return { params, whereClause };
};

/**
 * Loads Catalogue For a Contract
 * @returns {Object} - Returns containing contract catalogue ids
 */
UnreportedSalesReportHelpers.getCatalogue = async ({ contract, clientId }) => {
  // Get catalogue associated with the current contract
  // We only need to target salesReturnRights as we're looking for unreported sales
  const query = { clientId, 'salesReturnsRights.contractId': contract._id.toString() };

  const releases = await Release.find(query, '_id');
  if (!releases.length) { logger.info(`No Releases found | ContractId: ${contract._id.toString()}`); }

  const releaseIds = releases?.length > 0 ? releases.map((release) => release._id.toString()) : [];

  const tracks = await Track.find(query, '_id');
  if (!tracks.length) { logger.info(`No Tracks found | ContractId: ${contract._id.toString()}`); }

  const trackIds = tracks?.length > 0 ? tracks.map((track) => track._id.toString()) : [];

  const works = await Work.find(query, '_id');
  if (!works.length) { logger.info(`No Works found | ContractId: ${contract._id.toString()}`); }

  const workIds = works?.length > 0 ? works.map((work) => work._id.toString()) : [];

  return { releaseIds, trackIds, workIds };
};

/**
 * Streams Data From Big Query to CSV file
 */
UnreportedSalesReportHelpers.runQuery = ({ reportId, bigQuery, query, contract, writeCsv, retryCount = 0 }) => {
  let count = 0;

  logger.debug(query);
  return new Promise((resolve, reject) => {
    bigQuery.client.createQueryStream(query)
      .on('error', (err) => {
        logger.error(err);

        if (retryCount < 3) {
          logger.info(`${reportId} | ${contract._id.toString()} - ${contract.name}  | Retrying Stream...`);
          retryCount += 1;
          setTimeout(async () => {
            // Retry
            await UnreportedSalesReportHelpers.runQuery({ reportId, bigQuery, query, contract, writeCsv, retryCount });
          }, 2000);
        } else {
          reject(err);
        }
      })
      .on('data', async (row) => {
        if (!row) { return; }

        if (count === 5000) {
          logger.info(`${reportId} | ${contract._id.toString()} - ${contract.name} | Streamed ${count}`);
          count = 0;
        }

        // format BQ dates for CSV
        if (row.saleDate && row.saleDate.value) {
          const saleDateValue = row.saleDate.value;
          row.saleDate = UnreportedSalesReportHelpers.formatDate(saleDateValue);
        }
        if (row.transactionDate && row.transactionDate.value) {
          const transactionDateValue = row.transactionDate.value;
          row.transactionDate = UnreportedSalesReportHelpers.formatDate(transactionDateValue);
        }

        const contractIds = row.contractIds?.replaceAll(',', '').split(' ');

        // Lines from the catalogue related to the current contract,
        // but lacking the contract's id in the reportedRows column, will be placed in the unmappedLine array
        if (!contractIds?.includes(contract._id.toString())) {
          await UnreportedSalesReportHelpers.addToFile({
            writeCsv,
            sales: UnreportedSalesReportHelpers.formatRow({ contract, row }),
          });
        }

        count += 1;
      })
      .on('end', () => {
        logger.info(`${reportId} | Contract ID: ${contract._id} - ${contract.name} | Stream Complete`);
        resolve();
      });
  });
};

/**
 * Formats Big Query Row For CSV
 */
UnreportedSalesReportHelpers.formatRow = ({ contract, row }) => {
  delete row.contractIds;
  const formattedRow = [contract._id.toString(), contract.name].concat(Object.values(row));
  return [formattedRow];
};

/**
 * Formats Big Query Dates For CSV
 */
UnreportedSalesReportHelpers.formatDate = (date) => {
  date = moment(date).isValid() ? moment(date).format('MM/DD/YYYY') : date;
  return date;
};

/**
 * Adds array of arrays to csv
 * @returns {Promise}
 */
UnreportedSalesReportHelpers.addToFile = ({ writeCsv, sales }) => {
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
 * Writes csv file
 * @returns {Promise}
 */
UnreportedSalesReportHelpers.write = (writeCsv) => {
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

module.exports = UnreportedSalesReportHelpers;
