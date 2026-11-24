const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const jwt = require('jsonwebtoken');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const url = require('url');
const User = require('../models/user');
const Client = require('../models/client');
const Payee = require('../models/payee');
const Contract = require('../models/contract');
const Parent = require('../models/parent');
const AppSettings = require('../models/appSettings');
const Authenticate = require('../libs/authenticate');
const generateMfa = require('../libs/generateMfa');
const AuthenticateController = require('../controllers/authenticate');
const { mfaRateLimiter } = require('../libs/rateLimiter');

const INTERNAL_ERROR = { message: 'Internal error, please try again' };

router
  /**
     * @api {post} /authenticate Authenticate
     * @apiName authenticate
     * @apiGroup authenticate
     *
     * @apiBody {String} email User Email.
     * @apiBody {String} password User Password.
     *
     * @apiSuccessExample {json} Success Response (Multifactor Enabled) :
     *     HTTP/1.1 200 OK
     *     {
     *       success: true,
     *       multiFactorAuthentication: true,
     *       token: jwt
     *     }
     * @apiSuccessExample {json} Success Response (Multifactor Disabled) :
     *     HTTP/1.1 200 OK
     *     {
     *        success: true,
     *        userType: payee|client|parent|internal,
     *        adminType: Admin|Standard,
     *        token: jwt,
     *        clientName: xyz,
     *        currencySymbol: $,
     *        clientType: xyz,
     *        features: list
     *     }
     *
     * @apiSampleRequest off
     */
  .post('/', parseUrlencoded, (req, res) => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      if (req.body.email) {
        User.findOne({ email: req.body.email.toLowerCase(), authenticationType: { $nin: ['Azure', 'OneLogin', 'OKTA'] } })
          .then((user) => {
            if (!user) {
              // If no user found
              logger.info(`No user found by email: ${req.body.email}`);
              res.status(200).json({ success: false, message: 'Email not found. Please check details and try again.' });
            } else {
              // User found, check if password matches
              const auth = user.authenticate(req.body.password);
              if (!auth.response) {
                // Authentication fails
                logger.info('Authentication failed');
                user.setLastLogin(() => {
                  res.status(200).json({ success: false, message: auth.message });
                });
              } else {
                logger.info('Authentication passed');
                if (req.body.validateOnly) {
                  return res.status(200).json({ success: true });
                }

                if (user.multiFactorAuthentication && user.multiFactorAuthenticationType === 'Email') {
                  // Authentication Passed - MultiFactor Enabled - Create MFA Token & Send Email
                  user.createMultiFactorTokenAndSendEmail((err, token) => {
                    if (err) {
                      logger.error(`Failed to send MFA email for user ${user._id.toString()}:`, err);
                      res.status(500).json(INTERNAL_ERROR);
                    } else {
                      res.status(200).json({ success: true, multiFactorAuthentication: true, token, multiFactorAuthenticationType: user.multiFactorAuthenticationType });
                    }
                  });
                } else if (user.multiFactorAuthentication && user.multiFactorAuthenticationType === 'Authenticator App') {
                  // Authentication Passed - MultiFactor Enabled - Put user to MFA page
                  const token = jwt.sign({ email: user.email, mfaRequired: true }, process.env.jsonSecretToken, { expiresIn: 900 });
                  res.status(200).json({ success: true, multiFactorAuthentication: true, multiFactorAuthenticationType: user.multiFactorAuthenticationType, token });
                } else {
                  user.processEmailLogin(async (response) => {
                    if (response) {
                      response.passwordExpired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: user.passwordRotationDate });

                      // Check if users have access to payments and require MFA to be setup
                      response.mfaRequired = await AuthenticateController.isMfaRequired(user);

                      // Create secret in user and generate QR Code
                      if (response.mfaRequired) {
                        try {
                          const qrCode = await new Promise((resolve, reject) => {
                            generateMfa.generate(user, (err, user, url) => {
                              if (err) {
                                reject(err);
                              } else {
                                resolve(url);
                              }
                            });
                          });

                          response.email = user.email;
                          response.qrCode = qrCode;
                          res.status(200).json(response);
                        } catch (err) {
                          logger.error(`Setup MFA Failed for user ${user._id.toString()}:`, err);
                          res.status(500).json(INTERNAL_ERROR);
                        }
                      } else {
                        res.status(200).json(response);
                      }
                    }
                  });
                }
              }
            }
          })
          .catch((err) => {
            // I'm going to return here, it was definitely an error we were not before
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
      } else if (req.body.apiKey) {
        User.findOne({ apiKey: req.body.apiKey, authenticationType: { $nin: ['Azure', 'OneLogin', 'OKTA'] } })
          .then((user) => {
            if (!user) {
              // If no user found
              logger.info(`No user found by email: ${req.body.email}`);
              res.status(403).json({ success: false, message: 'API key did not match' });
            } else {
              // User found, check if password matches
              const auth = user.authenticateApiKey(req.body.apiSecretKey);
              if (auth.response) {
                logger.info('Authentication passed');
                // Authentication passes - create token
                user.clearTemporaryStatus(() => {
                  // Set to first if only one client or payee is associated
                  if (user.clientIds.length === 1) {
                    user.clientId = user.clientIds[0];
                  } else if (user.payeeIds.length === 1) {
                    user.payeeId = user.payeeIds[0];
                  }
                  user.getType(async (type) => {
                    const adminType = await user.clientAdminType(user.clientId);
                    const token = jwt.sign({
                      id: user._id,
                      type,
                      internal: user.internal,
                      parentId: user.parentId,
                      clientId: user.clientId,
                      payeeId: user.payeeId,
                      adminType,
                      rights: { [user.clientId]: user.rights[user.clientId] },
                    }, process.env.jsonSecretToken, { expiresIn: 86400 });
                    if (user.clientId) {
                      Client.findById(user.clientId)
                        .then((client) => {
                          if (client) {
                            user.setLastLogin(() => {
                              res.status(200).json({
                                success: true,
                                token,
                                clientName: client.name,
                              });
                            });
                          } else {
                            user.setLastLogin(() => {
                              res.status(200).json({
                                success: true,
                                userType: type,
                                token,
                              });
                            });
                          }
                        })
                        .catch((err) => {
                          logger.error(err);
                          res.status(500).json(INTERNAL_ERROR);
                        });
                    } else if (user.payeeId) {
                      Payee.findById(user.payeeId)
                        .then((payee) => {
                          Contract.find({ 'payees.payeeId': user.payeeId })
                            .then((contracts) => {
                              Client.findById(payee.clientId)
                                .then((client) => {
                                  const contractIds = contracts.map((contract) => contract._id.toString());
                                  const token = jwt.sign({
                                    id: user._id, type, internal: user.internal, parentId: user.parentId, clientId: user.clientId, payeeId: user.payeeId, contractIds, adminType,
                                  }, process.env.jsonSecretToken, { expiresIn: 86400 });
                                  if (client) {
                                    user.setLastLogin(() => {
                                      res.status(200).json({
                                        success: true,
                                        token,
                                        clientName: payee.name,
                                      });
                                    });
                                  } else {
                                    user.setLastLogin(() => {
                                      res.status(200).json({
                                        success: true,
                                        userType: type,
                                        token,
                                      });
                                    });
                                  }
                                })
                                .catch((err) => {
                                  logger.error(err);
                                  res.status(500).json(INTERNAL_ERROR);
                                });
                            })
                            .catch((err) => {
                              logger.error(err);
                              res.status(500).json(INTERNAL_ERROR);
                            });
                        })
                        .catch((err) => {
                          logger.error(err);
                          res.status(500).json(INTERNAL_ERROR);
                        });
                    } else {
                      user.setLastLogin(() => {
                        res.status(200).json({
                          success: true,
                          userType: type,
                          token,
                        });
                      });
                    }
                  });
                });
              } else {
                // Authentication fails
                logger.info('Authentication failed');
                res.status(403).json({ success: false, message: 'API keys did not match' });
              }
            }
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
      } else {
        res.status(403).json({ success: false, message: 'User not found. Please check details and try again.' });
      }
    } else {
      res.status(500).json({ success: false, message: 'Database not connected' });
    }
  })
  .post('/sso', parseUrlencoded, async (req, res) => {
    const logKey = 'SSO Authentication:';
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const { SAMLResponse } = req.body;
      const issuer = AuthenticateController.getSamlIssuer({ SAMLResponse, logKey });
      const samlData = await AuthenticateController.verifySamlResponse({ SAMLResponse, issuer, logKey });

      if (samlData) {
        const user = await User.findOne({ email: samlData.email, clientIds: { $in: samlData.clientIds }, authenticationType: { $in: ['Azure', 'OneLogin', 'OKTA'] } });
        if (!user) {
          logger.error(`${logKey} No user found by email: ${req.body.email}`);
          res.status(200).json({ success: false, message: 'Email not found. Please check details and try again.' });
        } else if (user) {
          logger.info(`${logKey} passed for ${user.email}`);
          user.processEmailLogin((response) => {
            if (response) {
              res.redirect(url.format({
                pathname: samlData.callbackUrl,
                query: {
                  curveToken: response.token,
                },
              }));
            }
          });
        }
      } else {
        logger.error(`${logKey} Authentication failed - No SAML Data retrieved`);
        res.status(200).json({ success: false, message: 'Authentication failed. Please check details and try again.' });
      }
    } else {
      res.status(500).json({ success: false, message: 'Database not connected' });
    }
  })
  /**
   * @api {post} /authenticate/multi_factor Multi Factor
   * @apiName multi_factor
   * @apiGroup authenticate
   * @apiSampleRequest off
   *
   * @apiBody {String} code code sent through email.
   * @apiBody {String} jwt token sent in authenticate response.
   *
   * @apiSuccessExample {json} Success Response:
   *     HTTP/1.1 200 OK
   *     {
   *        success: true,
   *        userType: payee|client|parent|internal,
   *        adminType: Admin|Standard,
   *        token: jwt,
   *        clientName: xyz,
   *        currencySymbol: $,
   *        clientType: xyz,
   *        features: list
   *     }
   */
  .post('/multi_factor', parseUrlencoded, mfaRateLimiter, (req, res) => {
    if (!req.body?.token) { return res.status(403).json({ message: 'Forbidden' }); }

    Authenticate.decodeToken(req.body.token, (data) => {
      if (data?.email || data?.id) {
        const query = [];
        if (data?.id) query.push({ _id: data.id });
        if (data?.email) query.push({ email: data.email.toLowerCase() });

        User.findOne({ $or: query })
          .then((user) => {
            const selectedAuthType = req.body.type || user?.multiFactorAuthenticationType;

            if (!user) {
              // If no user found
              logger.info(`No user found by email: ${req.body.email}`);
              res.status(403).json({ message: 'Forbidden' });
            } else if (['Authenticator App', 'Authenticator'].includes(selectedAuthType)) {
              const codeMatches = generateMfa.authenticate(user, req.body.code);
              if (codeMatches) {
                logger.debug('Multi Factor Authentication passed');
                user.processEmailLogin((response) => {
                  response.passwordExpired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: user.passwordRotationDate });
                  res.status(200).json(response);
                });
              } else {
                res.status(200).json({ success: false, message: 'Code incorrect' });
              }
            } else if (['Email', 'email'].includes(selectedAuthType) && !user.multiFactorAuthenticationEmailCode) {
              user.createMultiFactorTokenAndSendEmail((err, token) => {
                if (err) {
                  res.status(500).json(INTERNAL_ERROR);
                } else {
                  res.status(200).json({ multiFactorAuthentication: true, token, codeSent: true, email: user.email, message: 'Code sent to email' });
                }
              });
            } else if (['Email', 'email'].includes(selectedAuthType) && user.multiFactorAuthenticationEmailCode) {
              Authenticate.decodeToken(user.multiFactorAuthenticationEmailCode, (mfaToken) => {
                if (mfaToken?.code) {
                  const auth = user.multiFactorAuthenticate(mfaToken.code, req.body.code);
                  if (!auth.response) {
                    logger.info('Multi Factor Authentication failed');
                    user.setLastLogin(() => {
                      res.status(200).json({ success: false, message: auth.message });
                    });
                  } else {
                    logger.info('Multi Factor Authentication passed');
                    user.processEmailLogin((response) => {
                      if (response) {
                        response.passwordExpired = AuthenticateController.checkPasswordExpired({ userPasswordRotationDate: user.passwordRotationDate });
                        res.status(200).json(response);
                      }
                    });
                  }
                } else {
                  res.status(403).json({ message: 'Forbidden' });
                }
              });
            } else {
              res.status(403).json({ message: 'Forbidden' });
            }
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
      } else {
        res.status(403).json({ message: 'Forbidden' });
      }
    });
  })
  .get('/test_token', (req, res) => {
    // get token from the query or headers
    const incomingToken = req.query.token || req.headers.token;
    if (incomingToken) {
      jwt.verify(incomingToken, process.env.jsonSecretToken, (err, decoded) => {
        if (err) {
          logger.error(err);
          res.status(200).json({
            success: false,
          });
        } else if (decoded.clientId) {
          Client.findById(decoded.clientId)
            .then((client) => {
              if (client) {
                AppSettings.findOne({})
                  .then((settings) => {
                    let tsAndCsAccepted;
                    if (client.tsAndCsAcceptedDate) tsAndCsAccepted = true;
                    const features = { payments: client.features?.payments && settings?.features?.payments };
                    res.status(200).json({
                      success: true,
                      userType: decoded.type,
                      adminType: decoded.adminType,
                      token: incomingToken,
                      clientName: client.name,
                      currencySymbol: client.currencySymbol,
                      clientType: client.clientType,
                      requiresTsAndCsConfirmation: !tsAndCsAccepted,
                      features,
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              } else {
                res.status(200).json({
                  success: true,
                  userType: decoded.type,
                  token: incomingToken,
                });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            });
        } else if (decoded.payeeId) {
          Payee.findById(decoded.payeeId)
            .then((payee) => {
              if (payee) {
                Client.findById(payee.clientId)
                  .then((client) => {
                    if (client) {
                      res.status(200).json({
                        success: true,
                        userType: decoded.type,
                        adminType: decoded.adminType,
                        token: incomingToken,
                        clientName: `${client.name}: ${payee.name}`,
                        currencySymbol: client.currencySymbol,
                        clientType: client.clientType,
                      });
                    } else {
                      res.status(200).json({
                        success: true,
                        userType: decoded.type,
                        token: incomingToken,
                      });
                    }
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              } else {
                res.status(200).json({
                  success: true,
                  userType: decoded.type,
                  token: incomingToken,
                });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            });
        } else {
          res.status(200).json({
            success: true,
            userType: decoded.type,
            token: incomingToken,
          });
        }
      });
    } else {
      res.status(200).json({
        success: false,
      });
    }
  })
  .post('/whitelabel', parseUrlencoded, (req, res) => {
    const filter = {
      $and: [
        { customDomain: { $exists: true } },
        { customDomain: { $in: req.body?.originOptions?.split(',') } },
      ],
    };

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      Parent.findOne(filter)
        .then((parent) => {
          if (parent) {
            res.status(200).json({
              darkLogo: parent.publicDarkLogo, lightLogo: parent.publicLightLogo, favicon: parent.publicFavicon, pageTitle: parent.name,
            });
          } else {
            res.status(200).json({ message: 'Standard Curve Installation' });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(500).json({ message: 'Database not connected' });
    }
  })
  // angular app still uses the get so restored for now....
  .get('/whitelabel', (req, res) => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      Parent.findOne({ customDomain: req.headers.origin })
        .then((parent) => {
          if (parent) {
            res.status(200).json({
              darkLogo: parent.publicDarkLogo, lightLogo: parent.publicLightLogo, favicon: parent.publicFavicon, pageTitle: parent.name,
            });
          } else {
            res.status(200).json({ message: 'Standard Curve Installation' });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else {
      res.status(500).json({ message: 'Database not connected' });
    }
  })
  .post('/verify_captcha', async (req, res) => {
    const { grecaptcha } = req.body;

    if (!grecaptcha) {
      return res.status(400).json({ error: 'Please confirm you are not a robot' });
    }

    const remoteAddress = req.ip;
    const captchaBody = await Authenticate.verifyCaptcha(grecaptcha, remoteAddress);

    if (!captchaBody.success) {
      return res.status(400).json({ error: 'Failed captcha verification. Please refresh and try again' });
    }
    res.status(200).json(captchaBody);
  });

module.exports = router;
