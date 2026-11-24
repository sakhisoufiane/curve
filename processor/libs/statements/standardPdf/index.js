const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

module.exports = function (event, callback) {
  const Statement = event.contractType === 'Profit Share' || event.contractType === 'Profit Share - Flexible' ? require('./libs/profitShareStatement') : require('./libs/standardStatement');

  fileManager.downloadStatementLogoFromS3(event.logo, event.s3LogoPath, event.bucket, (err, localFile) => {
    event.logo = localFile;
    const statement = new Statement(event);
    const filename = utils.safeNameWithRandomString(event.contractName);
    statement.create(`${appRootDir}/tmp/${filename}.pdf`, (fileLocation) => {
      fileManager.uploadToS3(event.s3WriteKey, fileLocation, (err, key) => {
        logger.debug(key);
        callback(err, key);
      });
    });
  });
};
