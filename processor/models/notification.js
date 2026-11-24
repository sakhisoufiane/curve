// require('dotenv').config()
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Notification: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const async = require('async');
const SendEmail = require('../libs/sendEmail');

const notificationSchema = schema;

notificationSchema.plugin(mongoosePaginate);

notificationSchema.statics.generate = function (name, description, link, options, callback) {
  const User = require('./user');
  let user;
  let saveInAppNotification = false;
  let sendEmailNotification = false;
  async.waterfall([
    function (cb) {
      User.findOne({ email: options.email })
        .then((foundUser) => {
          user = foundUser;

          // Temporary workaround for Fuga Splits, with no User
          if (!user && options.email) {
            sendEmailNotification = true;
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
          logger.error('Error finding user for notification', err);
          cb(err);
        });
    },
    function (cb) {
      if (saveInAppNotification) {
        const newNotification = {
          clientId: options.client._id.toString(), userId: user._id, name, description, link,
        };
        if (options.error) { newNotification.notificationErrors = options.error; }
        if (options.urls?.length > 0) newNotification.urls = options.urls;
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
        if (
          options.identifier === 'reportDownload'
          || options.identifier === 'salesExportZips'
          || options.identifier === 'statementSalesExportZips'
          || options.identifier === 'songlistDownload'
          || options.identifier === 'statementAllFilesExportZip'
          || options.identifier === 'worksExportDownload'
          || options.identifier === 'unmappedExportDownload'
          || options.identifier === 'cwrExportDownload'
        ) {
          // For large exports, we need to show a list of download links instead of a single button
          if (options.urls) {
            SendEmail.genericComplete(
              options.email,
              options.client,
              options.subject,
              options.mainText,
              cb,
            );
          } else {
            // Exports with only a single file to download (show the button in the template)
            SendEmail.reportDownload(
              options.email,
              options.client,
              options.subject,
              options.link,
              options.mainText,
              cb,
            );
          }
        } else if (options.identifier === 'genericComplete') {
          SendEmail.genericComplete(options.email, options.client, options.subject, options.mainText, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'genericError') {
          SendEmail.genericError(options.email, options.client, options.subject, options.mainText, options.closingText, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'bulkImportError') {
          SendEmail.bulkImportError(options.email, options.client, options.subject, options.mainText, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'partialImportError') {
          SendEmail.partialImportError(options.email, options.client, options.subject, options.mainText, options.error, (err, result) => {
            cb(err, result);
          });
        } else if (options.identifier === 'scriptComplete') {
          SendEmail.scriptCompleteEmail(name, options.email, (err) => {
            cb(err);
          });
        } else if (options.identifier === 'scriptError') {
          SendEmail.scriptErrorEmail(name, options.email, (err) => {
            cb(err);
          });
        } else if (options.identifier === 'periodComplete') {
          SendEmail.genericComplete(options.email, options.client, options.subject, options.mainText, (err, result) => {
            cb(err, result);
          });
        } else {
          throw new Error('Notification not sent, no valid identifier found');
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

let Notification = mongoose.model(name, notificationSchema);

module.exports = Notification;
