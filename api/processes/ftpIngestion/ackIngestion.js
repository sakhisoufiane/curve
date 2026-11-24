/* eslint-disable no-async-promise-executor */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
const { logger, Bucket } = require('@curveroyaltysystems/platform-shared-utils');

const moment = require('moment');
const { eachSeries } = require('async');
const appRootDir = require('app-root-dir').get();

const FTPLogs = require('../../models/ftpLogs');

const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const ftpHelpers = require('./ftpHelpers');
const CWRAcknowledgement = require('../../models/cwrAcknowledgement');
const User = require('../../models/user');

const { allowedAckExtensions } = require('../../config.json');
const Client = require('../../models/client');

const ACKIngestion = this;

ACKIngestion.ingest = async ({ server, client, logText }) => {
  await runIngestionProcess({ server, clientId: client._id, logText })
    .then(async () => {
      // Successful ingestion, clear any errors
      server.error = null;
      // If the server hasn't been initialised before, set the initialisedDate to prevent further inclusion in initialisation runs and for ui display
      if (!server.initialisedDate) {
        server.initialisedDate = moment().format();
        server.retries = 0;
        ftpHelpers.createNotifications(client, server.name, true, null, () => {});
      } else {
      // Set the lastSuccessfulCheck for ui display
        server.lastSuccessfulCheck = moment().format();
      }
      await client.save();
    })
    .catch(async (error) => {
      // Save error against the server
      logger.debug(error);
      logger.error(`${logText}: ${client._id.toString()} - ${client.name} - ${error}`);
      server.error = `${error.message} : ${moment().format()}`;

      if (server.retries > 5) {
        server.active = false;
        server.retries = 0;
        ftpHelpers.createNotifications(client, server.name, !server.initialisedDate, error, () => {});
      } else {
      // Increment count if an error has occurred
        server.retries += 1;
      }

      await client.save();
    });
};

/**
   * Ingests ACK files from the clients' FTP server.
   *
   * @param {object} server - FTP server details
   * @param {string} clientId - Client ID
   * @param {string} logText - Used to identify logs
   */
const runIngestionProcess = async ({ server, clientId, logText }) => {
  const rootDir = server.directory || '/';
  const defaultPort = (server.protocol === 'SFTP') ? 22 : 21;
  const client = await Client.findById(clientId).select('name');

  const ftpParams = {
    protocol: server.protocol,
    host: server.host,
    username: server.username,
    password: server.password,
    port: server.port || defaultPort,
    authenticationType: server.authenticationType,
    privateKey: server.fileKey,
  };

  if (['FTPES', 'FTPS'].includes(server.protocol)) { ftpParams.secure = (server.protocol === 'FTPS') ? 'implicit' : true; }

  const ftp = (server.protocol === 'SFTP') ? new Sftp(ftpParams) : new Ftp(ftpParams);
  const recursive = server.recursive || false;
  const isFirstPass = !server.initialisedDate;// true/false based on whether last check has a value or not

  // Connect to the server
  await ftp.connect(server.host, client._id, logText, client.name);

  // Read files
  const { ftpFiles, zipFiles } = await new Promise((resolve, reject) => {
    const ignoredFiles = [];
    ftpHelpers.readAllFiles(ftp, server, rootDir, isFirstPass, ignoredFiles, recursive, [], [], [], null, true, (err, zipFiles, gZipFiles, ftpFiles) => {
      if (err) { return reject(err); }
      // Some files may be zip files, so we are returning both
      resolve({ ftpFiles, zipFiles });
    }, logText, clientId, client.name);
  });

  // Organise file into an array
  let files = [];
  if (ftpFiles?.length) { files = files.concat(ftpFiles); }
  // Get list of previously ingested files
  const ftpLogs = await FTPLogs.find({ clientId, type: 'ACK' });
  // Merge the files array of different buckets into one
  const previouslyIngestedFiles = ftpLogs.map((log) => log.files).flat(1);
  // Filter out already ingested files
  // A file is considered already ingested if a record exists where:
  // 1. The file name is the same
  // 2. The server is the same (username@host)
  // 3. The upload date on the server is the same
  let filesToIngest = files.filter((file) => {
    const previouslyIngested = previouslyIngestedFiles.find((previouslyIngestedFile) => previouslyIngestedFile.filename === `${file.path}/${file.name}` && moment(previouslyIngestedFile.dateUploadedToServer).format() === moment(file.date).format() && previouslyIngestedFile.server === `${server.username}@${server.host}`);
    return !previouslyIngested;
  });
  // Handle Zipped Files
  // Check that the zip haven't been previously ingested
  const zipFilesToProcess = zipFiles.filter((file) => {
    const previouslyIngested = previouslyIngestedFiles.find((previouslyIngestedFile) => previouslyIngestedFile.filename === `${file.path}/${file.name}` && moment(previouslyIngestedFile.dateUploadedToServer).format() === moment(file.date).format() && previouslyIngestedFile.server === `${server.username}@${server.host}`);
    return !previouslyIngested;
  });
  // If there are any zip files, we need to download and unzip to tmp folder. Then we can return an array of files
  if (zipFilesToProcess?.length) {
    const unzippedFiles = await processZippedAckFiles({ zipFiles: zipFilesToProcess, ftp, clientId, type: server.protocol === 'SFTP' ? 'SFTP' : 'FTP' });
    if (unzippedFiles?.length) { filesToIngest = filesToIngest.concat(unzippedFiles); }
  }

  // If this is on first initialisation, only add the existing files to the ftpLogs to be ignored.
  if (isFirstPass) {
    logger.info(`${logText}: ${clientId} - Marking ${filesToIngest.length} firstPass ignore files : ${server.name}`);
    await eachSeries(filesToIngest, async (fileToIngest) => {
      const file = {
        filename: fileToIngest.zipFileName || `${fileToIngest.path}/${fileToIngest.name}`,
        dateIngested: moment().format(),
        dateUploadedToServer: moment(fileToIngest.zipDate || fileToIngest.date).format(),
        server: `${server.username}@${server.host}`,
        firstPass: isFirstPass,
      };

      await Bucket.add({ Model: FTPLogs, filter: { clientId, type: 'ACK' }, field: 'files', value: file });
    });
  } else {
    // Ingest any new files after initialisation run
    logger.info(`${logText}: ${clientId} - Ingesting ${filesToIngest.length} files : ${server.name}`);
    logger.debug('Files to ingest: ', filesToIngest);

    await eachSeries(filesToIngest, async (fileToIngest) => {
      // Check if the file shouldn't be ingested
      if (!isFileTypeAllowed({ filename: fileToIngest.name })) return logger.info(`${logText}: ${clientId} - ${fileToIngest.name} file type not allowed`);
      logger.info(`${logText}: ${clientId} - Ingesting ${fileToIngest.name}...`);
      // Upload file to S3
      const ftpFileLocation = `${fileToIngest.path}/${fileToIngest.name}`;
      const cwrAcknowledgement = new CWRAcknowledgement({ clientId, name: fileToIngest.name });
      const key = `acknowledgements/${cwrAcknowledgement._id.toString()}/${fileToIngest.name}`;
      const localFile = fileToIngest.localPath || await ftpHelpers.downloadFromFtp({ ftp, ftpFileLocation, filename: fileToIngest.zipFileName || fileToIngest.name, type: server.protocol === 'SFTP' ? 'SFTP' : 'FTP' });
      await ftpHelpers.uploadToS3({ key, localFile });
      cwrAcknowledgement.file = key;
      await cwrAcknowledgement.save();
      // Create ingestion Tasks
      const admins = await User.find({ adminClientIds: clientId.toString() });
      const adminUserEmails = admins.map((user) => user.email).join(',');
      await cwrAcknowledgement.importAcknowledgementFile({ adminUserEmails });
      // Add files to the client ftp logs to be ignored on subsequent runs
      const file = {
        filename: fileToIngest.zipFileName || `${fileToIngest.path}/${fileToIngest.name}`,
        dateIngested: moment().format(),
        dateUploadedToServer: moment(fileToIngest.zipDate || fileToIngest.date).format(),
        server: `${server.username}@${server.host}`,
      };

      await Bucket.add({ Model: FTPLogs, filter: { clientId, type: 'ACK' }, field: 'files', value: file });
    });
  }

  // Disconnect from the FTP server
  // await ftp disconnect as its a promise, sftp will just run synchronous
  await ftp.disconnect(server.host, client._id, logText, client.name);
  logger.info(`${logText}: ${clientId} - Completed : ${server.name}`);
};

const processZippedAckFiles = async ({ zipFiles, ftp, type }) => {
  logger.info('Unzipping Files');
  const unzippedFiles = [];
  await eachSeries(zipFiles, async (zipFile) => {
    logger.debug(zipFile);
    const ftpFileLocation = `${zipFile.path}/${zipFile.name}`;
    const outputLocation = `${appRootDir}/tmp/${moment().format('x')}_${zipFile.name}`;

    const files = await ftpHelpers.unzipFile({ ftpFileLocation, outputLocation, ftp, type, uploadToServerDate: zipFile.date });
    logger.debug('UnzippedFiles: ', unzippedFiles);
    unzippedFiles.push(files);
  });

  return unzippedFiles.flat();
};

const isFileTypeAllowed = ({ filename }) => {
  const fileParts = filename.split('.');
  const ext = fileParts[fileParts.length - 1];
  const fileTypeAllowed = allowedAckExtensions.includes(`.${ext}`);
  logger.debug(`testFileTypeAllowed ${ext} ${fileTypeAllowed}`);
  return fileTypeAllowed;
};

module.exports = ACKIngestion;
