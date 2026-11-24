/* eslint-disable no-buffer-constructor */
/**
 * @module fileManager
 */
const fs = require('fs');
const {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  GetObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  UploadPartCopyCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const crypto = require('crypto');
const sanitize = require('sanitize-filename');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const logger = require('./logger');

let accessKeyId = process.env.S3_access_key;
let secretAccessKey = process.env.S3_secret_key;
let region = process.env.S3_region;
let awsBucket = process.env.S3_bucket;

const s3Url = `https://${awsBucket}.s3-eu-west-1.amazonaws.com/`;
const S3Credentials = { credentials: { accessKeyId, secretAccessKey }, region };
/**
  * Uploads a single file stream to s3 bucket
  *
  * * Returns: Promise
  *
  * @async
  * @param {object} params - AWS upload parameters
  * @param {string} params.Bucket - s3 bucket where file should be uploaded
  * @param {string} params.Key - s3 key where file should be uploaded
  * @param {object} params.Body - file stream object
  * @param {string} params.ACL - Optional setting defining access to uploaded file
 */
async function uploadReadableStream(params) {
  const AWSS3 = new S3Client(S3Credentials);
  const upload = new Upload({
    client: AWSS3,
    params,
  });
  return upload.done();
}

/**
   * Copies a S3 storage file to another S3 storage destination using multipart
   *
   * * Calls `callback(err, response)` with `response` containing the data retuned by CompleteMultipartUploadCommand
   * * Calls `callback(err, response)` with an `err` message if an error occurs
   *
   * @param {*} sourceKey - Key of the file to copy
   * @param {*} destinationKey - Destination key
   * @param {function(string, string)} callback - A callback that handles the response
   */
const copyS3FileMultipart = async ({ callback, destinationKey, sourceKey }) => {
  let response;
  const sourceBucket = awsBucket;
  const destinationBucket = awsBucket;

  try {
    const s3Client = new S3Client(S3Credentials);
    const createMultipartParams = {
      Bucket: destinationBucket,
      Key: destinationKey,
    };
    const multipartUploadResponse = await s3Client.send(new CreateMultipartUploadCommand(createMultipartParams));
    const uploadId = multipartUploadResponse.UploadId;

    const sourceObjectParams = {
      Bucket: sourceBucket,
      Key: sourceKey,
    };

    const sourceObjectMetadata = await s3Client.send(new HeadObjectCommand(sourceObjectParams));
    const optimalPartSize = 100 * 1024 * 1024; // 100MB
    const totalParts = Math.ceil(sourceObjectMetadata.ContentLength / optimalPartSize);
    const partSize = Math.ceil(sourceObjectMetadata.ContentLength / totalParts);
    const copyPartPromises = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const startByte = (partNumber - 1) * partSize;
      const endByte = Math.min(startByte + partSize, sourceObjectMetadata.ContentLength) - 1;
      const copyPartParams = {
        Bucket: destinationBucket,
        CopySource: `/${sourceBucket}/${sourceKey}`,
        Key: destinationKey,
        PartNumber: partNumber,
        UploadId: uploadId,
        CopySourceRange: `bytes=${startByte}-${endByte}`,
      };
      const copyPartPromise = s3Client.send(new UploadPartCopyCommand(copyPartParams));
      copyPartPromises.push(copyPartPromise);
    }

    const uploadedParts = await Promise.all(copyPartPromises);
    const completedParts = uploadedParts.map((part, index) => ({
      ETag: part.CopyPartResult.ETag,
      PartNumber: index + 1,
    }));

    const completeMultipartParams = {
      Bucket: destinationBucket,
      Key: destinationKey,
      MultipartUpload: {
        Parts: completedParts,
      },
      UploadId: uploadId,
    };

    response = await s3Client.send(new CompleteMultipartUploadCommand(completeMultipartParams));
  } catch (err) {
    callback(err);
  }
  callback(undefined, response);
};

/**
  * Uploads a single file from local tmp for to s3 bucket
  *
  * * Calls `callback(err, key)` with `key` containing the aws key
  * * Calls `callback(err, key)` with an `err` message if an error occurs
  *
  * @async
  * @param {object} opts - Query options
  * @param {string} opts.key - s3 key where file should be uploaded
  * @param {string} opts.localPath - Full local path of file to be uploaded
  * @param {boolean} opts.makePublic - State whether s3 link be public
  * @param {function(string, string)} callback - A callback that handles the response
 */
async function runUpload(opts, callback) {
  const s3Params = {
    Bucket: process.env.S3_bucket,
    Key: opts.key,
    Body: fs.createReadStream(opts.localPath),
    ACL: 'bucket-owner-full-control',
  };

  if (opts.makePublic) {
    s3Params.ACL = 'public-read';
  }

  try {
    const response = await uploadReadableStream(s3Params);
    logger.debug('S3 upload complete', response.Key);
    // const command = new HeadObjectCommand(s3Params);
    // const headObject = await AWSS3.send(command);
    // // const stats = fs.statSync(opts.key);
    // // const fileSizeInBytes = stats.size;
    // // logger.debug(`${response.Key} -> ${fileSizeInBytes}`);
    // logger.debug(`HEAD OBJECT: ${response.Key}`, headObject);
    callback(null, response.Key);
  } catch (err) {
    callback(err);
  }
}

/**
  * Check if file to be uploaded is present. Makes 2 staggered attempts
  *
  * * Calls `callback(err, key)` with `key` containing the aws key
  * * Calls `callback(err, key)` with an `err` message if an error occurs
  *
  * @param {object} opts - Query options
  * @param {string} opts.key - s3 key where file should be uploaded
  * @param {string} opts.localPath - Full local path of file to be uploaded
  * @param {boolean} opts.makePublic - State whether s3 link be public
  * @param {function(string, string)} callback - A callback that handles the response
 */
const actionUpload = (opts, callback) => {
  if (!opts.key || opts.key === '') {
    callback(new Error('Key is empty'));
  }
  if (fs.existsSync(opts.localPath)) {
    runUpload(opts, callback);
  } else {
    setTimeout(() => {
      if (fs.existsSync(opts.localPath)) {
        runUpload(opts, callback);
      } else {
        callback(new Error(`File ${opts.localPath} does not exist`));
      }
    }, 1000);
  }
};

function removeFileFromTmp(localPath, err, response, callback) {
  if (fs.existsSync(localPath) && localPath.includes('tmp')) {
    fs.unlink(localPath, () => {
      logger.debug(`File deleted from tmp folder: ${localPath}`);
      callback(err, response);
    });
  } else {
    callback(err, response);
  }
}

module.exports = {
  uploadToS3(key, localPath, callback) {
    const makePublic = false;
    const opts = { key, localPath, makePublic };

    actionUpload(opts, (err, response) => {
      removeFileFromTmp(localPath, err, response, callback);
    });
  },
  uploadAsPublicToS3(key, localPath, callback) {
    const makePublic = true;
    const opts = { key, localPath, makePublic };

    actionUpload(opts, (err, response) => {
      removeFileFromTmp(localPath, err, response, callback);
    });
  },
  /**
   * Deletes a file from S3 storage
   *
   * * Calls `callback(err, data)` with `localFile` containing the path to the local file
   * * Calls `callback(err, data)` with an `err` message if an error occurs
   *
   * @param {string} key - path to file on S3 storage
   * @param {function(string, string)} callback - A callback that handles the response
   */
  deleteFromS3(key, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_bucket,
      Key: key,
    });
    AWSS3.send(command, (err, response) => {
      if (err) { logger.error(err); }
      callback(err, response);
    });
  },
  /**
   * Deletes a file from S3 storage using async function
   *
   * @param {string} key - path to file on S3 storage
   * @param {object} altConfig - alternative s3 configuration
   */
  deleteFromS3async: async (key, altConfig) => {
    let thisAWSS3 = new S3Client(S3Credentials);
    if (altConfig?.accessKeyId && altConfig.secretAccessKey) {
      ({ accessKeyId, secretAccessKey, region } = altConfig);
      thisAWSS3 = new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
      });
      awsBucket = altConfig.bucket;
    }

    const deleteParams = { Bucket: awsBucket, Key: key };
    const command = new DeleteObjectCommand(deleteParams);
    await thisAWSS3.send(command);
  },
  /**
   * Deletes alls file from S3 virtual directory using async function
   *
   * @param {string} dir - path to a virtual directory on S3 storage
   * @param {object} altConfig - alternative s3 configuration
   */
  deleteFromS3Path: async function emptyS3Directory(dir, altConfig) {
    let thisAWSS3 = new S3Client(S3Credentials);
    // If altConfig provide then overwrite s3 configuaration
    if (altConfig?.accessKeyId && altConfig.secretAccessKey) {
      ({ accessKeyId, secretAccessKey, region } = altConfig);
      thisAWSS3 = new S3Client({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
      });
      awsBucket = altConfig.bucket;
    }

    // Configure params
    const listParams = { Bucket: awsBucket, Prefix: dir };
    const deleteParams = { Bucket: awsBucket, Delete: { Objects: [] } };

    // Retrieve list of s3 objects on the supplied directory path
    const command = new ListObjectsV2Command(listParams);
    const listedObjects = await thisAWSS3.send(command);

    // If there are no s3 objects then return
    if (listedObjects.Contents.length === 0) return;

    // Build up array of s3 objects for deletion
    listedObjects.Contents.forEach(({ Key }) => {
      deleteParams.Delete.Objects.push({ Key });
    });

    const commandDelete = new DeleteObjectsCommand(deleteParams);
    await thisAWSS3.send(commandDelete);

    if (listedObjects.IsTruncated) await emptyS3Directory(awsBucket, dir);
  },
  /**
   * Downloads a file from S3 storage and return a temporary local file
   *
   * * Calls `callback(err, localFile)` with `localFile` containing the path to the local file
   * * Calls `callback(err, localFile)` with an `err` message if an error occurs
   *
   * @param {string} key - path to file on S3 storage
   * @param {string} bucket -  S3 bucket path
   * @param {object} options -  Options
   * @param {function(string, string)} cb - A callback that handles the response
   */
  downloadFromS3: async (key, bucket, options, cb) => {
    // Avoid param reassign
    let callback = cb;
    // Fallback when no options are passed
    if (!callback) { callback = options; }
    // Check if key exists
    if (key) {
      const AWSS3 = new S3Client(S3Credentials);
      const keySplit = key.split('/');
      // Download file
      // const localFile = `${appRootDir}/tmp/${moment().format('YYYYMMDDHHmmSSsss')}${keySplit[keySplit.length - 1]}`;
      const sanitizedKey = sanitize(keySplit[keySplit.length - 1]);
      let localFile = `${appRootDir}/tmp/${sanitizedKey}`;
      // Add timestamp to the local file name
      if (options && options.addTimestamp) {
        const filename = sanitizedKey.substr(0, sanitizedKey.lastIndexOf('.'));
        const fileExtension = sanitizedKey.substr(sanitizedKey.lastIndexOf('.') + 1);
        localFile = `${appRootDir}/tmp/${filename}-${moment().format('x')}.${fileExtension}`;
      }
      const file = fs.createWriteStream(localFile);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await AWSS3.send(command).catch((e) => {
        logger.error(command);
        logger.error(e);
        callback(e);
      });
      if (response) {
        const s3Stream = response.Body.pipe(file);
        s3Stream.on('finish', () => {
          // Return local file
          if (options && options.addTimestamp) {
            callback(null, {
              localFile,
              filename: sanitizedKey,
            });
          } else {
            callback(null, localFile);
          }
        });
        s3Stream.on('error', (err) => {
          // Handle some errors, returning to API
          logger.error(err);
          callback(err);
        });
      }
    } else {
      callback(new Error('Key is empty'));
    }
  },
  downloadStatementLogoFromS3(localPath, key, bucket, callback) {
    // Check if key exists
    if (fs.existsSync(localPath)) {
      // Return local file
      callback(null, localPath);
    } else if (key) {
      const AWSS3 = new S3Client(S3Credentials);
      // Download from S3
      const keySplit = key.split('/');
      // Setup random string
      const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      // Download file
      const localFile = `/tmp/${randomString}${keySplit[keySplit.length - 1]}`;
      const file = fs.createWriteStream(localFile);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });

      AWSS3.send(command, (error, response) => {
        const s3Stream = response.Body.pipe(file);
        s3Stream.on('finish', () => {
          // Return local file
          // console.log('+///+down+++++ DOWNLOADED:', localFile);
          callback(null, localFile);
        });
        s3Stream.on('error', (err) => {
          // Handle some errors, returning to API
          logger.error(err);
          callback(err);
        });
      });
    } else {
      callback(new Error('Key is empty'));
    }
  },
  async publicS3Link(key, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    let error;
    let url;
    try {
      const command = new GetObjectCommand({ Bucket: process.env.S3_bucket, Key: key });
      url = await getSignedUrl(AWSS3, command, { expiresIn: 60 * 60 });
    } catch (err) {
      logger.error(err);
      error = err;
    }
    callback(error, url);
  },
  async publicLink24Hours(key, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    let error;
    let url;
    try {
      const command = new GetObjectCommand({ Bucket: process.env.S3_bucket, Key: key });
      url = await getSignedUrl(AWSS3, command, { expiresIn: 60 * 60 * 24 });
    } catch (err) {
      logger.error(err);
      error = err;
    }
    callback(error, url);
  },
  async publicLink7Days(key, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    let error;
    let url;
    try {
      const command = new GetObjectCommand({ Bucket: process.env.S3_bucket, Key: key });
      url = await getSignedUrl(AWSS3, command, { expiresIn: 60 * 60 * 24 * 7 });
    } catch (err) {
      logger.error(err);
      error = err;
    }
    callback(error, url);
  },
  async publicLink7DaysPromisify(key) {
    return new Promise((resolve, reject) => {
      this.publicLink7Days(key, (error, response) => {
        if (error) {
          reject(error);
        } else if (response) {
          resolve(response);
        } else {
          reject(new Error('PublicLink7Days did not produce an error or a url'));
        }
      });
    });
  },
  getFileSize(key, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    const command = new HeadObjectCommand({ Bucket: process.env.S3_bucket, Key: key });
    AWSS3.send(command, (err, response) => {
      if (err) {
        callback(err);
      } else if (response) {
        callback(err, response.ContentLength);
      } else {
        callback();
      }
    });
  },
  getUploaderCredentials(path, data, callback) {
    let key = path + sanitize(data.filename);
    key = key.replace(/&/g, 'and');
    const readType = 'bucket-owner-full-control';
    const expiration = moment().add(300, 'm').toDate(); // 300 minutes

    const s3Policy = {
      expiration,
      conditions: [{ bucket: awsBucket },
        ['starts-with', '$key', key], {
          acl: readType,
        }, {
          success_action_status: '201',
        },
        ['starts-with', '$Content-Type', data.type],
        ['content-length-range', 0, 10000485760], // min and max
      ],
    };

    const stringPolicy = JSON.stringify(s3Policy);
    const base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64');

    // sign policy
    const signature = crypto.createHmac('sha1', secretAccessKey).update(new Buffer(base64Policy, 'utf-8')).digest('base64');

    const credentials = {
      url: s3Url,
      fields: {
        key,
        AWSAccessKeyId: accessKeyId,
        acl: readType,
        policy: base64Policy,
        signature,
        'Content-Type': data.type,
        success_action_status: 201,
      },
    };

    callback({ key, credentials });
  },
  /**
   * Copies a S3 storage file to another S3 storage destination
   *
   * * Calls `callback(err, response)` with `response` containing the data retuned by AWS.copyObject
   * * Calls `callback(err, response)` with an `err` message if an error occurs
   *
   * @param {*} sourceKey - Key of the file to copy
   * @param {*} destKey - Destination key
   * @param {*} [options.sourceBucket] - source bucket, if not supplied will use bucket defined in env
   * @param {*} [options.destBucket] - destination bucket, if not supplied will use bucket defined in env
   * @param {function(string, string)} callback - A callback that handles the response
   */
  async copyS3File(sourceKey, destKey, options, callback) {
    const AWSS3 = new S3Client(S3Credentials);
    const copySource = `${options.sourceBucket || process.env.S3_bucket}/${sourceKey}`;
    const destBucket = options.destBucket || process.env.S3_bucket;
    const s3Params = {
      CopySource: copySource,
      Bucket: destBucket,
      Key: destKey,
      ACL: 'bucket-owner-full-control',
    };
    const sourceObjectParams = {
      Bucket: process.env.S3_bucket,
      Key: sourceKey,
    };

    let sourceObjectMetadata;
    try {
      sourceObjectMetadata = await AWSS3.send(new HeadObjectCommand(sourceObjectParams));
    } catch (err) {
      callback(err);
    }

    if (sourceObjectMetadata.ContentLength < (4000 * 1024 * 1024)) {
      try {
        logger.info(`Copying from ${copySource} to ${destBucket}/${destKey}`);
        const command = new CopyObjectCommand(s3Params);
        AWSS3.send(command, (err, response) => {
          if (err) { logger.error(err, err.stack); } else { logger.debug('S3 copy complete', response); }
          callback(err, response);
        });
      } catch (err) {
        callback(err);
      }
    } else {
      copyS3FileMultipart({ callback, destinationKey: destKey, sourceKey });
    }
  },
};
