/* eslint-disable no-async-promise-executor */
/* eslint-disable no-await-in-loop */

const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const SQS = require('../sqs');
const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const Task = require('../../models/task');

const credentials = {
  client_email: process.env.FUGA_GCP_CLIENT_EMAIL,
  private_key: process.env.FUGA_GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newline characters
};

const storage = new Storage({
  credentials,
});

// const message = {
//   "bucket": "fuga-integ-rasa-statements",
//   "name": "dds/123/9384.csv",
//   "metageneration": "1",
//   "timeCreated": "2020-09-29711:32:00.000Z",
//   "updated": "2020-09-29712:11:00.000Z",
//   "size": "1024",
//   "md5Hash": "d41d8cd98f00b204e9800998ecf8427e",
//   "contentType": "text/plain",
//   "metadata": {
//     "gcs_path": "gcs://ryba/123.csv",
//     "export_run_id": "123",
//     "statement_run_id": "123",
//     "statement_run_name": "June 2023",
//     "statement_run_reference": "2023.06",
//     "statement_id": "9384",
//     "statement_name": "Statement name",
//     "account": "dds",
//     "organization_id": "32234",
//     "organization_name": "Jimmy Org",
//     "package_hook": "hjkghjgj291jnhh21g",
//     "statement_run_statements": "123"
//   }
// };

async function ingestFile({ message }) {
  // Message may be a string or an object, normalise to object
  if (typeof message === 'string') {
    message = JSON.parse(message);
  }
  logger.info('Fuga Sales: Ingesting file:', message);
  const fugaOrgId = message?.metadata?.fuga_organization_id;
  if (!fugaOrgId) {
    throw new Error('Fuga Sales: fuga_organization_id is missing from metadata');
  }
  if (!message?.metadata?.statement_run_title || !message?.metadata?.statement_id) {
    throw new Error('Fuga Sales: statement_run_title or statement_id is missing from metadata');
  }
  // Find client by Org ID
  logger.info(`Fuga Sales: Looking up client with Fuga ID ${fugaOrgId}`);
  const clients = await Client.find({ 'fugaIntegration.fugaOrgId': fugaOrgId, 'fugaIntegration.fugaAutoIngestSales': true });
  for (const client of clients) {
    await processClient(client, message);
  }
  return clients.length;
}

async function processClient(client, message) {
  if (client) {
    logger.info(`Fuga Sales: Client found with Fuga ID ${message?.metadata?.fuga_organization_id} - ${client.name}`);

    // Download file from GCS
    let localFile;
    try {
      localFile = await downloadFileFromGCS(message.name, message.bucket);
    } catch (e) {
      logger.error(`Fuga Sales: Error downloading file ${message.name} from GCS:`, e);
      return;
    }

    if (localFile) {
      logger.info(`Fuga Sales: File downloaded ${localFile}`);
      try {
        // Create sales file based on file name
        const salesFile = await createSalesFile(client._id.toString(), localFile, message);
        // Trigger sales file ingestion by creating task and adding to queue
        const task = await createIngestionTask(salesFile, client);
        return task;
      } catch (e) {
        logger.error(`Fuga Sales: Error creating sales file: ${e}`);
      }
    }
  } else {
    logger.info(`Fuga Sales: Client with Org ID ${message.metadata.fuga_organization_id} and sync enabled not found - abandoning file ingestion for file ${message.name}`);
  }
}

async function downloadFileFromGCS(srcFilename, bucketName) {
  const destFilename = `${appRootDir}/tmp/${path.basename(srcFilename)}`;
  const options = {
    destination: destFilename,
  };

  try {
    // Downloads the file
    await storage.bucket(bucketName).file(srcFilename).download(options);
    logger.info(`Fuga Sales: File ${srcFilename} downloaded to ${destFilename}.`);
    return destFilename;
  } catch (err) {
    logger.error(`Fuga Sales: Error downloading file ${srcFilename} from bucket ${bucketName}:`, err);
    throw err;
  }
}

async function createSalesFile(clientId, localFile, task) {
  return new Promise(async (resolve, reject) => {
    const { metadata } = task;
    const name = `${metadata.statement_run_title} - ${metadata.statement_id}`;
    const salesFile = new SalesFile({ clientId, name, status: 'Waiting' });
    await salesFile.save();
    logger.info(`Fuga Sales: Sales file ${name} created.`);
    logger.info(salesFile);
    // Upload file to S3 - note we always update this, even if the file exists previously
    const s3Path = `salesFiles/${salesFile._id.toString()}/${path.basename(localFile)}`;
    fileManager.uploadToS3(s3Path, localFile, async (err, key) => {
      if (err) {
        logger.error(`Fuga Sales: Error uploading file to S3: ${err}`);
        throw (err);
      }
      logger.info(`Fuga Sales: File uploaded to ${s3Path}`);
      // Update sales file with S3 path
      salesFile.file = key;
      await salesFile.save();
      resolve(salesFile);
    });
  });
}

async function createIngestionTask(salesFile, client) {
  const task = new Task({
    name: 'Sales File Ingest',
    clientId: client._id.toString(),
    clientName: client.name,
    priority: 2,
    status: 'Pending',
    value: { salesFileId: salesFile._id.toString() },
  });
  await task.save();

  // Create SQS task
  await new Promise((resolve, reject) => {
    SQS.sendMessage(task, 1, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  logger.info(`Fuga Sales: Task ${task.name} created.`);
}

module.exports = { ingestFile, processClient, downloadFileFromGCS, createSalesFile, createIngestionTask };
