/* eslint-disable no-promise-executor-return */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, CwrDeliveryController, CwrUtils, Utils, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { CwrDelivery: { name, schema } } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { ObjectId } = require('mongodb');
const path = require('path');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const unzip = require('unzipper');
const moment = require('moment');

const modelHistory = require('../../libs/modelHistory');
const Ftp = require('../../libs/ftp');
const Sftp = require('../../libs/sftp');
const Notification = require('../notification');
const SendEmail = require('../../libs/sendEmail');
const Work = require('../work');
const Client = require('../client');
const User = require('../user');
const DeliverySchedule = require('../deliverySchedule');
const DeliveredWork = require('../deliveredWork');
const DeliveryLog = require('../deliveryLog');
const TerritoryGroup = require('../territoryGroup');
const DeliveryPartner = require('../deliveryPartner');

const cwrDeliverySchema = schema;

cwrDeliverySchema.plugin(modelHistory, { mongoose, name: 'cwrDeliveryPatches' });
cwrDeliverySchema.plugin(mongoosePaginate);

cwrDeliverySchema.methods.deliver = async function (curveUser, callback) {
  const DeliveryPartner = require('../deliveryPartner');
  const delivery = this;
  let deliveryPartnerName;
  let notificationSent = false;
  const client = await Client.findById(curveUser.clientId)
    .catch((err) => {
      logger.error(err);
      callback(err);
    });

  logger.info(`CWR Delivery: ${delivery._id.toString()} - Preparing to send`);
  const checkClientsDeliveryEmails = (clientsDeliveryEmails) => clientsDeliveryEmails.some((email) => email.trim() !== '');

  async.waterfall([
    function (cb) {
      CwrDelivery.updateOne({ _id: delivery._id }, { $set: { status: 'In Progress' } })
        .then(() => {
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      // Refactored to check delivery partner exists and the settings before doing any heavy lifting
      DeliveryPartner.findById(delivery.deliveryPartnerId)
        .then((deliveryPartner) => {
          if (!deliveryPartner) {
            logger.error(`CWR Delivery: ${delivery._id.toString()} - No delivery partner found`);
            cb(new Error('Requires a delivery partner'));
          } else if (deliveryPartner && !deliveryPartner.type) {
            logger.error(`CWR Delivery: ${delivery._id.toString()} - Delivery cannot be sent - please add a Delivery Type to this Delivery Partner in their settings`);
            cb(new Error('Delivery cannot be sent - please add a Delivery Type to this Delivery Partner in their settings'));
          } else {
            deliveryPartnerName = deliveryPartner.name;
            cb(null, deliveryPartner);
          }
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    async function (deliveryPartner) {
      logger.info(`CWR Delivery: ${delivery._id.toString()} - Preparing delivery`);
      // Required due to a mess of circular dependencies
      // TODO: Fix when moving delivery logic to Processor
      const CwrDeliveryController = require('../../controllers/cwrDelivery/cwrDelivery');
      const key = await CwrDeliveryController.prepareDelivery({ delivery, deliveryPartner, curveUser });
      return [key, deliveryPartner];
    },
    function ([key, deliveryPartner], cb) {
      if (deliveryPartner.type === 'Email') {
        fileManager.publicLink7Days(key, (err, link) => {
          cb(err, link, deliveryPartner);
        });
      } else {
        fileManager.downloadFromS3(key, process.env.S3_bucket, (err, localFile) => {
          logger.debug('--------------==============--------------');
          logger.debug(localFile);
          logger.debug('--------------==============--------------');
          cb(err, localFile, deliveryPartner);
        });
      }
    },
    function (fileInfo, deliveryPartner, cb) {
      if (deliveryPartner.type === 'Email') {
        logger.info(`CWR Delivery: ${delivery._id.toString()} - Sending Email to Delivery Partner`);
        // Send Email
        Client.findById(curveUser.clientId)
          .then((client) => {
            if (!delivery.fromScheduledDelivery) {
              User.findById(curveUser.id)
                .then((user) => {
                  if (user) {
                    logger.debug(`deliveryPartner.notificationEmail ${deliveryPartner.notificationEmail}`);
                    logger.debug(`user.email ${user.email}`);
                    // Remove any delivery emails if they match the user's email - Sendgrid will error if using the same email multiple times
                    // This is structured as a string, comma separated
                    const formattedDeliveryPartnerNotificationEmails = deliveryPartner.notificationEmail.replace(/\s+/g, '');
                    let notificationEmails = formattedDeliveryPartnerNotificationEmails.split(',').filter((email) => email.trim() !== user.email);
                    let cc = user.email;
                    if (!notificationEmails || notificationEmails === '' || !notificationEmails.length) {
                      notificationEmails = [cc];
                      cc = null;
                    }
                    SendEmail.cwrDelivery(notificationEmails, cc, client, `${client.name} Has Sent You a ${delivery.outputFormat} File`, fileInfo, delivery, cb);
                  } else {
                    cb(new Error('User not found to send email from'));
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  cb(new Error('User not found to send email from'));
                });
            } else if (delivery.fromScheduledDelivery) {
              client.deliveryEmails = client.deliveryEmails || [];
              logger.debug(`deliveryPartner.notificationEmail ${deliveryPartner.notificationEmail}`);
              User.find({ clientId: curveUser.clientId, _id: { $in: client.deliveryEmails } })
                .then((users) => {
                  const emails = users?.length ? users.map((user) => user.email) : null;
                  // Remove whitespace added by client - a known issue
                  let formattedDeliveryPartnerNotificationEmails = deliveryPartner.notificationEmail.replace(/\s+/g, '');
                  // Check whether there are multiple emails separated by comma, if so split and convert to an array - the required format of multiple emails for sendgrid
                  formattedDeliveryPartnerNotificationEmails = formattedDeliveryPartnerNotificationEmails.includes(',') ? formattedDeliveryPartnerNotificationEmails.split(',') : formattedDeliveryPartnerNotificationEmails;
                  // Remove any delivery emails if they match the user's email - Sendgrid will error if using the same email multiple times
                  const filteredUserEmails = emails ? emails.filter((email) => !formattedDeliveryPartnerNotificationEmails.includes(email)) : null;
                  SendEmail.cwrDelivery(formattedDeliveryPartnerNotificationEmails, filteredUserEmails, client, `${client.name} Has Sent You a ${delivery.outputFormat} File`, fileInfo, delivery, cb);
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            } else {
              logger.debug('No Delivery Emails to send out');
              cb();
            }
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        logger.info(`CWR Delivery: ${delivery._id.toString()} - Sending via FTP`);
        prepareFilesArray(fileInfo, (err, localFiles) => {
          if (err) {
            return cb(err);
          }
          logger.debug(localFiles);

          // Set up FTP data
          const config = { host: deliveryPartner.ftpHost, username: deliveryPartner.ftpUsername, password: deliveryPartner.ftpPassword };
          if (deliveryPartner.ftpPort) { config.port = deliveryPartner.ftpPort; }
          // Check if FTP and port is 21 or 22, remove if set
          if (deliveryPartner.type === 'FTP' && (deliveryPartner.ftpPort === '21' || deliveryPartner.ftpPort === 21 || deliveryPartner.ftpPort === '22' || deliveryPartner.ftpPort === 22)) {
            delete config.port;
          }

          // Conditionally Add SFTP Config for Key File
          if (deliveryPartner.type === 'SFTP') {
            config.authenticationType = deliveryPartner.ftpAuthenticationType;
            config.privateKey = deliveryPartner.ftpFileKey;
          }

          // Conditionally Add FTPS (implicit TLS) Config
          if (deliveryPartner.type === 'FTPS') {
            config.protocol = 'FTPS';
            config.secure = 'implicit';
          }

          // Get FTP type
          const ftp = deliveryPartner.type === 'SFTP' ? new Sftp(config) : new Ftp(config);
          // Connect to FTP server
          logger.info(`CWR Delivery: ${delivery._id.toString()} - FTP Details { type: ${deliveryPartner.type}, host: ${deliveryPartner.ftpHost}, username: ${deliveryPartner.ftpUsername}, port: ${deliveryPartner.ftpPort} }`);
          ftp.connect(deliveryPartner.ftpHost, client._id, 'CWR Delivery', client.name).then(() => {
            logger.info(`CWR Delivery: ${delivery._id.toString()} - Connected to (S)FTP`);
            let remoteLocation = deliveryPartner.ftpRootDir;
            if (!remoteLocation || remoteLocation === '') {
              remoteLocation = '/';
            } else if (remoteLocation && remoteLocation[remoteLocation.length - 1] !== '/') {
              remoteLocation += '/';
            }
            // Upload each file in localFiles array
            async.eachSeries(localFiles, (localFile, filesCb) => {
              const remotePath = remoteLocation + path.basename(localFile);
              logger.info(`CWR Delivery: ${delivery._id.toString()} - Attempting to upload - Remote Path: ${remotePath}`);
              ftp.uploadFile(localFile, remotePath).then(() => {
                logger.info(`CWR Delivery: ${delivery._id.toString()} - Uploaded File - Remote Path: ${remotePath}`);
                // Clear up files
                fs.unlinkSync(localFile);
                filesCb();
              }).catch((err) => {
                logger.error(`CWR Delivery: ${delivery._id.toString()} - Failed to upload - Remote Path: ${remotePath}`);
                logger.error(err);
                filesCb(err);
              });
            }, (err) => {
              if (err) {
                localFiles.forEach((localFile) => {
                  try {
                    if (fs.existsSync(localFile)) {
                      fs.unlinkSync(localFile);
                    }
                  } catch (cleanupErr) {
                    logger.error(`CWR Delivery: ${delivery._id.toString()} - Failed to cleanup local file ${localFile}: ${cleanupErr}`);
                  }
                });
                ftp.disconnect(deliveryPartner.ftpHost, client._id, 'CWR Delivery', client.name)
                  .catch((disconnectErr) => logger.error(`CWR Delivery: ${delivery._id.toString()} - Failed to disconnect (S)FTP after upload error: ${disconnectErr}`))
                  .finally(() => cb(err));
                return;
              }
              logger.info(`CWR Delivery: ${delivery._id.toString()} - FTP Upload Complete`);
              ftp.disconnect(deliveryPartner.ftpHost, client._id, 'CWR Delivery', client.name).then(() => {
                logger.info(`CWR Delivery: ${delivery._id.toString()} - Disconnected from (S)FTP`);
                const subject = `Your ${delivery.outputFormat} was delivered to ${deliveryPartner.name}`;
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    logger.info(`CWR Delivery: ${delivery._id.toString()} - Sending complete email to users`);
                    if (!delivery.fromScheduledDelivery) {
                      const generateOptions = {
                        identifier: 'deliveryComplete',
                        curveUser,
                        deliveryPartnerName: deliveryPartner.name,
                        client,
                        subject,
                      };
                      Notification.generate(`${delivery.outputFormat} was delivered`, subject, null, curveUser, generateOptions, cb);
                      notificationSent = true;
                    } else if (delivery.fromScheduledDelivery && client.deliveryEmails?.length && checkClientsDeliveryEmails(client.deliveryEmails)) {
                      User.find({ clientId: curveUser.clientId, _id: { $in: client.deliveryEmails } })
                        .then((users) => {
                          users.forEach((user) => {
                            const generateOptions = {
                              identifier: 'deliveryComplete',
                              curveUser: { clientId: curveUser.clientId, id: user._id.toString() },
                              deliveryPartnerName: deliveryPartner.name,
                              client,
                              subject,
                            };
                            Notification.generate(`${delivery.outputFormat} was delivered`, subject, null, { clientId: curveUser.clientId, id: user._id.toString() }, generateOptions);
                            notificationSent = true;
                          });
                          cb();
                        })
                        .catch((err) => {
                          logger.error(err);
                          cb(err);
                        });
                    } else {
                      cb();
                    }
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              }).catch(cb);
            });
          }).catch((err) => {
            logger.info(`CWR Delivery: ${delivery._id.toString()} - Failed to connect to (S)FTP`);
            logger.error(err);
            localFiles.forEach((localFile) => {
              try {
                if (fs.existsSync(localFile)) {
                  fs.unlinkSync(localFile);
                }
              } catch (cleanupErr) {
                logger.error(`CWR Delivery: ${delivery._id.toString()} - Failed to cleanup local file ${localFile}: ${cleanupErr}`);
              }
            });
            ftp.disconnect(deliveryPartner.ftpHost, client._id, 'CWR Delivery', client.name)
              .catch((disconnectErr) => logger.error(`CWR Delivery: ${delivery._id.toString()} - Failed to disconnect (S)FTP after connection error: ${disconnectErr}`))
              // Send back generic error message to user.
              .finally(() => cb(new Error('Could not connect to FTP server.')));
          });
        });
      }
    },
  ], async (waterfallErr) => {
    if (waterfallErr) {
      logger.info(`CWR Delivery: ${delivery._id.toString()} - Delivery Failed`);
      logger.error(waterfallErr);
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          const subject = `Your ${delivery.outputFormat} Delivery '${delivery.name}' Has Errored`;

          CwrDelivery.updateOne({ _id: delivery._id }, { $set: { status: 'Errored' } })
            .then(() => {
              if (!delivery.fromScheduledDelivery) {
                const generateOptions = {
                  identifier: 'deliveryError',
                  curveUser,
                  deliveryName: delivery.name,
                  client,
                  subject,
                  error: [waterfallErr.message],
                };
                if (waterfallErr.message === 'Delivery cannot be sent - please add a Delivery Type to this Delivery Partner in their settings') {
                  callback(waterfallErr); // only a toaster required for this scenario, no notification or email
                } else {
                  Notification.generate(`${delivery.outputFormat} Delivery Errored`, subject, null, curveUser, generateOptions);
                  callback(waterfallErr);
                }
              } else if (delivery.fromScheduledDelivery && client.deliveryEmails?.length && checkClientsDeliveryEmails(client.deliveryEmails)) {
                User.find({ clientId: curveUser.clientId, _id: { $in: client.deliveryEmails } })
                  .then((users) => {
                    users.forEach((user) => {
                      const generateOptions = {
                        identifier: 'deliveryError',
                        curveUser: { clientId: curveUser.clientId, id: user._id.toString() },
                        deliveryName: delivery.name,
                        client,
                        subject,
                        error: [waterfallErr.message],
                      };
                      Notification.generate(`${delivery.outputFormat} Delivery Errored`, subject, null, { clientId: curveUser.clientId, id: user._id.toString() }, generateOptions);
                    });
                    callback(waterfallErr);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              } else {
                callback(waterfallErr);
              }
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      try {
        logger.info(`CWR Delivery: ${delivery._id.toString()} - Delivery Completed Successfully`);
        const client = await Client.findById(curveUser.clientId);
        await CwrDelivery.updateOne({ _id: delivery._id }, { $set: { status: 'Delivered' } });

        if (!delivery.fromScheduledDelivery && !notificationSent) {
          const subject = `Your ${delivery.outputFormat} was delivered to ${deliveryPartnerName}`;
          const generateOptions = {
            identifier: 'deliveryComplete',
            curveUser,
            deliveryPartnerName,
            client,
            subject,
          };
          await new Promise((resolve, reject) => {
            Notification.generate(`${delivery.outputFormat} was delivered`, subject, null, curveUser, generateOptions, (err) => (err ? reject(err) : resolve()));
          });
        } else if (delivery.fromScheduledDelivery && client.deliveryEmails?.length && !notificationSent && checkClientsDeliveryEmails(client.deliveryEmails)) {
          const users = await User.find({ clientId: curveUser.clientId, _id: { $in: client.deliveryEmails } });
          await async.each(users, async (user) => {
            const subject = `Your ${delivery.outputFormat} was delivered to ${deliveryPartnerName}`;
            const generateOptions = {
              identifier: 'deliveryComplete',
              curveUser: { clientId: curveUser.clientId, id: user._id.toString() },
              deliveryPartnerName,
              client,
              subject,
            };
            await new Promise((resolve, reject) => {
              Notification.generate(`${delivery.outputFormat} was delivered`, subject, null, { clientId: curveUser.clientId, id: user._id.toString() }, generateOptions, (err) => (err ? reject(err) : resolve()));
            });
          });
        }

        logger.info(`CWR Delivery: ${delivery._id.toString()} - Updating delivered works`);
        await new Promise((resolve, reject) => {
          delivery.deliverWorks((err) => (err ? reject(err) : resolve()));
        });
        callback();
      } catch (err) {
        callback(err);
      }
    }
  });
};

/**
 * Marks all works in this delivery as delivered in the database.
 *
 * Streams matching works via a cursor to keep memory usage at O(batch) rather than
 * O(total works). For each batch of BATCH_SIZE works, calls deliverWorksBatch which
 * issues three bulk MongoDB operations (DeliveredWork upserts, DeliveryLog upserts,
 * Work.updateMany). This replaces the previous pattern of one save per work per partner,
 * reducing round trips from O(works × partners) to O(ceil(works / BATCH_SIZE) × 3).
 *
 * @param {Function} callback - Node-style callback(err) called when complete
 */
cwrDeliverySchema.methods.deliverWorks = async function (callback) {
  const delivery = this;
  const deliveryId = delivery._id.toString();
  const BATCH_SIZE = 1000;

  function perfRate(count, startMs) {
    const secs = (Date.now() - startMs) / 1000;
    return secs > 0 ? Math.round(count / secs) : 0;
  }

  logger.info(`CWR Delivery: ${deliveryId} - Marking works as delivered`);

  try {
    const filterStart = Date.now();
    logger.info(`CWR Delivery: ${deliveryId} - Building works filter`);
    const filter = await CwrDeliveryController.buildWorksFilter({
      status: 'All',
      delivery,
      DeliveryPartner,
      Work,
      DeliverySchedule,
      CwrDelivery,
      TerritoryGroup,
      DeliveredWork,
    });
    logger.info(`CWR Delivery: ${deliveryId} - buildWorksFilter complete in ${((Date.now() - filterStart) / 1000).toFixed(2)}s`);

    const thisDeliveryPartner = await DeliveryPartner.findById(delivery.deliveryPartnerId);
    const deliveryPartnerIds = thisDeliveryPartner?.subPartners?.length
      ? [delivery.deliveryPartnerId].concat(thisDeliveryPartner.subPartners.map((sp) => sp._id))
      : [delivery.deliveryPartnerId];
    const deliveryPartners = await DeliveryPartner.find({ _id: { $in: deliveryPartnerIds } }, '_id name receivingParty');
    logger.info(`CWR Delivery: ${deliveryId} - Delivery partners resolved: ${deliveryPartners.map((dp) => dp._id).join(', ')}`);

    // Build deliveredToArray once — same values for every work in every batch
    const deliveredToArray = [{ deliveryPartnerId: delivery.deliveryPartnerId, deliveredAt: moment().format(), status: 'Delivered' }];
    if (thisDeliveryPartner?.subPartners) {
      thisDeliveryPartner.subPartners.forEach((subPartner) => {
        deliveredToArray.push({ deliveryPartnerId: subPartner.partner._id, deliveredAt: moment().format(), status: 'Delivered' });
      });
    }

    // Stream work IDs through a cursor rather than loading all at once.
    // .select('_id').lean() keeps each document as small as possible — we only need
    // the ID here; the full work documents are fetched inside deliverWorksBatch.
    logger.info(`CWR Delivery: ${deliveryId} - Streaming works via cursor`);
    const cursor = Work.find(filter).select('_id').lean().cursor();
    let batch = [];
    const allWorkIds = [];
    let totalProcessed = 0;
    const cursorStart = Date.now();

    for await (const work of cursor) {
      batch.push(work._id);
      allWorkIds.push(work._id.toString());

      if (batch.length === BATCH_SIZE) {
        const batchStart = Date.now();
        await deliverWorksBatch(batch, deliveryPartners, delivery, deliveredToArray);
        totalProcessed += BATCH_SIZE;
        logger.info(
          `CWR Delivery: ${deliveryId} - Batch ${Math.ceil(totalProcessed / BATCH_SIZE)} complete`
          + ` | ${totalProcessed} works processed in ${((Date.now() - batchStart) / 1000).toFixed(2)}s`
          + ` | rate=${perfRate(totalProcessed, cursorStart)}/s`,
        );
        batch = [];
      }
    }

    if (batch.length > 0) {
      const batchStart = Date.now();
      await deliverWorksBatch(batch, deliveryPartners, delivery, deliveredToArray);
      totalProcessed += batch.length;
      logger.info(
        `CWR Delivery: ${deliveryId} - Final batch complete`
        + ` | ${totalProcessed} works processed in ${((Date.now() - batchStart) / 1000).toFixed(2)}s`
        + ` | rate=${perfRate(totalProcessed, cursorStart)}/s`,
      );
    }

    logger.info(
      `CWR Delivery: ${deliveryId} - Cursor complete`
      + ` | ${totalProcessed} total works in ${((Date.now() - cursorStart) / 1000).toFixed(2)}s`,
    );

    if (allWorkIds.length > 0) {
      logger.info(`CWR Delivery: ${deliveryId} - Saving delivery with ${allWorkIds.length} workIds`);
      delivery.workIds = allWorkIds;
      await delivery.save();
    }

    logger.info(`CWR Delivery: ${deliveryId} - deliverWorks complete`);
    callback();
  } catch (err) {
    logger.error(`CWR Delivery: ${deliveryId} - deliverWorks failed`, err);
    callback(err);
  }
};

/**
 * Processes one batch of work IDs through the delivered-works pipeline using bulk operations.
 *
 * For each work × delivery partner pair:
 *  - Upserts a DeliveredWork record (status set to 'Delivered' unless the work is already Accepted)
 *  - Appends a delivery log entry to DeliveryLog
 * Then updates all works in the batch in a single updateMany.
 *
 * Using bulkWrite instead of per-work individual saves reduces DB round trips from
 * O(works × partners) per batch down to 3 total (one bulkWrite each for DeliveredWork,
 * DeliveryLog, and Work.updateMany).
 *
 * @param {ObjectId[]} workIds - Work IDs to process in this batch
 * @param {Object[]} deliveryPartners - Resolved delivery partner documents ({ _id, name, receivingParty })
 * @param {Object} delivery - CwrDelivery document
 * @param {{ deliveryPartnerId: ObjectId, deliveredAt: string }[]} deliveredToArray - Pre-built entries
 *   to push onto each work's deliveredTo array. Built once outside the batch loop since the values
 *   are identical for every work in the delivery.
 */
async function deliverWorksBatch(workIds, deliveryPartners, delivery, deliveredToArray) {
  const now = new Date();

  // Pre-fetch existing DeliveredWork records for this batch so we know each record's current
  // status before deciding whether to update it. Scoped to this batch's workIds to avoid
  // loading all records at once.
  const existingRecords = await DeliveredWork.find({
    clientId: delivery.clientId,
    workId: { $in: workIds },
    deliveryPartnerId: { $in: deliveryPartners.map((p) => p._id) },
  }).lean();

  // Key by "workId-deliveryPartnerId" for O(1) lookup in the loop below
  const existingMap = new Map(
    existingRecords.map((dw) => [`${dw.workId}-${dw.deliveryPartnerId}`, dw]),
  );

  const deliveredWorkOps = [];
  const logOps = [];

  for (const partner of deliveryPartners) {
    for (const workId of workIds) {
      const existing = existingMap.get(`${workId}-${partner._id}`);
      const shouldUpdateStatus = !existing
        || !DeliveredWorkController.ackDeliveryStatuses.Accepted.includes(existing.status);
      const newStatus = shouldUpdateStatus ? 'Delivered' : existing.status;
      // Pre-generate _id for new records so deliveredWorkId is available for the log entry
      const deliveredWorkId = existing ? existing._id : new ObjectId();

      deliveredWorkOps.push({
        updateOne: {
          filter: { clientId: delivery.clientId, workId, deliveryPartnerId: partner._id },
          update: {
            $set: {
              deliveryDate: now,
              updatedAt: now,
              ...(shouldUpdateStatus && { status: 'Delivered' }),
            },
            $setOnInsert: {
              _id: deliveredWorkId,
              clientId: delivery.clientId,
              workId,
              deliveryPartnerId: partner._id,
              cwrDeliveryId: delivery._id,
              receivingParty: partner.receivingParty,
              createdAt: now,
            },
          },
          upsert: true,
        },
      });

      logOps.push({
        updateOne: {
          filter: { clientId: delivery.clientId, deliveryPartnerId: partner._id, workId },
          update: {
            $push: {
              log: {
                deliveredWorkId,
                cwrDeliveryId: delivery._id,
                status: newStatus,
                action: 'Delivery',
                date: moment().format(),
              },
            },
            $set: { updatedAt: now },
            $setOnInsert: {
              clientId: delivery.clientId,
              deliveryPartnerId: partner._id,
              workId,
              createdAt: now,
            },
          },
          upsert: true,
        },
      });
    }
  }

  // Single round trip per collection for the entire batch.
  // ordered: false lets MongoDB continue processing remaining ops if one fails.
  await DeliveredWork.bulkWrite(deliveredWorkOps, { ordered: false });
  await DeliveryLog.bulkWrite(logOps, { ordered: false });

  // One updateMany covers all works in the batch — push deliveredTo entries and clear
  // the forceRedelivery flag for the primary partner in a single query.
  // FLAG (OPS-502): $pull only removes primary deliveryPartnerId from forceRedelivery,
  // not sub-partners — preserved exactly as the original to avoid behaviour change
  await Work.updateMany(
    { _id: { $in: workIds } },
    {
      $push: { deliveredTo: { $each: deliveredToArray } },
      $pull: { forceRedelivery: delivery.deliveryPartnerId },
    },
  );
}

cwrDeliverySchema.methods.works = async function (filterType, filter, paginationParams, callback) {
  const DeliveryPartner = require('../deliveryPartner');
  const delivery = this;
  paginationParams.select = 'title composer identifier clientId valid deliveredTo';

  const uncontrolledWorksPromise = CwrDeliveryController.getUncontrolledWorks({
    Work,
    DeliveryPartner,
    TerritoryGroup,
    DeliverySchedule,
    CwrDelivery,
    cwrDelivery: delivery,
    query: filter,
  });

  const result = await CwrUtils.getWorksMatchingFilter({
    Work,
    DeliverySchedule,
    CwrDelivery,
    DeliveryPartner,
    TerritoryGroup,
    clientId: delivery.clientId,
    deliveryPartnerId: delivery.deliveryPartnerId,
    filterType,
    deliveryFilter: filter,
    paginationParams,
    workIds: delivery.workIds.length ? delivery.workIds : null,
  });

  result.docs = JSON.parse(JSON.stringify(result.docs));

  result.docs.forEach((work) => {
    const entry = work.deliveredTo?.find(
      (d) => d.deliveryPartnerId?.toString() === delivery.deliveryPartnerId?.toString(),
    );
    if (entry) {
      work.status = entry.status;
      work.messages = entry.messages;
      work.iswc = entry.iswc;
      work.partnerId = entry.partnerId;
    }
  });

  const uncontrolledWorks = await uncontrolledWorksPromise;

  callback(null, { works: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs }, uncontrolledWorks });
};

cwrDeliverySchema.methods.exportWorks = function (status, valid, curveUser) {
  const DeliveredWork = require('../deliveredWork');
  const delivery = this;
  let client;
  // Setup CSV
  const outputLocation = `${appRootDir}/tmp/Acknowledgement Export - ${moment().format('X')}.csv`;
  const writeCsv = new WriteCsv({ headers: ['Work ID', 'Work Title', 'Identifier', 'Source', 'Status', 'Detail'], outputLocation });
  async.waterfall([
    async () => {
      // Get Works
      const filter = await CwrDeliveryController.buildWorksFilter({
        status: 'All',
        delivery,
        DeliveryPartner,
        Work,
        DeliverySchedule,
        CwrDelivery,
        TerritoryGroup,
        DeliveredWork,
      });
      if (!valid) filter.valid = false;
      const works = await Work.find(filter);
      return works;
    },
    (works, cb) => {
      const output = [];
      // Map works to CSV format
      async.eachLimit(works, 100, (work, workCb) => {
        const row = [work._id.toString(), work.title, work.identifier, delivery.receivingParty];
        // Get delivery status/messages
        let status; let messages;
        DeliveredWorkController.getSingle({ DeliveredWork, filter: { clientId: work.clientId, workId: work._id, cwrDeliveryId: delivery._id }, select: { status: 1, messages: 1 } })
          .then((delivery) => {
            status = delivery?.status;
            messages = delivery?.messages;

            // Map accepted, rejected or no participation values
            if (['Accepted', 'Registration Accepted', 'Transaction Accepted', 'Registration Accepted with Changes'].includes(status)) {
              row.push('Accepted');
            } else if (['Rejected', 'Claim Rejected', 'Conflict'].includes(status)) {
              row.push('Rejected');
            } else if (['Duplicate'].includes(status)) {
              row.push('Duplicate');
            } else if (['No Participation'].includes(status)) {
              row.push('No Participation');
            } else {
              row.push(status);
            }
            // Add Message
            if (messages) {
              row.push(messages.join(', '));
            }

            output.push(row);
            workCb();
          })
          .catch(workCb);
      }, (err) => {
        cb(err, output);
      });
    },
    (output, cb) => {
      // Write to CSV
      writeCsv.addData(output, (err) => {
        writeCsv.write((err) => {
          cb(err);
        });
      });
    },
    (cb) => {
      // Get client for notifications
      Client.findById(curveUser.clientId)
        .then((foundClient) => {
          client = foundClient;
          // Upload to S3
          fileManager.uploadToS3(`exports/${client.name} Delivery Export ${moment().format('YYYYMMDDHHmmssSSS')}.${outputLocation.split('.').pop()}`, outputLocation, cb);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    (key, cb) => {
      // Get Public link from S3
      fileManager.publicLink24Hours(key, cb);
    },
    (link, cb) => {
      // Create notification
      const generateOptions = {
        identifier: 'exportDownload',
        curveUser,
        client,
        subject: `Your Delivery Export for ${client.name} is Ready to Download`,
        link,
      };
      Notification.generate('Delivery Export Ready', `Your Delivery Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
        cb(err);
      });
    },
  ], (err) => {
    // Handle errors
    if (err) {
      const generateOptions = {
        identifier: 'exportError',
        curveUser,
        client,
        subject: 'Your Delivery Export Has Errored',
        error: err.message,
      };
      Notification.generate('Your Delivery Export Has Errored', err.message, null, curveUser, generateOptions);
    }
  });
};

cwrDeliverySchema.methods.filterTerritories = function (deliveryFilter, filter, deliverySpecificTerritory) {
  const delivery = this;
  if (!filter) {
    filter = {};
  }
  // If delivery territory filter is set to 'World', convert this to array of all territories
  if (deliveryFilter?.territory === 'WW') {
    deliveryFilter.territory = Utils.allTerritories;
  }
  // Manage territories
  if (delivery.territory && delivery.territory !== 'WW' && deliverySpecificTerritory && deliverySpecificTerritory.length !== 0 && deliveryFilter && deliveryFilter.territory && deliveryFilter.territory.length !== 0) {
    // Both delivery and filter territories exists
    filter.$and = [{ territories: { $in: deliverySpecificTerritory } }, { territories: deliveryFilter.territory }];
  } else if (delivery.territory && delivery.territory !== 'WW' && deliverySpecificTerritory && deliverySpecificTerritory.length !== 0) {
    // Only delivery.territory exists
    filter.territories = { $in: deliverySpecificTerritory };
  } else if (deliveryFilter.territory) {
    // Only filter territories exists
    filter.territories = deliveryFilter.territory;
  }
  return filter;
};

cwrDeliverySchema.methods.deliverySpecificTerritories = function (callback) {
  const delivery = this;
  // Check for delivery territories
  if (delivery.territory && ObjectId.isValid(delivery.territory)) {
    // Convert into array of teritories if it's a territoryGroup
    TerritoryGroup.findById(delivery.territory)
      .then((territoryGroup) => {
        if (territoryGroup) {
          // Return territories if it exists
          callback(null, territoryGroup.territories);
        } else {
          callback(null, null);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    // Return territory string converted into Array
    callback(null, [delivery.territory].filter(Boolean));
  }
};

cwrDeliverySchema.methods.issueSequenceNo = async function () {
  const cwrDelivery = this;
  if (!cwrDelivery.sequenceNo) {
    const foundDelivery = await CwrDelivery.findOne({ clientId: cwrDelivery.clientId }, { sequenceNo: 1 }, { sort: { sequenceNo: -1 } });
    if (!foundDelivery || !foundDelivery.sequenceNo) {
      cwrDelivery.sequenceNo = 1;
    } else {
      cwrDelivery.sequenceNo = foundDelivery.sequenceNo + 1;
    }
  }
};

cwrDeliverySchema.pre('save', async function (next) {
  const DeliveryPartner = require('../deliveryPartner');
  const delivery = this;
  if (!delivery.name) {
    const { name: deliveryPartnerName } = await DeliveryPartner.findById(delivery.deliveryPartnerId);
    delivery.name = `New Delivery to ${deliveryPartnerName}`;
  }
  await delivery.issueSequenceNo();
  next();
});

cwrDeliverySchema.post('save', (err, savedDelivery, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

/**
 * Formats an error message to a human readable format.
 *
 * Calls callback(null, newMessages) with the formatted error [newMessages].
 *
 * @method
 * @param {object} err - The error to format.
 * @param {function(string)} callback - The callback that handles the response.
 */

function errorMessages(err, callback) {
  if (err && err.message) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('Path `territory` is required')) {
        return 'A Territory is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

const prepareFilesArray = function (file, callback) {
  // If we have a zip we will extract and return an array of files to upload
  if (file.substring(file.length - 4, file.length) === '.zip') {
    let filesWrittenCounter = 0;
    const files = [];
    const zipPipeline = fs.createReadStream(file).pipe(unzip.Parse());

    zipPipeline.on('entry', (entry) => {
      const fileName = entry.path;
      if (fileName) {
        const filePath = `${appRootDir}/tmp/${fileName}`;
        files.push(filePath);
        const filePipeline = entry.pipe(fs.createWriteStream(filePath));

        filePipeline.on('close', () => {
          // Increment count for checking files have been succesfully
          filesWrittenCounter += 1;
        });

        filePipeline.on('error', (err) => {
          logger.error(`Unzipped write error : file: ${filePath}`);
          callback(err);
        });
      } else {
        entry.autodrain();
      }
    });

    zipPipeline.on('close', () => {
      const progressCheck = setInterval(() => {
        // Wait until all files in the archive have been written
        if (filesWrittenCounter === files.length) {
          fs.unlinkSync(file);
          clearInterval(progressCheck);
          callback(null, files);
        }
      }, 200);
    });

    zipPipeline.on('error', (err) => {
      logger.error(`Unzip Error : file: ${file}`);
      callback(err);
    });
  } else {
    // Uploading a single file so wrap in an array and return
    callback(null, [file]);
  }
};

cwrDeliverySchema.methods.reDeliverWorks = function (status, curveUser, callback) {
  const delivery = this;
  let dateFormat = 'DD/MM/YYYY';
  async.waterfall([
    // Get Client's date format
    function (cb) {
      Client.findById(curveUser.clientId, 'dateFormat')
        .then((client) => {
          if (client && client.dateFormat) {
            ({ dateFormat } = client);
          }
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    // Build filter
    async function () {
      const filter = await CwrDeliveryController.buildWorksFilter({
        status: 'All',
        delivery,
        DeliveryPartner,
        Work,
        DeliverySchedule,
        CwrDelivery,
        TerritoryGroup,
        DeliveredWork,
      });
      return filter;
    },
    // Get Work Ids
    function (filter, cb) {
      Work.find(filter, '_id')
        .then((works) => {
          const workIds = works.map((work) => work._id);
          cb(null, workIds);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    // Create Delivery
    function (workIds, cb) {
      const cwrDelivery = new CwrDelivery({
        name: `${delivery.name} ${status === 'All' ? '(Re-Delivered)' : 'Rejected'} - ${moment().format(dateFormat.toUpperCase())}`,
        clientId: curveUser.clientId,
        territory: delivery.territory,
        deliveryPartnerId: delivery.deliveryPartnerId,
        cwrVersion: delivery.cwrVersion,
        outputFormat: delivery.outputFormat,
        receivingParty: delivery.receivingParty,
        fileName: delivery.fileName,
        filter: {
          workIds,
        },
      });

      if (status === 'All') { cwrDelivery.filterType = 'specific'; } // For re-delivery

      cwrDelivery.save()
        .then((savedCwrDelivery) => {
          cb(null, savedCwrDelivery);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], callback);
};

const CwrDelivery = mongoose.model(name, cwrDeliverySchema);

module.exports = CwrDelivery;
