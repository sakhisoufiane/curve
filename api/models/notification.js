// require('dotenv').config()
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Notification: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const modelHistory = require('../libs/modelHistory');
const SendEmail = require('../libs/sendEmail');

const notificationSchema = schema;

notificationSchema.plugin(modelHistory, { mongoose, name: 'notificationPatches' });
notificationSchema.plugin(mongoosePaginate);

notificationSchema.statics.generate = function (name, description, link, curveUser, options, callback) {
  let user;
  let saveInAppNotification = false;
  let sendEmailNotification = false;
  async.waterfall([
    function (cb) {
      const User = require('./user');
      User.findById(curveUser.id.toString())
        .then((foundUser) => {
          user = foundUser;

          // Temporary workaround for Fuga Splits, with no User
          if (!user && options.curveUser?.email) {
            sendEmailNotification = true;
          } else if (!user) {
            logger.info(`No notification generated, User not found ${curveUser.id}`);
          } else if (user.notifications === 'Both') {
            saveInAppNotification = true;
            sendEmailNotification = true;
          } else if (user.notifications === 'In App Notifications') {
            saveInAppNotification = true;
          } else if (user.notifications === 'Email') {
            sendEmailNotification = true;
          } else {
            saveInAppNotification = true;
          }
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      if (saveInAppNotification) {
        const newNotification = {
          clientId: curveUser.clientId, userId: user._id, name, description, link,
        };
        if (options.error) { newNotification.notificationErrors = options.error; }
        const notification = new Notification(newNotification);
        notification.save()
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        setImmediate(() => {
          cb();
        });
      }
    },
    function (cb) {
      if (sendEmailNotification) {
        if (options.identifier === 'invite') {
          SendEmail.invite(options.email, null, options.parent, options.userCreationToken, options.association, options.options, cb);
        } else if (options.identifier === 'inviteAdditional') {
          SendEmail.inviteAdditional(null, user.email, options.parent, options.association, options, cb);
        } else if (options.identifier === 'exportDownload') {
          SendEmail.exportDownload(options.curveUser, options.client, options.subject, options.link, cb);
        } else if (options.identifier === 'exportError') {
          SendEmail.exportError(options.curveUser, options.client, options.subject, options.error, cb);
        } else if (options.identifier === 'importError') {
          SendEmail.importError(options.curveUser, options.client, options.subject, options.file, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'spotifyImportError') {
          SendEmail.spotifyImportError(options.curveUser, options.client, options.subject, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'partialImportError') {
          SendEmail.partialImportError(options.curveUser, options.client, options.subject, options.file, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'partialSpotifyImportError') {
          SendEmail.partialSpotifyImportError(options.curveUser, options.client, options.subject, options.file, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'importComplete' && options.spotifyImport) {
          SendEmail.importComplete(options.curveUser, options.client, options.subject, 'from Spotify', options.count, cb);
        } else if (options.identifier === 'csPartialImportError') {
          SendEmail.csPartialImportError(options.curveUser, options.client, options.subject, options.file, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'importComplete') {
          SendEmail.importComplete(options.curveUser, options.client, options.subject, options.file, options.count, cb);
        } else if (options.identifier === 'deliveryComplete') {
          SendEmail.deliveryComplete(options.curveUser, options.client, options.subject, options.deliveryPartnerName, cb);
        } else if (options.identifier === 'deliveryError') {
          SendEmail.deliveryError(options.curveUser, options.client, options.subject, options.deliveryName, options.error, cb);
        } else if (options.identifier === 'bulkImportError') {
          SendEmail.bulkImportError(options.curveUser, options.client, options.subject, options.file, options.error, cb);
        } else if (options.identifier === 'bulkImportComplete') {
          SendEmail.bulkImportComplete(options.curveUser, options.client, options.subject, options.file, options.releases, options.tracks, options.payees, options.contracts, cb);
        } else if (options.identifier === 'bulkPublishingImportComplete') {
          SendEmail.bulkPublishingImportComplete(options.curveUser, options.client, options.subject, options.file, options.payees, options.contracts, options.composers, options.publishers, options.works, cb);
        } else if (options.identifier === 'cwrImportComplete') {
          SendEmail.cwrImportComplete(options.curveUser, options.client, options.subject, options.file, options.count, cb);
        } else if (options.identifier === 'genericComplete') {
          SendEmail.genericComplete(options.curveUser, options.client, options.subject, options.mainText, cb);
        } else if (options.identifier === 'genericError') {
          SendEmail.genericError(options.curveUser, options.client, options.subject, options.mainText, options.closingText, options.error, cb);
        } else if (options.identifier === 'genericEmail') {
          SendEmail.genericEmail(options.email, options.client, options.subject, options.mainText, cb);
        } else if (options.identifier === 'flushPaymentValidation') {
          SendEmail.flushPaymentValidation(options.curveUser, options.client, options.subject, options.file, options.error);
        }
      } else {
        setImmediate(() => {
          cb();
        });
      }
    },
  ], (err, result) => {
    if (callback) {
      callback(err, result);
    }
  });
};

notificationSchema.methods.userForbidden = function (user) {
  // Check if notification is for user
  if (this.userId === user.id) {
    return false;
  }
  return true;
};

const Notification = mongoose.model(name, notificationSchema);

module.exports = Notification;
