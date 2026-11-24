const fs = require('fs');
const csv = require('csv-parser');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const { eachLimit } = require('async');

const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const Client = require('../../../models/client');
const { downloadFileFromS3 } = require('./s3Downloader');

/**
 * Process an array of sales data files
 * @param {Array<string>} salesDataFiles - Array of S3 keys for sales data files
 * @param {string} periodId - The ID of the period
 * @param {string} clientId - The ID of the client
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @param {Object} workMappings - The work mappings from the previous step
 * @returns {Promise<void>} - A promise that resolves when all files have been processed
 */
const triggerImportSalesData = async (salesDataFiles, periodId, clientId, contractMappings, workMappings) => {
  logger.info(`DMP Period Ingest: Processing ${salesDataFiles.length} sales data files`);
  if (!salesDataFiles || !Array.isArray(salesDataFiles) || salesDataFiles.length === 0) {
    logger.info('DMP Period Ingest: No sales data files to process');
    return;
  }

  let count = 0;

  // Process files in parallel (10 at a time)
  await eachLimit(salesDataFiles, 10, async (file) => {
    await Period.findByIdAndUpdate(periodId, {
      $set: {
        calculationStatus: `DMP Period Ingest: Importing Sales Data: ${count}/${salesDataFiles.length} files: (Last file - ${file})`,
      },
    });
    await processFile(file, clientId, contractMappings, workMappings, periodId);
    count += 1;
    logger.info(`[${count}/${salesDataFiles.length}] Imported ${file}`);
  });
  logger.info(`DMP Period Ingest: Completed processing ${salesDataFiles.length} sales data files`);
};

/**
 * Process a single sales data file
 * @param {string} file - The S3 key of the file to process
 * @param {string} clientId - The ID of the client
 * @param {Object} workMappings - The work mappings from the previous step
 * @param {string} periodId - The ID of the period
 * @returns {Promise<void>} - A promise that resolves when the file has been processed
 */
const processFile = async (file, clientId, contractMappings, workMappings, periodId) => {
  if (!periodId) {
    logger.info(`DMP Period Ingest: Skipping Importing Sales Data ${file}, No Period ID`);
    return;
  }

  logger.info(`DMP Period Ingest: Importing Sales Data ${file}`);
  let tmpFilePath;
  try {
    tmpFilePath = await downloadFileFromS3(file);
    logger.info(`DMP Period Ingest: Downloaded: ${file} to ${tmpFilePath}`);

    const partitionNos = await getPartitionNos(periodId, clientId);
    const client = await Client.findById(clientId).lean();
    if (!client) throw new Error(`DMP Period Ingest: No client found with ID ${clientId}`);

    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    await new Promise((resolve, reject) => {
      bigQuery.setupFile(async () => {
        const allowedFields = bigQuery.outputSchema.filter((item) => item.mode !== 'REPEATED').map((item) => item.name);
        const fieldTypes = Object.fromEntries(bigQuery.outputSchema.map((f) => [f.name, f.type]));

        let count = 0;
        let batch = [];
        const batchSize = 50000;
        let fileCount = 0;

        try {
          for await (const row of fs.createReadStream(tmpFilePath).pipe(csv())) {
            const processed = processRow(row, contractMappings, workMappings, periodId, partitionNos, allowedFields, fieldTypes);
            batch.push(processed);
            count += 1;

            if (batch.length >= batchSize) {
              await writeToBq(batch, bigQuery);
              batch = [];
              fileCount += 1;
              bigQuery.setupFile(() => {});
            }
          }

          if (batch.length > 0) {
            await writeToBq(batch, bigQuery);
            fileCount += 1;
          }

          logger.info(`DMP Period Ingest: Sales Data: Uploaded ${fileCount} batches to BigQuery`);

          logger.info('DMP Period Ingest: Sales Data: Finalising to BigQuery');
          bigQuery.writeFileToDb(bigQuery.outputTable, async (err) => {
            if (err) {
              logger.error(err);
              reject(err);
            } else {
              try {
                await fs.promises.unlink(tmpFilePath);
              } catch {}
              logger.info(`DMP Period Ingest: Sales Data: Finished Importing Sales Data - Total Output ${count}`);
              resolve();
            }
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  } catch (error) {
    if (fs.existsSync(tmpFilePath)) {
      fs.promises.unlink(tmpFilePath).catch(() => {});
    }
    throw error;
  }
};

/**
 * Write data to BigQuery
 * @param {Array} results - The results to write
 * @param {Object} bigQuery - The BigQuery instance
 * @returns {Promise<void>} - A promise that resolves when the data has been written
 */
const writeToBq = (results, bigQuery) => new Promise((resolve, reject) => {
  bigQuery.writeToFile(results, bigQuery.outputTable, (err) => {
    if (err) {
      logger.error(err);
      reject(err);
    } else {
      resolve();
    }
  });
});

/**
 * Process a single row of sales data
 * @param {Object} result - The sales data row
 * @param {Object} contractMappings - The contract mappings from the previous step
 * @param {Object} workMappings - The work mappings from the previous step
 * @param {string} periodId - The ID of the period
 * @param {Object} partitionNos - The partition numbers for contracts
 * @param {Array} allowedFields - The allowed fields for BigQuery
 * @param {Object} fieldTypes - The field types for BigQuery
 * @returns {Object} - The processed row
 */
const processRow = (result, contractMappings, workMappings, periodId, partitionNos, allowedFields, fieldTypes) => {
  result.contractId = contractMappings[result.contractId];
  result.catalogueWorkForeignId = result.workId;
  result.workId = workMappings[result.workId];
  result.periodId = periodId;
  result.contractPartitionNo = parseInt(partitionNos[result.contractId]);
  result.catalogueReleaseLabel = result.sourceId;
  result.catalogueTrackLabel = result.subSourceId;
  return fixOutput(result, allowedFields, fieldTypes);
};

/**
 * Fix output for BigQuery
 * @param {Object} outputLine - The output line to fix
 * @param {Array} allowedFields - The allowed fields for BigQuery
 * @param {Object} fieldTypes - The field types for BigQuery
 * @returns {Object} - The fixed output line
 */
const fixOutput = (outputLine, allowedFields, fieldTypes) => {
  Object.keys(outputLine).forEach((key) => {
    if (!allowedFields.includes(key)) {
      delete outputLine[key];
    } else if (fieldTypes[key] === 'FLOAT' && isNaN(parseFloat(outputLine[key]))) {
      delete outputLine[key];
    } else if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].includes(key) && outputLine[key] && outputLine[key].value) {
      outputLine[key] = outputLine[key].value;
    } else if (fieldTypes[key] === 'DATE') {
      if (String(outputLine[key]).length !== 10) {
        delete outputLine[key];
      }
    } else if (fieldTypes[key] === 'STRING' && (outputLine[key] || outputLine[key] === 0)) {
      outputLine[key] = String(outputLine[key]);
    }
  });

  return outputLine;
};

/**
 * Get partition numbers for contracts
 * @param {string} periodId - The ID of the period
 * @param {string} clientId - The ID of the client
 * @returns {Promise<Object>} - A promise that resolves to the partition numbers
 */
const getPartitionNos = async (periodId, clientId) => {
  const period = await Period.findById(periodId, 'startDate').lean();
  if (!period) {
    throw new Error(`DMP Period Ingest: No period found with ID ${periodId}`);
  }

  const contracts = await Contract.find({ clientId }, 'name').lean();
  const partitionNos = {};

  for (const contract of contracts) {
    partitionNos[contract._id] = generateContractPartitionNo(period, contract);
  }

  return partitionNos;
};

/**
 * Generate contract partition number
 * @param {Object} period - The period object
 * @param {Object} contract - The contract object
 * @returns {number} - The contract partition number
 */
const generateContractPartitionNo = (period, contract) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let partitionNo = 0;

  if (contract.name) {
    const firstLetter = contract.name.toLowerCase().charAt(0);
    const letterPosition = String(alphabet.indexOf(firstLetter) + 1).padStart(2, '0');
    let halfYearsSince2022 = Math.ceil(moment(period.startDate).diff(moment('01/01/2022', 'DD/MM/YYYY'), 'months') / 6);

    if (halfYearsSince2022 < 1) {
      halfYearsSince2022 = 1;
    }

    partitionNo = `${halfYearsSince2022}${letterPosition}`;
  }

  return partitionNo;
};

module.exports = {
  triggerImportSalesData,
  processFile,
  processRow,
  fixOutput,
  writeToBq,
  getPartitionNos,
  generateContractPartitionNo,
};
