/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const avro = require('avsc');

const Helper = require('../helper');
const { logKey, BUCKET_NAME } = require('../config');
const GoogleStorage = require('../../../../controllers/googleStorage');

const Process = this;

/**
 * Get the Catalogue Document for a row
 *
 * @param {Object} param - The parameters to get the Catalogue Document
 * @param {import('../../../../models/client')} param.client - The client object
 * @param {object} param.row - The row to get the Catalogue Document for
 * @param {object} param.catalogue - Catalogue object
 *
 * @returns {object} - The Catalogue Document
 *
 * @example
 * const Catalogue = { Releases: { '234sdf73sdf592sd349b': { name: 'Test' } }, Tracks: {}, Works: {} };
 * const catalogueDocument = getCatalogueDocument({ row, Catalogue });
 */
const getCatalogueDocument = ({ row, catalogue, client }) => {
  const { catType } = row;
  const { Releases, Tracks, Works } = catalogue;

  if (catType === 'Work') return Works[row.workId];
  if (catType === 'Release') return Releases[row.releaseId];
  if (catType === 'Track') return Tracks[row.trackId];
};

/**
 * Process a row from a file export from BigQuery
 * @param {Object} param - The parameters to process the row
 * @param {import('../../../../models/client')} param.client - The client object
 * @param {object} param.row - The row to process
 * @param {object} param.Catalogue - Catalogue object, ALL catalogue items associated with the period
 * @param {object} param.Contracts - Contracts object, ALL contracts associated with the period
 * @param {Array} param.template - Template array
 * @param {import('../../../writeCsv/writeCsvObject')} param.writeCsv - WriteCsv instance
 * @param {string} param.reportId - The reportId
 *
 * @throws {Error} Throws an error if the row cannot be processed
 * @returns {Promise<void>}
 */
Process.processRow = async ({ row, catalogue, contracts, template, writeCsv, reportId, client }) => {
  if (row.saleDate?.value) row.saleDate = Helper.formatDate(row.saleDate.value);
  if (row.transactionDate?.value) row.transactionDate = Helper.formatDate(row.transactionDate.value);

  const contractIds = row.contractIds?.replaceAll(',', '').split(' ') || [];

  // Handle Contract Rows
  if (row.catType === 'Contract') {
    const contract = contracts[row.contractId];
    // Contract is from a different period
    if (!contract) {
      logger.info(`${reportId} | ${logKey} | No Contract found`);
      return;
    }

    // row.contractId should be included in contractIds otherwise report to file
    if (!contractIds.includes(row.contractId)) {
      await Helper.addToFile({
        writeCsv,
        sales: Helper.formatRow({ contract, row, template }),
      });
      return;
    }

    return;
  }

  // Handle CatType Release, Track, Work
  const catalogueDocument = getCatalogueDocument({ row, catalogue, client });
  if (!catalogueDocument) {
    logger.debug(`${reportId} | ${logKey} | No Catalogue Document found`);
    return;
  }

  // Check for Release Specific Rights
  const releaseSpecificIds = catalogueDocument.releaseSpecificSalesReturnsRights?.map(({ releaseId }) => releaseId);
  if (row.catType === 'Track' && releaseSpecificIds?.includes(row.releaseId)) {
    // Check if contract is in release specific rights
    const releaseRights = catalogueDocument.releaseSpecificSalesReturnsRights.find(({ releaseId }) => releaseId === row.releaseId);
    const contract = contracts[releaseRights.contractId];
    if (!contract) return; // Contract is from a different period

    if (!contractIds.includes(releaseRights.contractId)) {
      await Helper.addToFile({
        writeCsv,
        sales: Helper.formatRow({ contract, row, template }),
      });
    }
    return;
  }

  // Check for Sales Return Rights
  const unreportedContractIds = catalogueDocument.salesReturnsRights?.filter((contractId) => !contractIds.includes(contractId));

  // When there are no contracts attached to report, we skip the row.
  // These are lines are considered unreported but show up in the unreported sales files stored against the period.
  // In future, we may just consolidate both in the same report.
  if (!unreportedContractIds?.length) return;

  for (const contractId of unreportedContractIds) {
    const contract = contracts[contractId];
    if (!contract) continue; // Contract is from a differnet period

    await Helper.addToFile({
      writeCsv,
      sales: Helper.formatRow({ contract, row, template }),
    });
  }
};

Process.processPeriodFileRow = async ({ row, catalogue, contracts, template, writeCsv, reportId, client }) => {
  const contractIds = row.contractIds?.replaceAll(',', '').split(' ') || [];
  // Handle CatType Contract
  if (row.catType === 'Contract') {
    // Check if contract is in period
    const contract = contracts[row.contractId];
    if (!contract) {
      logger.info(`${reportId} | ${logKey} | No Contract found`);
      return;
    }

    // Check if the contract from the sales line (row.contractId) has been reported in the contractIds array
    if (!contractIds.includes(row.contractId)) {
      await Helper.addToFile({
        writeCsv,
        sales: Helper.formatRow({ contract, row, template, periodFile: true }),
      });
    }
    return;
  }

  // Handle CatType Release, Track, Work
  const catalogueDocument = getCatalogueDocument({ row, catalogue, client });
  if (!catalogueDocument) return; // Not Part of Period

  // Unreported Period File only cares if the line has been reported at all, not if a particular contract has been reported
  // That functionality is handled in processRow which is from the Fixed Report Unreported Sales
  if (contractIds?.length) return;

  if (row.saleDate?.value) row.saleDate = Helper.formatDate(row.saleDate.value);
  if (row.transactionDate?.value) row.transactionDate = Helper.formatDate(row.transactionDate.value);
  await Helper.addToFile({
    writeCsv,
    sales: Helper.formatRow({ contract: {}, row, template, periodFile: true }),
  });
};

/**
 * Process a batch of rows from a file from BigQuery
 * @param {Object} param - The parameters to process the batch
 * @param {import('../../../../models/client')} param.client - The client object
 * @param {object} param.file - The file to process
 * @param {string} param.reportId - The reportId
 * @param {import('../../../writeCsv/writeCsvObject')} param.writeCsv - WriteCsv instance
 * @param {object} param.Catalogue - Catalogue object
 * @param {object} param.Contracts - Contracts object
 * @param {Array} param.template - Template array
 *
 * @throws {Error} Throws an error if the file cannot be downloaded
 * @returns {Promise<void>}
 */
Process.processBatch = async ({ client, file, reportId, writeCsv, catalogue, contracts, template, periodFile, fileCount }) => {
  logger.info(`${reportId} - Processing file: ${file.name} of ${fileCount} files`);

  // Configure destination directory
  const destination = `${appRootDir}/tmp/${file.name}`;
  // Download file
  const storage = new GoogleStorage(BUCKET_NAME);
  await storage.downloadFile({ file: file.name, destination });
  // Process file line by line
  const decodedStream = avro.createFileDecoder(destination);
  for await (const row of decodedStream) {
    if (periodFile) {
      await Process.processPeriodFileRow({ row, catalogue, contracts, template, writeCsv, reportId, client });
    } else {
      await Process.processRow({ row, catalogue, contracts, template, writeCsv, reportId, client });
    }
  }
  // Remove file.
  fs.unlinkSync(destination);
};

module.exports = Process;
