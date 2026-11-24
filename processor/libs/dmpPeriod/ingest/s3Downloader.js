const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

/**
 * Gets S3 configuration from environment variables
 * @returns {Object} - S3 configuration object
 */
const getS3Config = () => ({
  accessKeyId: process.env.DMP_S3_access_key,
  secretAccessKey: process.env.DMP_S3_secret_key,
  region: process.env.DMP_S3_region,
  bucket: process.env.DMP_S3_bucket,
});

/**
 * Downloads a file from S3 to a temporary location using custom credentials
 * @param {string} file - The S3 key of the file to download
 * @returns {Promise<string>} - A promise that resolves to the local path of the downloaded file
 */
const downloadFileFromS3 = async (file) => {
  try {
    const config = getS3Config();
    const s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });

    const tmpDir = path.join(process.cwd(), 'tmp');
    await fs.promises.mkdir(tmpDir, { recursive: true });

    const tmpFilePath = path.join(
      tmpDir,
      `${Date.now()}-${Math.random().toString(36).slice(2)}-${path.basename(file)}`,
    );

    const writeStream = fs.createWriteStream(tmpFilePath);

    await new Promise((resolve, reject) => {
      s3.getObject({ Bucket: config.bucket, Key: file })
        .createReadStream()
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    return tmpFilePath;
  } catch (error) {
    logger.error(`Error downloading file from S3: ${file}`, error);
    throw error;
  }
};

/**
 * Recursively lists files in an S3 directory, handling pagination
 * @param {AWS.S3} s3 - The S3 client
 * @param {string} bucket - The S3 bucket name
 * @param {string} directory - The directory prefix in S3
 * @param {Array} inputData - Accumulated file data
 * @param {string} nextToken - Continuation token for pagination
 * @returns {Promise<Array>} - A promise that resolves to an array of file objects
 */
const listFilesFromS3Loop = async (s3, bucket, directory, inputData = [], nextToken = null) => {
  const params = {
    Bucket: bucket,
    Prefix: directory,
  };

  if (nextToken) {
    params.ContinuationToken = nextToken;
  }

  const data = await s3.listObjectsV2(params).promise();
  inputData = inputData.concat(data.Contents || []);

  if (data.IsTruncated) {
    return listFilesFromS3Loop(s3, bucket, directory, inputData, data.NextContinuationToken);
  }
  return inputData;
};

/**
 * Lists files in an S3 directory with optional date filtering
 * @param {string} directory - The directory prefix in S3
 * @param {string} date - Optional date string to filter files
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of file paths
 */
const listFilesFromS3 = async (directory, date) => {
  try {
    const config = getS3Config();
    const s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });

    const data = await listFilesFromS3Loop(s3, config.bucket, directory);
    logger.info(`DMP Period Ingest: Found ${data.length} files in S3`);

    let files = data.map((file) => file.Key);
    files = files.filter((file) => file.includes('.csv'));
    files = files.filter((file) => file.includes('data'));
    if (date) {
      files = files.filter((file) => file.includes(date));
    }

    logger.info(`DMP Period Ingest: Found ${files.length} CSV files for date ${date || 'any'}`);
    return files;
  } catch (error) {
    logger.error('DMP Period Ingest: Error listing files from S3', error);
    throw error;
  }
};

/**
 * Gets files from S3 for a specific period
 * @param {string} periodType - The period folder to use
 * @param {string} extractDate - The date of extraction
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of file paths
 */
const getFiles = async (extractFolder, extractDate) => {
  try {
    const config = getS3Config();

    if (!config.bucket) {
      throw new Error('DMP_S3_bucket environment variable is not set');
    }

    if (!extractDate) {
      throw new Error('extractDate is required to get files from S3');
    }
    const prefix = `curve/curve_test/${extractFolder}`;
    const files = await listFilesFromS3(prefix, extractDate);
    logger.info(`DMP Period Ingest: Found ${files.length} files to ingest`);
    return sortFilesByType(files);
  } catch (error) {
    logger.error('DMP Period Ingest: Error getting files from S3', error);
    throw error;
  }
};

/**
 * Sorts files by type based on filename patterns
 * @param {Array<string>} files - Array of file paths
 * @returns {Object} - Object with file types as keys and arrays of file paths as values
 */
const sortFilesByType = (files) => {
  if (!files || !Array.isArray(files)) {
    throw new Error('sortFilesByType requires an array of files');
  }

  const filesByType = {
    payees: [],
    contracts: [],
    transactions: [],
    works: [],
    royalties: [],
  };

  logger.info(`DMP Period Ingest: Sorting ${files.length} files by type`);

  files.forEach((file) => {
    if (file.includes('payees')) {
      filesByType.payees.push(file);
    } else if (file.includes('contracts')) {
      filesByType.contracts.push(file);
    } else if (file.includes('transactions')) {
      filesByType.transactions.push(file);
    } else if (file.includes('works')) {
      filesByType.works.push(file);
    } else if (file.includes('royalty_info')) {
      filesByType.royalties.push(file);
    }
  });

  logger.info(`DMP Period Ingest: Files sorted by type - Payees: ${filesByType.payees.length}, Contracts: ${filesByType.contracts.length}, Transactions: ${filesByType.transactions.length}, Works: ${filesByType.works.length}, Sales: ${filesByType.royalties.length}`);

  return filesByType;
};

module.exports = {
  downloadFileFromS3,
  listFilesFromS3,
  getFiles,
};
