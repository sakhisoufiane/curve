/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');

const { closeStream, uploadFile, createZipStream, getFileSize, addFileToZip, getSignedS3Urls } = require('../../../util/fileUtils');
const Statement = require('../../../../models/statement');
const Period = require('../../../../models/period');
const { getExportDisplayName } = require('./utils');
const exportNotification = require('../../../exportNotification/exportNotification');

const MAX_ZIP_SIZE = 5 * 1024; // 5GB

async function createSalesZips({ client, period, email, maxZipSize = MAX_ZIP_SIZE }) {
  const logKey = `${period._id.toString()} | Create Statement Sales Zip |`;
  const filter = { clientId: period.clientId, periodId: period._id.toString() };
  const fields = ['salesCsv'];
  const statements = await Statement.find(filter, fields);
  if (statements.length === 0) {
    logger.error(logKey, `No statements found to zip for Period ${period._id.toString()}`);
    throw new Error(`No statements found to zip for Period ${period._id.toString()}`);
  }
  logger.info(logKey, 'Statements to zip:', statements.length);

  let zipSize = 0;
  let zipIndex = 0;
  let outputStream = null;
  let zipStream = null;
  let zipFilePath = null;
  let fileNamesInZip = [];
  const fileKeys = [];
  const exportTimestamp = moment().format('YYYYMMDDHHmmssSSS');

  const zipComplete = async (periodId) => {
    logger.info(logKey, 'ZIP reached max size, finalising and writing');
    await closeStream(outputStream, zipStream);

    logger.info(logKey, 'ZIP written to:', zipFilePath);
    const fileName = zipFilePath.split('/').pop();
    const fileKey = `periods/${periodId}/${fileName}`;

    logger.info(logKey, 'Uploading ZIP to S3:', fileKey);
    await uploadFile(zipFilePath, fileKey);
    fileKeys.push(fileKey);
  };

  for (const statement of statements) {
    logger.info(logKey, 'Downloading statement:', statement.salesCsv);
    const localFile = await downloadStatement(statement.salesCsv)
      .catch((err) => {
        logger.error(logKey, `Error downloading statement: ${statement._id}`, err);
        throw err;
      });
    const size = getFileSize(localFile);

    // ZIP has reached max size of 5GB
    // Close stream and upload to S3
    if (zipStream && (zipSize + size > (maxZipSize))) {
      await zipComplete(period._id.toString());
      // Reset zip state
      outputStream = null;
      zipStream = null;
      zipIndex += 1;
      zipSize = 0;
      zipFilePath = null;
      fileNamesInZip = [];
    }

    // No zip stream exists yet, create a new one
    if (!zipStream) {
      const exportName = getExportDisplayName('salesCsv', client.clientType);
      const safeName = utils.safeName(`${period.name} - ${exportName}`);
      let fileName = `${safeName} Zip ${exportTimestamp}`;
      if (zipIndex > 0) fileName += ` - ${(zipIndex + 1).toString().padStart(3, '0')}`;
      zipFilePath = `${appRootDir}/tmp/${fileName}.zip`;
      ({ outputStream, zipStream } = createZipStream(zipFilePath));
      logger.info(logKey, 'Created new ZIP writer:', zipFilePath);
    }

    if (!outputStream || !zipStream) throw new Error('Error creating ZIP stream');
    zipSize += size;

    logger.info(logKey, `Adding statement ${statement._id} to zip (${size}MB)`);
    const addedFileName = await addFileToZip(localFile, zipStream, fileNamesInZip);
    fileNamesInZip.push(addedFileName);
  }

  // If we've finished processing the statements and there is an incomplete zip remaining
  if (zipStream) await zipComplete(period._id.toString());

  // Generate public links
  const urls = await getSignedS3Urls(fileKeys);

  // Add S3 file keys to the Period
  logger.info(logKey, 'Saving file keys on Period');
  await saveFileKeys(period._id, client._id.toString(), fileKeys, urls.map(({ url }) => url));

  logger.info(logKey, 'Finished exporting all statements for Period, zips created:', fileKeys.length);

  logger.info(logKey, 'Sending export notification to:', email);
  await exportNotification.sendBulkExportNotification({
    exportName: 'All Sales',
    periodName: period.name,
    exportScope: 'period',
    urls,
    client,
    email,
    identifier: 'statementSalesExportZips',
  });
}

async function downloadStatement(fileKey) {
  const localFile = await new Promise((resolve, reject) => {
    fileManager.downloadFromS3(fileKey, process.env.S3_bucket, null, (err, localFile) => {
      if (err) reject(err);
      else resolve(localFile);
    });
  });
  return localFile;
}

async function saveFileKeys(periodId, clientId, fileKeys, urls) {
  const filter = { _id: periodId, clientId };
  const query = {
    statementSalesExportFileKeys: fileKeys,
    statementSalesExportZipsPublicLinks: urls,
  };
  await Period.updateOne(filter, query);
}

module.exports = {
  // Entry
  createSalesZips,
  // Methods
  downloadStatement,
  addFileToZip,
  saveFileKeys,
};
