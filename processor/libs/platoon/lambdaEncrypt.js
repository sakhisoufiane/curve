const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const lambdas = require('./lambdas');

module.exports = (remoteFiles, outputLocation, callback) => {
  const encryptedFiles = [];
  eachLimit(remoteFiles, 2, async (s3Key, cb) => new Promise((resolve, reject) => {
    logger.info({ s3Key, outputLocation });
    lambdas.encrypt({ s3Key, outputLocation }).then((response) => {
      logger.info(JSON.parse(Buffer.from(response.Payload).toString()));
      const remoteLocation = JSON.parse(Buffer.from(response.Payload).toString());
      encryptedFiles.push(remoteLocation);
      logger.info(`Platoon: Encrypted file ${remoteLocation}`);
      resolve(remoteLocation);
    });
  }), (err) => {
    callback(err, encryptedFiles);
  });
};
