require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const async = require('async');
const fs = require('fs');
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

const accessKeyId = 'AKIA6OZDLXRFMESX6W7T';
const secretAccessKey = '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';
const region = process.env.S3_region;
const inputBucket = 'curve-royalties-production';
const outputBucket = 'curve-royalties-production-new';

const AWSS3 = new S3Client({
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region,
});

let count = 0;

function copyObjects(prefix, marker, callback) {
  logger.info(`Getting Objects with Marker: ${marker}`);
  const s3Params = { Bucket: inputBucket, Prefix: prefix, MaxKeys: 1000 };
  if (marker) { s3Params.ContinuationToken = marker; }
  const command = new ListObjectsV2Command(s3Params);
  AWSS3.send(command, (err, data) => {
    if (err) {
      // Log error and retry
      logger.error(`Error getting count ${err}`);
      copyObjects(prefix, marker, callback);
    } else {
      async.eachLimit(data.Contents, 10, (file, next) => {
        count += 1;
        copyObject(file, count, next);
      }, (err) => {
        if (data.NextContinuationToken) {
          copyObjects(prefix, data.NextContinuationToken, callback);
        } else {
          logger.info(`COMPLETED ${prefix}`);
          callback();
        }
      });
    }
  });
}

function copyObject(file, count, next) {
  const command = new HeadObjectCommand({ Bucket: outputBucket, Key: file.Key });
  AWSS3.send(command, (err, data) => {
    if (err) {
      // Download and upload object
      fileManager.downloadFromS3(file.Key, inputBucket, {}, (err, localFile) => {
        if (err) {
          logger.error(`File Failed to Download: ${file.Key} - ${err}`);
          next();
        } else {
          fileManager.uploadToS3(file.Key, localFile, (err) => {
            if (err) {
              logger.error(`File Failed to upload: ${file.Key} - ${err}`);
            } else {
              // Remove file
              fs.unlinkSync(localFile);
              next();
            }
          });
        }
      });
    } else {
      logger.info(`File Exists ${count} - ${outputBucket}/${file.Key}`);
      next();
    }
  });
}

const prefixes = ['accountingPeriods/', 'clients/', 'companies/', 'contracts/', 'costs/', 'cwrAcknowledgements/', 'cwrFiles/', 'deliveryFiles/', 'imports/', 'libraryTemplates/', 'parents/', 'periods/', 'reports/', 'salesFiles/', 'salesTemplates/', 'statements/'];
async.eachSeries(prefixes, (prefix, cb) => {
  logger.info(`Copying Prefix ${prefix}`);
  copyObjects(prefix, null, cb);
}, (err) => {
  if (err) {
    logger.error(`COPY S3 ERRORED ${err.message}`);
  } else {
    logger.info('COPY S3 COMPLETE');
  }
});
