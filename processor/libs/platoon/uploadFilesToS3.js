const { fileManager, logger } = require('@curveroyaltysystems/platform-shared-utils');
const path = require('path');
const { eachLimit } = require('async');

// Upload files to s3
module.exports = (files, s3Prefix, callback) => {
  const output = [];
  eachLimit(files, 3, (file, cb) => {
    logger.info(`Platoon: Uploading file ${s3Prefix}/${path.basename(file)}`);
    fileManager.uploadToS3(`${s3Prefix}/${path.basename(file)}`, file, (err, key) => {
      if (key) {
        output.push(key);
        cb();
      } else {
        cb(err);
      }
    });
  }, (err) => {
    callback(err, output);
  });
};
