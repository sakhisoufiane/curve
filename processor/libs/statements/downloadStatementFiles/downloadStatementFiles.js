/* eslint-disable no-await-in-loop */
const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const Statement = require('../../../models/statement');
const Client = require('../../../models/client');
const { closeStream, uploadFile, createZipStream, getFileSize, addFileToZip, getSignedS3Urls } = require('../../util/fileUtils');
const exportNotification = require('../../exportNotification/exportNotification');

const MAX_ZIP_SIZE = 5 * 1024; // 5GB

async function downloadFileFromS3(fileKey) {
  const localFile = await new Promise((resolve, reject) => {
    fileManager.downloadFromS3(fileKey, process.env.S3_bucket, null, (err, localFile) => {
      if (err) reject(err);
      else resolve(localFile);
    });
  });
  return localFile;
}

/**
 * Downloads ALL statement files for the specified statement IDs and sends a notification to the specified email address.
 * If the total size of the files is greater than the max zip size, the files will be split into multiple zip files.
 * @param {string[]} statementIds - The IDs of the statements to download.
 * @param {string} clientName - The name of the client.
 * @param {string} email - The email address to send the notification to.
 * @param {number} maxZipSize - The maximum size of the zip file in MB.
 */
async function downloadStatementFiles(statementIds, clientName, email, maxZipSize = MAX_ZIP_SIZE) {
  const exportTimestamp = moment().format('YYYYMMDDHHmmssSSS');
  const logKey = `${exportTimestamp} - ${clientName} | Download Selected Statements Zip`;

  const statements = await Statement.find({ _id: { $in: statementIds } });

  if (statements.length === 0) {
    logger.error(`No statements found for client ${clientName}`);
    throw new Error('No statements found for client');
  }
  const client = await Client.findById(statements[0].clientId);

  let zipSize = 0;
  let zipIndex = 0;
  let outputStream = null;
  let zipStream = null;

  const rootZipFilePath = utils.safeName(`${exportTimestamp} - ${clientName} Statement Export`);
  // Used to ensure unique file names in the zip
  let fileNamesInZip = [];
  // Used to store the file keys of the uploaded final zips
  const fileKeys = [];
  let currentZipFilePath = null;

  const zipComplete = async () => {
    await closeStream(outputStream, zipStream);

    logger.info(logKey, 'ZIP written to:', currentZipFilePath);
    const fileName = currentZipFilePath.split('/').pop();
    const fileKey = `statements/${clientName}/${fileName}`;

    logger.info(logKey, 'Uploading ZIP to S3:', fileKey);
    await uploadFile(currentZipFilePath, fileKey);
    fileKeys.push(fileKey);
  };

  for (const statement of statements) {
    const { allFilesZip } = statement;
    logger.info(`Downloading statement: ${statement._id}`);
    const localFile = await downloadFileFromS3(allFilesZip).catch((err) => {
      logger.error(`Error downloading statement: ${statement._id}`, err);
      throw err;
    });

    const size = getFileSize(localFile);

    // If the zip stream exists and the size of the current zip is greater than the max zip size, write the current zip to S3 and reset the zip state
    if (zipStream && (zipSize + size > (maxZipSize))) {
      logger.info(logKey, 'ZIP reached max size, finalising and writing');
      await zipComplete();
      logger.info(logKey, 'Resetting zip state');
      outputStream = null;
      zipStream = null;
      zipIndex += 1;
      zipSize = 0;
      currentZipFilePath = null;
      fileNamesInZip = [];
    }

    // No zip stream exists yet, create a new one
    if (!zipStream) {
      let fileName = `${rootZipFilePath}`;
      fileName += ` - ${(zipIndex + 1).toString().padStart(4, '0')}`;
      currentZipFilePath = `${appRootDir}/tmp/${fileName}.zip`;
      ({ outputStream, zipStream } = createZipStream(currentZipFilePath));
      logger.info('Created new ZIP writer:', currentZipFilePath);
    }

    if (!outputStream || !zipStream) throw new Error('Error creating ZIP stream');
    zipSize += size;

    logger.info(`Adding statement ${statement._id} to zip (${size}MB)`);
    const addedFileName = await addFileToZip(localFile, zipStream, fileNamesInZip);
    fileNamesInZip.push(addedFileName);
  }
  // Close the final zip stream
  if (zipStream) {
    logger.info(logKey, 'Closing final zip stream');
    await zipComplete();
  }

  // Generate public links
  const urls = await getSignedS3Urls(fileKeys);

  logger.info(logKey, 'Finished exporting all Statements, zips created:', fileKeys.length);

  await exportNotification.sendBulkExportNotification({
    exportName: 'Selected Statements',
    exportScope: 'selectedStatements',
    periodName: null,
    urls,
    client,
    email,
    identifier: 'statementAllFilesExportZip',
  });
}

module.exports = {
  downloadStatementFiles,
};
