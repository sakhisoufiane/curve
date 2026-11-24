/* eslint-disable no-cond-assign */
const fs = require('fs');
const decompress = require('decompress');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const _ = require('lodash');
const { logger, Bucket, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { createGunzip } = require('gunzip-stream');
const { Duplex } = require('stream'); // only needed of using stream meethod for gzip
const stream = require('stream');
const async = require('async');
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client } = require('@aws-sdk/client-s3');

const { ftpIngestionServicePatterns, allowedSalesFileExtensions, allowedAckExtensions } = require('../../../config.json');
const SalesFile = require('../../../models/salesFile');
const Notification = require('../../../models/notification');
const User = require('../../../models/user');
const FTPLogs = require('../../../models/ftpLogs');
const Client = require('../../../models/client');

const s3RootPath = 'salesFiles';

/* only need if using fs method for gzip files
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
*/

const bufferToStream = (buffer) => {
  const streamB = new Duplex();
  streamB.push(buffer);
  streamB.push(null);
  return streamB;
};

const dspConfigLabels = Object.keys(ftpIngestionServicePatterns);
dspConfigLabels.splice(dspConfigLabels.indexOf('merlin'), 1);

module.exports = {
  // Wrapper for piping stream to S3
  writeToS3: (Key) => {
    const Body = new stream.PassThrough();
    const Bucket = process.env.S3_bucket;

    const upload = new Upload({
      client: new S3Client({
        credentials: {
          accessKeyId: process.env.S3_access_key,
          secretAccessKey: process.env.S3_secret_key,
        },
        region: process.env.S3_region,
      }),
      params: {
        Body,
        Key,
        Bucket,
      },
    });

    let error;
    upload.done()
      .then((data) => { })
      .catch((err) => {
        error = err;
      }).then(() => {
        Body.destroy(error);
      });

    return Body;
  },

  // Test for pre-uploaded file
  testFileIsNew: (file, ignoredFiles, logText, clientId, serverName, clientName) => {
    logger.info(`${logText}: ${clientName} (${clientId}) - ${serverName} ${file.name}`);
    const test = _.find(ignoredFiles, {
      name: file.name,
      date: file.date,
    });
    logger.info(`${logText}: ${clientName} (${clientId}) - ${serverName} ${file.name} testFileIsNew ${!test}`);
    return !test;
  },

  testFileTypeAllowed: (fileName, logText, clientId, serverName, clientName) => {
    allowedSalesFileExtensions.push('.zip', '.gz'); // might need to use zlib for gzip
    const fileParts = fileName.split('.');
    const ext = fileParts[fileParts.length - 1].toLowerCase();
    const fileTypeAllowed = allowedSalesFileExtensions.includes(`.${ext}`) || allowedAckExtensions.includes(`.${ext}`);
    if (fileTypeAllowed) {
      logger.info(`${logText}: ${clientName} (${clientId}) - ${serverName} ${fileName} testFileTypeAllowed ${ext} ${fileTypeAllowed}`);
    } else {
      logger.error(`${logText}: ${clientName} (${clientId}) - ${serverName} ${fileName} - Error, file extension unsupported`);
    }
    return fileTypeAllowed;
  },

  testFileInclusion(fileObject, ignoredFiles, path, service, logText, client, serverName) {
    let includeFile = true;
    const fileName = fileObject.name;
    const fileIsNew = this.testFileIsNew(fileObject, ignoredFiles, logText, client._id, serverName, client.name);
    const fileTypeAllowed = this.testFileTypeAllowed(fileName, logText, client._id, serverName, client.name);

    // MERLIN updated exclude pattern
    // EXCLUDE Cargo-digital-services-gmbh-Facebook-UGC-Consumption_Usage-Report_202206....csv
    // EXCLUDE Cargo-digital-services-gmbh_deezer-market-share_2022-06-15_202208.csv
    // INCLUDE Cargo-digital-services-gmbh_Facebook-UGC-Production_Usage-Report_202206.csv

    if (fileTypeAllowed && fileIsNew) {
      // First test if file matches file exclude pattern
      if (ftpIngestionServicePatterns[service]?.excludeFilePattern) {
        // Apply the includeFilePattern for this service if it exists - otherwise stick with includeFile=true
        const regexFileName = new RegExp(ftpIngestionServicePatterns[service].excludeFilePattern.join('|'), 'i');
        if (regexFileName.test(fileName)) {
          includeFile = false;
        }
      }

      // If file not excluded by excludeFilePattern then test against includeFilePattern
      if (includeFile && ftpIngestionServicePatterns[service]?.includeFilePattern) {
        // const regexDummy = new RegExp('(Monthly[\\w\\s-]+Usage)|(Cloud_Detail)', 'i');
        let { includeFilePattern } = ftpIngestionServicePatterns[service];

        // If the pattern is ''merlin' we need to test each file path for a matching dsp filter
        if (includeFilePattern === 'merlin') {
          dspConfigLabels.forEach((dspConfigLabel) => {
            if (path.toLowerCase().includes(dspConfigLabel)) {
              logger.debug('merlin filter path match: ', path.toLowerCase());
              // Check if we have a pattern for this dsp and if we do then set it for the test stage
              if (ftpIngestionServicePatterns[dspConfigLabel].includeFilePattern) {
                ({ includeFilePattern } = ftpIngestionServicePatterns[dspConfigLabel]);
              }
            }
          });
        }
        logger.debug(`post merlin check: use pattern  ${includeFilePattern}`);

        // If the config is merlin then includeFilePattern will now be replaced with relevant pattern based
        // on path or will still be 'merlin'. If merlin then we don't have a pattern for the path so skip
        // the test leaving includeFile=true, otherwise proceed as normal
        if (includeFilePattern !== 'merlin') {
          const matchArray = [];
          includeFilePattern.forEach((matchSet) => {
            const matchString = matchSet.join('[\\w\\s-]+');
            matchArray.push(`(${matchString})`);
          });
          const regex = new RegExp(matchArray.join('|'), 'i');
          includeFile = regex.test(fileName);
        }
      }
    } else {
      includeFile = false;
    }
    if (includeFile) {
      logger.info(`${logText}: ${client.name} (${client._id}) - ${serverName} ${fileName} testFileInclusion ${includeFile}`);
    } else {
      logger.error(`${logText}: ${client.name} (${client._id}) - ${serverName} ${fileName} - Error, file not included for this dsp`);
    }
    return includeFile;
  },

  testExcludeDirPattern(dir, service) {
    let excludeDir = false;
    if (ftpIngestionServicePatterns[service] && ftpIngestionServicePatterns[service].excludeDirPattern) {
      const regex = new RegExp(ftpIngestionServicePatterns[service].excludeDirPattern.join('|'), 'i');
      excludeDir = regex.test(dir);
    }
    return excludeDir;
  },
  parseRawModifiedAt(rawDate) {
    const now = new Date();

    const withTime = /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2})$/;
    const withYear = /^([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/;

    let match;

    if ((match = rawDate.match(withTime))) {
      // Format: "Jun 11 12:34" → assume current year
      const [_, mon, day, hour, minute] = match;
      const currentYear = now.getFullYear();
      return new Date(`${mon} ${day} ${currentYear} ${hour}:${minute}:00 UTC`);
    } if ((match = rawDate.match(withYear))) {
      // Format: "Jun 11 2024"
      const [_, mon, day, year] = match;
      return new Date(`${mon} ${day} ${year} 00:00:00 UTC`);
    }
    return null;
  },
  readAllFiles(ftp, server, rootDir, isFirstPass, ignoredFiles, recursive, ftpFiles, zipFiles, gZipFiles, recurseCB, topLevel, ingestCB, logText, client) {
    // Read Ftp files at given path with recursive option
    // Retrieve directory contents
    const clientId = client._id;
    const clientName = client.name;
    ftp.ls(rootDir).then((files) => {
      // Test each item
      async.eachSeries(files, (file, cb) => {
        // Run recursion on directories or add files to return array
        if (file && file.name !== '.' && file.name !== '..') {
          if (file.type === 'd') {
            // Check if recursion is required for this server and that this dir is not excleded - otherwise move on
            const excludeDir = this.testExcludeDirPattern(file.name, server.dsp);
            if (recursive && !excludeDir) {
              // Run recursion
              this.readAllFiles(ftp, server, `${rootDir}/${file.name}`, isFirstPass, ignoredFiles, recursive, ftpFiles, zipFiles, gZipFiles, cb, false, ingestCB, logText, client);
            } else {
              setImmediate(() => {
                cb();
              });
            }
          } else {
            // Add file metadata to return array
            let fileDateStamp;
            if (server.protocol === 'SFTP') {
              fileDateStamp = file.modifyTime;
            } else {
              // Use `modifiedAt` if it's available (from servers that support the MLSD command).
              // Otherwise, attempt to parse `rawModifiedAt`. If parsing fails, throw an error.
              const modifiedDate = file.modifiedAt ? file.modifiedAt : this.parseRawModifiedAt(file.rawModifiedAt);
              if (!modifiedDate) {
                throw new Error('Could not retrieve modified date');
              }
              fileDateStamp = modifiedDate;
            }

            const fileObject = {
              name: file.name,
              date: fileDateStamp,
            };

            // console.group(fileObject.name + '-------');
            // On firstPass we want to store all files down so that we don't run filter tests on unwanted files on future runs
            if (isFirstPass || this.testFileInclusion(fileObject, ignoredFiles, rootDir, server.dsp, logText, client, server.name)) {
              fileObject.path = rootDir;
              const ext = file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length).toLowerCase();

              if (isFirstPass) {
                // on initialisation (first pass) the file type is irrelevamt as we are only storing down the file meta to be ignored.
                // This way means less repetitve code in the main ingestion script
                ftpFiles.push(fileObject);
              } else {
                switch (ext) {
                  case 'zip':
                    zipFiles.push(fileObject);
                    break;
                  case 'gz':
                    gZipFiles.push(fileObject);
                    break;
                  default:
                    ftpFiles.push(fileObject);
                }
              }
            }
            // console.groupEnd(fileObject.name + '-------');
            setImmediate(cb);
          }
        } else {
          setImmediate(cb);
        }
      }, (err) => {
        // Either move back up the chain to recursion parent cb or if back at ftp root then return file data to ingest process
        if (topLevel) {
          ingestCB(err, zipFiles, gZipFiles, ftpFiles);
        } else {
          recurseCB();
        }
      });
    }).catch((err) => {
      if (err) {
        logger.error(err);
        logger.error(`${logText}: ${clientName} (${clientId}) - ${server.name} - Error reading contents of server`);
      }
      ingestCB(new Error(`FTP INGESTION: Error reading file structure - ${rootDir}`));
    });
  },

  async processZippedSalesFiles(server, zipFiles, host, dsp, clientId, ignoredFiles, ftp, logText, callback) {
    const client = await Client.findById(clientId);
    const zipFilesToProcess = await this.filterDuplicateFiles({ clientId, files: zipFiles, ignoredFiles, server });

    async.eachSeries(zipFilesToProcess, (zipFile, zipsCB) => {
      logger.debug(`zipFile:::\n${zipFile}`);
      const ftpFileLocation = `${zipFile.path}/${zipFile.name}`;
      const outputLocation = `${appRootDir}/tmp/${moment().format('x')}_${zipFile.name}`;

      this.unzipFile({ ftpFileLocation, outputLocation, ftp, type: server.protocol === 'SFTP' ? 'SFTP' : 'FTP', uploadToServerDate: zipFile.date }).then((files) => {
        const filteredFiles = files.map((file) => {
          if (zipFile.isDuplicate) { file.isDuplicate = true; }
          return file;
        }).filter((file) => this.testFileInclusion(file, [], file.localPath, dsp, 'ZIPPED FILES', client));

        this.processSalesFiles(server, filteredFiles, host, clientId, ftp, logText).then(zipsCB).catch(zipsCB);
      }).catch((err) => {
        // Log error and try next file
        logger.error(`${logText}: ${clientId} - ${err.message}`);
        zipsCB(null);
      });
    }, (err) => {
      logger.info(`${logText}: ${clientId} - processZipFiles completed`);
      callback(err);
    });
  },

  async processGzippedSalesFiles(server, gZipFiles, host, clientId, ignoredFiles, ftp, logText, callback) {
    const gZipFilesToProcess = await this.filterDuplicateFiles({ clientId, files: gZipFiles, ignoredFiles, server });

    async.eachSeries(gZipFilesToProcess, (gZipFile, gZipsCB) => {
      const gZipFileName = gZipFile.name;
      const gZipFileLocation = `${gZipFile.path}/${gZipFileName}`;
      const logsFtpPath = `${host}/${gZipFileLocation}`;
      const innerFileName = gZipFileName.replace('.gz', ''); // This works if file name follows normal convention but might need to use file opener to ensure fileType

      logger.debug(`gZipFile:::\n${JSON.stringify(gZipFile)}`);
      logger.debug(`gZipFileLocation: ${gZipFileLocation}`);

      // No need to test ignored files or filters as path same as gzip so already tested on readFiles (assuming normal gzip conventions)
      // Test inner file extension is valid
      if (!this.testFileTypeAllowed(innerFileName, logText, clientId, server.name)) {
        return gZipsCB();
      }

      const salesFileName = innerFileName.substring(0, innerFileName.lastIndexOf('.')) || innerFileName;
      const salesFile = new SalesFile({
        clientId,
        name: salesFileName,
        status: 'Setup',
      });

      salesFile.save()
        .then((salesFile) => {
          // Build S3 key
          const salesFileId = salesFile._id.toString();
          const key = `${s3RootPath}/${salesFileId}/${innerFileName}`;

          ftp.download(gZipFileLocation).then((file) => {
            logger.info(`${logText}: ${clientId} - DOWNLOADED GZIP: extracting: ${gZipFileName} to ${innerFileName}`);
            const fileData = [];

            file.zipFileName = gZipFileLocation;
            file.zipDate = gZipFile.date;

            // piping straight through gunzip-stream to S3 will not work. So...
            // piping to memory - alt method is to save the file locally before parsing - sample code preserved in processGzippedSalesFiles_raw_eg_of_FS_method
            file.on('data', (chunk) => {
              fileData.push(chunk);
            });
            file.on('end', () => {
              const fileDataBuffer = Buffer.concat(fileData);
              const fileDataStream = bufferToStream(fileDataBuffer);

              logger.info(`${logText}: ${clientId} - Attempting to unzip and pipe: ${key}`);
              const fileDataPipeline = fileDataStream.pipe(createGunzip()).pipe(this.writeToS3(key));

              fileDataPipeline.on('close', () => {
                logger.info(`${logText}: ${clientId} - File transfer pipeline complete: ${key}`);
                salesFile.file = key;

                if (gZipFile.isDuplicate) { salesFile.duplicateSalesFileId = 'No ID Provided'; }

                salesFile.save()
                  .then(async (salesFile) => {
                    const salesFileId = salesFile._id.toString();
                    // Pass priority 2 for queue 2 - bulk ingestions. 1 is for user re-ingests
                    if (gZipFile.isDuplicate) {
                      await this.addToBucket({ ftpFile: file, server, salesFile, clientId });
                      gZipsCB();
                    } else {
                      salesFile.createIngestTask(2, { internal: true }, async (err) => {
                        if (!err) {
                          await this.addToBucket({ ftpFile: file, server, salesFile, clientId });
                          logger.info(`${logText}: ${clientId} - ${salesFileId} - Ingest task created for ${key}`);
                        }
                        gZipsCB(err);
                      });
                    }
                  })
                  .catch((err) => {
                    logger.error(err);
                    gZipsCB(err);
                  });
              });

              fileDataPipeline.on('error', (err) => {
                logger.error(`${logText}: ${clientId} -  Gunzip transfer error : file: ${key}`);
                return gZipsCB(err);
              });
            });

            file.on('error', (err) => {
              logger.error(err);
              return gZipsCB(err);
            });
          }).catch((err) => {
            logger.error(`${logText}: ${clientId} - FTP Error : streaming gzip ${logsFtpPath}`);
            gZipsCB(err);
          });
        })
        .catch((err) => {
          logger.error(err);
          gZipsCB(err);
        });
    }, (err) => {
      logger.info(`${logText}: ${clientId} - processgGZipFiles completed`);
      callback(err);
    });
  },

  processGzippedSalesFiles_raw_eg_of_stream_method(gZipFiles, host, clientId, ignoredFiles, ftp, callback) {
    async.eachSeries(gZipFiles, (gZipFile, gZipsCB) => {
      logger.debug(`gZipFile:::\n${gZipFile}`);
      const gZipFileName = gZipFile.name;
      const gZipFileLocation = `${gZipFile.path}/${gZipFileName}`;
      const logsFtpPath = `${host}/${gZipFileLocation}`;
      const innerFileName = gZipFileName.replace('.gz', '');

      const key = `salesFiles/devtest/dump/${innerFileName}`;

      logger.debug('gZipFileLocation', gZipFileLocation);

      ftp.download(gZipFileLocation).then((file) => {
        const fileData = [];
        file.on('data', (chunk) => {
          fileData.push(chunk);
        });
        file.on('end', () => {
          const fileDataBuffer = Buffer.concat(fileData);
          const fileDataStream = bufferToStream(fileDataBuffer);
          const fileDataPipeline = fileDataStream.pipe(createGunzip()).pipe(this.writeToS3(key));

          fileDataPipeline.on('close', () => {
            gZipsCB();
          });

          fileDataPipeline.on('error', (err) => gZipsCB(err));
        });
      }).catch((err) => {
        logger.error(`FTP INGESTION: FTP Error : streaming ${logsFtpPath} for client : ${clientId}`);
        gZipsCB(err);
      });
    }, (err) => {
      logger.debug('> processgGZipFiles completed');
      callback(err);
    });
  },

  unzipFile: async ({ ftpFileLocation, outputLocation, ftp, type, uploadToServerDate }) => {
    let file;
    if (type === 'FTP') {
      // eslint-disable-next-line no-async-promise-executor
      await new Promise(async (resolve, reject) => {
        try {
          file = await ftp.download(ftpFileLocation);
          file.pipe(fs.createWriteStream(outputLocation));
          file.once('close', () => {
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });
    } else if (type === 'SFTP') {
      await ftp.downloadFastGet(ftpFileLocation, outputLocation);
      file = fs.createReadStream(outputLocation);
    }

    const unzippedFiles = [];

    const outputFolder = `${appRootDir}/tmp/${moment().format('x')}`;
    const date = moment().format('');
    const files = await decompress(outputLocation, outputFolder);
    logger.debug('Unzipped file');
    for (const file of files) {
      logger.debug(file);
      if (file.type === 'file') {
        unzippedFiles.push({ name: file.path, date, localPath: `${outputFolder}/${file.path}`, zipFileName: ftpFileLocation, zipDate: uploadToServerDate });
      }
    }
    return unzippedFiles;
  },

  // processGzippedSalesFiles_raw_eg_of_FS_method(gZipFiles, host, clientId, ignoredFiles, ftp, callback) {
  //   async.eachSeries(gZipFiles, (gZipFile, gZipsCB) => {
  //     logger.debug(`gZipFile:::\n${JSON.stringify(gZipFile)}`);
  //     const gZipFileName = gZipFile.name;
  //     const gZipFileLocation = `${gZipFile.path}/${gZipFileName}`;
  //     const logsFtpPath = `${host}/${gZipFileLocation}`;
  //     const innerFileName = gZipFileName.replace('.gz', '');

  //     const key = `salesFiles/devtest/dump2/${innerFileName}`;
  //     logger.debug('gZipFileLocation', gZipFileLocation);

  //     ftp.download(gZipFileLocation).then((file) => {
  //       const filePath = `${appRootDir}/tmp/${innerFileName}`;
  //       const localFile = fs.createWriteStream(filePath);
  //       const filePipeline = file.pipe(localFile);

  //       filePipeline.on('close', () => {
  //         const fileDataStream = fs.createReadStream(filePath);// , {highWaterMark: 16}
  //         const fileDataPipeline = fileDataStream.pipe(createGunzip()).pipe(this.writeToS3(key));

  //         fileDataPipeline.on('close', () => {
  //           fs.unlink(filePath, (err) => {
  //             gZipsCB();
  //           });
  //         });

  //         fileDataPipeline.on('error', (err) => {
  //           fs.unlink(filePath, (err) => {
  //             gZipsCB(err);
  //           });
  //         });
  //       });
  //     }).catch((err) => {
  //       logger.error(`FTP Error : streaming ${logsFtpPath} for client : ${clientId}`);
  //       gZipsCB(err);
  //     });
  //   }, (err) => {
  //     logger.debug('> processgGZipFiles completed');
  //     callback(err);
  //   });
  // },

  async processSalesFiles(server, ftpFiles, host, clientId, ftp, logText) {
    await async.eachSeries(ftpFiles, async (ftpFile) => {
      // Download and stream to S3
      if (!ftpFile) { return; }

      const fileName = ftpFile.name;
      const ftpFileLocation = `${ftpFile.path}/${fileName}`;
      const logsFtpPath = `${host}${ftpFileLocation}`;
      const salesFileName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

      const salesFile = new SalesFile({
        clientId,
        name: salesFileName,
        status: 'Setup',
      });

      await salesFile.save();

      const salesFileId = salesFile._id.toString();
      logger.info(`${logText}: ${clientId} - ${salesFileId} - Attempting to pipe ${logsFtpPath}`);

      // Download File From FTP Server
      const localFile = ftpFile.localPath
        || await this.downloadFromFtp({ ftp, ftpFileLocation, filename: fileName, type: server.protocol === 'SFTP' ? 'SFTP' : 'FTP' });

      // Uploaded File to S3
      const key = `${s3RootPath}/${salesFileId}/${fileName}`;
      await this.uploadToS3({ key, localFile });

      logger.info(`${logText}: ${clientId} - ${salesFileId} - File uploaded to S3: ${key}`);
      salesFile.file = key;

      // To display to the user that the following file is a duplicate and link the original file id to the duplicated sales file
      if (ftpFile.isDuplicate) { salesFile.duplicateSalesFileId = ftpFile.previous?.documentId || 'No ID Found'; }

      await salesFile.save();

      // As soon as the sales file has been created and file uploaded, we should add this file to the bucket
      // If any errors are thrown before the point it will be due to file download/upload to S3,
      // if any of this fails then no file will be attached and the file will need to be re-processed again
      await this.addToBucket({ ftpFile, server, salesFile, clientId });

      // When file is a duplicate we don't want to trigger an SQS message to the processor, it should just be flagged in the front-end
      if (ftpFile.isDuplicate) { logger.debug(`FTP File duplicate: ${ftpFile.name} | Skipping ingestion`); return; }

      // When file is NEW we send a message to the processor, which will ingest the file
      await new Promise((resolve) => {
        salesFile.createIngestTask(2, { internal: true }, async (err) => {
          if (err) {
            logger.error(`${logText}: ${clientId} - ${salesFileId} - Could not create an ingestion task.`);
            logger.error(err);
          }

          logger.info(`${logText}: ${clientId} - ${salesFileId} - Ingest task created for ${key}`);
          resolve();
        });
      });
    });
  },

  /**
 * Uploads a file to S3
 * @param {string} key - The S3 key to use
 * @param {string} localFile - The path to the local file
 * @returns {string} key - The S3 key of the uploaded file
 */
  uploadToS3: ({ key, localFile }) => new Promise((resolve, reject) => {
    fileManager.uploadToS3(key, localFile, (err, key) => {
      if (err) { return reject(err); }
      resolve(key);
    });
  }),

  addToBucket: async ({ ftpFile, server, salesFile, clientId, isFirstPass }) => {
    const file = {
      filename: ftpFile.zipFileName || `${ftpFile.path}/${ftpFile.name}`,
      dateIngested: moment().format(),
      dateUploadedToServer: moment(ftpFile.zipDate || ftpFile.date).format(),
      server: `${server.username}@${server.host}`,
      documentId: salesFile?._id?.toString(),
    };

    if (isFirstPass) { file.firstPass = isFirstPass; }

    await Bucket.add({ Model: FTPLogs, filter: { clientId, type: 'Sales' }, field: 'files', value: file }).catch(logger.error);
  },

  filterDuplicateFiles: async ({ clientId, files, ignoredFiles, server }) => {
    const filesToIngest = files.filter((file) => {
      const previouslyIngested = ignoredFiles.find((previouslyIngestedFile) => {
        if (
          previouslyIngestedFile.filename === `${file.path}/${file.name}`
          && moment(previouslyIngestedFile.dateUploadedToServer).format() === moment(file.date).format()
          && previouslyIngestedFile.server === `${server.username}@${server.host}`
        ) {
          return previouslyIngestedFile;
        }
      });

      // When file name and server origin is the same but the upload date is different, we want to flag and return this file
      // We will then create a sales file but not ingest the sales file
      const duplicateFile = ignoredFiles.find((previouslyIngestedFile) => {
        if (
          previouslyIngestedFile.filename === `${file.path}/${file.name}`
          // If the upload date is different, then we can assume this is a re-uploaded duplicate which we need to flag
          && moment(previouslyIngestedFile.dateUploadedToServer).format() !== moment(file.date).format()
          && previouslyIngestedFile.server === `${server.username}@${server.host}`
        ) {
          return previouslyIngestedFile;
        }
      });

      if (!previouslyIngested) {
        // For UI purposes add
        if (duplicateFile) {
          file.isDuplicate = true;
          file.previous = duplicateFile;
        }
        return file;
      }
    });

    const serverLogs = await FTPLogs.findOne({ clientId, type: 'Server Sales', 'files.server': `${server.username}@${server.host}` }).catch(logger.error);
    const serverLog = serverLogs?.files?.find((log) => log.server === `${server.username}@${server.host}`);
    // Once feature has been deployed, we assume any files before deployment date have been ingested, we use the below condition to filer files older than deployment date
    const filerOldFilesFromServerDate = filesToIngest.filter((file) => (moment(file.date).format() > moment(serverLog?.dateUploadedToServer).format()) || !serverLog);

    return filerOldFilesFromServerDate;
  },

  /**
 * Download a file from the ftp server and save it to locally
 * @param {object} ftp - The ftp connection
 * @param {string} ftpFileLocation - The path to the file on the server
 * @param {string} filename - The name of the file on the server
 * @returns {string} outputLocation - The path to the local file
 */
  // eslint-disable-next-line no-async-promise-executor
  downloadFromFtp: ({ ftp, ftpFileLocation, filename, type }) => new Promise(async (resolve) => {
    const outputLocation = `${appRootDir}/tmp/${moment().format('x')}_${filename}`;

    if (type === 'FTP') {
      const file = await ftp.download(ftpFileLocation);
      file.pipe(fs.createWriteStream(outputLocation));
      file.once('close', () => {
        resolve(outputLocation);
      });
    } else if (type === 'SFTP') {
      await ftp.downloadFastGet(ftpFileLocation, outputLocation);
      resolve(outputLocation);
    }
  }),

  createNotifications: (client, label, isFirstPass, ftpErr, callback) => {
    // Only runs if this is initialistion or an error was returned
    User.find({ adminClientIds: client._id.toString() })
      .then((users) => {
        let identifier = 'genericError';
        let subjectIntro;
        let subject;
        let mainText;

        if (isFirstPass) {
          subjectIntro = `Your FTP setup for ${label}`;
          if (ftpErr) {
            subject = `${subjectIntro} has errored`;
            mainText = `${subject}.`;
          } else {
            identifier = 'genericComplete';
            subject = `${subjectIntro} has been succesfully initialised`;
            mainText = `${subject}. Curve will check this server daily for new sales files.`;
          }
        } else {
          subject = `Your FTP ingestion for ${label} has errored.`;
          mainText = `${subject}.`;
        }
        async.each(users, (user, userCb) => {
          logger.info(`FTP INGESTION: ${client._id.toString()} = Create FTP notification for ${user.email}`);
          const generateOptions = {
            identifier,
            curveUser: user,
            client,
            subject,
            mainText,
          };
          if (ftpErr) {
            generateOptions.error = [ftpErr];
            generateOptions.closingText = 'Please review the setup and make any necessary changes.';
          }

          const curveUser = { id: user._id, clientId: client._id.toString() }; // Manually setting the clientId to the affected one, this is to remove any confusion with a users default client
          Notification.generate('FTP ingestion', subject, '', curveUser, generateOptions, userCb);
        }, (err) => {
          if (err) {
            logger.error(err);
          }
          // Ignore any notification errors for the callback
          callback();
        });
      })
      .catch((err) => {
        logger.error(err);
        callback();
      });
  },
};
