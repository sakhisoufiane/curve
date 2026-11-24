const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const jwt = require('jsonwebtoken');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Mail = require('../libs/sendEmail');
const User = require('../models/user');
const Client = require('../models/client');
const Parent = require('../models/parent');

router
  .post('/', parseUrlencoded, (req, res) => {
    let token = '';
    let email;
    if (req.body.email) { email = req.body.email.toLowerCase(); }

    User.findOne({ email, authenticationType: { $nin: ['Azure', 'OneLogin', 'OKTA'] } })
      .then((user) => {
        if (!user) {
          res.status(200).json({ success: true });
        } else {
          user.getType(() => {
            const date = new Date();
            user.forgotPasswordDate = date.toISOString();
            token = jwt.sign({ id: user._id, forgot: user.forgotPasswordDate }, process.env.jsonSecretToken, { expiresIn: 86400 });
            user.forgotPasswordToken = token;
            user.save()
              .then(() => {
                if (user.clientId) {
                  Client.findById(user.clientId)
                    .then((client) => {
                      if (client) {
                        client.getParent((err, parent) => {
                          Mail.forgotPassword(email, parent, user.forgotPasswordToken, (err) => {
                            if (err) {
                              logger.error(err);
                              return res.status(200).json({ success: false, message: 'Internal error, please try again' });
                            }
                            res.status(200).json({ success: true });
                          });
                        });
                      } else {
                        Mail.forgotPassword(email, null, user.forgotPasswordToken, (err) => {
                          if (err) {
                            logger.error(err);
                            return res.status(200).json({ success: false, message: 'Internal error, please try again' });
                          }
                          res.status(200).json({ success: true });
                        });
                      }
                    })
                    .catch((err) => {
                      logger.error(err);
                      res.status(200).json({ success: false, message: 'Internal error, please try again' });
                    });
                } else if (user.parentId) {
                  Parent.findById(user.parentId)
                    .then((parent) => {
                      Mail.forgotPassword(email, parent, user.forgotPasswordToken, (err) => {
                        if (err) {
                          logger.error(err);
                          return res.status(200).json({ success: false, message: 'Internal error, please try again' });
                        }
                        res.status(200).json({ success: true });
                      });
                    })
                    .catch((err) => {
                      logger.error(err);
                      res.status(200).json({ success: false, message: 'Internal error, please try again' });
                    });
                } else {
                  Mail.forgotPassword(email, null, user.forgotPasswordToken, (err) => {
                    if (err) {
                      logger.error(err);
                      return res.status(200).json({ success: false, message: 'Internal error, please try again' });
                    }
                    res.status(200).json({ success: true });
                  });
                }
              })
              .catch((err) => {
                logger.error(err);
                res.status(200).json({ success: false, message: 'Internal error, please try again' });
              });
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(200).json({ success: false, message: 'Internal error, please try again' });
      });
  });

module.exports = router;
