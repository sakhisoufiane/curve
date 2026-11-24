const { databaseUtils, fileManager, promisify, CurveError, ERROR_CODES } = require('@curveroyaltysystems/platform-shared-utils');
const { withDefaultCredentials } = require('@curveroyaltysystems/bigquery');
const { logger } = require('@curveroyaltysystems/logger');
const moment = require('moment');
const { unlink } = require('node:fs/promises');
const { S3Client, GetObjectAttributesCommand } = require('@aws-sdk/client-s3');
const { createStorage, createWorkflowExecutionClient } = require('../../util/gcp');
const prepareData = require('./prepareData');
const Client = require('../../../models/client');
const originalIngestSalesFile = require('../../salesIngestion/ingestSalesFile');
const Task = require('../../../models/task');
const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Work = require('../../../models/work');
const Contract = require('../../../models/contract');

const dateFormat = 'DD/MM/YYYY HH:mm:ss.SS';
const s3Bucket = process.env.S3_bucket;
const gcpProjectId = process.env.PLATFORM_GCS_PROJECT_ID;

const location = 'europe-west4';
const googleWorkflowName = 'sales-ingestion-workflow';

/** @typedef {import('../../../models/salesFile').SalesFile} SalesFile */
/**
 * Ingest a Sales File using the Platform API. This function manages the status on the Sales File, prepares
 * the data required for ingesting, and sends the data to the Platform API to start the ingestion.
 * @param {SalesFile} salesFile The MongoDB document containing the Sales File information
 * @param {string} taskId The ID of the Task in Mongo
 * @param {string} userId The ID of the invoking user
 * @return {Promise<void>} A Promise. If resolved, the task has been successfully created in the Platform. Rejects otherwise
 */
const ingestSalesFile = async (salesFile, taskId, userId) => {
  const salesFileId = salesFile._id.toString();
  logger.addToContext({ salesFileId, userId });

  // Validate incoming parameters
  if (!taskId) {
    return reportError(new Error('Task ID must be provided to start a Sales Ingestion'), salesFile);
  }
  if (!userId) {
    return reportError(new Error('User ID must be provided to start a Sales Ingestion'), salesFile);
  }

  // Mark Sales File as being ingested
  try {
    salesFile.status = 'Ingesting';
    salesFile.error = null;
    await salesFile.save();
  } catch (e) {
    return reportError(e, salesFile);
  }

  const localFile = await downloadFile(salesFile)
    .catch(async (e) => reportError(e, salesFile, taskId));

  if (!localFile) return;

  try {
    // Find template if required
    if (!salesFile.salesTemplateId) {
      await promisify(originalIngestSalesFile.matchToTemplate, localFile, salesFile);
    }

    // Create BQ from client
    const client = await Client.findById(salesFile.clientId);
    if (!client) { throw new Error(`${salesFileId} Error finding client: ${moment().format(dateFormat)}`); }
    const bigQueryClient = withDefaultCredentials({ ...databaseUtils.getBigQueryOpts(client), retryBackoffTime: 10000 });

    // Delete old sales data for file
    await originalIngestSalesFile.removeOldSales(bigQueryClient, salesFileId, salesFile.partitionNo);

    const task = await prepareData(salesFile, taskId, localFile);
    if (!task) { throw new Error(`Failed to create task data. SalesFile: ${salesFileId}`); }

    const bucketDetails = createConfigurationLocationDetails(taskId);
    await uploadConfig(task, bucketDetails.bucketName, bucketDetails.fileName);

    const runner = await pickRunner(salesFile);

    // Send the ingestion task to Google Workflows
    const executionName = await sendToGoogleWorkflows(taskId, task, bucketDetails.configUrl, userId, salesFileId, runner);
    logger.info(`Created execution: ${executionName} for Sales File ID: ${salesFileId} and Task ID: ${taskId}`);
  } catch (e) {
    await reportError(e, salesFile, taskId);
  }
  return unlink(localFile);
};

/**
 * Generate an object containing the bucket name, file name, and GSUtil URL for the configuration
 * @param taskId The Task to generate the configuration for
 * @return {{bucketName: string, configUrl: string, fileName: string}} The details
 */
const createConfigurationLocationDetails = (taskId) => {
  // The URL to upload
  const nowString = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const fileName = `sales-ingestion-dataflow-configurations/${taskId}/${taskId}-${nowString}-config.json`;

  const bucketName = process.env.SALES_INGESTION_INPUTS_BUCKET;

  return {
    bucketName,
    fileName,
    configUrl: `gs://${bucketName}/${fileName}`,
  };
};

/**
 * Uploads the configuration to GCS
 * @param {TaskDefinition} task The Task configuration to upload
 * @param {string} bucketName The bucket to upload to the file to
 * @param {string} fileName The name of the file
 * @return {Promise<void>} A promise. Resolves once the upload has completed
 */
const uploadConfig = async (task, bucketName, fileName) => {
  const storage = createStorage();

  const configString = JSON.stringify(task);

  await storage
    .bucket(bucketName)
    .file(fileName)
    .save(configString);
};

/**
 * Execute the Google Workflows task
 * @param {string} taskId The Task ID to run
 * @param {TaskDefinition} task The task configuration uploaded to GCS
 * @param {string} configUrl The GSUtil URL of the task uploaded
 * @param {string} userId The user ID of the user that started the ingestion
 * @param {string} salesFileId The ID of the sales file
 * @param {string} runner The runner to use. Either 'Dataflow' or 'Spark'
 * @return {Promise<string>} A promise. Contains the execution ID in Google Workflows representing this ingestion run
 */
const sendToGoogleWorkflows = async (taskId, task, configUrl, userId, salesFileId, runner) => {
  const requiredSteps = [];
  if (task.inputConfig.fileType.type === 'CRD') requiredSteps.push('CRD Read');

  const client = createWorkflowExecutionClient();

  const createExecutionRes = await client.createExecution({
    parent: client.workflowPath(gcpProjectId, location, googleWorkflowName),
    execution: {
      argument: JSON.stringify({
        taskId,
        configUrl,
        requiredSteps,
        userId,
        salesFileId,
        runner,
      }),
    },
  });

  return createExecutionRes[0].name;
};

/**
 * In the event of an error occuring when finalizing the Sales ingestion, this function will
 * log the error and push the error to the Sales File for presentation to the user.
 * @param {CurveError|Error} error The error to log
 * @param {SalesFile} salesFile The Sales File being ingested
 * @param {string} [taskId] The Task ID that triggered the job
 * @return {Promise<void>} A Promise. Resolves once the save of the error to the database has completed.
 */
const reportError = async (error, salesFile, taskId) => {
  logger.error('Error during Platform Sales File Ingestion', error);
  // Update the Sales File
  if (error.statusCode === ERROR_CODES.salesTemplateNotMatched) {
    salesFile.status = 'Unrecognised';
  } else {
    salesFile.status = 'Errored';
  }

  salesFile.error = error.userMessage ?? error.message ?? JSON.stringify(error);

  await salesFile.save()
    .catch((e) => {
      logger.error('Failed to save error to salesFile.', e);
    });

  // Update the Task
  const task = await Task.findById(taskId);
  if (!task) {
    logger.error('Tried to mark Task as Errored, but Task could not be found');
    return;
  }

  if (error.statusCode === ERROR_CODES.salesTemplateNotMatched) {
    task.status = 'Complete';
  } else {
    task.status = 'Errored';
    task.error = error.message ?? JSON.stringify(error);
  }

  await task.save()
    .catch((e) => {
      logger.error('Failed to save error to task', e);
    });
};

/**
 * Asynchronously downloads a file from S3 and returns the first result.
 *
 * @param {SalesFile} salesFile - The sales file document from mongo
 * @returns {Promise<string>} Returns the local file path of the downloaded file
 */
const downloadFile = async (salesFile) => {
  // Get localFile from S3
  if (!salesFile.file) { throw new Error('No file is attached, please upload a file'); }
  const downloadResults = await promisify(fileManager.downloadFromS3, salesFile.file, s3Bucket);
  if (!downloadResults?.length) { throw new Error('downloadFromS3 returned no results'); }
  return downloadResults[0];
};

const pickRunner = async (salesFile) => {
  /* We base the runner choice on:
   *  How much data is in the file (no more than 25MB)
   *  How many releases, track, works and contracts we have combined (no more than 200,000)
   */
  const objectSize = await getObjectSize(salesFile);
  if (!objectSize || objectSize > 25_000_000) {
    return 'Dataflow';
  }

  const releaseCount = await Release.countDocuments({ clientId: salesFile.clientId });
  const trackCount = await Track.countDocuments({ clientId: salesFile.clientId });
  const workCount = await Work.countDocuments({ clientId: salesFile.clientId });
  const contractCount = await Contract.countDocuments({ clientId: salesFile.clientId });

  if (releaseCount + trackCount + workCount + contractCount > 200_000) {
    return 'Dataflow';
  }

  return 'Spark';
};

async function getObjectSize(salesFile) {
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_access_key,
      secretAccessKey: process.env.S3_secret_key,
    },
    region: process.env.S3_region,
  });
  const params = {
    Bucket: process.env.S3_bucket,
    Key: salesFile.file,
    ObjectAttributes: ['ObjectSize'],
  };
  const command = new GetObjectAttributesCommand(params);
  const response = await s3Client.send(command);

  return response.ObjectSize;
}

module.exports = {
  ingestSalesFile,
};
