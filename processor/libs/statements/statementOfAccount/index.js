const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./libs/standardTransaction');

module.exports = function (event, callback) {
  fileManager.downloadStatementLogoFromS3(event.logo, event.s3LogoPath, event.bucket, (err, localFile) => {
    event.logo = localFile;
    const statement = new Statement(event);
    const filename = utils.safeNameWithRandomString(event.contractName);
    statement.create(`/tmp/${filename}.pdf`, (fileLocation) => {
      fileManager.uploadToS3(event.s3WriteKey, fileLocation, (err, key) => {
        logger.debug(err);
        logger.debug(key);
        callback(err, key);
      });
    });
  });
};
