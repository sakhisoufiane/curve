const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const { logger, createZip, fileManager } = require('@curveroyaltysystems/platform-shared-utils');

module.exports = (files, failures, callback) => {
  let filesToZip = files.concat(failures);
  const filePath = `${appRootDir}/tmp/Platoon SAP Files ${moment().format('X')}.zip`;
  logger.info(`Platoon: Zipping Files ${filesToZip.join('|')}`);
  // Remove files that don't exist
  filesToZip = filesToZip.filter((file) => fs.existsSync(file));
  // Generate the zip
  createZip.localFiles(filesToZip, filePath, (err) => {
    if (err) {
      return callback(err);
    }
    // Upload to S3
    logger.info('Platoon: Zip created, uploading to S3');
    fileManager.uploadToS3(`exports/Platoon SAP Files ${moment().format('X')}.zip`, filePath, (err, key) => {
      if (key) {
        fileManager.publicLink24Hours(key, callback);
      } else {
        callback(err);
      }
    });
  });
};
