const _ = require('lodash');
const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, Utils } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const bcrypt = require('bcrypt');
const { randomBytes } = require('node:crypto');
const async = require('async');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const { User: { name, schema } } = require('@curveroyaltysystems/models');
const Notification = require('../notification');
const config = require('../../config.json');
const SendEmail = require('../../libs/sendEmail');
const modelHistory = require('../../libs/modelHistory');
const Client = require('../client');
const Contract = require('../contract');
const Parent = require('../parent');
const Payee = require('../payee');
const SsoConfig = require('../ssoConfig');

const userSchema = schema;

userSchema.plugin(modelHistory, { mongoose, name: 'userPatches' });
userSchema.plugin(mongoosePaginate);

userSchema.pre('save', function () {
  const Payee = require('../payee');

  this.markModified('rights');
  // Strip out blank payee IDs and duplicates
  this.payeeIds = [...new Set(this.payeeIds?.filter((id) => id && id !== ''))];

  // Strip out blank client IDs
  this.clientIds = this.clientIds.map((id) => { if (id && id !== '') { return id; } }).filter(Boolean);
  const sortedPayeeIds = _(this.payeeIds).sort();
  // before we remove payeeIds, lets re-validate the removed ones
  User.findById(this._id)
    .then((foundUser) => {
      if (foundUser) {
        // Sort payeeIds
        const originalPayees = _(foundUser.payeeIds).sort();
        if (!(_.isEqual(sortedPayeeIds, originalPayees))) {
          // What payeeIds have been removed
          const removedPayees = _.difference(originalPayees.__wrapped__, sortedPayeeIds.__wrapped__);
          // Filter by affected payeeIds
          Payee.find({ _id: { $in: removedPayees } })
            .then((payees) => {
              if (payees) {
                // Run re-validation for each affected payee
                async.each(payees, async (payee) => {
                  await payee.checkValidationErrors().catch(logger.error);
                  await payee.checkValidationUser(true).catch(logger.error);
                });
              }
            })
            .catch((err) => {
              logger.error(err);
            });
        }
      }
    })
    .catch((err) => {
      logger.error(err);
    });
});

userSchema.post('save', function () {
  const Payee = require('../payee');

  const user = this;
  // Run the validation for any Payee in the payeeIds array
  Payee.find({ _id: { $in: user.payeeIds } })
    .then((payees) => {
      if (payees) {
        // Run re-validation for each payee
        async.each(payees, async (payee) => {
          await payee.checkValidationErrors().catch(logger.error);
          await payee.checkValidationUser(true).catch(logger.error);
        });
      }
    })
    .catch((err) => {
      logger.error(err);
    });
});

userSchema.methods.userForbidden = function (requestingUser, callback) {
  const Payee = require('../payee');

  const user = this;
  let output = true;
  // Get DB User for requester
  User.findById(requestingUser.id)
    .then((foundUser) => {
      if (foundUser) {
        // Get client IDs associated with any payees
        Payee.distinct('clientId', { _id: { $in: user.payeeIds.map((id) => new ObjectId(id)) } })
          .then((clientIds) => {
            if (user._id.toString() === requestingUser.id) {
              // Same User
              output = false;
            } else if (requestingUser.internal) {
              // Internal User
              output = false;
            } else if (user.parentId && requestingUser.parentId === user.parentId) {
              // Parent User of User
              output = false;
            } else if ((clientIds.includes(requestingUser.clientId) || user.clientIds.includes(requestingUser.clientId)) && (foundUser.adminClientIds.includes(requestingUser.clientId) || requestingUser.internal || requestingUser.parentId)) {
              // Client User of User
              output = false;
            }
            callback(null, output);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        callback(null, output);
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

userSchema.methods.checkAssociatedIdUpdates = function (requestingUser, actingClientId, clientIds, payeeIds, callback) {
  // Returns clientIds and payeeIds after checking what can be added or removed from the request
  const user = this;
  // Check clientIds match those the requesting user can issue based on it's user permissions
  User.findById(requestingUser.id)
    .then((requestUser) => {
      if (!requestUser) {
        return callback(new Error(`User not found with ID ${requestingUser.id}`));
      }
      async.parallel([
        (cb) => {
          let missingClientIds = [];
          let extraClientIds = [];
          // Deleted IDs are the ones that are missing from the request but are against the user
          if (Array.isArray(clientIds)) {
            missingClientIds = user.clientIds.filter((id) => !clientIds.includes(id));
          }
          // Additional IDs are the ones that are in the request by are not against the user
          if (Array.isArray(clientIds)) {
            extraClientIds = clientIds.filter((id) => !user.clientIds.includes(id));
          }
          // Get clientIds that can be affected
          requestUser.getAdminClientIds((err, requestUserClientIds) => {
            // Loop through missingClientIds and delete and that are available to the requestingUser
            missingClientIds = missingClientIds.filter((id) => requestUserClientIds.includes(id));
            missingClientIds.forEach((id) => {
              const index = user.clientIds.indexOf(id);
              user.clientIds.splice(index, 1);
            });
            // Loop through extraClientIds and add those that are available to the requestingUser
            extraClientIds = extraClientIds.filter((id) => requestUserClientIds.includes(id));
            extraClientIds.forEach((id) => {
              user.clientIds.push(id);
            });
            cb();
          });
        },
        (cb) => {
          let missingPayeeIds = [];
          let extraPayeeIds = [];
          // Deleted IDs are the ones that are missing from the request but are against the user
          if (Array.isArray(payeeIds)) {
            missingPayeeIds = user.payeeIds.filter((x) => !payeeIds.includes(x));
          }
          // Additional IDs are the ones that are in the request by are not against the user
          if (Array.isArray(payeeIds)) {
            extraPayeeIds = payeeIds.filter((x) => !user.payeeIds.includes(x));
          }
          // Get clientIds that can be affected
          requestUser.getPossiblePayeeIds(actingClientId, (err, requestUserPayeeIds) => {
            // Loop through missingPayeeIds and delete any that are available to the requestingUser
            missingPayeeIds = missingPayeeIds.filter((x) => requestUserPayeeIds.includes(x));
            missingPayeeIds.forEach((id) => {
              const index = user.payeeIds.indexOf(id);
              user.payeeIds.splice(index, 1);
            });
            // Loop through extraPayeeIds and add those that are available to the requestingUser
            extraPayeeIds = extraPayeeIds.filter((x) => requestUserPayeeIds.includes(x));
            extraPayeeIds.forEach((id) => {
              user.payeeIds.push(id);
            });
            cb();
          });
        },
      ], (err) => {
        callback(null, user.clientIds, user.payeeIds);
      });
    })
    .catch((err) => {
      logger.error(err);
      return callback(new Error(`User not found with ID ${requestingUser.id}`));
    });
  // Check payeeIds match those the requesting user can issue based on it's client
};

/**
* Validates if the user creating the new user has the right to add specific payees
*
* @method
* @param {object} requestingUser - The requesting user wanting to create a new user.
* @param {string} actingClientId - Where the requesting user is creating the new user.
* @param {object} newUser - The new user being created for client or payee access.
*/
userSchema.methods.validateUserPayeeAccess = async function (requestingUser, actingClientId, newUser) {
  const Payee = require('../payee');
  let acceptedIds;

  const user = await User.findById(requestingUser.id);
  if (!user) throw new Error(`User not found with ID ${requestingUser?.id}`);

  // Validate payeeId access
  if (newUser.payeeIds?.length > 0 && actingClientId) {
    // Get all payees associated with current client
    const payees = await Payee.find({ clientId: actingClientId }, '_id');

    if (payees?.length === 0) throw new Error(`No Payees found with clientId ${actingClientId}`);
    // Only add payeeIds to the new user where relevant
    acceptedIds = payees.map((payee) => payee._id.toString()).filter((payeeId) => newUser.payeeIds.includes(payeeId));
  }

  // We return undefined so that when it passes to createUser method, the correct conditions can be met (from Line 629).
  return acceptedIds?.length === 0 ? undefined : acceptedIds;
};

userSchema.methods.getAdminClientIds = function (callback) {
  const user = this;
  if (user.internal) {
    // Internal Users can get all clients
    Client.find({}, '_id')
      .then((clients) => {
        const ids = clients.map((client) => client._id.toString());
        callback(null, ids);
      }).catch((err) => {
        logger.error(err);
        return callback(new Error(`Parent not found with ID ${user.parentId}`));
      });
  } else if (user.parentId) {
    // Payee users can act on their clients
    Client.find({ parentId: user.parentId }, '_id')
      .then((clients) => {
        const ids = clients.map((client) => client._id.toString());
        callback(null, ids);
      })
      .catch((err) => {
        logger.error(err);
        return callback(new Error(`Parent not found with ID ${user.parentId}`));
      });
  } else {
    // Else user can act on the adminClientIds
    callback(null, user.adminClientIds);
  }
};

userSchema.methods.getPossiblePayeeIds = function (actingClientId, callback) {
  const Payee = require('../payee');

  if (actingClientId) {
    Payee.find({ clientId: actingClientId }, '_id')
      .then((payees) => {
        const payeeIds = payees.map((payee) => payee._id.toString());
        callback(null, payeeIds);
      })
      .catch((err) => {
        logger.error(err);
        return callback(err);
      });
  } else {
    callback(null, []);
  }
};

const hashPassword = function (password) {
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }
};

userSchema.methods.forgotPassword = function (callback) {
  const salt = bcrypt.genSaltSync(10);
  this.forgotPasswordToken = salt;
  this.forgotPasswordDate = Date.now();
  this.save()
    .then(() => {
      callback(salt);
    })
    .catch((err) => {
      // This seems wrong
      logger.error(err);
      callback(salt);
    });
};

userSchema.methods.setNewPassword = function (password, callback) {
  this.forgotPasswordToken = null;
  this.forgotPasswordDate = null;
  this.password = hashPassword(password);
  if (typeof (callback) === 'function') {
    callback();
  }
};

userSchema.methods.authenticate = function (password) {
  if (password && this.password && bcrypt.compareSync(password, this.password) && this.status === 'Active') {
    return {
      response: true,
      message: 'Authentication passed.',
    };
  } if (password && this.password && bcrypt.compareSync(password, this.password) && this.status !== 'Active') {
    return {
      response: false,
      message: 'User access is restricted.',
    };
  }
  return {
    response: false,
    message: 'Password is incorrect. Please try again.',
  };
};

/**
 *
 * @param codeFromToken
 * @param codeFromRequest
 * @returns {{response: boolean, message: string}}
 *
 * Takes two code, one from request, that is sent in email and other from JWT token. Compares both code along with user
 * status to authenticate user
 */
userSchema.methods.multiFactorAuthenticate = function (codeFromToken, codeFromRequest) {
  if (codeFromToken && codeFromRequest && parseInt(codeFromToken) === parseInt(codeFromRequest) && this.status === 'Active') {
    return {
      response: true,
      message: 'Authentication passed.',
    };
  } if (codeFromToken && codeFromRequest && parseInt(codeFromToken) === parseInt(codeFromRequest) && this.status !== 'Active') {
    return {
      response: false,
      message: 'User access is restricted.',
    };
  }
  return {
    response: false,
    message: 'Invalid code. Please try again.',
  };
};

userSchema.methods.authenticateApiKey = function (key) {
  if (key && this.apiSecretKey && bcrypt.compareSync(key, this.apiSecretKey)) {
    return {
      response: true,
      message: 'Authentication passed.',
    };
  }
  return {
    response: false,
    message: 'Password is incorrect. Please try again.',
  };
};

/**
 *
 * @param callback
 *
 * Process email login, purpose to create this function is to reduce code redundency. It process login response as per user type.
 */
userSchema.methods.processEmailLogin = function (callback) {
  const user = this;
  // Clear the multi factor authentication email code after successful login
  user.multiFactorAuthenticationEmailCode = null;

  user.clearTemporaryStatus(() => {
    // Set to first if only one client or payee is associated
    if (user.clientIds.length === 1) {
      user.clientId = user.clientIds[0];
    } else if (user.payeeIds.length === 1) {
      user.payeeId = user.payeeIds[0];
    } else if (user.payeeIds.length > 10) {
      // Removes payeeId for users when they have a lot associated
      // Is useful to present a user with a payee as standard, but when there are many, it is causing issues
      // Consideration is that if they have many, they are a professional user, and so selecting is helpful
      user.payeeId = undefined;
    }
    user.getType(async (type) => {
      const adminType = await user.clientAdminType(user.clientId);
      const token = jwt.sign({
        id: user._id,
        type,
        internal: user.internal,
        superInternal: user.superInternal,
        monitoring: user.monitoring,
        parentId: user.parentId,
        clientId: user.clientId,
        payeeId: user.payeeId,
        adminType,
      }, process.env.jsonSecretToken, { expiresIn: 86400 });
      if (user.clientId) {
        Client.findById(user.clientId)
          .then((client) => {
            if (client) {
              user.setLastLogin(() => {
                callback({
                  success: true,
                  userType: type,
                  adminType,
                  token,
                  clientName: client.name,
                  currencySymbol: client.currencySymbol,
                  clientType: client.clientType,
                  features: client.features,
                });
              });
            } else {
              user.setLastLogin(() => {
                callback({
                  success: true,
                  userType: type,
                  token,
                });
              });
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else if (user.payeeId) {
        Payee.findById(user.payeeId)
          .then((payee) => {
            if (payee) {
              Contract.find({ 'payees.payeeId': user.payeeId })
                .then((contracts) => {
                  Client.findById(payee.clientId)
                    .then((client) => {
                      const contractIds = contracts.map((contract) => contract._id.toString());
                      const token = jwt.sign({
                        id: user._id,
                        type,
                        internal: user.internal,
                        superInternal: user.superInternal,
                        monitoring: user.monitoring,
                        parentId: user.parentId,
                        clientId: user.clientId,
                        payeeId: user.payeeId,
                        // When there are many contractIds attached to one or more payeeIds, we need to reduce the load on the token
                        // Note: curveUser.contractIds is only uesd in Payee.paramsToFilterField - looking at the front-end I don't see where this peice of code will ever be used.
                        contractIds: contractIds.length > 10 ? [] : contractIds,
                        adminType,
                      }, process.env.jsonSecretToken, { expiresIn: 86400 });
                      if (client) {
                        user.setLastLogin(() => {
                          callback({
                            success: true,
                            userType: type,
                            token,
                            clientName: payee.name,
                            currencySymbol: client.currencySymbol,
                            clientType: client.clientType,
                          });
                        });
                      } else {
                        user.setLastLogin(() => {
                          callback({
                            success: true,
                            userType: type,
                            token,
                          });
                        });
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
              user.setLastLogin(() => {
                callback({
                  success: true,
                  userType: type,
                  token,
                });
              });
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        user.setLastLogin(() => {
          callback({
            success: true,
            userType: type,
            token,
          });
        });
      }
    });
  });
};

userSchema.methods.setLastLogin = function (callback) {
  const user = this;
  user.lastLogin = Date.now();
  user.save()
    .then(() => {
      callback();
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

userSchema.methods.getType = function (callback) {
  if (this.payeeId) {
    callback('payee');
  } else if (this.clientId) {
    callback('client');
  } else if (this.parentId) {
    callback('parent');
  } else if (this.internal) {
    callback('internal');
  } else {
    callback();
  }
};

userSchema.methods.setApiKeys = function () {
  this.apiKey = randomBytes(12).toString('hex');
  const secret = randomBytes(12).toString('hex');
  logger.debug('API Key:', this.apiKey);
  logger.debug('Secret Key:', secret);
  this.apiSecretKey = hashPassword(secret);
};

userSchema.methods.clearTemporaryStatus = function (callback) {
  const user = this;
  if (user.parentId || user.internal) {
    user.clientId = null;
    user.payeeId = null;
    user.save()
      .then(() => {
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  } else {
    if (user.clientId && !user.clientIds?.includes(user.clientId)) { user.clientId = null; }
    if (user.payeeId && !user.payeeIds?.includes(user.payeeId)) { user.payeeId = null; }
    user.save()
      .then(() => {
        callback();
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

/**
 *
 * @param callback
 *
 * Generated Multi factor code, and JWT token, and call sendEmail. JWT is returned to client side for use in verification
 * step. Token contains user email and generated code.
 */
userSchema.methods.createMultiFactorTokenAndSendEmail = function (callback) {
  const user = this;
  const min = 100000;
  const max = 999999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  const token = jwt.sign({ email: this.email, mfaRequired: true }, process.env.jsonSecretToken, { expiresIn: 900 });
  // We need to store the generated code in the user document, with an expiry of 900 seconds
  const mfaCodeToken = jwt.sign({ code }, process.env.jsonSecretToken, { expiresIn: 900 });
  user.multiFactorAuthenticationEmailCode = mfaCodeToken;

  user.save()
    .then(() => {
      // Clear out a stale clientId/payeeId left over from a previous session (e.g. via set_client)
      // before resolving which client/parent branding to use for this email. This must wait for the
      // save above to finish first - Mongoose rejects overlapping save() calls on the same document.
      user.clearTemporaryStatus((err) => {
        if (err) {
          callback(err, null);
          return;
        }
        createAndSendMfaEmail();
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });

  function createAndSendMfaEmail() {
    if (user.clientId) {
      Client.findById(user.clientId)
        .then((client) => {
          if (client) {
            client.getParent((err, parent) => {
              SendEmail.multiFactorAuthentication(user.email, parent, code, (err) => {
                if (err) {
                  callback(err, null);
                } else {
                  callback(null, token);
                }
              });
            });
          } else {
            SendEmail.multiFactorAuthentication(user.email, null, code, (err) => {
              if (err) {
                callback(err, null);
              } else {
                callback(null, token);
              }
            });
          }
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else if (user.parentId) {
      Parent.findById(user.parentId)
        .then((parent) => {
          SendEmail.multiFactorAuthentication(user.email, parent, code, (err) => {
            if (err) {
              callback(err, null);
            } else {
              callback(null, token);
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    } else {
      SendEmail.multiFactorAuthentication(user.email, null, code, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, token);
        }
      });
    }
  }
};

userSchema.statics.createUser = async function (params, callback) {
  const Payee = require('../payee');

  // params = { email: req.body.email, parentId: req.body.parentId, clientId: req.body.clientId, payeeId: req.body.payeeId }
  if (!params) {
    callback(new Error('No params passed'));
  } else if (!params.email || String(params.email) === '') {
    callback(new Error('An Email is required'));
  } else {
    // existing sso users must be only authenticated with sso, to not share rights to client data
    if (params.authenticationType === 'Email') {
      const count = await User.countDocuments({ email: params.email, authenticationType: { $in: ['Azure', 'OneLogin', 'OKTA'] } });
      if (count > 0) {
        callback(new Error('Error - you cannot create this User with this Authentication Type'));
        return;
      }
    }
    // new sso users email must not be used outside of sso config clients scope
    // as well as sso user should not be duplicated on specific client
    if (['Azure', 'OneLogin', 'OKTA'].indexOf(params.authenticationType) > -1) {
      const ssoConfig = await SsoConfig.findOne({ clientIds: params.clientId });
      if (!ssoConfig) {
        callback(new Error('Error - you cannot create this User with this Authentication Type'));
        return;
      }
      const countOutsideSsoClients = await User.countDocuments({ email: params.email, clientIds: { $nin: ssoConfig.clientIds } });
      const countSameClient = await User.countDocuments({ email: params.email, clientIds: params.clientId });
      if (countOutsideSsoClients > 0 || countSameClient > 0) {
        callback(new Error('Error - you cannot create this User with this Authentication Type'));
        return;
      }
    }

    let newUser = false;
    params.email = String(params.email).trim().toLowerCase();
    let payeeNames;
    async.waterfall([
      function (cb) {
        // Try to find user by email
        User.findOne({ email: params.email })
          .then((user) => {
            cb(null, user);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (user, cb) {
        // Create new user if none found
        if (!user) {
          const authenticationType = params.authenticationType ? params.authenticationType : 'Email';
          user = new User({ email: params.email, authenticationType });
          newUser = true;
          cb(null, user);
        } else {
          cb(null, user);
        }
      },
      function (user, cb) {
        // if existing user with payees for this client and changing to client user (admin or standard) - Remove all payees for this client from payeeIds
        if (!newUser && (params.adminType === 'Admin' || (!params.payeeId && !params.payeeIds))) {
          Payee.find({ _id: { $in: user.payeeIds }, clientId: params.clientId }, '_id')
            .then((payees) => {
              const payeesToRemove = payees.map((payee) => payee._id.toString());
              if (payeesToRemove.length > 0) {
                const payeesToRemoveSet = new Set(payeesToRemove);
                const newPayeeIds = user.payeeIds.filter((id) => !payeesToRemoveSet.has(id));
                user.payeeIds = newPayeeIds;
                // remove payeeId if in one of the payeesToRemove
                if (payeesToRemoveSet.has(user.payeeId)) { user.payeeId = ''; }
              }
              cb(null, user);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb(null, user);
        }
      },
      function (user, cb) {
        // if existing user and changing from Admin to Standard - remove client id from adminClientIds
        const adminIndex = user.adminClientIds.indexOf(params.clientId);
        if (adminIndex > -1 && params.adminType !== 'Admin' && !newUser) { user.adminClientIds.splice(adminIndex, 1); }
        // if existing user and changing from Admin or Standard Client user to Standard user with a payeeId - remove client id from clientIds and rights
        const clientIndex = user.clientIds.indexOf(params.clientId);
        if (clientIndex > -1 && params.adminType !== 'Admin' && (params.payeeId || params.payeeIds) && !newUser) {
          user.clientIds.splice(clientIndex, 1);
          // remove the rights for this client
          const userRights = { ...user.rights };
          delete userRights[params.clientId];
          user.rights = userRights;
          // if clientId is current client - remove
          if (user.clientId === params.clientId) { user.clientId = ''; }
        }

        // Add IDs
        if (params.payeeId) {
          user.payeeIds.push(params.payeeId);
        } else if (params.payeeIds) {
          user.payeeIds = user.payeeIds.concat(params.payeeIds);
        } else if (params.clientId) {
          user.clientIds.push(params.clientId);
          if (params.adminType === 'Admin') { user.adminClientIds.push(params.clientId); }
        } else if (params.clientIds) {
          user.clientIds = user.clientIds.concat(params.clientIds);
          if (params.adminType === 'Admin') { user.adminClientIds.concat(params.clientIds); }
        } else if (params.parentId && newUser) {
          user.parentId = params.parentId;
        } else if (params.parentId && !newUser) {
          return cb(new Error('User already exists, must be a new user for a parent'));
        } else if (params.internal && newUser) {
          user.internal = true;
        } else if (params.internal && !newUser) {
          return cb(new Error('User already exists, must be a new user to set up an internal user'));
        }
        // remove duplicate adminClientIds
        const uniqueAdminClientIds = user?.adminClientIds.filter((value, index, self) => self.indexOf(value) === index);
        const uniqueClientIds = user?.clientIds.filter((value, index, self) => self.indexOf(value) === index);
        user.adminClientIds = [...uniqueAdminClientIds];
        user.clientIds = [...uniqueClientIds];

        // Add Rights - only if not a payee user
        if (params.rights && !params.payeeId && !params.payeeIds) {
          const userRights = { ...user.rights };
          Object.keys(params.rights).forEach((clientId) => {
            userRights[clientId] = params.rights[clientId];
          });
          user.rights = userRights;
        }
        user.save()
          .then((savedUser) => {
            cb(null, savedUser);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (user, cb) {
        // Get assigned payee names
        if (params.payeeIds) {
          Payee.find({ _id: params.payeeIds }, { name: 1 })
            .then((payees) => {
              payeeNames = payees.map((payee) => payee.name);
              cb(null, user);
            })
            .catch((err) => {
              logger.error(err);
              cb(err, user);
            });
        } else {
          cb(null, user);
        }
      },
      function (user, cb) {
        // Get Association Name
        if (params.payeeId) {
          Payee.findById(params.payeeId)
            .then((payee) => {
              payee.getParent((err, parent) => {
                Client.findById(payee.clientId)
                  .then((client) => {
                    cb(null, user, payee.name, parent, client);
                  })
                  .catch((err) => {
                    logger.error(err);
                    callback(err);
                  });
              });
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else if (params.clientId) {
          Client.findById(params.clientId)
            .then((client) => {
              client.getParent((err, parent) => {
                cb(null, user, client.name, parent, client);
              });
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else if (params.parentId) {
          user.parentId = params.parentId;
          Parent.findById(params.parentId)
            .then((parent) => {
              cb(null, user, parent.name, parent, null);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb(null, user, 'Curve Royalty Systems', null, null);
        }
      },
      function (user, association, parent, client, cb) {
        if (newUser) {
          user.userCreationDate = new Date();
          user.userCreationToken = jwt.sign({ id: user._id, created: user.userCreationDate, invite: true }, process.env.jsonSecretToken, { expiresIn: 604800 });
          user.save()
            .then(() => {
              let options = {};
              if (client) {
                options = { supportEmail: client.customSupportEmail, cc: client.ccCommunicationEmail };
                if (client.inviteEmailCustomText) { options.customText = Utils.unescapeHtml(client.inviteEmailCustomText); }
              }
              if (payeeNames) options.payeeNames = payeeNames;
              if (['Azure', 'OneLogin', 'OKTA'].indexOf(user.authenticationType) === -1) {
                SendEmail.invite(user.email, client, parent, user.userCreationToken, association, options, (err) => {
                  if (!err) {
                    user.sendings.push({ date: new Date(), email: user.email, clientId: client?._id });
                  }
                  cb(err, user);
                });
              } else {
                cb(null, user);
              }
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
          // Only send invite email if user already exists and not internal
        } else if (!user.internal) {
          let options = {};
          if (client) {
            options = { supportEmail: client.customSupportEmail, cc: client.ccCommunicationEmail };
            if (client.inviteEmailCustomText) { options.customText = Utils.unescapeHtml(client.inviteEmailCustomText); }
          }
          if (payeeNames) options.payeeNames = payeeNames;
          SendEmail.inviteAdditional(client, user.email, parent, association, options, (err) => {
            if (!err) {
              user.sendings.push({ date: new Date(), email: user.email, clientId: client?._id });
            }
            cb(err, user);
          });
        } else {
          cb(null, user);
        }
      },
      function (user, cb) {
        user.save()
          .then((savedUser) => {
            cb(null, savedUser);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
    ], callback);
  }
};

/**
 * Checks the user rights for this client based on admin rights set for this client or the user being a user of a parent which has access to this client
 *
 * @param {string} clientId - The client id to check against
 * @returns {string} - Admin | Standard
 */
userSchema.methods.clientAdminType = async function (clientId) {
  const user = this;
  if (clientId) {
    const client = await Client.findById(clientId).catch((clientErr) => {
      logger.error('Error finding client in user.clientAdminType', clientErr);
    });
    if (client) {
      const parent = await Parent.findById(client.parentId).catch((parentErr) => {
        logger.error('Error finding parent in user.clientAdminType', parentErr);
      });
      if ((user.parentId && parent && user.parentId === parent._id.toString()) || (clientId && user.adminClientIds.includes(clientId.toString()))) {
        return 'Admin';
      }
    }
  }
  return 'Standard';
};

userSchema.methods.setAdminTypeByClientId = function (clientId) {
  const user = this;
  if (clientId && user.adminClientIds.includes(clientId.toString())) {
    user.adminType = 'Admin';
  } else {
    user.adminType = 'Standard';
  }
};

userSchema.statics.removeOrDelete = function (id, curveUser, callback) {
  let revalidatePayees;
  if (!id) {
    callback(new Error('ID is required to be passed'));
  } else if (!curveUser) {
    callback(new Error('curveUser is required to be passed'));
  } else {
    User.findById(id)
      .then((user) => {
        if (!user) {
          callback(new Error('User was not found by passed ID'));
        } else {
          // take a copy of payeeIds to revalidate after delete
          revalidatePayees = [...user.payeeIds];
          async.waterfall([
            function (cb) {
              if (curveUser.payeeId) {
                const index = user.payeeIds.indexOf(curveUser.payeeId);
                user.payeeIds.splice(index, 1);
                cb();
              } else if (curveUser.clientId) {
                // Remove Payee IDs
                Payee.distinct('_id', { clientId: curveUser.clientId })
                  .then((ids) => {
                    ids = ids.map((i) => i.toString());
                    async.each(ids, (i, eachCb) => {
                      const index = user.payeeIds.indexOf(i);
                      if (index > -1) {
                        user.payeeIds.splice(index, 1);
                        if (user.payeeId === i) {
                          // If last login from user was for this payee. also remove param payeeId from user
                          user.payeeId = null;
                        }
                      }
                      eachCb();
                    }, () => {
                      // Remove Client
                      const index = user.clientIds.indexOf(curveUser.clientId);
                      if (index > -1) {
                        user.clientIds.splice(index, 1);
                        const userRights = { ...user.rights };
                        delete userRights[curveUser.clientId];
                        user.rights = userRights;
                      }

                      // Remove AdminClient and rights
                      const adminIndex = user?.adminClientIds.indexOf(curveUser.clientId);
                      if (adminIndex > -1) {
                        // remove the rights for this client
                        const userRights = { ...user.rights };
                        delete userRights[curveUser.clientId];
                        user.rights = userRights;
                        // remove the client id from admin client ids
                        user.adminClientIds.splice(adminIndex, 1);
                      }

                      if (user.clientId === curveUser.clientId) {
                        // If last login from user was for this client. also remove param clientId from user
                        user.clientId = null;
                      }
                      cb();
                    });
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              } else {
                User.findByIdAndDelete(id)
                  .then(() => {
                    // Remove user after deleting
                    user = undefined;
                    cb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              }
            },
            function (cb) {
              if (user && !user.parentId && !user.internal && user.clientIds.length === 0 && user.payeeIds.length === 0) {
                User.findByIdAndDelete(id)
                  .then(() => {
                    cb(null, true);
                  })
                  .catch((err) => {
                    logger.error(err);
                    // It makes no sense to return true here, let it return falsy via undefined
                    // May not be correct
                    cb(err);
                  });
              } else if (user) {
                user.save()
                  .then(() => {
                    cb(null, user);
                  })
                  .catch((err) => {
                    logger.error(err);
                    cb(err);
                  });
              } else {
                cb(null, true);
              }
            },
            function (user, cb) {
              // re-validate the payees that were attached to this user
              Payee.find({ _id: { $in: revalidatePayees } })
                .then((payees) => {
                  if (payees) {
                    // Run re-validation for each affected payee
                    async.each(payees, async (payee) => {
                      await payee.checkValidationErrors().catch(logger.error);
                      await payee.checkValidationUser(true).catch(logger.error);
                    }, cb(null, user));
                  } else {
                    cb(null, user);
                  }
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            },
          ], callback);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

userSchema.methods.removeClientIdsFromPayeeUser = function (user, callback) {
  const Payee = require('../payee');

  const payeeIds = user.payeeIds.map((id) => {
    if (ObjectId.isValid(id)) {
      return new ObjectId(id);
    }
  }).filter(Boolean);
  Payee.find({ _id: payeeIds })
    .then((payees) => {
      payees.forEach((payee) => {
        const index = user.clientIds.indexOf(payee.clientId);
        if (index > -1) {
          // remove client id if payee is attached to this client
          user.clientIds.splice(index, 1);
        }
      });
      callback();
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

// Import
userSchema.statics.importFromExcel = function (file, curveUser, callback) {
  const ImportXlsx = require('../../libs/importXlsx');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.user, 0, 2, dateFormat, (error, data) => {
          if (error) {
            if (error === 'Template does not match') { error = 'It appears the template does not match'; }
            SendEmail.importError(curveUser, client, 'Your User Import Has Errored', file.originalname, [error], (err, result) => {
              if (callback) { callback(err, result); }
            });
          } else {
            data.forEach((row) => {
              logger.info(`User import: Client ${client._id} - User ${curveUser.id} - ${JSON.stringify(row)}`);
            });
            User.importUsers(data, curveUser.clientId, (errors, count, importedUsers) => {
              if (errors && errors.length > 0) {
                logger.error('Import Users Errors');
                logger.error(errors);
                // Send errors email
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your User Import Has Errored',
                  file: file.originalname,
                  error: errors,
                };
                Notification.generate('Your User Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              } else {
                const saveErrors = [];

                // Didn't error, save.
                async.eachSeries(importedUsers, (importedUser, userCb) => {
                  async.waterfall([
                    function (waterfallCb) {
                      // Save initial user
                      importedUser.save()
                        .then((savedUser) => {
                          waterfallCb(null, savedUser);
                        })
                        .catch((err) => {
                          logger.error(err);
                          waterfallCb(err);
                        });
                    },
                    function (savedUser, waterfallCb) {
                      if (!savedUser.userCreationDate) {
                        // Set date
                        savedUser.userCreationDate = new Date();
                        // Create token
                        savedUser.userCreationToken = jwt.sign({ id: savedUser._id, created: savedUser.userCreationDate, invite: true }, process.env.jsonSecretToken, { expiresIn: 604800 });
                        // Resave user with tokens set
                        savedUser.save()
                          .then(() => {
                            // Send user and whether it is newly created
                            waterfallCb(null, savedUser, true);
                          })
                          .catch((err) => {
                            logger.error(err);
                            waterfallCb(err);
                          });
                      } else {
                        // Send original user and it's not newly created
                        waterfallCb(null, savedUser, false);
                      }
                    },
                    function (savedUser, newUser, waterfallCb) {
                      const options = { customText: Utils.unescapeHtml(client.inviteEmailCustomText), supportEmail: client.customSupportEmail, cc: client.ccCommunicationEmail };
                      const parentId = client.parentId ? { _id: client.parentId } : null;
                      if (newUser && savedUser.authenticationType === 'Email') {
                        logger.debug('Inviting User:', savedUser.email);
                        SendEmail.invite(savedUser.email, client, parentId, savedUser.userCreationToken, client.name, options, () => {
                          savedUser.sendings.push({ date: new Date(), email: savedUser.email, clientId: client._id });
                          savedUser.save()
                            .then((savedUser) => {
                              waterfallCb(null, savedUser);
                            })
                            .catch((err) => {
                              logger.error(err);
                              waterfallCb(err);
                            });
                        });
                      } else if (savedUser) {
                        logger.debug('Additional Invite to:', savedUser.email);
                        SendEmail.inviteAdditional(client, savedUser.email, parentId, client.name, options, () => {
                          savedUser.sendings.push({ date: new Date(), email: savedUser.email, clientId: client._id });
                          savedUser.save()
                            .then(() => {
                              waterfallCb();
                            })
                            .catch((err) => {
                              logger.error(err);
                              waterfallCb(err);
                            });
                        });
                      } else {
                        waterfallCb();
                      }
                    },
                  ], (err) => {
                    // Handle errors
                    if (err) {
                      saveErrors.push(err.message);
                    }
                    userCb();
                  });
                }, (errors) => {
                  if (errors && errors.length > 0) {
                    logger.error('Error handling');
                    logger.error(errors);
                    SendEmail.importError(curveUser, client.name, 'Your User Import Has Errored', file.originalname, errors, () => {
                      if (callback) { callback(errors); }
                    });
                  } else if (saveErrors && saveErrors.length > 0) {
                    logger.error('Save Errors');
                    logger.error(saveErrors);
                    SendEmail.importError(curveUser, client.name, 'Your User Import Has Errored', file.originalname, saveErrors, () => {
                      if (callback) { callback(errors); }
                    });
                  } else {
                    // Send import complete email
                    logger.info('User Import Complete');
                    const generateOptions = {
                      identifier: 'importComplete',
                      curveUser,
                      client,
                      subject: 'Your User Import Has Completed',
                      file: file.originalname,
                      count,
                    };
                    Notification.generate('Your User Import Has Completed', `${count} Users imported in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  }
                });
              }
            });
          }
        });
      });
  } catch (e) {
    SendEmail.importError(curveUser, 'Your User Import Has Errored', file.originalname, [e], (err, result) => {
      if (callback) { callback(err, result); }
    });
  }
};

userSchema.statics.importUser = function (data, clientId, importedUsers, callback) {
  let query = null;
  if (!data) {
    return callback("Data doesn't match template");
  }
  if (!data.email || String(data.email) === '') {
    // No data on line, so skip
    return callback();
  }
  // Strip email of any white space
  data.email = String(data.email).trim().toLowerCase();
  // Check if included in importedUsers
  let previouslyImported;
  let previouslyImportedIndex;
  // Loop through previously import
  importedUsers.forEach((importedUser, index) => {
    // When email matches
    if (importedUser && importedUser.email === data.email) {
      // Make previouslyImported
      previouslyImported = importedUser;
      previouslyImportedIndex = index;
    }
  });
  if (previouslyImported) {
    addPayeeIds(data, previouslyImported, clientId, () => {
      importedUsers[previouslyImportedIndex] = previouslyImported;
      callback();
    });
  } else {
    // Find from DB of create new
    if (data._id && data._id !== '') {
      if (!mongoose.Types.ObjectId.isValid(data._id) || data._id.length !== 24) {
        return callback(new Error(`Invalid User ID: '${data._id}'`));
      }
      query = { _id: new ObjectId(data._id) };
    } else {
      query = { email: data.email };
    }
    User.findOne(query)
      .then((user) => {
        if (!user) { user = new User(); }
        user.email = data.email;
        // if existing user and is an Admin user for this client - reject the import
        if (user.adminClientIds.includes(clientId)) {
          callback(new Error(`User ${data.email} is currently an Admin user. You can only import Payee users`));
        } else if (!data.payeeNames || (Array.isArray(data.payeeNames) && data.payeeNames.length === 0)) {
          callback(new Error(`User ${data.email} has no payee assigned. You can only import users associated with payees`));
        } else {
          addPayeeIds(data, user, clientId, callback);
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }

  function addPayeeIds(data, user, clientId, callback) {
    async.each(data.payeeNames, (payeeName, payeeCb) => {
      Payee.findOne({ clientId, name: payeeName })
        .then((payee) => {
          if (!payee) {
            payeeCb(new Error(`Payee with name ${payeeName} not found`));
          } else {
            user.payeeIds.push(payee._id.toString());
            payeeCb();
          }
        })
        .catch((err) => {
          logger.error(err);
          payeeCb(err);
        });
    }, (err) => {
      if (err) {
        callback(err);
      } else {
        // Unique Payee IDs
        user.payeeIds = user.payeeIds.filter((value, index, self) => self.indexOf(value) === index);
        user.removeClientIdsFromPayeeUser(user, () => {
          user.validate()
            .then(() => {
              callback(null, user);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        });
      }
    });
  }
};

userSchema.statics.importUsers = function (users, clientId, callback) {
  try {
    if (Object.prototype.toString.call(users) !== '[object Array]') {
      callback('Data must be an Array', null);
    } else if (!clientId) {
      callback('A Client ID must be passed', null);
    } else {
      let count = 0;
      const importedUsers = [];
      const errors = [];
      async.eachOfSeries(users, (user, index, cb) => {
        User.importUser(user, clientId, importedUsers, (err, importedUser) => {
          if (err) {
            errors.push(`Line ${index + 3}: ${err}`);
          } else if (importedUser) {
            count += 1;
            importedUsers.push(importedUser);
          }
          cb();
        });
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(errors, count, importedUsers);
        }
      });
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

// Export
userSchema.statics.sendExport = function (filter, curveUser) {
  Client.findById(curveUser.clientId)
    .then((client) => {
      async.waterfall([
        function (cb) {
          User.createExportXlsx(filter, curveUser.clientId, cb);
        },
        function (filePath, cb) {
          Client.findById(curveUser.clientId)
            .then((client) => {
              fileManager.uploadToS3(`exports/${client.name} User Export ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (key, cb) {
          fileManager.publicLink24Hours(key, cb);
        },
        function (link, cb) {
          const generateOptions = {
            identifier: 'exportDownload',
            curveUser,
            client,
            subject: `Your User Export for ${client.name} is Ready to Download`,
            link,
          };
          Notification.generate('User Export Ready', `Your User Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
            cb(err);
          });
        },
      ], (error) => {
        if (error) {
          logger.info(error);
          const generateOptions = {
            identifier: 'exportError',
            curveUser,
            client,
            subject: 'Your User Export Has Errored',
            error: error.message,
          };
          Notification.generate('Your User Export Has Errored', error.message, null, curveUser, generateOptions);
        }
      });
    })
    .catch((err) => {
      logger.error(err);
    });
};

userSchema.statics.createExportXlsx = function (filter, clientId, callback) {
  async.waterfall([
    function (cb) {
      User.find(filter)
        .then((users) => {
          cb(null, users);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (users, cb) {
      User.convertUsersForXlsx(users, clientId, cb);
    },
    function (data, cb) {
      Exports.getTemplate({ Client, templateName: 'user', clientId }).then((template) => {
        createXlsx.createInTemplate([data], template, cb);
      });
    },
  ], callback);
};

userSchema.statics.convertUsersForXlsx = function (users, clientId, callback) {
  try {
    if (users instanceof Array) {
      const convertedUsers = [];
      async.each(users, (user, cb) => {
        user.exportData(clientId, (err, data) => {
          convertedUsers.push(data);
          cb();
        });
      }, (err) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, convertedUsers);
        }
      });
    } else {
      callback(new Array('Must be passed an Array of Users'), null);
    }
  } catch (e) {
    logger.error(e);
    callback(e);
  }
};

userSchema.methods.exportData = function (clientId, callback) {
  const user = this;
  Payee.find({ clientId, _id: { $in: user.payeeIds.map((id) => { if (id) { return new ObjectId(id); } }).filter(Boolean) } })
    .then((payees) => {
      const data = [
        user._id.toString(),
        user.email,
        payees.map((payee) => { if (payee) { return payee.name; } }).filter(Boolean).join(';'),
        user.status,
      ];
      callback(null, data);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

let User = mongoose.model(name, userSchema);
module.exports = User;
module.exports.hashPassword = hashPassword;
