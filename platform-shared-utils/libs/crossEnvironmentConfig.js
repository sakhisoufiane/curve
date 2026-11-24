/* eslint-disable max-len */
const protocol = 'mongodb+srv://';
const options = 'retryWrites=true&w=majority';
const region = 'eu-west-1';
const dbName = 'curve-production';

// Production Config
const productionConfig = {
  mongo: {
    dbName,
    dbUrl: 'production.2sp2l.mongodb.net',
    username: process.env.DB_USER_PROD,
    password: process.env.DB_PASS_PROD,
  },
  s3: {
    region,
    accessKeyId: process.env.S3_access_key_PROD,
    secretAccessKey: process.env.S3_secret_key_PROD,
    bucket: process.env.S3_bucket_PROD,
  },
};

// Staging Config
const stagingConfig = {
  mongo: {
    dbName,
    dbUrl: 'curvestaging.xseuw.mongodb.net',
    username: process.env.DB_USER_STAGING,
    password: process.env.DB_PASS_STAGING,
  },
  s3: {
    region,
    accessKeyId: process.env.S3_access_key_STAGING,
    secretAccessKey: process.env.S3_secret_key_STAGING,
    bucket: process.env.S3_bucket_STAGING,
  },
};

// Define the mongo uris
const productionUri = `${protocol}${productionConfig.mongo.username}:${productionConfig.mongo.password}@${productionConfig.mongo.dbUrl}/${productionConfig.mongo.dbName}?${options}`;
const stagingUri = `${protocol}${stagingConfig.mongo.username}:${stagingConfig.mongo.password}@${stagingConfig.mongo.dbUrl}/${stagingConfig.mongo.dbName}?${options}`;

module.exports = {
  productionUri,
  stagingUri,
  productionS3Config: productionConfig.s3,
  stagingS3Config: stagingConfig.s3,
};
