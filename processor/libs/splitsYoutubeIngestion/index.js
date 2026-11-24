/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { S3Client, ListObjectsCommand } = require('@aws-sdk/client-s3');

const ingestFile = require('./ingestFile');

const s3Client = new S3Client({ region: 'your-region' });

async function listAllObjects(bucket, prefix) {
  let isTruncated = true;
  let marker;
  const allObjects = [];

  while (isTruncated) {
    const params = { Bucket: bucket, Prefix: prefix };
    if (marker) params.Marker = marker;

    try {
      const command = new ListObjectsCommand(params);
      const response = await s3Client.send(command);
      allObjects.push(...response.Contents);
      isTruncated = response.IsTruncated;
      if (isTruncated) {
        marker = response.Contents.slice(-1)[0].Key;
      }
    } catch (err) {
      logger.error('Error listing objects:', err);
      throw err;
    }
  }

  return allObjects;
}

function extractIDFromKey(key) {
  if (key) {
    const split = key.split('/');
    return split ? split[1] : null;
  }
}

async function scanAndIngest(bucket, prefix) {
  try {
    const objects = await listAllObjects(bucket, prefix);
    for (const obj of objects) {
      const id = extractIDFromKey(obj.Key);
      if (id) {
        await ingestFile(obj.Key, id);
      }
    }
  } catch (err) {
    logger.error('Error scanning and ingesting files:', err);
  }
}

module.exports = {
  scanAndIngest,
  listAllObjects,
  extractIDFromKey,
};
