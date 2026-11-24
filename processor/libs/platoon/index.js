const { waterfall, parallel } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const Path = require('path');

const generate = require('./generate');
const lambdaEncrypt = require('./lambdaEncrypt');
const lambdaSftp = require('./lambdaSftp');
const uploadFilesToS3 = require('./uploadFilesToS3');
const zip = require('./zip');
const Notification = require('../../models/notification');
const Client = require('../../models/client');

module.exports = {
  triggerSAPOutput: (period, curveUser, callback) => {
    let zipLocation;
    if (!period || !curveUser) {
      throw new Error('Period and Curve User must be passed to Platoon SAP Output');
    }
    Client.findById(period.clientId)
      .then((client) => {
        waterfall([
          (cb) => {
            // Generate files
            generateFiles(period, true, (err, remoteFiles, zip) => {
              zipLocation = zip;
              period.platoon.files = remoteFiles;
              period.save()
                .then(() => {
                  cb(err, remoteFiles);
                })
                .catch((saveErr) => {
                  logger.error('Platoon: Error saving period after generating files');
                  logger.error(saveErr);
                  cb(err, remoteFiles);
                });
            });
          },
          (files, cb) => {
            logger.info('Platoon: Encrypting Files');
            lambdaEncrypt(files, `${period._id}/${period.platoon.summaryNumber}/encrypted`, cb);
          },
          (outputFiles, cb) => {
            // Separate out the summary file
            const summaryFile = outputFiles.find((file) => file.includes('SUMMARY'));
            const otherFiles = outputFiles.filter((file) => !file.includes('SUMMARY'));
            logger.info(otherFiles);
            logger.info('Platoon: Uploading Files');
            lambdaSftp(otherFiles, (err) => {
              if (err) {
                return cb(err);
              }
              // Run on summary file
              logger.info('Platoon: Uploading Summary File');
              lambdaSftp([summaryFile], (err) => {
                cb(err);
              });
            });
          },
          (cb) => {
            // Notify user
            const generateOptions = {
              identifier: 'genericComplete',
              email: curveUser.email,
              curveUser,
              client,
              subject: 'Your SAP Delivery has completed',
              link: zipLocation,
            };
            Notification.generate('Your SAP Delivery has completed', `SAP Delivery for ${period.name} has been successfully delivered`, zipLocation, generateOptions, (err) => {
              cb(err);
            });
          },
        ], (err) => {
          if (err) {
            logger.error('Platoon: Error in exporting files');
            logger.error(err);
            // Notify user
            const generateOptions = {
              identifier: 'genericComplete',
              email: curveUser.email,
              curveUser,
              client,
              subject: 'Your SAP Delivery has failed',
              link: zipLocation,
            };
            Notification.generate('Your SAP Delivery has failed', `SAP Delivery for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
              if (callback) {
                callback(err);
              }
            });
          } else {
            logger.info('Platoon: Completed export and delivery to Apple');
          }
        });
      })
      .catch((err) => {
        logger.error('Platoon: Error in exporting files');
        logger.error(err);
        // Notify user
        const generateOptions = {
          identifier: 'genericComplete',
          email: curveUser.email,
          curveUser,
          client: undefined,
          subject: 'Your SAP Delivery has failed',
          link: zipLocation,
        };
        Notification.generate('Your SAP Delivery has failed', `SAP Delivery for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
          if (callback) {
            callback(err);
          }
        });
      });
  },
  downloadSAPOutput: (period, curveUser, callback) => {
    let zipLocation;
    if (!period || !curveUser) {
      throw new Error('Period and Curve User must be passed to Platoon SAP Output');
    }
    Client.findById(period.clientId)
      .then((client) => {
        waterfall([
          (cb) => {
            logger.info('Platoon: Generating Files');
            generate(period, false, cb);
          },
          (files, failures, unreported, dspSummaries, cb) => {
            // Zip files and upload to S3
            logger.info('Platoon: Zipping Files');
            const extraFiles = failures.concat(unreported, dspSummaries);
            zip(files, extraFiles, (err, zip) => {
              zipLocation = zip;
              cb(err, files);
            });
          },
          (files, cb) => {
            // Upload files to s3
            logger.info('Platoon: Uploading Files');
            uploadFilesToS3(files, `platoon/${period._id}/${period.platoon.summaryNumber}/original`, (err, generatedRemoteFiles) => {
              logger.info(generatedRemoteFiles);
              // Add generated files to period
              period.platoon.files = generatedRemoteFiles;
              period.save()
                .then(() => {
                  cb(err, files);
                })
                .catch((saveErr) => {
                  logger.error('Platoon: Error saving period after generating files');
                  logger.error(saveErr);
                  cb(err, files);
                });
            });
          },
          (files, cb) => {
            // Delete local files
            if (files) {
              files.forEach((file) => {
                logger.info(`Platoon: Deleting file ${file}`);
                if (fs.existsSync(file)) {
                  fs.unlinkSync(file);
                }
              });
            }
            cb();
          },
          (cb) => {
            // Notify user about main SAP files
            const generateOptions = {
              identifier: 'genericComplete',
              curveUser,
              email: curveUser.email,
              client,
              subject: 'Your SAP Files are Ready for Download',
              link: zipLocation,
            };

            // Use the unreportedFileUsed and unreportedFileOutput properties from the period
            const inputRereportFile = period.unreportedFileUsed;
            const outputRereportFile = period.unreportedFileOutput;

            // Create notification tasks for parallel execution
            const notificationTasks = {
              mainSapFiles: (callback) => {
                Notification.generate(
                  'Your SAP Files are Ready for Download',
                  `SAP Files for ${period.name} have been created and ready for download`,
                  zipLocation,
                  generateOptions,
                  callback,
                );
              },
            };

            // Add input rereport notification if file exists
            if (inputRereportFile) {
              notificationTasks.inputRereport = (callback) => {
                const inputRereportOptions = {
                  identifier: 'genericComplete',
                  curveUser,
                  email: curveUser.email,
                  client,
                  subject: 'Input Rereport Data File Available',
                  link: inputRereportFile,
                };
                Notification.generate(
                  'Input Rereport Data File Available',
                  `Input Rereport Data File for ${period.name} is available for download`,
                  inputRereportFile,
                  inputRereportOptions,
                  callback,
                );
              };
            }

            // Add output rereport notification if file exists
            if (outputRereportFile) {
              notificationTasks.outputRereport = (callback) => {
                const outputRereportOptions = {
                  identifier: 'genericComplete',
                  curveUser,
                  email: curveUser.email,
                  client,
                  subject: 'Output Rereport Data File Available',
                  link: outputRereportFile,
                };
                Notification.generate(
                  'Output Rereport Data File Available',
                  `Output Rereport Data File for ${period.name} is available for download`,
                  outputRereportFile,
                  outputRereportOptions,
                  callback,
                );
              };
            }

            // Execute all notification tasks in parallel
            parallel(notificationTasks, (err) => {
              cb(err);
            });
          },
        ], (err) => {
          if (err) {
            logger.error('Platoon: Error in exporting files');
            logger.error(err);
            // Notify user
            const generateOptions = {
              identifier: 'genericComplete',
              curveUser,
              email: curveUser.email,
              client,
              subject: 'Your SAP File Preparation has Failed',
              link: zipLocation,
            };
            Notification.generate('Your SAP File Preparation has Failed', `SAP File Preparation for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
              if (callback) {
                callback(err);
              }
            });
          } else {
            logger.info('Platoon: Completed export and delivery to Apple');
            callback();
          }
        });
      })
      .catch((err) => {
        logger.error('Platoon: Error in exporting files');
        logger.error(err);
        // Notify user
        const generateOptions = {
          identifier: 'genericComplete',
          curveUser,
          email: curveUser.email,
          client: undefined,
          subject: 'Your SAP File Preparation has Failed',
          link: zipLocation,
        };
        Notification.generate('Your SAP File Preparation has Failed', `SAP File Preparation for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
          if (callback) {
            callback(err);
          }
        });
      });
  },
  encodeAndSftpOnly: (period, curveUser, callback) => {
    let zipLocation;
    if (!period || !curveUser) {
      throw new Error('Period and Curve User must be passed to Platoon SAP Output');
    }
    Client.findById(period.clientId)
      .then((client) => {
        waterfall([
          (cb) => {
            if (period.platoon.files && period.platoon.files.length > 0) {
              cb(null, period.platoon.files);
            } else {
              // Generate files
              generateFiles(period, true, (err, remoteFiles, zip) => {
                zipLocation = zip;
                period.platoon.files = remoteFiles;
                period.save()
                  .then(() => {
                    cb(err, remoteFiles);
                  })
                  .catch((saveErr) => {
                    logger.error('Platoon: Error saving period after generating files');
                    logger.error(saveErr);
                    cb(err, remoteFiles);
                  });
              });
            }
          },
          (files, cb) => {
            logger.info('Platoon: Encrypting Files');
            lambdaEncrypt(files, `${period._id}/${period.platoon.summaryNumber}/encrypted`, cb);
          },
          (outputFiles, cb) => {
            // Separate out the summary file
            const summaryFile = outputFiles.find((file) => file.includes('SUMMARY'));
            const otherFiles = outputFiles.filter((file) => !file.includes('SUMMARY'));
            logger.info(otherFiles);
            logger.info('Platoon: Uploading Files');
            lambdaSftp(otherFiles, (err) => {
              if (err) {
                return cb(err);
              }
              // Run on summary file
              logger.info('Platoon: Uploading Summary File');
              lambdaSftp([summaryFile], (err) => {
                cb(err);
              });
            });
          },
          (cb) => {
            // Update the last file no and summary no on period from files
            let highestFileNumber = period.platoon.fileNumberLast || 0;
            let summaryFileNumber = period.platoon.summaryNumber;
            period.platoon.files.forEach((file) => {
              // Only do this on playdata files, summary files structured differently
              if (file.includes('PLAYDATA')) {
                // Get file name from S3 path
                const fileName = Path.basename(file);
                const split = fileName.split('_');
                const fileNumber = parseInt(split[4]);
                summaryFileNumber = parseInt(split[3]);
                if (fileNumber > highestFileNumber) {
                  highestFileNumber = fileNumber;
                }
              }
            });
            period.platoon.fileNumberLast = highestFileNumber;
            period.platoon.summaryNumber = summaryFileNumber + 1;
            period.save()
              .then(() => {
                cb();
              })
              .catch(() => {
                cb();
              });
          },
          (cb) => {
            // Notify user
            const generateOptions = {
              identifier: 'genericComplete',
              curveUser,
              email: curveUser.email,
              client,
              subject: 'Your SAP Delivery has completed',
              link: zipLocation,
            };
            Notification.generate('Your SAP Delivery has completed', `SAP Delivery for ${period.name} has been successfully delivered`, zipLocation, generateOptions, (err) => {
              cb(err);
            });
          },
        ], (err) => {
          if (err) {
            logger.error('Platoon: Error in exporting files');
            logger.error(err);
            // Notify user
            const generateOptions = {
              identifier: 'genericComplete',
              curveUser,
              email: curveUser.email,
              client,
              subject: 'Your SAP Delivery has failed',
              link: zipLocation,
            };
            Notification.generate('Your SAP Delivery has failed', `SAP Delivery for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
              if (callback) {
                callback(err);
              }
            });
          } else {
            logger.info('Platoon: Completed export and delivery to Apple');
            callback();
          }
        });
      })
      .catch((err) => {
        logger.error('Platoon: Error in exporting files');
        logger.error(err);
        // Notify user
        const generateOptions = {
          identifier: 'genericComplete',
          curveUser,
          email: curveUser.email,
          client: undefined,
          subject: 'Your SAP Delivery has failed',
          link: zipLocation,
        };
        Notification.generate('Your SAP Delivery has failed', `SAP Delivery for ${period.name} has failed. Please contact support.`, zipLocation, generateOptions, (err) => {
          if (callback) {
            callback(err);
          }
        });
      });
  },
};

const generateFiles = (period, incrementNumbers, callback) => {
  let zipLocation;
  let remoteFiles;
  waterfall([
    (cb) => {
      logger.info('Platoon: Generating Files');
      generate(period, incrementNumbers, cb);
    },
    (files, failures, unreported, dspSummaries, cb) => {
      // Zip files and upload to S3
      logger.info('Platoon: Zipping Files');
      const extraFiles = failures.concat(unreported, dspSummaries);
      zip(files, extraFiles, (err, zip) => {
        zipLocation = zip;
        cb(err, files);
      });
    },
    (files, cb) => {
      // Upload files to s3
      logger.info('Platoon: Uploading Files');
      uploadFilesToS3(files, `platoon/${period._id}/${period.platoon.summaryNumber}/original`, (err, generatedRemoteFiles) => {
        logger.info(generatedRemoteFiles);
        remoteFiles = generatedRemoteFiles;
        cb(err);
      });
    },
  ], (err) => {
    callback(err, remoteFiles, zipLocation);
  });
};
