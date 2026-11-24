const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, Utils } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const appRootDir = require('app-root-dir').get();
const getSymbolFromCurrency = require('currency-symbol-map');
const multer = require('multer');
const moment = require('moment');
const User = require('../../models/user');
const generateMfa = require('../../libs/generateMfa');
const AppSettings = require('../../models/appSettings');
const Contract = require('../../models/contract');
const Client = require('../../models/client');
const Parent = require('../../models/parent');
const Payee = require('../../models/payee');
const Authenticate = require('../../libs/authenticate');

const UserController = require('../../controllers/user');
const PaymentGroupController = require('../../controllers/paymentGroup');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${appRootDir}/tmp/`);
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };
const notFoundError = (id) => ({ message: `Could not find User with ID ${id}` });

router
  .get('/', async (req, res) => {
    const text = req.query.text || '';
    const paginationParams = {
      page: Page.valueOrDefault(req.query.page, 1),
      limit: Page.valueOrDefault(req.query.limit, 25),
      sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
      select: 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt',
    };
    const { curveUser } = req;
    if (!curveUser) {
      return res.status(404).json({ message: 'Error, please try again' });
    } if (curveUser.payeeId) {
      return res.status(403).json(FORBIDDEN);
    }
    try {
      const users = await UserController.getAll({ curveUser, text, paginationParams });
      return res.status(200).json(users);
    } catch (err) {
      if (err && err.code) return res.status(err.code).json({ message: err.message });
      logger.error(err);
      return res.status(500).json(INTERNAL_ERROR);
    }
  })
  .get('/:id', (req, res) => {
    let selectProperties = 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt notifications authenticationType sendings';
    // return 'internal' property only if internal user requesting
    if (req.curveUser.internal) {
      selectProperties += ' internal';
    }
    User.findById(req.params.id)
      .select(selectProperties)
      .then((user) => {
        if (user) {
          user.userForbidden(req.curveUser, (err, forbidden) => {
            if (forbidden) {
              res.status(403).json(FORBIDDEN);
            } else {
              user.setAdminTypeByClientId(req.curveUser.clientId);
              // clientId was not previously stored on sendings, so we need to check it exists before filtering
              const hasClientId = user.sendings.some((sending) => sending?.clientId);
              if (hasClientId) {
                user.sendings = user.sendings.filter((sending) => sending?.clientId?.toString() === req.curveUser.clientId);
              }
              res.status(200).json(user);
            }
          });
        } else {
          res.status(404).json(notFoundError(req.params.id));
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .put('/:id', parseUrlencoded, (req, res) => {
    // only allow the current user to update their password
    if (req.body.newPassword && req.body.confirmNewPassword && (req.body._id !== req.curveUser.id)) { return res.status(403).json(FORBIDDEN); }

    User.findById(req.params.id)
      .then(async (user) => {
        // If there is a change to the multiFactorAuthentication, we need to ensure only the user can change their own
        if (
          ((req.body.multiFactorAuthentication !== user.multiFactorAuthentication) || (req.body.multiFactorAuthenticationType !== user.multiFactorAuthenticationType))
          && (req.body._id !== req.curveUser.id)
        ) { return res.status(403).json(FORBIDDEN); }

        // Check that the user sending the request is allowed to make changes to the user specified in the body, otherwise continue
        try {
          const userInBodyForbidden = await new Promise((resolve, reject) => {
            user.userForbidden({ id: req.body._id }, (err, forbidden) => {
              if (err) reject(err);
              resolve(forbidden);
            });
          });
          if (userInBodyForbidden) return res.status(403).json(FORBIDDEN);
        } catch (err) {
          return res.status(500).json(INTERNAL_ERROR);
        }

        if (user) {
          if (req.body?.payeeIds?.length > 1 && Array.isArray(req.body.payeeIds)) {
            req.body.payeeIds = req.body.payeeIds.filter(onlyUnique);
          }
          if (req.body?.payeeIds) {
            const clientLinkedPayees = await Payee.countDocuments({ _id: { $in: req.body?.payeeIds }, clientId: req.curveUser.clientId });
            if (clientLinkedPayees > 0) {
              delete req.body.rights;
            }
          }
          user.userForbidden(req.curveUser, (err, userInRequestUrlforbidden) => {
            user.checkAssociatedIdUpdates(req.curveUser, req.curveUser.clientId, req.body.clientIds, req.body.payeeIds, (err, clientIds, payeeIds) => {
              // Update clientIds and payeeIds
              req.body.clientIds = clientIds;
              req.body.payeeIds = payeeIds;
              // Don't allow changing of the following at all
              delete req.body.email;
              delete req.body.password;
              delete req.body.apiKey;
              delete req.body.apiSecretKey;
              delete req.body.createdBy;
              delete req.body.lastLogin;
              delete req.body.authenticationType;
              delete req.body.lastModifiedBy;
              delete req.body.clientId;
              delete req.body.payeeId;
              delete req.body.clientIds;
              delete req.body.payeeIds;
              delete req.body.adminClientIds;
              delete req.body.monitoring;
              // only allow internal user to set/unset user as internal
              if (!req.curveUser.internal) {
                delete req.body.internal;
              }
              // Remove parent setting unless user is internal or a parent
              if (!req.curveUser.internal && !req.curveUser.parentId) {
                delete req.body.parentId;
              }
              // Remove user updating itself values
              if (req.curveUser.id === user._id.toString()) {
                delete req.body.rights;
              }
              // Remove updates to a user from another user
              if (req.curveUser.id !== user._id.toString()) {
                delete req.body.multiFactorAuthentication;
                delete req.body.multiFactorAuthenticationType;
                delete req.body.multiFactorAuthenticationSecret;
                delete req.body.emailCatalogueIngestions;
                delete req.body.emailSalesIngestions;
                delete req.body.emailPeriodCompletion;
                delete req.body.newPassword;
                delete req.body.confirmNewPassword;
              }
              if (userInRequestUrlforbidden) {
                res.status(403).json(FORBIDDEN);
              } else {
                user.lastModifiedBy = req.curveUser.id;
                Object.keys(req.body).forEach((key) => {
                  // ensure property exists in User Schema before adding it
                  if (User.schema.paths[key]) {
                    if (key === 'rights' && typeof req.body?.rights !== 'undefined') {
                      const rights = JSON.parse(JSON.stringify(user[key] ?? {}));
                      rights[req.curveUser.clientId] = req.body[key][req.curveUser.clientId];
                      user[key] = rights;
                    } else {
                      user[key] = req.body[key];
                    }
                  }
                });
                if (req.body.newPassword && req.body.newPassword.length > 0) {
                  // Ensure password and confirm password match
                  if (req.body.newPassword !== req.body.confirmNewPassword) {
                    return res.status(400).json({ message: 'Passwords do not match' });
                  }
                  // Ensure minimum password requirements are met
                  if (!Utils.isStrongPassword(req.body.newPassword)) {
                    return res.status(400).json({ message: 'Password does not meet the minimum requirements' });
                  }
                  if (user.authenticate(req.body.currentPassword).response === true) {
                    user.setNewPassword(req.body.newPassword);
                  } else {
                    return res.status(401).json({ message: 'Could not update password. Current password does not match' });
                  }
                }
                user.removeClientIdsFromPayeeUser(user, () => {
                  user.save()
                    .then((savedUser) => {
                      let selectProperties = 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt notifications sendings';
                      // return 'internal' property only if internal user requesting
                      if (req.curveUser.internal) {
                        selectProperties += ' internal';
                      }
                      User.findById(savedUser._id, selectProperties)
                        .then((userRestrictedData) => {
                          userRestrictedData.setAdminTypeByClientId(req.curveUser.clientId);
                          res.status(200).json(userRestrictedData);
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
                });
              }
            });
          });
        } else {
          res.status(404).json({ success: false, message: `Could not find User with ID ${req.params.id}` });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .get('/:id/get_possible_clients', (req, res) => {
    User.findById(req.params.id)
      .then((user) => {
        // Side-note, we should check for 403 first, to hide valid userId's from malicious actors
        if (!user) {
          res.status(404).json(notFoundError(req.params.id));
        } else {
          user.userForbidden(req.curveUser, async (err, forbidden) => {
            if (forbidden) {
              res.status(403).json(FORBIDDEN);
            } else {
              const { clients, error } = await UserController.getPossibleClientsAndPayees({ searchTerm: req.query.searchTerm, user });
              if (error) {
                res.status(500).json(INTERNAL_ERROR);
              } else {
                res.status(200).json(clients);
              }
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .get('/:id/get_possible_clients_mobile', async (req, res) => {
    const user = await User.findById(req.params?.id).catch(logger.error);
    if (!user) { return res.status(404).json(notFoundError(req.params.id)); }

    if (req.curveUser.id !== user._id.toString()) { return res.status(403).json(FORBIDDEN); }

    UserController.getClientsMobile(user).then((list) => {
      res.status(200).json(list);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    });
  })
  .get('/:id/clients', (req, res) => {
    if (req.curveUser.internal && req.params.id) {
      User.findById(req.params.id)
        .then((user) => {
          Client.find({ _id: user.clientIds }, { name: 1 })
            .then((clients) => {
              res.status(200).json(clients);
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
      res.status(403).json(FORBIDDEN);
    }
  })
  .get('/:id/payees', (req, res) => {
    if (req.params.id && (req.curveUser.clientId || req.curveUser.internal)) {
      User.findById(req.params.id)
        .then(async (user) => {
          try {
            const forbidden = await new Promise((resolve, reject) => {
              user.userForbidden(req.curveUser, (err, forbidden) => {
                if (err) reject(err);
                resolve(forbidden);
              });
            });
            if (forbidden) return res.status(403).json(FORBIDDEN);
          } catch (err) {
            return res.status(500).json(INTERNAL_ERROR);
          }
          Payee
            .find({ _id: user.payeeIds }, { name: 1, clientId: 1 })
            .populate({ path: 'clientId', model: 'Client', select: { name: 1 } })
            .then((payees) => {
              if (req.curveUser.clientId) {
                payees = payees.filter((payee) => (payee.clientId && payee.clientId._id && payee.clientId._id.toString() === req.curveUser.clientId));
              }
              res.status(200).json(payees);
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
      res.status(403).json(FORBIDDEN);
    }
  })
  .put('/:id/set_client', parseUrlencoded, (req, res) => {
    // Get user by curveUser
    User.findById(req.curveUser.id)
      .then(async (user) => {
        if (!user) {
          res.status(404).json(notFoundError(req.curveUser.id));
        } else {
          // Get possible clients and payees associated with the user
          const { clients, error } = await UserController.getPossibleClientsAndPayees({ user, forceAll: true });
          if (error) {
            res.status(500).json(INTERNAL_ERROR);
            return;
          }
          // Get ids from all possibilities
          // Item will have either payeeId or clientId
          const ids = clients.map((item) => (item.payeeId ? item.payeeId : item.clientId));
          // Check if id is included in possibilities
          if (req.body.roleId && ids.includes(req.body.roleId)) {
            // When role is client
            if (req.body.role === 'client') {
              // Set the clientId in the user
              req.curveUser.clientId = req.body.roleId;
              // Find client
              Client.findById(req.body.roleId)
                .then((client) => {
                  if (client) {
                    // Update user in DB
                    user.clientId = req.body.roleId;
                    user.save()
                      .then(async () => {
                        const adminType = await user.clientAdminType(user.clientId);
                        // If user is a parent, get all clients under the parent and add them to the user's rights
                        if (user.parentId) {
                          const clients = await Client.find({ parentId: user.parentId }).select('_id');
                          if (!user.rights) user.rights = {};

                          clients.forEach((client) => {
                            user.rights[client._id.toString()] = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit', admin: true };
                          });
                        }
                        // Create token for response
                        jwt.sign(
                          {
                            id: req.curveUser.id,
                            type: 'client',
                            internal: req.curveUser.internal,
                            superInternal: user.superInternal,
                            monitoring: user.monitoring,
                            parentId: req.curveUser.parentId,
                            clientId: req.body.roleId,
                            // Only Set Rights for the currently logged in client
                            // If internal user, give Edit rights
                            rights: user.internal && !user.rights?.[req?.body?.roleId] // Only default to none admin edit rights for internal, when user has not specified any client rights
                              ? { [req.body.roleId]: { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit' } }
                              : { [req.body.roleId]: user.rights[req.body.roleId] },
                            lockedForNonPayment: client.lockedForNonPayment,
                            adminType,
                          },
                          process.env.jsonSecretToken,
                          { expiresIn: 86400 },
                          (err, token) => {
                            if (err) {
                              return res.status(500).json(INTERNAL_ERROR);
                            }
                            // Set rights default to edit - if they don't exist, standard is to edit
                            let rights = { catalogue: 'None', contracts: 'None', sales: 'None', periods: 'None' };
                            // Set rights where they exist on the client
                            if (user.rights?.[user.clientId]) { rights = user.rights[user.clientId]; }
                            if (user.internal) { rights = { catalogue: 'Edit', contracts: 'Edit', sales: 'Edit', periods: 'Edit' }; }
                            // Load parent for updating logos, etc.
                            Parent.findById(client.parentId)
                              .then((parent) => {
                                AppSettings.findOne({})
                                  .then((settings) => {
                                    // Disable payments if disabled globally
                                    if (!client.features) { client.features = {}; }
                                    client.features.payments = client?.features?.payments && settings?.features?.payments;
                                    client.features.demo = settings?.features?.demo;

                                    let tsAndCsAccepted;
                                    if (client.tsAndCsAcceptedDate) tsAndCsAccepted = true;
                                    const output = {
                                      success: true,
                                      token,
                                      userType: 'client',
                                      email: user.email,
                                      currency: client.homeCurrency,
                                      currencySymbol: client.currencySymbol,
                                      multiCurrencies: [client.currency2, client.currency3, client.currency4].filter(Boolean),
                                      dateFormat: client.dateFormat,
                                      clientName: client.name,
                                      clientId: client._id,
                                      clientType: client.clientType,
                                      adminType,
                                      parentUser: (req.curveUser.parentId && parent && req.curveUser.parentId === parent._id.toString()),
                                      clientRights: rights,
                                      features: client.features,
                                      requiresTsAndCsConfirmation: !tsAndCsAccepted,
                                      paymentProvider: client.paymentProviders?.selectedPaymentProvider,
                                      tipaltiCrossPayeeDetails: client.paymentProviders?.tipalti?.crossPayeeDetails,
                                      paymentTier: client.paymentTier,
                                    };
                                    // Set logos
                                    if (parent && parent.useLogoForClients) {
                                      output.darkLogo = parent.publicDarkLogo;
                                      output.lightLogo = parent.publicLightLogo;
                                    }

                                    // Check if the user is in trial:
                                    const minimumCreatedDate = moment().subtract(client.trialDays || 14, 'days').format();
                                    const userIsInTrial = client.billing?.billingType === 'Card'
                                      && !client.billing?.stripePaymentMethod
                                      && !client.billing?.lastPaymentDate
                                      && moment(client.createdAt).isSameOrAfter(minimumCreatedDate);
                                    if (userIsInTrial) {
                                      output.isInTrial = true;
                                      output.trialDaysLeft = (client.trialDays || 14) - moment().diff(moment(client.createdAt), 'days');
                                    }

                                    // Fetch client's payments statuses
                                    PaymentGroupController.getPaymentStatuses({ clientId: client._id.toString() });

                                    // Return response including token
                                    return res.status(200).json(output);
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
                          },
                        );
                      })
                      .catch((err) => {
                        logger.error(err);
                        res.status(500).json(INTERNAL_ERROR);
                      });
                  } else {
                    // Return not found
                    return res.status(404).json({ message: 'User not found' });
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json(INTERNAL_ERROR);
                });
            } else if (req.body.role === 'payee') {
              // Set payeeId on curveUser
              req.curveUser.payeeId = req.body.roleId;
              // Find payee
              Payee.findById(req.body.roleId)
                .then((payee) => {
                  if (payee) {
                    // Set payeeId on user and update in DB
                    user.payeeId = req.body.roleId;
                    user.save()
                      .then(() => {
                        // Find contracts associated with payee
                        Contract.find({ clientId: payee.clientId, 'payees.payeeId': user.payeeId })
                          .then((contracts) => {
                            const contract = contracts[0];
                            // Find client associated with payee
                            Client.findById(payee.clientId)
                              .then((client) => {
                                // Create contractIds array
                                const contractIds = contracts.map((contract) => contract._id.toString());
                                // Create token for response
                                jwt.sign(
                                  {
                                    id: req.curveUser.id,
                                    type: 'payee',
                                    internal: req.curveUser.internal,
                                    parentId: req.curveUser.parentId,
                                    payeeId: req.body.roleId,
                                    contractIds: contractIds.length > 10 ? [] : contractIds,
                                  },
                                  process.env.jsonSecretToken,
                                  { expiresIn: 86400 },
                                  (err, token) => {
                                    if (err) {
                                      return res.status(500).json(INTERNAL_ERROR);
                                    }
                                    Parent.findById(client.parentId)
                                      .then((parent) => {
                                        // Get contract currency and symbol
                                        let contractCurrency = client.homeCurrency;
                                        if (contract && contract.currency !== 'Home Currency') {
                                          contractCurrency = contract.currency;
                                        }
                                        const contractCurrencySymbol = contract && getSymbolFromCurrency(contract.currency) ? getSymbolFromCurrency(contract.currency) : client.currencySymbol;
                                        const output = {
                                          success: true,
                                          token,
                                          userType: 'payee',
                                          email: user.email,
                                          currency: contractCurrency,
                                          currencySymbol: contractCurrencySymbol,
                                          multiCurrencies: [client.currency2, client.currency3, client.currency4].filter(Boolean),
                                          dateFormat: client.dateFormat,
                                          features: { payeeBalances: client.features?.payeeBalances, paymentDetails: client.features?.paymentDetails },
                                          paymentProvider: client.paymentProviders?.selectedPaymentProvider,
                                          clientId: client._id,
                                          clientName: `${client.name}: ${payee.name}`,
                                          clientType: client.clientType,
                                        };
                                        // Set logos
                                        if (parent && parent.useLogoForClients) {
                                          output.darkLogo = parent.publicDarkLogo;
                                          output.lightLogo = parent.publicLightLogo;
                                        }
                                        // Return response with token
                                        return res.status(200).json(output);
                                      })
                                      .catch((err) => {
                                        logger.error(err);
                                        res.status(500).json(INTERNAL_ERROR);
                                      });
                                  },
                                );
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
                    // Return not found
                    return res.status(404).json({ message: 'Payee not found' });
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json(INTERNAL_ERROR);
                });
            } else {
              // Return forbidden when no role passed
              return res.status(403).json(FORBIDDEN);
            }
          } else {
            // Return forbidden when not included in list
            return res.status(403).json(FORBIDDEN);
          }
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .put('/:id/remove_client', parseUrlencoded, (req, res) => {
    User.findById(req.curveUser.id)
      .then((user) => {
        if (!user) {
          res.status(404).json(notFoundError(req.curveUser.id));
        } else {
          user.clientId = null;
          user.payeeId = null;
          user.save()
            .then(() => {
              user.getType((type) => {
                jwt.sign(
                  {
                    id: req.curveUser.id,
                    type,
                    internal: req.curveUser.internal,
                    parentId: req.curveUser.parentId,
                  },
                  process.env.jsonSecretToken,
                  { expiresIn: 86400 },
                  (err, token) => {
                    if (err) {
                      res.status(500).json(INTERNAL_ERROR);
                    }
                    return res.status(200).json({
                      success: true,
                      internal: req.curveUser.internal,
                      parentId: req.curveUser.parentId,
                      token,
                    });
                  },
                );
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .post('/import', upload.single('file'), (req, res) => {
    if (req.curveUser.clientId && req.file) {
      User.findById(req.curveUser.id)
        .then((foundUser) => {
          // Check that the user has admin rights on the client
          if (foundUser
            && (foundUser.internal || foundUser.parentId || (foundUser.adminClientIds && foundUser.adminClientIds.includes(req.curveUser.clientId)))
          ) {
            User.importFromExcel(req.file, req.curveUser);
            res.status(200).json({ message: 'Users are importing, and a report will be sent to you shortly.' });
          } else {
            // Forbidden
            res.status(403).json(FORBIDDEN);
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else if (req.curveUser.clientId && !req.file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })
  .post('/export', async (req, res) => {
    try {
      await UserController.export({ curveUser: req.curveUser, userIds: req.body.ids, text: req.body.filter.text });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      if (err && err.code) return res.status(err.code).json({ message: err.message });
      logger.error(err);
      return res.status(500).json(INTERNAL_ERROR);
    }
  })
  .delete('/:id', (req, res) => {
    // Disallow deleting own user
    if (req.curveUser.id === req.params.id) {
      return res.status(403).json({ message: 'Action Denied' });
    }

    User.findById(req.params.id)
      .then(async (user) => {
        if (!user) {
          res.status(404).json({ message: 'User not found' });
        } else {
          user.userForbidden(req.curveUser, (err, forbidden) => {
            if (forbidden) {
              res.status(403).json(FORBIDDEN);
            } else {
              User.removeOrDelete(req.params.id, req.curveUser, (err, user) => {
                if (err) {
                  logger.error(err);
                  res.status(500).json(INTERNAL_ERROR);
                } else if (user) {
                  res.status(200).json({ success: true, message: 'User successfully deleted' });
                } else {
                  res.status(404).json(notFoundError(req.params.id));
                }
              });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .post('/', parseUrlencoded, (req, res) => {
    User.findById(req.curveUser.id)
      .then(async (foundUser) => {
        // Check that the user has admin rights on the client
        if (foundUser && (foundUser.internal || foundUser.parentId || (foundUser.adminClientIds && foundUser.adminClientIds.includes(req.curveUser.clientId)))
        ) {
          if (req.body?.payeeIds?.length > 1 && Array.isArray(req.body.payeeIds)) {
            req.body.payeeIds = req.body.payeeIds.filter(onlyUnique);
          }

          // Filter out any req.payeeIds which the requesting user has no access too
          // When validateUserPayeeAccess errores, payeeIds will be undefined which is fine as User.createUser will handle this correctly.
          const payeeIds = await foundUser.validateUserPayeeAccess(req.curveUser, req.curveUser.clientId, req.body).catch(logger.error);

          if (req.body.internal && foundUser.internal) {
            // When user is creating an internal user
            User.createUser({
              email: req.body.email,
              internal: true,
              parentId: foundUser.parentId,
              clientId: req.curveUser.clientId,
              clientIds: req.body.clientIds,
              payeeId: req.body.payeeId,
              payeeIds,
              rights: req.body.rights,
              adminType: req.body.adminType,
              authenticationType: req.body.authenticationType,
              createdBy: req.curveUser.id,
              lastModifiedBy: req.curveUser.id,
            }, (err, user) => {
              if (err) {
                logger.error(err);
                res.status(409).json({ success: false, message: err.message });
              } else {
                User.findById(user._id, 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt internal')
                  .then((userRestrictedData) => {
                    res.status(200).json(userRestrictedData);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              }
            });
          } else if (req.body.parentId && (foundUser.internal || (foundUser.parentId && req.body.parentId === foundUser.parentId))) {
            // if user is a parent and not internal and adding client rights to the user, we need to make sure the parent has access to the clients
            // check the clientIds in the body and make sure the parent has access to them
            const clients = await Client.find({ _id: { $in: req.body.clientIds } }).select('parentId');
            const allowedClientIds = clients.filter((client) => client.parentId === req.body.parentId).map((client) => client._id.toString());
            req.body.clientIds = req.body.clientIds || [];
            if (allowedClientIds.length !== req.body.clientIds.length) {
              return res.status(403).json(FORBIDDEN);
            }
            // Check the rights for the clients and make sure the parent has access to them
            if (req.body.rights) {
              const { rights } = req.body;
              for (const clientId in rights) {
                if ([null, 'null', undefined, 'undefined'].includes(clientId)) {
                  delete rights[clientId];
                }
              }
              const allowedRights = Object.keys(rights).filter((clientId) => allowedClientIds.includes(clientId));
              if (allowedRights.length !== Object.keys(rights).length) {
                return res.status(403).json(FORBIDDEN);
              }
            }
            // When user is creating a parent
            User.createUser({
              email: req.body.email,
              parentId: req.body.parentId,
              clientId: req.curveUser.clientId,
              clientIds: req.body.clientIds,
              payeeId: req.body.payeeId,
              payeeIds,
              rights: req.body.rights,
              adminType: req.body.adminType,
              authenticationType: req.body.authenticationType,
              createdBy: req.curveUser.id,
              lastModifiedBy: req.curveUser.id,
            }, (err, user) => {
              if (err) {
                logger.error(err);
                res.status(409).json({ success: false, message: err.message });
              } else {
                User.findById(user._id, 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt parentId')
                  .then((userRestrictedData) => {
                    res.status(200).json(userRestrictedData);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              }
            });
          } else if (req.curveUser.clientId && ((foundUser.adminClientIds && foundUser.adminClientIds.includes(req.curveUser.clientId)) || foundUser.internal || foundUser.parentId)) {
            // Create client user
            User.createUser({
              email: req.body.email,
              clientId: req.curveUser.clientId,
              clientIds: req.body.clientIds,
              payeeId: req.body.payeeId,
              payeeIds,
              rights: req.body.rights,
              adminType: req.body.adminType,
              authenticationType: req.body.authenticationType,
              createdBy: req.curveUser.id,
              lastModifiedBy: req.curveUser.id,
            }, (err, user) => {
              if (err) {
                logger.error(err);
                res.status(409).json({ success: false, message: err.message });
              } else {
                User.findById(user._id, 'email status lastLogin clientId payeeId clientIds payeeIds rights parentId adminClientIds multiFactorAuthentication multiFactorAuthenticationType createdAt')
                  .then((userRestrictedData) => {
                    res.status(200).json(userRestrictedData);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json(INTERNAL_ERROR);
                  });
              }
            });
          } else {
            res.status(403).json(FORBIDDEN);
          }
        } else {
          // Forbidden
          res.status(403).json(FORBIDDEN);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .get('/:id/setup_mfa', (req, res) => {
    // Find user and check user is allowed to update
    User.findById(req.params.id)
      .then((user) => {
        if (user) {
          user.userForbidden(req.curveUser, (err, forbidden) => {
            if (forbidden) {
              res.status(403).json(FORBIDDEN);
            } else {
              // Create secret in user and generate QR Code
              generateMfa.generate(user, (err, user, url) => {
                if (err) {
                  logger.error(`User Setup MFA Errored: ${err}`);
                  res.status(500).json(INTERNAL_ERROR);
                } else {
                  res.status(200).json({ qrcode: url });
                }
              });
            }
          });
        } else {
          res.status(404).json(notFoundError(req.params.id));
        }
      })
      .catch((err) => {
        logger.error(`User Setup MFA Errored: ${err}`);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .put('/:id/check_mfa', parseUrlencoded, async (req, res) => {
    if (req.body?.multiFactorAuthenticationType === 'Authenticator App' || req.body?.multiFactorAuthenticationType === 'Authenticator') {
      User.findOne({ _id: req.params.id, multiFactorAuthenticationType: { $nin: ['Azure', 'OneLogin', 'OKTA'] } })
        .then((user) => {
          if (!user) {
            logger.info(`User not found: ${req.params.id}`);
            res.status(200).json({ success: false, message: 'User not found. Please check details and try again.' });
          } else {
            const codeMatches = generateMfa.authenticate(user, req.body.multiFactorAuthenticationSetupToken);
            if (codeMatches) {
              res.status(200).json({ success: true });
            } else {
              res.status(401).json({ success: false });
            }
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
    } else if (req.body?.multiFactorAuthenticationType === 'Email') {
      const user = await User.findById(req.params.id);

      if (!user) {
        logger.info(`User not found: ${req.params.id}`);
        return res.status(200).json({ success: false, message: 'User not found. Please check details and try again.' });
      }

      // Only allow the current user to update their own MFA settings
      if (req.curveUser.id !== req.params.id) return res.status(403).json(FORBIDDEN);

      // Check Email code
      Authenticate.decodeToken(user.multiFactorAuthenticationEmailCode, (mfaToken) => {
        if (mfaToken?.code) {
          const auth = user.multiFactorAuthenticate(mfaToken.code, req.body.multiFactorAuthenticationSetupToken);
          if (!auth.response) {
            logger.info('Multi Factor Authentication failed');
            res.status(401).json({ success: false, message: auth.message });
          } else {
            logger.info('Multi Factor Authentication passed');
            res.status(200).json({ success: true });
          }
        } else {
          res.status(403).json({ message: 'Forbidden' });
        }
      });
    } else {
      res.status(200).json({ success: false, message: 'Multi-factor authentication type not set' });
    }
  })
  .put('/:id/setup_mfa_email', parseUrlencoded, async (req, res) => {
    if (req.body?.multiFactorAuthenticationType !== 'Email') {
      return res.status(200).json({ success: false, message: 'Multi-factor authentication type not set to Email' });
    }

    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        logger.info(`User not found: ${req.params.id}`);
        return res.status(200).json({ success: false, message: 'User not found. Please check details and try again.' });
      }

      // Only allow the current user to update their own MFA settings
      if (req.curveUser.id !== req.params.id) return res.status(403).json(FORBIDDEN);

      user.createMultiFactorTokenAndSendEmail((err, _) => {
        if (err) return res.status(500).json(INTERNAL_ERROR);

        return res.status(200).json({ success: true });
      });
    } catch (err) {
      logger.error(`User Setup MFA Email Errored: ${err}`);
      res.status(500).json(INTERNAL_ERROR);
    }
  })
  .post('/enable_mfa', parseUrlencoded, async (req, res) => {
    const { token } = req.headers;

    try {
      Authenticate.decodeToken(token, async (decoded) => {
        const user = await User.findById(decoded.id);

        if (!user) {
          logger.info(`User not found: ${decoded.id}`);
          res.status(200).json({ success: false, message: 'User not found. Please check details and try again.' });
        }

        if (user) {
          const { type } = req.body;
          user.multiFactorAuthentication = true;
          user.multiFactorAuthenticationType = type;

          await user.save();
          res.status(200).json({ success: true });
        }
      });
    } catch (err) {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    }
  });

// function getQueryForPayee(payeeId, curveUser, text) {
//   return new Promise((resolve, reject) => {
//     Payee.findOne({ _id: payeeId }, (err, payee) => {
//       if (err) {
//         reject(err);
//       }
//       const { clientId } = payee;
//       Payee.find({ clientId }, (err, payees) => {
//         if (err) {
//           reject(err);
//         }
//         const ids = getObjectsIds(payees);
//         const query = {
//           $and: [
//             { _id: { $ne: curveUser.id } },
//             {
//               payeeId: { $in: ids },
//               $or: [{
//                 email: { $regex: new RegExp(text) },
//               }],
//             },
//           ],
//         };

//         text.length == 24 && ObjectId.isValid(text) ? query.$and[1].$or.push({ _id: text }) : null;
//         resolve(query);
//       });
//     });
//   });
// }

// function getQueryForPayeeId(payeeId) {
//   const query = { payeeIds: payeeId };
//   return new Promise((resolve) => {
//     resolve(query);
//   });
// }

module.exports = router;
