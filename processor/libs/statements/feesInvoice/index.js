const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./libs/standardFeesInvoice');

module.exports = function (event, callback) {
  // output.s3LogoPath = output.logo;
  fileManager.downloadStatementLogoFromS3(event.logo, event.s3LogoPath, event.bucket, (err, localFile) => {
    event.logo = localFile;
    const statement = new Statement(event);
    const filename = utils.safeNameWithRandomString(event.contractName);
    statement.create(`/tmp/${filename}.pdf`, (fileLocation) => {
      fileManager.uploadToS3(event.s3WriteKey, fileLocation, (err, key) => {
        logger.debug(key);
        callback(err, key);
      });
    });
  });
};
