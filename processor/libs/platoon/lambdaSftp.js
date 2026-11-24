const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const path = require('path');
const moment = require('moment');
const lambdas = require('./lambdas');

const runDelivery = (remoteFiles, callback) => {
  const successfulFiles = [];
  const failedFiles = [];
  eachLimit(remoteFiles, 10, async (file) => new Promise((resolve, reject) => {
    const remoteLocation = `out/${path.basename(file)}`;
    const params = {
      s3Key: file,
      sftpPath: remoteLocation,
    };
    logger.info(`Platoon: Sending File ${path.basename(file)} ${moment().format('YYYY-MM-DD HH:mm:ss:SSS')}`);
    lambdas.sftp(params).then((response) => {
      const remoteResponse = JSON.parse(Buffer.from(response.Payload).toString());
      if (remoteResponse?.complete) {
        logger.info(`Platoon: Completed Sending File ${path.basename(file)} ${moment().format('YYYY-MM-DD HH:mm:ss:SSS')}`);
        successfulFiles.push(remoteLocation);
        resolve();
      } else {
        logger.error(`Platoon: Failed Sending File ${path.basename(file)} ${moment().format('YYYY-MM-DD HH:mm:ss:SSS')}`);
        logger.error(remoteResponse);
        failedFiles.push(file);
        resolve();
      }
    });
  }), (err) => {
    callback(err, successfulFiles, failedFiles);
  });
};

const deliveryLoop = (remoteFiles, tries, callback) => {
  tries += 1;
  runDelivery(remoteFiles, (err, successfulFiles, failedFiles) => {
    // If failed files, try again up to limit to 5 tries
    if (failedFiles.length > 0 && tries <= 5) {
      logger.info(`Platoon: Retrying ${failedFiles.length} files`);
      logger.info(`Platoon: Retrying ${failedFiles.join(',')}`);
      deliveryLoop(failedFiles, tries, callback);
    } else {
      callback(err, successfulFiles, failedFiles);
    }
  });
};

module.exports = (remoteFiles, callback) => {
  deliveryLoop(remoteFiles, 0, callback);
};
