const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const Authenticate = require('../../libs/authenticate');
const Mail = require('../../libs/sendEmail');

const Client = require('../../models/client');
const Parent = require('../../models/parent');
const User = require('../../models/user');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const sendExpiredEmail = ({ email, parent }) => {
  Mail.expiredPassword(email, parent, (err) => {
    if (err) logger.error(err);
    if (!err) logger.info('Expired Password Updated');
  });
};

router
  .post('/', parseUrlencoded, async (req, res) => {
    const { currentPassword, newPassword, newPasswordRepeat } = req.body;
    const { token } = req.query;

    // Check new passwords match
    if (newPassword !== newPasswordRepeat) {
      logger.info('Passwords do not match');
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    // Check minimum password requirements are met
    if (!Utils.isStrongPassword(newPassword)) {
      logger.info('Password does not meet the minimum requirements');
      return res.status(400).json({ success: false, message: 'Password does not meet the minimum requirements' });
    }

    Authenticate.decodeToken(token, async (decoded) => {
      try {
        const user = await User.findOne({ _id: decoded.id });

        // Check user exists
        if (!user) {
          logger.info('User not found');
          return res.status(200).json({ success: false, message: 'User not found. Please contact support' });
        }

        // Check current password is correct
        const auth = user.authenticate(currentPassword);
        if (!auth.response) {
          logger.info('Authentication failed');
          return res.status(200).json({ success: false, message: 'Current password is incorrect' });
        }

        if (newPassword === currentPassword) {
          logger.info('Cannot re-use existing password');
          return res.status(200).json({ success: false, message: 'Password reuse is not allowed. Please select a new password' });
        }

        user.password = User.hashPassword(newPassword);
        user.passwordRotationDate = new Date();
        await user.save();

        if (user.clientId) {
          const client = await Client.findById(user.clientId);
          if (client) {
            client.getParent((err, parent) => {
              sendExpiredEmail({ email: user.email, parent });
            });
          } else {
            sendExpiredEmail({ email: user.email });
          }
        } else if (user.parentId) {
          const parent = await Parent.findById(user.parentId);
          sendExpiredEmail({ email: user.email, parent });
        } else {
          sendExpiredEmail({ email: user.email });
        }

        return res.status(200).json({ success: true, email: user.email });
      } catch (err) {
        logger.error(err);
        return res.status(500).json({ success: false, message: 'Internal error, please try again' });
      }
    });
  });

module.exports = router;
