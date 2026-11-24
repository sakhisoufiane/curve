require('dotenv').config();
require('../../models/db');
const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { waterfall } = require('async');
const moment = require('moment');
const fs = require('fs');
const {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../../libs/writeCsv');
const Contract = require('../../models/contract');
const Client = require('../../models/client');

const limit = 1000;
let count = 0;
let allContainsInvaidFiles = [];

const newBackupConfig = {
  s3: {
    region: 'eu-west-1',
    accessKeyId: process.env.S3_access_key_BACKUP,
    secretAccessKey: process.env.S3_secret_key_BACKUP,
    bucket: process.env.S3_bucket_BACKUP,
  },
};

const oldProdBackupConfig = {
  s3: {
    region: 'eu-west-1',
    accessKeyId: process.env.S3_access_key_OLDPROD,
    secretAccessKey: process.env.S3_secret_key_OLDPROD,
    bucket: process.env.S3_bucket_OLDPROD,
  },
};

// Define the AWS Objects
const newBackupAWSS3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_access_key_BACKUP,
    secretAccessKey: process.env.S3_secret_key_BACKUP,
  },
  region: 'eu-west-1',
});

const oldProdBackupAWSS3 = new S3Client({
    credentials: {
      accessKeyId: process.env.S3_access_key_OLDPROD,
      secretAccessKey: process.env.S3_secret_key_OLDPROD,
    },
    region: 'eu-west-1',
});

// Set environment objects
const newBackup = { bucket: newBackupConfig.s3.bucket, AWSS3: newBackupAWSS3 };
const oldProdBackup = { bucket: oldProdBackupConfig.s3.bucket, AWSS3: oldProdBackupAWSS3 };

// Define the transfer environments
const copyFromNewBackup = newBackup;
const copyFromOldProdBackup = oldProdBackup;

function runContract(client, lastId, total, save, containsInvaidFiles, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    // if processing another batch, ensure you start after the last release in previous batch.
    filter._id = { $gt: lastId };
  } else {
    containsInvaidFiles = [];
  }
  // query all elements from Contracts and sort by _id - Should we include projection?
  Contract.find(filter).sort({ _id: 1 }).limit(limit).exec((err, contracts) => {
    async.eachLimit(contracts, 50, (contract, cb) => {
      count += 1;
      // process.stdout.write(`\r${count}/${contracts.length+total} - ${contract._id} - ${contract.name}`);
      lastId = contract._id;
      // Do the check against the file size on s3
      if (contract?.files?.length > 0) {
        async.each(contract?.files, (contractFile, contractFileCb) => {
          fileManager.getFileSize(contractFile.key, (errGetSize) => {
            const doesFileExist = (errGetSize) ? 'deleted' : 'exists';
            if (doesFileExist === 'deleted') {
              // Do the check against the file size on new backup
              getFileSize(contractFile.key, copyFromNewBackup, (errGetSize) => {
                const doesFileExist = (errGetSize) ? 'deleted' : 'exists';
                if (doesFileExist === 'deleted') {
                  // Do the check against the file size on old prod backup
                  getFileSize(contractFile.key, copyFromOldProdBackup, (errGetSize) => {
                    const doesFileExist = (errGetSize) ? 'deleted' : 'exists';
                    if (doesFileExist === 'deleted') {
                      containsInvaidFiles.push({ client: client.name, id: contract._id, contractName: contract.name, file: `${contractFile.key}`, existsNowhere: doesFileExist });
                      contractFileCb();
                    } else {
                      containsInvaidFiles.push({ client: client.name, id: contract._id, contractName: contract.name, file: `${contractFile.key}`, existsOldBackup: doesFileExist });
                      // If file exists and we want to recover the files from old prod backup
                      if (save && save === 'true') {
                        waterfall([
                          (waterfallCb) => {
                            // Download file
                            downloadFromS3(contractFile.key, copyFromOldProdBackup.bucket, null, copyFromOldProdBackup, waterfallCb);
                          },
                          (localFile, waterfallCb) => {
                            // Upload to S3
                            fileManager.uploadToS3(contractFile.key, localFile, waterfallCb);
                          },
                          (updatedKey, waterfallCb) => {
                            // Uploaded
                            console.log(updatedKey);
                            waterfallCb();
                          },
                        ], contractFileCb);
                      } else {
                        contractFileCb();
                      }
                    }
                  });
                } else {
                  containsInvaidFiles.push({ client: client.name, id: contract._id, contractName: contract.name, file: `${contractFile.key}`, existsNewBackup: doesFileExist });
                  // If file exists and we want to recover the files from new backup
                  if (save && save === 'true') {
                    waterfall([
                      (waterfallCb) => {
                        // Download file
                        downloadFromS3(contractFile.key, copyFromNewBackup.bucket, null, copyFromNewBackup, waterfallCb);
                      },
                      (localFile, waterfallCb) => {
                        // Upload to S3
                        fileManager.uploadToS3(contractFile.key, localFile, waterfallCb);
                      },
                      (updatedKey, waterfallCb) => {
                        // Uploaded
                        console.log(updatedKey);
                        waterfallCb();
                      },
                    ], contractFileCb);
                  } else {
                    contractFileCb();
                  }
                }
              });
            } else {
              // containsInvaidFiles.push({ client: client.name, id: contract._id, contractName: contract.name, file: `${contractFile.key}`, exists: doesFileExist });
              contractFileCb();
            }
          });
        }, (err) => {
          if (err) { console.log(err) };
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      if (err) { console.log(err) };
      // should we go get the next 'limit' documents
      if (contracts && contracts.length === limit) {
        runContract(client, lastId, total + limit, save, containsInvaidFiles, callback);
      } else {
        if (containsInvaidFiles?.length > 0) {
          const combinedArray = allContainsInvaidFiles.concat(containsInvaidFiles);
          allContainsInvaidFiles = combinedArray;
        }
        callback();
      }
    });
  });
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All copied Contracts')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          console.log(`>>>>>> processing client ${client.name} <<<<<<`);
          count = 0;
          runContract(client, null, 0, save, null, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
    process.exit(-1);
  } else {
    const outputLocation = `${appRootDir}/tmp/checkForContractDeletedFiles.csv`;
    const writer = new WriteCsv({ headers: ['client', 'id', 'contract', 'file', 'exists', 'existsNewBackup', 'existsOldBackup', 'Nowhere'], outputLocation });
    const outputData = allContainsInvaidFiles.map((line) => [line.client, line.id, line.contractName, line.file, line.exists, line.existsNewBackup, line.existsOldBackup, line.existsNowhere]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});

// --------- s3 file operations ----------

function getFileSize(key, backup, callback) {
  const thisAWSS3 = backup.AWSS3;
  const awsBucket = backup.bucket;
  const command = new HeadObjectCommand({ Bucket: awsBucket, Key: key });
  thisAWSS3.send(command, (err, data) => {
    if (err) {
      callback(err);
    } else if (data) {
      callback(err, data.ContentLength);
    } else {
      callback();
    }
  });
}

function downloadFromS3(key, bucket, options, backup, cb) {
  // Avoid param reassign
  let callback = cb;
  // Fallback when no options are passed
  if (!callback) { callback = options; }
  // Check if key exists
  if (key) {
    console.log(`Downloading: ${key}`);
    const keySplit = key.split('/');
    // Download file
    // const localFile = `${appRootDir}/tmp/${moment().format('YYYYMMDDHHmmSSsss')}${keySplit[keySplit.length - 1]}`;
    const sanitizedKey = keySplit[keySplit.length - 1];
    let localFile = `${appRootDir}/tmp/${sanitizedKey}`;
    // Add timestamp to the local file name
    if (options && options.addTimestamp) {
      const filename = sanitizedKey.substr(0, sanitizedKey.lastIndexOf('.'));
      const fileExtension = sanitizedKey.substr(sanitizedKey.lastIndexOf('.') + 1);
      localFile = `${appRootDir}/tmp/${filename}-${moment().format('x')}.${fileExtension}`;
    }
    const file = fs.createWriteStream(localFile);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    backup.AWSS3.send(command, (err, data) => {
        const s3Stream = data.Body.pipe(file);
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
          callback(err);
        });
    });
  } else {
    callback(new Error('Key is empty'));
  }
}
