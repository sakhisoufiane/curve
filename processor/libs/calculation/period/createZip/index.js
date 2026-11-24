const { logger, fileManager, createZip, utils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');

const Client = require('../../../../models/client');
const Statement = require('../../../../models/statement');
const CreateSalesZip = require('./createSalesZip');
const exportNotification = require('../../../exportNotification/exportNotification');
const { getExportDisplayName } = require('./utils');

async function createStatementZip(period, email, file, callback) {
  if (!file) {
    logger.error(`Error in createZipOfStatements for period ${period._id}. A file must be specified for the export`);
    return callback(new Error('createZipOfStatements requires a file to be specified for the export'));
  }

  const files = [];
  const client = await Client.findById(period.clientId);
  logger.info(`Period Statements Zip: Creating zip with file ${file}`);

  if (file === 'salesCsv') {
    try {
      await CreateSalesZip.createSalesZips({ client, period, email });
      return callback();
    } catch (err) {
      logger.error(`Error in createSalesZip for period ${period._id}`, err);
      return callback(err);
    }
  }

  // If exporting statement pdfs, check if custom statements exist
  const fields = [file];
  if (file === 'pdf') fields.push('customStatement');

  const statements = await Statement.find({ clientId: period.clientId, periodId: period._id.toString() }, fields);
  logger.info(`Period Statements Zip: Prepare to zip ${statements.length} statements for period ${period._id}`);

  for (const selectedField of fields) {
    // eslint-disable-next-line no-await-in-loop
    await async.each(statements, async (statement) => {
      if (statement[selectedField]) files.push(statement[selectedField]);
    });
  }

  if (files.length === 0) {
    logger.error(`Error in createZipOfStatements for period ${period._id}. No ${file} found in statements`);
    return callback(new Error('No statements found for period'));
  }

  const exportName = getExportDisplayName(file, client.clientType);
  const safeName = utils.safeName(`${period.name} - ${exportName}`);
  logger.info(`Period Statements Zip: Zipping files for period ${period._id}`);

  const zipFile = await new Promise((resolve, reject) => {
    const zipFilepath = `${appRootDir}/tmp/${safeName} Zip ${moment().format('YYYYMMDDHHmmssSSS')}.zip`;
    createZip.s3Files(files, process.env.S3_bucket, zipFilepath, (err, zipFile) => {
      if (err) reject(err);
      else resolve(zipFile);
    });
  }).catch((err) => {
    logger.error(`Error in createZipOfStatements for period ${period._id}. Error returned by createZip.s3Files: ${err}`);
    return callback(err);
  });

  logger.info(`Period Statements Zip: Completed Zip for period ${period._id} - ${zipFile}`);
  logger.info(`Period Statements Zip: Uploading Zip to S3 for period ${period._id}`);

  try {
    await new Promise((resolve, reject) => {
      fileManager.uploadToS3(`periods/${period._id.toString()}/${safeName}.zip`, zipFile, async (err, s3Key) => {
        if (err) reject(err);
        else {
          fs.unlink(zipFile, () => {
            fileManager.publicLink24Hours(s3Key, async (err, publicKey) => {
              if (err) {
                reject(err);
                return;
              }

              try {
                const emailList = email && email.search(',') > -1 ? email.split(',') : [email];
                await Promise.all(emailList.map((currentEmail) => exportNotification.sendBulkExportNotification({
                  exportName,
                  periodName: period.name,
                  urls: [{ url: publicKey, name: exportName }],
                  client,
                  email: currentEmail,
                  identifier: 'statementAllFilesExportZip',
                  exportScope: 'period',
                  linkAvailabilityText: '24 hours',
                })));
                resolve();
              } catch (notificationError) {
                reject(notificationError);
              }
            });
          });
        }
      });
    });
    callback();
  } catch (err) {
    logger.error(`Error in createZipOfStatements for period ${period._id}. Error returned by fileManager.uploadToS3: ${err}`);
    callback(err);
  }
}

module.exports = {
  createStatementZip,
};
