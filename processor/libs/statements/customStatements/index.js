const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();

module.exports = function (event, callback) {
  let Statement;
  if (event.statementDesign === 'Just Music') {
    Statement = require('./libs/justStatement');
  } else if (event.statementDesign === 'Topic') {
    Statement = require('./libs/topicStatement');
  } else if (event.statementDesign === 'Late Night Tales') {
    Statement = require('./libs/lateNightTalesStatement');
    const splitPath = event.s3WriteKey.split('/');
    let fileName = splitPath.pop();
    fileName = event.payeeName ? `${utils.safeName(event.payeeName)} - ${fileName}` : fileName;
    splitPath.push(fileName);
    event.s3WriteKey = splitPath.join('/');
  } else if (event.statementDesign === 'MCPS') {
    Statement = require('./libs/mcpsStatement');
  } else if (event.statementDesign === 'General Ledger Summary') {
    Statement = require('./libs/generalLedgerSummary');
  } else if (event.statementDesign === 'Drag City') {
    Statement = require('./libs/dragCityStatement');
  } else if (event.statementDesign === 'Combined Plus Release Summary') {
    Statement = require('./libs/combinedPlusReleaseSummaryStatement');
  } else {
    Statement = require('./libs/properStatement');
  }
  fileManager.downloadStatementLogoFromS3(event.logo, event.s3LogoPath, event.bucket, (err, localFile) => {
    event.logo = localFile;
    const statement = new Statement(event);
    let filename = utils.safeName(event.contractName);
    if (['Drag City', 'Combined Plus Release Summary'].indexOf(event.statementDesign) !== -1) {
      filename += '.pdf';
      event.s3WriteKey += '.pdf';
    } else {
      filename += '.xlsx';
      event.s3WriteKey += '.xlsx';
    }
    statement.create(`${appRootDir}/tmp/${filename}`, (err, fileLocation) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        fileManager.uploadToS3(event.s3WriteKey, fileLocation, (err, key) => {
          callback(err, key);
        });
      }
    });
  });
};
