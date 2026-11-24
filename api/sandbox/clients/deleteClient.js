require('../models/db');
require('dotenv').config();
const { logger, crossEnvironmentConfig } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const deleteClients = require('../processes/deleteClients');

const protocol = 'mongodb+srv://';
const options = 'retryWrites=true&w=majority';
const region = 'eu-west-1';
const dbName = 'curve-production';
// Production Config
// const productionConfig = {
//   mongo: {
//     dbName,
//     dbUrl: 'production.2sp2l.mongodb.net',
//     username: process.env.DB_USER_PROD,
//     password: process.env.DB_PASS_PROD,
//   },
//   s3: {
//     region,
//     accessKeyId: process.env.S3_access_key_PROD,
//     secretAccessKey: process.env.S3_secret_key_PROD,
//     bucket: process.env.S3_bucket_PROD,
//   },
// };

// Staging Config
const stagingConfig = {
  mongo: {
    dbName,
    dbUrl: 'curvestaging.xseuw.mongodb.net',
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
  },
  s3: {
    region,
    accessKeyId: process.env.S3_access_key_STAGING,
    secretAccessKey: process.env.S3_secret_key_STAGING,
    bucket: process.env.S3_bucket_STAGING,
  },
};

// Define the mongo uris
// const productionUri = `${protocol}${productionConfig.mongo.username}:${productionConfig.mongo.password}@${productionConfig.mongo.dbUrl}/${productionConfig.mongo.dbName}?${options}`;
const stagingUri = `${protocol}${stagingConfig.mongo.username}:${stagingConfig.mongo.password}@${stagingConfig.mongo.dbUrl}/${stagingConfig.mongo.dbName}?${options}`;
console.log(stagingUri);

const deleteClient = async (clientId) => {
  const logText = 'ProductionClientDeletion';
  // Find specific client
  const filter = { _id: ObjectId(clientId) };

  await deleteClients(stagingUri, filter, logText, stagingConfig.s3).catch((err) => {
    if (err) {
      logger.error(`${logText}: Production DB clean up failed`, err);
    } else {
      logger.info(`${logText}: Production DB clean up complete`);
    }
  });
};

deleteClient('5dc2b2bd059a0d335718030a');
