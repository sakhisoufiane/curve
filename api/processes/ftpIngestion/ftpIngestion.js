const _ = require('lodash');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const Client = require('../../models/client');
const ftpHelpers = require('./ftpHelpers');
const FTPLogs = require('../../models/ftpLogs');

module.exports = {
  /**
   * Manages the ftp initialisation or ingest processes depending on presence of server.initialisedDate
   *
   * @param {object} server FTP server details
   * @param {string} clientId Client identifier
   * @param {array} ignoredFiles Array of files on the server we have previously recogonised and wish to ignore
   * @param {function} serverCallback Callback function
   * @returns {err}
   */
  ingest: (server, clientId, ignoredFiles, logText, clientName, serverCallback) => {
    const rootDir = server.directory || '/';
    const defaultPort = (server.protocol === 'SFTP') ? 22 : 21;
    let connectionActive = false;
    const ftpParams = {
      protocol: server.protocol,
      host: server.host,
      username: server.username,
      password: server.password,
      port: server.port || defaultPort,
    };

    if (['FTPES', 'FTPS'].includes(server.protocol)) {
      ftpParams.secure = (server.protocol === 'FTPS') ? 'implicit' : true;
    }
    logger.debug({ ftpParams });
    const ftp = (server.protocol === 'SFTP') ? new Sftp(ftpParams) : new Ftp(ftpParams);
    const recursive = server.recursive || false;
    const isFirstPass = !server.initialisedDate;// true/false based on whether last check has a value or not
    logger.info(`${logText}: ${clientName} (${clientId}) - ${server.name} {isFirstPass:${isFirstPass}}`);
    logger.debug({ 'server.lastSuccessfulCheck': server.lastSuccessfulCheck });
    logger.debug({ 'server.initialisedDate': server.initialisedDate });

    async.waterfall([
      (callback) => {
        // Connect to FTP
        ftp.connect(server.name, clientId, logText, clientName).then(() => {
          // merlin ssl testing
          // return serverCallback();
          connectionActive = true;
          callback();
        // ftp.connect
        }).catch((err) => {
          // This also requires a bit of refactoring - Use of catch for promise rejection is dangerous.
          // A process error in the waterfall chain after a successful connection will be caught here and error on callback already called
          logger.error(`${logText}: ${clientId} - FTP Connection Error (or process crash) : ${ftpParams.host}`);
          callback(err);
        });
      },
      (callback) => {
        Client.findById(clientId).then((client) => {
          if (!client) {
            return callback(new Error(`Client with ID ${clientId} not found`));
          }
          callback(null, client);
        }).catch((err) => {
          callback(err);
        });
      },
      (client, callback) => {
        // Retrieve array of ftp file metadata - passing recursive option flag
        ftpHelpers.readAllFiles(ftp, server, rootDir, isFirstPass, [], recursive, [], [], [], null, true, callback, logText, client);
      },
      (zipFiles, gZipFiles, ftpFiles, callback) => {
        if (zipFiles && zipFiles.length) {
          logger.debug({ 'zipFiles.length': zipFiles.length });
          // Loop through zip files - download each then extract files - if they are wanted then pipe to s3 & ingest
          ftpHelpers.processZippedSalesFiles(server, zipFiles, ftpParams.host, server.dsp, clientId, ignoredFiles, ftp, logText, (err) => {
            callback(err, gZipFiles, ftpFiles);
          });
        } else {
          setImmediate(() => {
            callback(null, gZipFiles, ftpFiles);
          });
        }
      },
      (gZipFiles, ftpFiles, callback) => {
        if (gZipFiles && gZipFiles.length) {
          logger.debug({ 'gZipFiles.length': gZipFiles.length });
          // Loop through gzip files - download each then extract data - if wanted then pipe to s3 & ingest
          ftpHelpers.processGzippedSalesFiles(server, gZipFiles, ftpParams.host, clientId, ignoredFiles, ftp, logText, (err) => {
            callback(err, ftpFiles);
          });
        } else {
          setImmediate(() => {
            callback(null, ftpFiles);
          });
        }
      },
      (ftpFiles, callback) => {
        if (!ftpFiles?.length) { return setImmediate(callback); }

        // Loop through files and either set up logs for firstPass OR if not already ingested then download, stream to S3 and ingest
        logger.info(`${logText}: ${clientName} (${clientId}) Total number of files on server {ftpFiles.length:${ftpFiles.length}}`);

        ftpHelpers.filterDuplicateFiles({ clientId, files: ftpFiles, ignoredFiles, server }).then((filesToIngest) => {
          logger.info(`${logText}: ${clientName} (${clientId}) Total number of files to be ingested {filesToIngest.length: ${filesToIngest.length}}`);

          if (isFirstPass) {
            // Set up client ftp log by storing down the current ftp server state (on FirstPass, ftpFiles will also contain any compressed files)
            async.eachLimit(filesToIngest, 5, (ftpFile, eachCb) => {
              ftpHelpers.addToBucket({ ftpFile, server, salesFile: null, clientId, isFirstPass }).then(eachCb).catch(eachCb);
            }, () => setImmediate(callback));
          } else {
            // This is not the first pass of the server so we want to go get the files and ingest
            ftpHelpers.processSalesFiles(server, filesToIngest, ftpParams.host, clientId, ftp, logText).then(callback).catch(callback);
          }
        }).catch(callback);
      },
    ], async (ftpErr) => {
      if (connectionActive) {
        // Disconnect
        // connectionActive set on connect
        // await ftp disconnect as its a promise, sftp will just run synchronous
        await ftp.disconnect(server.name, clientId, logText, clientName);
      }

      if (ftpErr) {
        logger.error(`${logText}: ${clientId} - Error in ingest from FTP : ${server.name}`);
      } else {
        logger.info(`${logText}: ${clientId} - Completed : ${server.name}`);
      }
      Client.findById(clientId)
        .then((client) => {
          const runDate = new Date();
          const ftpIngestion = _.find(client.salesFtpIngestions, {
            directory: server.directory,
            name: server.name,
            host: server.host,
          });

          if (ftpIngestion) {
            // Correct any missing data
            if (!ftpIngestion.dsp) {
              ftpIngestion.dsp = 'other';
            }
            if (!ftpIngestion.directory) {
              ftpIngestion.directory = '/';
            }
            if (ftpErr) {
              // Store Error for ui display
              ftpIngestion.error = `${ftpErr} : ${new Date()}`;
            } else {
              // Remove any previous errors
              ftpIngestion.error = null;
              if (isFirstPass) {
                // Set the initialisedDate to prevent further inclusion in initialisation runs and for ui display
                ftpIngestion.initialisedDate = runDate;
              } else {
                // Set the lastSuccessfulCheck for ui display
                ftpIngestion.lastSuccessfulCheck = runDate;
              }
            }
          }

          client.save()
            .then(async () => {
              logger.info(`${logText}: ${clientName} (${clientId}) - Client Updated: ${clientId}`);

              // Handle any errors first
              // When the ftp ingestion errors we only send an email after the 5th attempt
              if (ftpErr && ftpIngestion.retries > 5) {
                ftpIngestion.active = false;
                ftpIngestion.retries = 0;
                await client.save().catch(logger.error);
                ftpHelpers.createNotifications(client, server.name, isFirstPass, ftpErr, serverCallback);
              } else if (ftpErr) {
                // Iterate count if an error has occurred
                ftpIngestion.retries += 1;
                await client.save().catch(logger.error);
                serverCallback(ftpErr);
              } else if (isFirstPass) {
                // If firstPass was succesful then we'll reset any retry count
                ftpIngestion.retries = 0;
                await client.save().catch(logger.error);
                ftpHelpers.createNotifications(client, server.name, isFirstPass, ftpErr, serverCallback);
              } else {
                serverCallback(ftpErr);
              }
            })
            .catch((err) => {
              logger.error(`${logText}: ${clientName} (${clientId}) - Unable to update Client: ${clientId}`);
              serverCallback(err);
            });
        })
        .catch((err) => {
          logger.error(err);
          serverCallback(err);
        });
    });
  },
};
