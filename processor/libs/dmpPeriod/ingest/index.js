const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { triggerImportPayees } = require('./importPayees');
const { triggerImportContracts } = require('./importContracts');
const { triggerImportTransactions } = require('./importTransactions');
const { triggerImportWorks } = require('./importWorks');
const { triggerImportSalesData } = require('./importSalesData');
const { getFiles } = require('./s3Downloader');

const Contract = require('../../../models/contract');
const Work = require('../../../models/work');
const Period = require('../../../models/period');

/**
 * Orchestrates the full DMP period import process in five steps, passing the mappings between steps and updating the period status:
 * 1. Import Payees
 * 2. Import Contracts
 * 3. Import Transactions
 * 4. Import Works
 * 5. Import Sales Data
 *
 * @async
 * @param {Object} filesByType - Object containing arrays of file paths by type (payees, contracts, transactions, works, royalties)
 * @param {string} periodId - The ID of the period
 * @param {string} clientId - The ID of the client
 * @returns {Promise<Object>} - Resolves with mapping objects for payees, contracts, and works
 * @throws {Error} - Throws if any import step fails
 */
const orchestrateImport = async (filesByType, periodId, clientId) => {
  logger.info(`${periodId} DMP Period Ingest: Starting orchestrated import process`);

  logger.info(`${periodId} DMP Period Ingest: Step 1 - Importing Payees`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: Importing Payees' },
  });
  const payeeMappings = await triggerImportPayees(filesByType.payees, clientId)
    .catch((e) => { throw new Error(`Payee Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Step 1 - Payees Import Complete`);

  logger.info(`${periodId} DMP Period Ingest: Step 2 - Importing Contracts`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: Importing Contracts' },
  });
  const contractMappings = await triggerImportContracts(filesByType.contracts, clientId, payeeMappings)
    .catch((e) => { throw new Error(`Contract Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Step 2 - Contracts Import Complete`);

  logger.info(`${periodId} DMP Period Ingest: Step 3 - Importing Transactions`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: Importing Transactions' },
  });
  await triggerImportTransactions(filesByType.transactions, clientId, contractMappings)
    .catch((e) => { throw new Error(`Transactions Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Step 3 - Transactions Import Complete`);

  logger.info(`${periodId} DMP Period Ingest: Step 4 - Importing Works`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: Importing Works' },
  });
  const workMappings = await triggerImportWorks(filesByType.works, clientId, contractMappings, periodId)
    .catch((e) => { throw new Error(`Works Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Step 4 - Works Import Complete`);

  logger.info(`${periodId} DMP Period Ingest: Step 5 - Importing Sales Data`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: Importing Sales Data' },
  });
  await triggerImportSalesData(filesByType.royalties, periodId, clientId, contractMappings, workMappings)
    .catch((e) => { throw new Error(`Sales Data Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Step 5 - Sales Data Import Complete`);

  logger.info(`${periodId} DMP Period Ingest: All import steps completed successfully`);

  return { payeeMappings, contractMappings, workMappings };
};

/**
 * Handles a partial ingest for a DMP period, importing only transactions and sales data.
 *
 * @async
 * @param {Object} filesByType - Object containing arrays of file paths by type (transactions, royalties)
 * @param {string} periodId - The ID of the period
 * @param {string} clientId - The ID of the client
 * @returns {Promise<void>}
 * @throws {Error} - Throws if any import step fails
 */
const processPartialIngest = async (filesByType, periodId, clientId) => {
  const contracts = await Contract.find({ clientId }).lean();
  const contractMappings = {};
  for (const contract of contracts) {
    if (contract.foreignId) contractMappings[contract.foreignId] = contract._id.toString();
  }

  const works = await Work.find({ clientId }, '_id foreignId').lean();

  const workMappings = {};
  for (const work of works) {
    if (work.foreignId) workMappings[work.foreignId] = work._id.toString();
  }
  logger.info(`${periodId} DMP Period Ingest: Starting importing transactions (partial)`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: step 1 - Importing Transactions (Partial)' },
  });
  await triggerImportTransactions(filesByType.transactions, clientId, contractMappings)
    .catch((e) => { throw new Error(`Transactions Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Completed importing transactions (partial)`);

  logger.info(`${periodId} DMP Period Ingest: Starting importing sales data (partial)`);
  await Period.findByIdAndUpdate(periodId, {
    $set: { calculationStatus: 'DMP Period Ingest: step 2 - Importing Sales Data (Partial)' },
  });
  await triggerImportSalesData(filesByType.royalties, periodId, clientId, contractMappings, workMappings)
    .catch((e) => { throw new Error(`Sales Data Import failed: ${e}`); });
  logger.info(`${periodId} DMP Period Ingest: Completed importing sales data (partial)`);
};

/**
 * Main entry point for DMP period ingest. Determines whether to run a full or partial ingest.
 *
 * @async
 * @param {string} extractDate - The extraction date string (used for file filtering)
 * @param {string} extractFolder - The S3 folder to extract from
 * @param {string} periodId - The ID of the period
 * @param {boolean} fullReingest - Whether to run a full reingest (true) or partial (false)
 * @param {string} clientId - The ID of the client
 * @returns {Promise<void>}
 * @throws {Error} - Throws if the ingest process fails
 */
const processDmpPeriodIngest = async (extractDate, extractFolder, periodId, fullReingest, clientId) => {
  logger.info(`DMP Period Ingest: Starting ingest process for period ${periodId} with extract date ${extractDate}`);
  logger.info(`DMP Period Ingest: Getting files for period ${periodId} with extract date ${extractDate}`);
  const filesByType = await getFiles(extractFolder, extractDate);

  logger.info(`${periodId} DMP Period Ingest: Sorted files by type: ${JSON.stringify(Object.keys(filesByType).map((key) => `${key}: ${filesByType[key].length}`))}`);

  if (fullReingest) {
    await orchestrateImport(filesByType, periodId, clientId);
  } else {
    await processPartialIngest(filesByType, periodId, clientId);
  }

  logger.info(`DMP Period Ingest: Completed ingest process for period ${periodId}`);
};

module.exports = {
  orchestrateImport,
  processDmpPeriodIngest,
  triggerImportPayees,
  triggerImportContracts,
  triggerImportTransactions,
  triggerImportWorks,
  triggerImportSalesData,
};
