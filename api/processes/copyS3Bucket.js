require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
} = require('@aws-sdk/client-s3');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const querystring = require('querystring');

const accessKeyId = 'AKIA6OZDLXRFMESX6W7T';
const secretAccessKey = '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';
const region = process.env.S3_region;
const inputBucket = process.env.S3_bucket;
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
        copyObject(file, count, 0, next);
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

function copyObject(file, count, retryAmount, next) {
  if (retryAmount < 3) {
    const command = new CopyObjectCommand({ CopySource: `${inputBucket}/${querystring.escape(file.Key)}`, Bucket: outputBucket, Key: file.Key });
    AWSS3.send(command, (err, copyData) => {
      if (err && err.message.includes('The specified copy source is larger than the maximum allowable')) {
        logger.error(`ERRORED COPYING SKIPPING ${inputBucket}/${querystring.escape(file.Key)} - ${err}`);
        next();
      } else if (err) {
        logger.error(`ERRORED COPYING ${inputBucket}/${querystring.escape(file.Key)} - ${err}`);
        retryAmount += 1;
        setTimeout(() => {
          copyObject(file, count, retryAmount, next);
        }, 5000);
      } else {
        logger.info(`Copied File ${count} - ${inputBucket}/${file.Key}`);
        next();
      }
    });
  } else {
    logger.info(`SKIPPING FILE DUE TO TOO MANY RETRIES: ${file.Key}`);
    next();
  }
}

const outputCounts = { 'curve-royalties-production': {}, 'curve-royalties-production-new': {} };
function countObjects(prefix, bucket, marker, callback) {
  const s3Params = { Bucket: bucket, Prefix: prefix, MaxKeys: 1000 };
  if (marker) { s3Params.ContinuationToken = marker; }
  const command = new ListObjectsV2Command(s3Params);
  AWSS3.send(command, (err, data) => {
    if (err) {
      // Log error and retry
      logger.error(`Error getting count ${err}`);
      countObjects(prefix, bucket, marker, callback);
    } else {
      outputCounts[bucket][prefix] = outputCounts[bucket][prefix] || 0;
      outputCounts[bucket][prefix] += data.Contents.length;
      if (data.NextContinuationToken) {
        countObjects(prefix, bucket, data.NextContinuationToken, callback);
      } else {
        logger.info(`COMPLETED ${[bucket]} ${prefix} - ${outputCounts[bucket][prefix]}`);
        callback();
      }
    }
  });
}

function countKeys(bucket, callback) {
  const prefixes = ['accountingPeriods/', 'clients/', 'companies/', 'contracts/', 'costs/', 'cwrAcknowledgements/', 'cwrFiles/', 'deliveryFiles/', 'exports/', 'imports/', 'libraryTemplates/', 'parents/', 'periods/', 'reports/', 'salesFiles/', 'salesTemplates/', 'statements/'];
  async.eachSeries(prefixes, (prefix, cb) => {
    logger.info(`Copying Prefix ${bucket} ${prefix}`);
    countObjects(prefix, bucket, null, cb);
  }, callback);
}

async.each([inputBucket, outputBucket], countKeys, (err, res) => {
  if (err) {
    logger.error(`COPY S3 ERRORED ${err.message}`);
  } else {
    logger.info('COMPLETE');
    logger.info(outputCounts);
  }
});
