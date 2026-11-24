const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const csv = require('csv-parser');
const { eachLimit, eachSeries } = require('async');

const { downloadFileFromS3 } = require('./s3Downloader');
const Period = require('../../../models/period');
const Work = require('../../../models/work');

/**
 * Process an array of work files
 * @param {Object} filesByType - Object with file types as keys and arrays of file paths as values
 * @param {string} periodId - The ID of the period
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {Promise<Object>} - A promise that resolves to the work mappings when all files have been processed
 */
const triggerImportWorks = async (worksFiles, clientId, contractMappings, periodId) => {
  logger.info(`DMP Period Ingest: Processing ${worksFiles.length} work files`);

  if (!worksFiles || !Array.isArray(worksFiles) || worksFiles.length === 0) {
    logger.info('DMP Period Ingest: No work files to process');
    return {};
  }

  let count = 0;

  // Process files in series
  await eachSeries(worksFiles, async (file) => {
    count += 1;
    await Period.findByIdAndUpdate(periodId, {
      $set: {
        calculationStatus: `DMP Period Ingest: Importing works Data: ${count}/${worksFiles.length} files: (Last file - ${file})`,
      },
    });
    await processFile(file, clientId, contractMappings);
  });

  logger.info(`DMP Period Ingest: Completed processing ${worksFiles.length} work files`);

  // Get work mappings after processing all files
  const works = await Work.find({ clientId }, '_id foreignId').lean();
  const workMappings = {};
  for (const work of works) {
    if (work.foreignId) workMappings[work.foreignId] = work._id.toString();
  }

  return workMappings;
};

/**
 * Process a single work file
 * @param {string} file - The S3 key of the file to process
 * @param {string} clientId - The ID of the client
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when the file has been processed
 */
const processFile = async (file, clientId, contractMappings) => {
  let tmpFilePath;
  logger.info(`DMP Period Ingest: Importing Works ${file}`);

  try {
    const tmpFilePath = await downloadFileFromS3(file);

    logger.info(`DMP Period Ingest: Downloaded: ${file} to ${tmpFilePath}`);

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(tmpFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    logger.info(`DMP Period Ingest: Works: Read Items ${results.length}`);
    // Group works and their contracts
    const outputs = {};
    for (const result of results) {
      const id = result[Object.keys(result)[0]];
      if (outputs[id]) {
        outputs[id].contracts = outputs[id].contracts || [];
        outputs[id].contracts.push({ contractId: result.contractId, share: result.share });
      } else {
        outputs[id] = result;
        outputs[id].contracts = [{ contractId: result.contractId, share: result.share }];
      }
    }

    let count = 0;
    await eachLimit(Object.values(outputs), 10, async (result) => {
      count += 1;
      logger.debug(`PROCESSING ROW: ${count}`);
      await ingestItem(clientId, result, contractMappings);
    });

    // Clean up the temporary file
    fs.unlinkSync(tmpFilePath);
    logger.info('DMP Period Ingest: COMPLETE WORK FILE');
  } catch (error) {
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
    }
    throw error;
  }
};

/**
 * Ingest a single work item
 * @param {string} clientId - The ID of the client
 * @param {Object} result - The work data
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when the item has been ingested
 */
const ingestItem = async (clientId, result, contractMappings) => {
  const id = String(result[Object.keys(result)[0]]).trim();
  const { title, composer } = result;
  if (id && title) {
    logger.debug(`Updating Work with clientId: ${clientId}, foreignId: ${id}`);
    let existingWork = await Work.findOne({ clientId, foreignId: id }).catch((err) => {
      logger.error(`DMP Period Ingest: Error finding work: ${id}`, err);
      throw err;
    });

    if (!existingWork) {
      existingWork = new Work({ clientId, foreignId: id, title, composer });
    }

    result.contracts.forEach((contract) => {
      const mappedContractId = mapContractId(contract.contractId, contractMappings);
      let contractAlreadyExists = false;
      existingWork.salesReturnsRights.forEach((right) => {
        if (right.contractId === mappedContractId) {
          contractAlreadyExists = true;
        }
      });
      if (!contractAlreadyExists) {
        existingWork.salesReturnsRights.push({ contractId: mappedContractId, percentage: contract.share, displayPercentage: contract.share });
        existingWork.salesReturnsRightsDisplay = existingWork.salesReturnsRights;
      }
    });

    await existingWork.save().catch((err) => {
      logger.error(`DMP Period Ingest: Error saving work: ${id}`, err);
      throw err;
    });
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
  triggerImportWorks,
};
