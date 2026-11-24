const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const csv = require('csv-parser');
const { eachSeries } = require('async');

const { downloadFileFromS3 } = require('./s3Downloader');
const Transaction = require('../../../models/transaction');

/**
 * Process an array of transaction files
 * @param {Object} filesByType - Object with file types as keys and arrays of file paths as values
 * @param {string} periodId - The ID of the period
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when all files have been processed
 */
const triggerImportTransactions = async (transactionFiles, clientId, contractMappings) => {
  logger.info(`DMP Period Ingest: Processing ${transactionFiles.length} transaction files`);

  if (!transactionFiles || !Array.isArray(transactionFiles) || transactionFiles.length === 0) {
    logger.info('DMP Period Ingest: No transaction files to process');
    return;
  }

  // Process files in series
  await eachSeries(transactionFiles, async (file) => {
    await processFile(file, clientId, contractMappings);
  });

  logger.info(`DMP Period Ingest: Completed processing ${transactionFiles.length} transaction files`);
};

/**
 * Process a single transaction file
 * @param {string} file - The S3 key of the file to process
 * @param {string} clientId - The ID of the client
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when the file has been processed
 */
const processFile = async (file, clientId, contractMappings) => {
  logger.info(`DMP Period Ingest: Importing Transactions ${file}`);
  let tmpFilePath;
  try {
    tmpFilePath = await downloadFileFromS3(file);

    logger.info(`DMP Period Ingest: Downloaded: ${file} to ${tmpFilePath}`);

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(tmpFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    logger.info(`DMP Period Ingest: Transactions: Read Items ${results.length}`);

    // Bulk upsert transactions
    const bulkOps = results
      .filter((result) => result.type)
      .map((result) => {
        let { contractId, name, amount, type, date } = result;
        if (!name) name = type;
        const mappedContractId = mapContractId(contractId, contractMappings);

        return {
          updateOne: {
            filter: {
              clientId,
              contractId: mappedContractId,
              name,
              amount,
              type,
              date,
              userCreated: false,
            },
            update: {
              name,
              clientId,
              contractId: mappedContractId,
              amount,
              type,
              date,
              userCreated: false,
            },
            upsert: true,
          },
        };
      });

    if (bulkOps.length > 0) {
      await Transaction.bulkWrite(bulkOps, { ordered: false });
    }

    // Clean up the temporary file
    fs.unlinkSync(tmpFilePath);
    logger.info('DMP Period Ingest: COMPLETE TRANSACTION FILE');
  } catch (error) {
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
    throw error;
  }
};

/**
 * Map contract foreign ID to contract ID
 * @param {string} foreignId - The foreign ID of the contract
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {string} - The contract ID
 */
const mapContractId = (foreignId, contractMappings) => contractMappings[foreignId];

module.exports = {
  triggerImportTransactions,
};
