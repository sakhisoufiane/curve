const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const csv = require('csv-parser');
const { eachLimit } = require('async');

const { downloadFileFromS3 } = require('./s3Downloader');
const Payee = require('../../../models/payee');

/**
 * Process an array of payee files
 * @param {Object} filesByType - Object with file types as keys and arrays of file paths as values
 * @param {string} periodId - The ID of the period
 * @returns {Promise<Object>} - A promise that resolves to the payee mappings
 */
const triggerImportPayees = async (payeeFiles, clientId) => {
  logger.info(`DMP Period Ingest: Processing ${payeeFiles.length} payee files`);

  if (!payeeFiles || !Array.isArray(payeeFiles) || payeeFiles.length === 0) {
    logger.info('DMP Period Ingest: No payee files to process');
    return {};
  }

  // Process files in parallel with a limit of 4 at a time
  await eachLimit(payeeFiles, 4, async (file) => {
    await processFile(file, clientId);
  });

  const payeeMappings = {};
  const payees = await Payee.find({ clientId }).select('_id foreignId').lean();

  for (const payee of payees) {
    payeeMappings[payee.foreignId] = payee._id;
  }

  logger.info(`DMP Period Ingest: Completed processing ${payeeFiles.length} payee files`);
  return payeeMappings;
};

/**
 * Process a single payee file
 * @param {string} file - The S3 key of the file to process
 * @param {string} clientId - The ID of the client
 * @returns {Promise<void>} - A promise that resolves when the file has been processed
 */
const processFile = async (file, clientId) => {
  let tmpFilePath;
  try {
    logger.info(`DMP Period Ingest: Importing Payees ${file}`);
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

    logger.info(`DMP Period Ingest: Payees: Read Items ${results.length}`);

    // Bulk upsert payees
    const bulkOps = results
      .filter((result) => {
        const id = result[Object.keys(result)[0]];
        const { name } = result;
        return id && name;
      })
      .map((result) => {
        const id = result[Object.keys(result)[0]];
        const { name } = result;
        return {
          updateOne: {
            filter: { clientId, foreignId: id },
            update: { clientId, name, foreignId: id },
            upsert: true,
          },
        };
      });

    if (bulkOps.length > 0) {
      await Payee.bulkWrite(bulkOps, { ordered: false });
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

module.exports = {
  triggerImportPayees,
};
