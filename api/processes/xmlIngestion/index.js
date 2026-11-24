const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const xmlReader = require('./xmlReader');
const dataIngest = require('./dataIngest');

module.exports = {
  ingest(ftpParams, clientId, rootDir, noDdexBatches, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, howToIngestOtherIdsOnImport, ddexDoNotUpdateExistingLabel, cb) {
    const processor = this;

    // Check Client FTP protocol and load appropriate library
    const ftp = ftpParams.protocol === 'SFTP' ? new Sftp(ftpParams) : new Ftp(ftpParams);

    async.waterfall([
      // Get XML File
      function (callback) {
        // Connect to FTP
        ftp.connect('Catalogue', clientId, '', '').then(() => {
          if (noDdexBatches) {
            // Just use root as the batch, setting as an object with the name
            processor.ingestIndividual(ftp, clientId, rootDir, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, howToIngestOtherIdsOnImport, ddexDoNotUpdateExistingLabel, callback);
          } else {
            // Get batches listed
            ftp.ls(rootDir).then((batches) => {
              // Loop through batches
              async.eachSeries(batches, (batch, batchCb) => {
                processor.ingestBatch(ftp, clientId, rootDir, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, batch, howToIngestOtherIdsOnImport, ddexDoNotUpdateExistingLabel, batchCb);
              }, callback);
            }).catch((err) => {
              logger.error(`${clientId} - Could not ls into folder`);
              logger.error(err);
              callback();
            });
          }
        }).catch((err) => {
          logger.error(`${clientId} - Could not connect`);
          logger.error(err);
          callback();
        });
      },
    ], async (err) => {
      // Disconnect
      await ftp.disconnect('Catalogue', clientId, '', '');
      if (err) {
        logger.error('DDEX Ingestion: Errored in ingesting from FTP');
        logger.error(err);
      } else {
        logger.info(`DDEX Ingestion: Completed Ingesting XML for client: ${clientId || 'Multiple Client Feed'}`);
      }
      // Conditional callback
      if (cb) {
        cb(err);
      }
    });
  },
  ingestBatch(ftp, clientId, rootDir, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, batch, howToIngestOtherIdsOnImport, ddexDoNotUpdateExistingLabel, cb) {
    const xmlFiles = [];
    let batchPath;
    if (batch) {
      // Check Delivery is complete
      const tempBatchPath = `${rootDir}/${batch.name}`;
      ftp.ls(tempBatchPath).then((dirs) => {
        logger.debug(dirs);
        let processBatch = false;
        dirs.forEach((dir) => {
          if (dir.name.includes('Complete') || dir.name.includes('complete')) { processBatch = true; }
        });
        if (processBatch) {
          logger.info(`DDEX Ingestion: Ingesting Batch ${tempBatchPath}`);
          async.waterfall([
            function (callback) {
              batchPath = `${rootDir}/${batch.name}`;
              ftp.ls(batchPath).then((dirs) => {
                // Loop through deliveries within batch
                async.eachSeries(dirs, (delivery, deliveryCb) => {
                  if (delivery?.type === 'd') {
                    const deliveryPath = `${batchPath}/${delivery.name}`;
                    ftp.ls(deliveryPath).then((files) => {
                      async.eachSeries(files, (dir, cb) => {
                        // Download file to local
                        if (dir && dir.type !== 'd') {
                          const fileName = dir.name;
                          const remoteFileLocation = `${deliveryPath}/${dir.name}`;
                          logger.debug('Attempting to download:', remoteFileLocation);
                          ftp.download(remoteFileLocation).then((file) => {
                            const localFileLocation = `${appRootDir}/tmp/${clientId}-${fileName}`;
                            const ws = fs.createWriteStream(localFileLocation);
                            file.pipe(ws);
                            file.on('end', () => {
                              logger.info('DDEX Ingestion: Xml file saved:', localFileLocation);
                              // Remove batch
                              ftp.rmdir(`${deliveryPath}/${dir.name}`).catch(logger.error);
                              // Add to array for ingestion
                              if (localFileLocation.includes('.xml')) {
                                xmlFiles.push(localFileLocation);
                              }
                              cb();
                            });
                          }).catch((ftpDownloadErr) => {
                            logger.error(ftpDownloadErr);
                            cb();
                          });
                        } else {
                          cb();
                        }
                      }, deliveryCb);
                    });
                  } else {
                    deliveryCb();
                  }
                }, (err) => {
                  if (err) {
                    logger.error(err);
                    callback(err);
                  } else {
                    callback();
                  }
                });
              }).catch(callback);
            },
            function (callback) {
              // Read XML
              xmlReader.getReleases(xmlFiles, howToIngestOtherIdsOnImport, callback);
            },
            function (releases, callback) {
              // Process imported releases
              dataIngest.ingest(releases, clientId, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, ddexDoNotUpdateExistingLabel, callback);
            },
            function (callback) {
              // Delete processed folders
              xmlFiles.forEach((localFile) => {
                if (fs.existsSync(localFile)) {
                  fs.unlinkSync(localFile);
                }
              });
              callback();
            },
          ], (err, result) => {
            if (batchPath) {
              logger.info('DDEX Ingestion: Deleting Batch at:', batchPath);
              ftp.rmdir(batchPath).then(() => {
                logger.info('DDEX Ingestion: Successfully deleted batch:', batchPath);
                cb(err, result);
              }).catch((error) => {
                logger.error(error);
                cb(null, result);
              });
            }
          });
        } else {
          logger.info('DDEX Ingestion: Batch not marked as complete:', batch.name);
          cb();
        }
      });
    } else {
      logger.error('No batch passed');
      cb();
    }
  },
  ingestIndividual(ftp, clientId, rootDir, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, howToIngestOtherIdsOnImport, ddexDoNotUpdateExistingLabel, cb) {
    const xmlFiles = [];
    const dirsToDelete = [];
    async.waterfall([
      function (callback) {
        ftp.ls(rootDir).then((dirs) => {
          // Loop through deliveries from root
          async.eachSeries(dirs, (delivery, deliveryCb) => {
            if (delivery.type === 'd') {
              const deliveryPath = `${rootDir}/${delivery.name}`;
              ftp.ls(deliveryPath).then((files) => {
                // Check for complete file
                let processDir = false;
                files.forEach((dir) => {
                  if (dir.name.includes('Complete') || dir.name.includes('complete') || dir.name.includes('.xml')) { processDir = true; }
                });
                // Add to array for deletion
                if (processDir) {
                  dirsToDelete.push(deliveryPath);
                  logger.info(`DDEX Ingestion: Ingesting Individual ${rootDir}/${delivery.name}`);
                }
                async.eachSeries(files, (dir, cb) => {
                  // Download file to local
                  if (processDir && dir && dir.type !== 'd' && dir.name.includes('.xml')) {
                    const fileName = dir.name;
                    const remoteFileLocation = `${deliveryPath}/${dir.name}`;
                    logger.debug('Attempting to download:', remoteFileLocation);
                    ftp.download(remoteFileLocation).then((file) => {
                      const localFileLocation = `${appRootDir}/tmp/${clientId}-${fileName}`;
                      const ws = fs.createWriteStream(localFileLocation);
                      file.pipe(ws);
                      file.on('end', () => {
                        logger.info('DDEX Ingestion: Xml file saved:', localFileLocation);
                        // Add to array for ingestion
                        if (localFileLocation.includes('.xml')) {
                          xmlFiles.push(localFileLocation);
                        }
                        cb();
                      });
                    }).catch((ftpDownloadErr) => {
                      logger.error(ftpDownloadErr);
                      cb();
                    });
                  } else {
                    cb();
                  }
                }, deliveryCb);
              });
            } else {
              deliveryCb();
            }
          }, (err) => {
            if (err) {
              logger.error(err);
              callback(err);
            } else {
              callback();
            }
          });
        }).catch(callback);
      },
      function (callback) {
        // Read XML
        xmlReader.getReleases(xmlFiles, howToIngestOtherIdsOnImport, callback);
      },
      function (releases, callback) {
        // Process imported releases
        dataIngest.ingest(releases, clientId, distributionChannel, labelMappings, setDefaultReleaseId, ingestForeignIds, useBarcodeAsCatNoOnImport, clientMappings, ddexDoNotUpdateExistingLabel, callback);
      },
      function (callback) {
        // Delete processed folders
        dirsToDelete.forEach((dir) => {
          ftp.rmdir(dir).catch(logger.error);
        });
        // Delete local XML files
        xmlFiles.forEach((localFile) => {
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
          }
        });
        callback();
      },
    ], cb);
  },
};
