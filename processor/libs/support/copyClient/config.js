const _ = require('lodash');
const { S3Client } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const { crossEnvironmentConfig } = require('@curveroyaltysystems/platform-shared-utils');

const { stagingUri, productionUri, stagingS3Config, productionS3Config } = crossEnvironmentConfig;

const Config = {
  getCopyConfig: (env) => {
    // Define the AWS Objects
    const ProductionAWSS3 = new S3Client({
      credentials: {
        accessKeyId: productionS3Config.accessKeyId,
        secretAccessKey: productionS3Config.secretAccessKey,
      },
      region: productionS3Config.region,
      bucket: productionS3Config.bucket,
    });

    const StagingAWSS3 = new S3Client({
      credentials: {
        accessKeyId: stagingS3Config.accessKeyId,
        secretAccessKey: stagingS3Config.secretAccessKey,
      },
      region: stagingS3Config.region,
      bucket: stagingS3Config.bucket,
    });

    const BetaAWSS3 = new S3Client({
      credentials: {
        accessKeyId: process.env.Beta_S3_access_key,
        secretAccessKey: process.env.Beta_S3_secret_key,
      },
      region: process.env.Beta_S3_region,
      bucket: process.env.Beta_S3_bucket,
    });
    const betaProtocol = process.env.Beta_DB_PROTOCOL;
    const betaUser = process.env.Beta_DB_USER;
    const betaPassword = process.env.Beta_DB_PASS;
    const betaDbUrl = process.env.Beta_DB_URL;
    const betaDbName = process.env.Beta_DB_NAME;
    const betaDbOps = process.env.Beta_DB_OPTS;
    const betaUri = `${betaProtocol}${betaUser}:${betaPassword}@${betaDbUrl}/${betaDbName}?${betaDbOps}`;
    // Set environment objects
    const PRODUCTION = { dbUri: productionUri, bucket: productionS3Config.bucket, AWSS3: ProductionAWSS3, isProduction: true };
    const STAGING = { dbUri: stagingUri, bucket: stagingS3Config.bucket, AWSS3: StagingAWSS3, isProduction: false };
    const BETA = { dbUri: betaUri, bucket: process.env.Beta_S3_bucket, AWSS3: BetaAWSS3, isProduction: false };

    switch (env.toUpperCase()) {
      case 'PRODUCTION':
        return PRODUCTION;
      case 'STAGING':
        return STAGING;
      case 'BETA':
        return BETA;
      default:
        throw new Error(`Unknown environment in getCopyConfig: ${env}`);
    }
  },

  crossEnvConfig: () => ({
    sourceBucket: productionS3Config.bucket,
    destinationBucket: stagingS3Config.bucket,
    devId: '08dbdec33d0df296d54972dc530f154baf40886dd611d766ddfcd78b769dd4c1',
    stagingId: 'b5743c187ac4e160810c9959278a9b6d267e37f8c6eef6d86cc521a52fbe6942',
    AWSS3: new S3Client({
      credentials: {
        accessKeyId: process.env.S3_access_key_CROSS_ENV,
        secretAccessKey: process.env.S3_secret_key_CROSS_ENV,
      },
      region: 'eu-west-1',
      requestHandler: new NodeHttpHandler({
      // We have 50 sockets, and often are trying to copy thousands of chunks in one go
      // This setting reduces the frequency of warning messages that a socket is not available
        socketAcquisitionWarningTimeout: 30000,
      }),
    }),
  }),
  /**
   * Get the source BigQuery credentials from environment string.
   * Unfortunately for now staging source is production but staging destination is staging
   * so we have to use separate functions for source and destination.
   *
   * @param {string} environment - The environment to get the BigQuery credentials for (production, staging, beta)
   * @returns {object} - The BigQuery credentials
   */
  getSourceBQCredentialsFromEnv: (environment) => {
    switch (environment.toUpperCase()) {
      case 'PRODUCTION':
        return Config.getProductionBQCredentials();
      case 'STAGING':
        return Config.getProductionBQCredentials();
      case 'BETA':
        return Config.getStagingBQCredentials();
      default:
        return Config.getStagingBQCredentials();
    }
  },

  /**
   * Get the destination BigQuery credentials from environment string.
   *
   * @param {string} environment - The environment to get the BigQuery credentials for (production, staging, beta)
   * @returns {object} - The BigQuery credentials
   */
  getDestinationBQCredentialsFromEnv: (environment) => {
    switch (environment.toUpperCase()) {
      case 'PRODUCTION':
        return Config.getProductionBQCredentials();
      case 'STAGING':
        return Config.getStagingBQCredentials();
      case 'BETA':
        return Config.getStagingBQCredentials();
      default:
        return Config.getStagingBQCredentials();
    }
  },

  /**
   * Get BigQuery credentials for the production environment.
   *
   * @returns {object} - The BigQuery credentials
   */
  getProductionBQCredentials: () => ({
    projectId: process.env.BQ_project_id,
    credentials: {
      client_email: process.env.BQ_client_email,
      private_key: process.env.BQ_private_key.replace(/\\n/g, '\n'),
    },
  }),

  /**
   * Get BigQuery credentials for the staging environment.
   *
   * @returns {object} - The BigQuery credentials
   */
  getStagingBQCredentials: () => ({
    projectId: process.env.Staging_BQ_project_id,
    credentials: {
      client_email: process.env.Staging_BQ_client_email,
      private_key: process.env.Staging_BQ_private_key.replace(/\\n/g, '\n'),
    },
  }),
};

module.exports = Config;
