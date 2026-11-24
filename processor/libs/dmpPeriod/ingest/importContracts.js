const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const csv = require('csv-parser');
const { eachLimit } = require('async');

const { downloadFileFromS3 } = require('./s3Downloader');
const Contract = require('../../../models/contract');

/**
 * Process an array of contract files
 * @param {Object} filesByType - Object with file types as keys and arrays of file paths as values
 * @param {string} periodId - The ID of the period
 * @param {Object} payeeMappings - The payee mappings from the previous step
 * @returns {Promise<Object>} - A promise that resolves to the contract mappings
 */
const triggerImportContracts = async (contractFiles, clientId, payeeMappings) => {
  logger.info(`DMP Period Ingest: Processing ${contractFiles.length} contract files`);

  if (!contractFiles || !Array.isArray(contractFiles) || contractFiles.length === 0) {
    logger.info('DMP Period Ingest: No contract files to process');
    return {};
  }

  // Process files in parallel with a limit of 4 at a time
  await eachLimit(contractFiles, 4, async (file) => {
    await processFile(file, clientId, payeeMappings);
  });

  const contractMappings = {};
  const contracts = await Contract.find({ clientId }).select('_id foreignId').lean();
  for (const contract of contracts) {
    contractMappings[contract.foreignId] = contract._id.toString();
  }

  logger.info(`DMP Period Ingest: Completed processing ${contractFiles.length} contract files`);
  return contractMappings;
};

/**
 * Process a single contract file
 * @param {string} file - The S3 key of the file to process
 * @param {string} clientId - The ID of the client
 * @param {Object} payeeMappings - The payee mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when the file has been processed
 */
const processFile = async (file, clientId, payeeMappings) => {
  logger.info(`DMP Period Ingest: Importing Contracts ${file}`);
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

    logger.info(`DMP Period Ingest: Contracts: Read Items ${results.length}`);

    // Bulk upsert contracts
    const bulkOps = results
      .filter((result) => {
        const id = result[Object.keys(result)[0]];
        const { name } = result;
        return id && name;
      })
      .map((result) => {
        const id = result[Object.keys(result)[0]];
        const { payeeId, name, accountingPeriod, currency, projectId, notes } = result;
        const mappedPayeeId = mapPayeeId(payeeId, payeeMappings);
        return {
          updateOne: {
            filter: { clientId, foreignId: id },
            update: {
              name,
              foreignId: id,
              clientId,
              payees: [{ payeeId: mappedPayeeId, percentage: 100 }],
              accountingPeriod,
              currency,
              projectId,
              notes,
              statementDesign: 'Combined',
            },
            upsert: true,
          },
        };
      });

    if (bulkOps.length > 0) {
      await Contract.bulkWrite(bulkOps, { ordered: false });
    }

    // Clean up the temporary file
    fs.unlinkSync(tmpFilePath);
  } catch (error) {
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
    throw error;
  }
};

/**
 * Map payee foreign ID to payee ID
 * @param {string} foreignId - The foreign ID of the payee
 * @param {Object} payeeMappings - The payee mappings from the previous step
 * @returns {string} - The payee ID
 */
const mapPayeeId = (foreignId, payeeMappings) => payeeMappings[foreignId];

module.exports = {
  triggerImportContracts,
};
