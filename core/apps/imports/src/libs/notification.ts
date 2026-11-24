// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-var-requires */
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SendEmail = require('./sendEmail');

const { User, Notification } = require('../models');

const NotificationController = this;

NotificationController.generate = function (
  name,
  description,
  link,
  curveUser,
  options,
  callback,
) {
  let user;
  let saveInAppNotification = false;
  let sendEmailNotification = false;
  async.waterfall(
    [
      function (cb) {
        User.findById(curveUser.id.toString(), (err, foundUser) => {
          user = foundUser;

          // Temporary workaround for Fuga Splits, with no User
          if (!user && options.curveUser?.email) {
            sendEmailNotification = true;
          } else if (!user) {
            logger.info(
              `No notification generated, User not found ${curveUser.id}`,
            );
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
        });
      },
      function (cb) {
        if (saveInAppNotification) {
          const newNotification = {
            clientId: curveUser.clientId,
            userId: user._id,
            name,
            description,
            link,
          };
          if (options.error) {
            newNotification.notificationErrors = options.error;
          }
          const notification = new Notification(newNotification);
          notification.save((err) => {
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
          if (options.identifier === 'importError') {
            SendEmail.importError(
              options.curveUser,
              options.client,
              options.subject,
              options.file,
              options.error,
              (err, result) => {
                cb(err, result);
              },
            );
          } else if (options.identifier === 'partialImportError') {
            SendEmail.partialImportError(
              options.curveUser,
              options.client,
              options.subject,
              options.file,
              options.error,
              (err, result) => {
                cb(err, result);
              },
            );
          } else if (options.identifier === 'importComplete') {
            SendEmail.importComplete(
              options.curveUser,
              options.client,
              options.subject,
              options.file,
              options.count,
              cb,
            );
          }
        } else {
          setImmediate(() => {
            cb();
          });
        }
      },
    ],
    (err, result) => {
      if (callback) {
        callback(err, result);
      }
    },
  );
};

module.exports = NotificationController;
