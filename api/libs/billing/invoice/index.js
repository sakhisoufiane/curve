const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const sanitize = require('sanitize-filename');
const Invoice = require('./libs/invoice');

module.exports = function (event, callback) {
  const invoice = new Invoice(event);
  // Setup random string
  const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const filename = sanitize(`Invoice ${randomString}`).split('/').join();
  invoice.create(`${appRootDir}/tmp/${filename}.pdf`, (createErr, fileLocation) => {
    if (createErr) { callback(createErr); return; }
    fileManager.uploadToS3(event.s3WriteKey, fileLocation, (err, key) => {
      logger.debug(key);
      callback(err, key);
    });
  });
};
