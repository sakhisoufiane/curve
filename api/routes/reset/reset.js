const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Utils } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const Authenticate = require('../../libs/authenticate');
const { checkPasswordsMatch } = require('../../controllers/user');
const User = require('../../models/user');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

router
  .post('/', parseUrlencoded, (req, res) => {
    // Ensure password and confirm password match
    if (req.body.password !== req.body.confirm) {
      res.status(400).json({ success: false, message: 'Passwords do not match' });
    // Ensure minimum password requirements are met
    } else if (!Utils.isStrongPassword(req.body.password)) {
      res.status(400).json({ success: false, message: 'Password does not meet the minimum requirements' });
    } else {
      const newPassword = req.body.password;
      req.body.password = User.hashPassword(req.body.password);
      Authenticate.decodeToken(req.query.token, (decoded) => {
        User.findOne({ _id: decoded.id })
          .then((user) => {
            if (!user) {
              res.status(200).json({ success: false, message: 'No user found with this email. Please contact support or the company that sent you this invite' });
            } else if (user.userCreationToken || user.forgotPasswordToken) {
              if (checkPasswordsMatch(user.password, newPassword)) {
                logger.info('Cannot re-use existing password');
                return res.status(200).json({ success: false, message: 'Password reuse is not allowed. Please select a new password' });
              }

              user.password = req.body.password;
              user.status = 'Active';
              user.userCreationToken = '';
              user.forgotPasswordToken = '';
              user.passwordRotationDate = new Date();
              user.save()
                .then(() => {
                  res.status(200).json({ success: true, email: user.email });
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ success: false, message: 'Internal error, please try again' });
                });
            } else {
              res.status(200).json({ success: false, message: 'Password already reset or reset link is expired' });
            }
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json({ success: false, message: 'Internal error, please try again' });
          });
      });
    }
  })
  .post('/validate', parseUrlencoded, (req, res) => {
    Authenticate.decodeToken(req.body.token, (decoded) => {
      logger.debug('decoded: ', decoded || '');
      if (decoded) {
        User.findOne({ _id: decoded.id })
          .then((user) => {
            if (!user) {
              res.status(403).json({ success: false, message: 'User not found' });
            } else if (user.userCreationToken || user.forgotPasswordToken) {
              res.status(200).json({ success: true, invite: decoded.invite });
            } else {
              res.status(403).json({ success: false, message: 'Password already reset' });
            }
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json({ success: false, message: 'Internal error, please try again' });
          });
      } else {
        res.status(401).json({ message: 'Token is invalid' });
      }
    });
  });

module.exports = router;
