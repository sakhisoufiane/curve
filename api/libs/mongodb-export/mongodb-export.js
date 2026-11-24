/* eslint-disable no-continue */
const { logger, databaseUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId, MongoClient } = require('mongodb');
const fs = require('fs');
const _ = require('lodash');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const readline = require('readline');

const Client = require('../../models/client');
const Notification = require('../../models/notification');

const CSVRawExport = async ({ curveUser, collectionName, filter, sync = false, excludeFields = [], customCursor }) => {
  const logKey = `${curveUser.clientId} Raw Export for ${collectionName} |`;
  const LOG_INTERVAL = 100_000;

  logger.info(`${logKey} starting export`);
  logger.debug(JSON.stringify({ curveUser, collectionName, filter, sync, excludeFields }));
  const jsonExportPath = `${appRootDir}/tmp/export_${moment().format('X')}.json`;
  const csvExportPath = `${appRootDir}/tmp/export_${moment().format('X')}.csv`;
  let mongoClient;
  let collection;
  if (!customCursor) {
    logger.info(`${logKey} connecting to MongoDB and querying data`);
    mongoClient = await MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts());
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    collection = db.collection(collectionName);
    if (filter?._id?.$in) {
      const ids = [];
      for (const id of filter._id.$in) {
        ids.push(new ObjectId(id));
      }
      filter._id.$in = ids;
    }
  } else {
    logger.info(`${logKey} using provided custom cursor to query data`);
  }

  const cursor = customCursor || collection.find(filter, { batchSize: 1000 });

  const writeStream = fs.createWriteStream(jsonExportPath);

  const headers = [];

  const startTimeDb = Date.now();
  let docCount = 0;
  for await (const doc of cursor) {
    docCount += 1;
    if (docCount % LOG_INTERVAL === 0) {
      logger.info(`${logKey} processed ${docCount} documents`);
    }
    writeStream.write(`${JSON.stringify(doc)}\n`);
    // Get headers (excluding specified fields)
    for (const key in doc) {
      if (!headers.includes(key) && !excludeFields.includes(key)) { headers.push(key); }
    }
  }

  writeStream.end();

  if (!customCursor) {
    await mongoClient.close();
  }

  logger.info(`${logKey} finished querying data from MongoDB after ${((Date.now() - startTimeDb) / 1000).toLocaleString()}s, total documents: ${docCount}`);

  logger.info(`${logKey} writing data to CSV file`);
  // Write CSV
  const inputStream = fs.createReadStream(jsonExportPath, 'utf8');
  const outputStream = fs.createWriteStream(csvExportPath, 'utf8');
  // Write the header row
  outputStream.write(`${headers.join(',')}\n`);

  const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });

  const startTimeCsv = Date.now();
  let lineCount = 0;
  for await (const line of rl) {
    lineCount += 1;
    if (lineCount % LOG_INTERVAL === 0) {
      logger.info(`${logKey} written ${lineCount} of ${docCount} lines to CSV file`);
    }
    if (!line.trim()) continue; // skip empty lines

    try {
      const obj = JSON.parse(line);
      const row = headers.map((key) => {
        let value = obj[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') value = JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`; // escape quotes
      }).join(',');

      outputStream.write(`${row}\n`);
    } catch (err) {
      logger.error('Skipping invalid JSON line:', line);
    }
  }
  logger.info(`${logKey} finished writing CSV file after ${((Date.now() - startTimeCsv) / 1000).toLocaleString()}s`);

  outputStream.end();

  fs.promises.unlink(jsonExportPath).catch((err) => logger.error(`${logKey} failed to delete temp JSON file:`, err));

  // Upload file to S3
  logger.info(`${logKey} uploading CSV file to S3`);
  const startTimeUpload = Date.now();
  const client = await Client.findById(curveUser.clientId);
  const s3Key = await new Promise((resolve, reject) => {
    fileManager.uploadToS3(`raw_exports/${client.name} - ${collectionName} raw export ${moment().format('YYYYMMDDHHmmssSSS')}.${csvExportPath.split('.').pop()}`, csvExportPath, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  logger.info(`${logKey} finished uploading CSV file to S3 after ${((Date.now() - startTimeUpload) / 1000).toLocaleString()}s`);

  const publicLink = await new Promise((resolve, reject) => {
    fileManager.publicLink24Hours(s3Key, (err, link) => {
      if (err) reject(err);
      else resolve(link);
    });
  });

  // If running synchronously, return the link directly without sending notification
  if (sync) {
    logger.info(`Exported ${collectionName} to ${publicLink} (synchronous)`);
    return { csvPublicLink: publicLink };
  }

  // Otherwise, send notification (existing async behavior)
  const generateOptions = { identifier: 'exportDownload', curveUser, client, subject: `Your Raw Export for ${client.name} is Ready to Download`, link: publicLink };
  Notification.generate(`${_.capitalize(collectionName)} Raw Export Ready`, `Your ${_.capitalize(collectionName)} Raw Export for ${client.name} is Ready to Download`, publicLink, curveUser, generateOptions, () => {});

  logger.info(`Exported ${collectionName} to ${publicLink}`);
};

module.exports = { CSVRawExport };
