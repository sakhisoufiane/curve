/* eslint-disable no-await-in-loop */
const { ObjectId, Db, Document } = require('mongodb');
const { eachLimit } = require('async');
const {
  UploadPartCopyCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { BigQuery } = require('@google-cloud/bigquery');

const { crossEnvConfig, getSourceBQCredentialsFromEnv, getDestinationBQCredentialsFromEnv } = require('./config');

const Suite = {
  formatNumber(number) {
    return number?.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  async copyDocuments({ taskId, clientId, collectionName, copyToDB, copyFromDB, projection, count = 0 }) {
    logger.debug(`-----Copying ${collectionName} From ${Suite.formatNumber(count)}-----`);

    await copyToDB.collection(collectionName).deleteMany({ clientId });

    const limit = 5000;
    let currentLastId;
    let currentCount = 0;
    let documents;

    do {
      if (taskId) {
        await Suite.updateTaskProgressStatus({ taskId, status: `Copying ${collectionName} - ${Suite.formatNumber(currentCount)}`, db: copyFromDB });
      }

      const query = { clientId };
      if (currentLastId) query._id = { $gt: currentLastId };

      // Load data from Production
      documents = await copyFromDB
        .collection(collectionName)
        .find(query)
        .project(projection)
        .sort({ _id: 1 })
        .limit(limit)
        .toArray();

      if (!documents?.length) break;

      await copyToDB.collection(collectionName).insertMany(documents);

      if (documents.length === limit) {
        currentLastId = documents[documents.length - 1]._id;
        currentCount += limit;
        logger.debug(`-----Copying ${collectionName} From ${Suite.formatNumber(currentCount)}-----`);
      }
    } while (documents.length === limit);
  },

  /**
   * Copy Sales Tables from one environment to another
   *
   * @param {string} taskId optional taskId to update progress
   * @param {Document} originalClient original mongo document of the client being copied
   * @param {Document} copiedClient copy of the original client with fields cleaned up
   * @param {Db} db MongoDB connection to use for to update the task status
   * @param {string} sourceEnvironment the environment we are copying from
   * @param {string} targetEnvironment the environment we are copying to
   */
  async copySalesTables(taskId, db, originalClient, copiedClient, sourceEnvironment, targetEnvironment) {
    const sourceBigQuery = new BigQuery(getSourceBQCredentialsFromEnv(sourceEnvironment));
    const destinationBigQuery = new BigQuery(getDestinationBQCredentialsFromEnv(targetEnvironment));

    if (taskId) {
      await Suite.updateTaskProgressStatus({ taskId, status: 'Copying Sales Tables', db });
    }

    logger.info(`${originalClient._id} | COPY CLIENT | Checking and clearing dataset`);
    await Suite.checkAndClearDestinationDataset(destinationBigQuery, copiedClient);

    logger.info(`${originalClient._id} | COPY CLIENT | Creating Dataset`);

    await destinationBigQuery.createDataset(copiedClient.bigQueryDataset, { location: 'EU' });

    logger.info(`${originalClient._id} | COPY CLIENT | Copying Dataset Tables`);
    await Suite.copyDatasetTables(sourceBigQuery, destinationBigQuery, originalClient, copiedClient);
  },

  /**
   * Copies the dataset tables from the source BigQuery instance to the destination BigQuery instance.
   * Skips copying if the original client does not have the specified table.
   *
   * @param {Db} sourceBigQuery the BigQuery instance for the source data
   * @param {Db} destinationBigQuery the BigQuery instance for the destination
   * @param {Document} originalClient the original client document
   * @param {Document} copiedClient the copied client document with removed config field
   * @returns a promise that resolves when the tables are copied
   */
  async copyDatasetTables(sourceBigQuery, destinationBigQuery, originalClient, copiedClient) {
    return Promise.all([
      Suite.checkAndCopyTable(sourceBigQuery, destinationBigQuery, originalClient, copiedClient, 'bigQuerySalesTable'),
      Suite.checkAndCopyTable(sourceBigQuery, destinationBigQuery, originalClient, copiedClient, 'bigQueryPeriodSales'),
      Suite.checkAndCopyTable(sourceBigQuery, destinationBigQuery, originalClient, copiedClient, 'bigQueryAccountingPeriodSales'),
      Suite.checkAndCopyTable(sourceBigQuery, destinationBigQuery, originalClient, copiedClient, 'bigQueryPeriodCosts'),
    ]);
  },

  /**
   * Checks if a table exists in the original client and copies it to the new environment if it does.
   *
   * @param {Db} sourceBigQuery the BigQuery instance for the source data
   * @param {Db} destinationBigQuery the BigQuery instance for the destination
   * @param {Document} originalClient the original client document
   * @param {Document} copiedClient the copied client document with removed config fields
   * @param {string} table the property name where the table name is stored in the client documents
   * @returns {Promise} a promise that resolves when the table is copied
   */
  async checkAndCopyTable(sourceBigQuery, destinationBigQuery, originalClient, copiedClient, table) {
    if (originalClient[table]) {
      return Suite.copyTable(sourceBigQuery, destinationBigQuery, originalClient.bigQueryDataset, originalClient[table], copiedClient.bigQueryDataset, copiedClient[table]);
    }
    logger.debug(`COPY CLIENT | No ${table} to copy in client ${originalClient._id}`);
  },

  /**
   * Copies a table from the source BigQuery instance to the destination BigQuery instance.
   *
   * @param {Db} sourceBigQuery the BigQuery instance for the source data
   * @param {Db} destinationBigQuery the BigQuery instance for the destination
   * @param {string} sourceDataset the name/id of the source dataset
   * @param {string} sourceTable the name/id of the source table
   * @param {string} targetDataset the name/id of the target dataset
   * @param {string} targetTable the name/id of the target table
   */
  async copyTable(sourceBigQuery, destinationBigQuery, sourceDataset, sourceTable, targetDataset, targetTable) {
    logger.info(`COPY CLIENT | Copying ${sourceDataset}.${sourceTable} -> ${targetDataset}.${targetTable}`);
    const [job] = await sourceBigQuery
      .dataset(sourceDataset)
      .table(sourceTable)
      // I saw some issues relating to permissions when copying tables, I believe destinationBigQuery
      // is not used at all in the copy operation, so we don't need to give it any permissions.
      // The sourceBigQuery will need write access to the destination table however.
      // Keep that in mind when we want to start copying from staging to some other environment.
      .copy(destinationBigQuery.dataset(targetDataset, { projectId: destinationBigQuery.projectId }).table(targetTable));
    logger.info(`COPY CLIENT | Copy job finished for ${targetDataset}.${targetTable}, status: ${job.status.state}`);
  },

  /**
   * Check if the destination dataset exists and delete it if it does.
   *
   * @param {GoogleBigQuery} destinationBigQuery the BigQuery instance for the destination environment
   * @param {Document} copiedClient the copied client document containing the dataset names
   */
  async checkAndClearDestinationDataset(destinationBigQuery, copiedClient) {
    const [exists] = await destinationBigQuery.dataset(copiedClient.bigQueryDataset).exists();

    if (exists) {
      logger.debug('Clearing old Dataset');
      const dataset = destinationBigQuery.dataset(copiedClient.bigQueryDataset);
      await dataset.delete({ force: true });
    }
  },

  async copySalesFilesNew(taskId, clientId, sourceDb, targetDb, projection, count = 0) {
    logger.debug(`-----Copying SalesFiles with Files From ${count}-----`);

    const limit = 5_000;
    const collectionName = 'salesfiles';
    let currentLastId;
    let currentCount = 0;
    let documents;

    await targetDb.collection(collectionName).deleteMany({ clientId });

    do {
      if (taskId) {
        await Suite.updateTaskProgressStatus({ taskId, status: `Copying Sales Files From S3 - ${Suite.formatNumber(currentCount)}`, db: sourceDb });
      }

      const query = { clientId };
      if (currentLastId) query._id = { $gt: currentLastId };

      // Load data from Production
      documents = await sourceDb
        .collection(collectionName)
        .find(query)
        .project(projection)
        .sort({ _id: 1 })
        .limit(limit)
        .toArray();

      if (!documents?.length) break;

      await eachLimit(documents, 10, async (salesFile) => {
        await Suite.multipartCopy({ sourceKey: salesFile.file }).catch(logger.error);
        if (salesFile.customAdditionalFile) {
          await Suite.multipartCopy({ sourceKey: salesFile.customAdditionalFile }).catch(logger.error);
        }
      });

      await targetDb.collection(collectionName).insertMany(documents);

      if (documents.length === limit) {
        currentLastId = documents[documents.length - 1]._id;
        currentCount += limit;
        logger.debug(`-----Copying SalesFiles with Files From ${currentCount}-----`);
      }
    } while (documents.length === limit);
  },

  async copyClientLogo({ taskId, copyFromClient, db }) {
    if (!copyFromClient?.logo) {
      logger.debug('No Client logo to copy');
      return;
    }

    if (taskId) {
      await Suite.updateTaskProgressStatus({ taskId, status: 'Copying Client Logo', db });
    }

    await Suite.multipartCopy({ sourceKey: copyFromClient.logo }).catch(logger.error);
  },

  /**
   * Executes a multipart copy operation to copy a large object from one S3 bucket to another.
   * This method initiates a multipart upload, breaks the source file into parts, copies over the parts and completes the upload process.
   * In case of failure, the method attempts to abort the multipart upload.
   *
   * @param {string} sourceKey - The key of the source object to copy.
   * @param {string} [destinationKey] - The key for the copied object in the destination bucket. Will use the source key if not defined
   * @return {Promise<void>} A promise that resolves when the multipart copy operation is completed successfully or rejects with an error if the operation fails.
   */
  async multipartCopy({ sourceKey, destinationKey = sourceKey }) {
    const { AWSS3, sourceBucket, destinationBucket, devId, stagingId } = crossEnvConfig();

    // Get the size of the source object, to determine how large the parts should be
    const headResp = await AWSS3.send(new HeadObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey,
    }));
    const objectSize = parseInt(headResp.ContentLength, 10);
    const partSize = this.determinePartSize(objectSize);

    let multipartUploadId;

    try {
      // Initiate a multipart upload at the target destination
      const createMultipartUploadResponse = await AWSS3.send(new CreateMultipartUploadCommand({
        Bucket: destinationBucket,
        Key: destinationKey,
        GrantFullControl: `id=${devId},id=${stagingId}`,
      }));
      multipartUploadId = createMultipartUploadResponse.UploadId;
      logger.debug('Initiated multipart upload with ID:', multipartUploadId);

      const copySource = `/${sourceBucket}/${encodeURIComponent(sourceKey)}`;

      // Create a command to copy each part
      const copyPartPromises = [];

      // We don't know how many parts to copy, just what the size of the parts should be. We keep track of the starting byte of each
      // part and the number of parts we've shipped so far
      let startByte = 0;
      let partNumber = 1;
      while (startByte < objectSize - 1) {
        // Determine the end byte. It's either the start byte plus the size of the parts, or it's the last byte in the object.
        const endByte = Math.min(startByte + partSize, objectSize) - 1;
        logger.debug(`Copying part ${partNumber}: bytes ${startByte}-${endByte}`);

        // Create a command to copy each calculated byte range. Start and End Byte are inclusive, so watch for off-by-one errors
        copyPartPromises.push(
          AWSS3.send(new UploadPartCopyCommand({
            Bucket: destinationBucket,
            Key: destinationKey,
            PartNumber: partNumber,
            UploadId: multipartUploadId,
            CopySource: copySource,
            CopySourceRange: `bytes=${startByte}-${endByte}`,
          })),
        );

        partNumber += 1;
        startByte = endByte + 1;
      }

      // Execute all the gathered promises to copy all the parts
      const copyResults = await Promise.all(copyPartPromises);

      // Create a list of all the parts by their number and eTag
      const completedParts = copyResults.map((result, index) => ({
        ETag: result.CopyPartResult.ETag,
        PartNumber: index + 1,
      }));

      // Mark the upload as completed, passing the information about the parts we uploaded
      await AWSS3.send(new CompleteMultipartUploadCommand({
        Bucket: destinationBucket,
        Key: destinationKey,
        UploadId: multipartUploadId,
        MultipartUpload: { Parts: completedParts },
      }));

      logger.debug('Multipart copy completed successfully.');
    } catch (err) {
      // If we initiated a multi-part upload, and it failed, abort it, so that the resources consumed can be released
      if (multipartUploadId) {
        await AWSS3.send(new AbortMultipartUploadCommand({
          Bucket: destinationBucket,
          Key: destinationKey,
          UploadId: multipartUploadId,
        }));
        logger.debug('Aborted multipart upload due to failure.');
      }
      throw err;
    }
  },

  /**
   * Determines the optimal part size for dividing a given file size according to specific constraints.
   * The method ensures that the part size adheres to a minimum size of 5MB and a maximum size of 5GB,
   * while aiming for an ideal number of parts (1000).
   *
   * @param {number} fileSize - The total size of the file in bytes.
   * @return {number} The calculated part size in bytes, adjusted to meet the necessary constraints.
   */
  determinePartSize(fileSize) {
    // A few considerations for choosing the max size and parts numbers -
    // A part has to be between 5MB and 5GB in size
    // The last part can be smaller than 5MB
    // You can't have more than 10,000 parts
    // If you ask to list the parts, you will only get up to 1000 in a request (use pagination to get the rest)
    // The maximum size of the file is 5TB

    // The strategy we are going to use is to aim for 1000 elements of up to 5GB for 5TB.
    // We will check each part isn't larger than 5GB.
    // If each part is smaller than 5MB, we will reduce the number of parts
    const idealPartCount = 1000;
    const minPartSize = 1024 * 1024 * 5;
    const maxPartSize = 1024 * 1024 * 1024 * 5;

    const idealPartSize = Math.ceil(fileSize / idealPartCount);

    if (idealPartSize > maxPartSize) {
      throw new Error('File we are trying to copy is larger than 5TB somehow');
    }

    return Math.max(minPartSize, idealPartSize);
  },

  async updateTaskProgressStatus({ taskId, status, db }) {
    if (!taskId) return;

    const Task = db.collection('tasks');
    await Task.updateOne({ _id: new ObjectId(taskId) }, { $set: { progressStatus: status } }).catch(logger.error);
  },
};

module.exports = Suite;
