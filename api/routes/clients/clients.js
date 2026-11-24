/* eslint-disable no-continue */
const { logger, fileManager, databaseUtils, configShared, encryption, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, Exports, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const Task = require('../../models/task');
const clientSelectFields = require('../../libs/clientSelectFields');
const BillingProcesses = require('../../processes/billing');
const modelHistoryUtils = require('../../libs/modelHistoryUtils');

const User = require('../../models/user');
const Payee = require('../../models/payee');
const Period = require('../../models/period');
const Client = require('../../models/client');
const ClientController = require('../../controllers/client/client');
const PaymentController = require('../../controllers/payment');
// TODO: Re-import validateRequest when Zod validation is re-enabled on the client PUT endpoint.
// const { validateRequest } = require('../../middlewares/validateRequest');

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

router
  .get('/', async (req, res) => {
    const user = await User.findById(req.curveUser.id, 'qaInternal').catch(logger.error);
    if (!user) { return res.status(404).json({ message: 'Could not find User' }); }

    if (req.curveUser.parentId || req.curveUser.internal || req.curveUser.monitoring) { // allow monitoring users to copy clients (use in typeahead)
      const paginationParams = {
        page: Page.valueOrDefault(req.query.page, 1),
        limit: Page.valueOrDefault(req.query.limit, 25),
        sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
        // eslint-disable-next-line max-len
        select: '_id parentId payeeIds name paymentTier companyName address phone ipiNo cwrPartyName cwrPartyId autoApproveWorks salesDatabaseTable periodSalesDatabaseTable periodCostsDatabaseTable statementDesign homeCurrency currencySymbol currency2 currency3 currency4 logo publicLogo createdAt features qaClient',
      };
      Client.paginate(paramsToFilterField(req.query, req.curveUser, user), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          const clients = result.docs.map((client) => {
            // ensure encryptionKey is never returned by API
            client.encryptionKey = undefined;
            // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
            return encryption.encryptionUtils.clearEncryptedFields(client, configShared.encryptedFields.client, req.curveUser);
          });
          res.status(200).json({ clients, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/allclients', (req, res) => {
    if (req.curveUser.internal || req.curveUser.monitoring) {
      const paginationParams = {
        page: Page.valueOrDefault(req.query.page, 1),
        limit: Page.valueOrDefault(req.query.limit, 25),
        sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
        // eslint-disable-next-line max-len
        select: '_id name',
      };
      Client.paginate(paramsToFilterField(req.query, null, null), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          const clients = result.docs.map((client) => {
            // ensure encryptionKey is never returned by API
            client.encryptionKey = undefined;
            // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
            return encryption.encryptionUtils.clearEncryptedFields(client, configShared.encryptedFields.client, req.curveUser);
          });
          res.status(200).json({ clients, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/stripe_setup_intent', (req, res) => {
    const { curveUser } = req;

    if (curveUser.clientId) {
      // Find client by user's current client
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${curveUser.clientId}` });
          } else {
            // Only allow admin users
            if (!curveUser.rights?.[client._id.toString()]?.admin) { return res.status(403).json({ message: 'Forbidden' }); }

            client
              .getStripeSetupIntent()
              .then((intent) => {
                res.status(200).json({ client_secret: intent.client_secret });
              })
              .catch((error) => {
                logger.error(error);
                res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
              });
          }
        })
        .catch((error) => {
          logger.error(`Error finding client: ${error}`);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/charge', (req, res) => {
    const { curveUser } = req;

    if (curveUser.clientId) {
      // Find client by user's current client
      Client.findById(curveUser.clientId)
        .then(async (client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${curveUser.id}` });
          } else {
            // Only allow admin users
            if (!curveUser.rights?.[client._id.toString()]?.admin) { return res.status(403).json({ message: 'Forbidden' }); }

            await client
              .chargeClient(curveUser, true)
              .then(() => {
                res.status(200).json({ message: 'Charged successfully' });
              })
              .catch((error) => {
                logger.error(error);
                res.status(201).json({ message: error.message });
              });
          }
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/payment_method', (req, res) => {
    const { curveUser } = req;

    if (curveUser.clientId) {
      // Find client by user's current client
      Client.findById(curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${curveUser.clientId}` });
          } else {
            // Only allow admin users
            if (!curveUser.rights?.[client._id.toString()]?.admin) { return res.status(403).json({ message: 'Forbidden' }); }

            client
              .retrieveSripePaymentMethod()
              .then((paymentMethod) => {
                res.status(200).json(paymentMethod);
              })
              .catch((error) => {
                logger.error(error);
                res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
              });
          }
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })
  .get('/:id/usage', (req, res) => {
    const { curveUser, params, query } = req;

    if (curveUser.clientId || params.id) {
      // Find client by user's current client
      Client.findById(curveUser.clientId || params.id)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${params.id}` });
          } else {
            // Only allow internal and admin users
            if (!(curveUser?.internal || curveUser.rights?.[client._id.toString()]?.admin)) {
              return res.status(403).json({ message: 'Forbidden' });
            }

            const { currency } = query;
            client
              .getUsage(currency)
              .then((usage) => {
                res.status(200).json(usage);
              })
              .catch((error) => {
                logger.error(error);
                res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
              });
          }
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/download_template', (req, res) => {
    const { curveUser, query } = req;

    if (curveUser.clientId) {
      const { type } = query;
      Exports
        .getTemplate({ Client, templateName: type, clientId: curveUser.clientId })
        .then((template) => {
          if (template) {
            res.status(200).download(template);
          } else {
            logger.error('Coudln\'t find template file.');
            res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
          }
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/processes/charge-clients', (req, res) => {
    if (req.curveUser.internal) {
      BillingProcesses.chargeClients();
      res.status(200).json({ message: 'Running process..' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/processes/check-expiring-trials', (req, res) => {
    if (req.curveUser.internal) {
      BillingProcesses.emailExpiringClients();
      res.status(200).json({ message: 'Running process..' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/processes/notify-about-client-deleted', (req, res) => {
    if (req.curveUser.internal) {
      BillingProcesses.notifyAboutSoonToBeDeleted();
      res.status(200).json({ message: 'Running process..' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/processes/delete-clients', (req, res) => {
    if (req.curveUser.internal) {
      BillingProcesses.deleteBillingClients();
      res.status(200).json({ message: 'Running process..' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    if (req.curveUser.parentId || req.curveUser.internal) {
      Client.findById(req.params.id)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
          } else if (client.userForbidden(req.curveUser)) {
            res.status(403).json({ message: 'Forbidden' });
          } else if (client) {
            client.patches
              .find({ ref: client._id })
              .populate('author', 'email')
              .then(async (patches) => {
                patches = await modelHistoryUtils.decryptPatches(patches, client, configShared.encryptedFields.client, encryption.encryptionUtils.isClientAdminUser(req.curveUser));
                res.status(200).json({ modelHistory: patches });
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json({ message: 'Internal error, please try again' });
              });
          } else {
            res.status(500).json({ message: 'Internal error, please try again' });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/cypress-token', async (req, res) => {
    const { clientId, userId } = req.query;

    const allowedClientIds = ['621f0b95fa73b800413c5d40', '621f0baafa73b800413c5d4f', '60d3120daa4fbb0012c74589'];
    const allowedUserIds = ['68de771d091c0ec01c7d653c', '68e38a3723be9bca3e7672ff'];

    // Make sure we're only allowing copying certain clients/users or anyone can have access to any account
    if (!allowedClientIds.includes(clientId) || !allowedUserIds.includes(userId)) { return res.status(403).json({ message: 'Forbidden' }); }

    // Copy client and generate token
    const token = await ClientController.copyClientForCypress({ clientId, userId });
    res.status(200).json({ token });
  })

  .delete('/delete-cypress-client', async (req, res) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'A token is required.' });
    } else {
      res.status(200).json({ message: 'Deleting client ...' });
      await ClientController.deleteCypressClient({ token });
    }
  })

  .get('/:id', (req, res) => {
    let selectFields;
    if (req.curveUser.payeeId) {
      selectFields = clientSelectFields.getPayeeFields();
    } else if (!req.curveUser.payeeId && req.query.clientBilling) {
      selectFields = clientSelectFields.clientBilling;
    } else if (encryption.encryptionUtils.isClientAdminUser(req.curveUser)) {
      selectFields = clientSelectFields.getClientAdminFields();
    } else {
      selectFields = clientSelectFields.getClientFields();
    }
    const clientRequest = req.curveUser.payeeId ? Client.findById(req.params.id).select(selectFields.join(' ')) : Client.findById(req.params.id).select(selectFields.join(' ')).populate('createdBy', 'email').populate('lastModifiedBy', 'email')
      .populate({ path: 'deliveryEmails', model: 'User', select: 'email' });
    clientRequest
      .then((client) => {
        if (!client) {
          res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
        } else if (req.curveUser.payeeId) {
          Payee.findById(req.curveUser.payeeId)
            .then((payee) => {
              if (payee && payee.clientId === client._id.toString()) {
                // ensure encryptionKey is never returned by API
                client.encryptionKey = undefined;
                // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
                const clearedClient = encryption.encryptionUtils.clearEncryptedFields(client, configShared.encryptedFields.client, req.curveUser);
                res.status(200).json(clearedClient);
              } else {
                res.status(403).json({ message: 'Forbidden' });
              }
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        } else if (client.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (client) {
          // ensure encryptionKey is never returned by API
          client.encryptionKey = undefined;
          // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
          const clearedClient = encryption.encryptionUtils.clearEncryptedFields(client, configShared.encryptedFields.client, req.curveUser);
          res.status(200).json(clearedClient);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/sync_fuga_catalogue', (req, res) => {
    const { curveUser } = req;
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email parameter missing.' });
    }

    if (!UserAccess.allowWriteAccessToAll({ user: curveUser, type: 'catalogue' })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    Client.findById(req.params.id)
      .then(async (client) => {
        if (!client) {
          res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
        } else if (client.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const count = await Task.countDocuments({
            name: 'Fuga Cat Sync',
            clientId: client._id.toString(),
            status: { $in: ['Pending', 'In Progress'] },
          });
          if (!count) {
            try {
              await TaskHelpers.createTaskAndSendMessage(Task, {
                name: 'Fuga Cat Sync',
                clientId: client._id,
                clientName: client.name,
                value: {
                  syncClientId: client._id.toString(),
                  userEmail,
                },
              });
              res.status(200).json();
            } catch (err) {
              res.status(500).json({ message: 'Could not initiate synchronization task' });
            }
          } else {
            res.status(500).json({ message: 'This task is already running - please wait until it has completed before running again' });
          }
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal server error' });
      });
  })

  .get('/:id/lastUsedDate', (req, res) => {
    Client.findById(req.params.id)
      .then((client) => {
        const result = {};

        if (!client) {
          res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
        } else if (client.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          async.forEachOf(client.accountingPeriodTypes, (type, key, callback) => {
            getPeriodByQuery({ clientId: req.params.id, accountingPeriodType: type, locked: true }, (err, period) => {
              if (err) return callback(err);
              result[type] = period ? { endDate: period.endDate.toISOString(), createdAt: period.createdAt } : { endDate: new Date(1900, 0, 1).toISOString(), createdAt: new Date(1900, 0, 1).toISOString() };
              callback();
            });
          }, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ error: err });
            } else {
              res.json(result);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal server error' });
      });

    function getPeriodByQuery(query, callback) {
      Period.findOne(query, { endDate: 1, createdAt: 1 }, { sort: { endDate: -1 } })
        .then((period) => {
          callback(null, period);
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  })

  .get('/:id/periods', async (req, res) => {
    if (!req.curveUser.clientId) { return res.status(403).json({ message: 'Forbidden' }); }

    Period.find({ status: 'Complete', contractType: { $ne: 'Mechanical' }, clientId: req.curveUser.clientId }, 'grossAmount endDate', { sort: { endDate: 1 } })
      .then((periods) => {
        const output = {};
        if (periods) {
          periods.forEach((period) => {
            const grossAmount = period.grossAmount ? parseFloat(period.grossAmount.toFixed(2)) : 0;
            output[moment(period.endDate).format('MM-YYYY')] = output[moment(period.endDate).format('MM-YYYY')] || 0;
            output[moment(period.endDate).format('MM-YYYY')] += grossAmount;
          });
          res.status(200).json({
            data: Object.values(output),
            labels: Object.keys(output),
          });
        } else {
          res.status(200).json({
            data: [],
            labels: [],
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal server error' });
      });
  })

  .get('/:id/summary', (req, res) => {
    Client.findById(req.params.id)
      .then((client) => {
        if (!client) {
          res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
        } else if (client.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const summary = {
            _id: client._id,
            name: client.name,
            totalRevenue: 0,
            totalCosts: 0,
            incompleteLines: 0,
          };

          MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
            .then((mongoClient) => {
              const db = mongoClient.db(databaseUtils.getMongoDBName());
              async.parallel([
                function (cb) {
                  db.collection('salesfiles')
                    .aggregate([
                      { $match: { clientId: client._id.toString() } },
                      { $group: { _id: 1, amount: { $sum: '$homeCurrencyNetAmount' }, invalidLines: { $sum: '$invalidLines' } } },
                    ], { allowDiskUse: true })
                    .toArray()
                    .then((result) => {
                      if (result && result.length > 0) {
                        summary.totalRevenue = result[0].amount;
                        summary.incompleteLines = result[0].invalidLines;
                        cb();
                      } else {
                        cb();
                      }
                    })
                    .catch(cb);
                },
                function (cb) {
                  db.collection('costs')
                    .aggregate([
                      { $match: { clientId: client._id.toString() } },
                      { $group: { _id: 1, amount: { $sum: '$amount' } } },
                    ], { allowDiskUse: true })
                    .toArray()
                    .then((result) => {
                      if (result && result.length > 0) {
                        summary.totalCosts = result[0].amount;
                        cb();
                      } else {
                        cb();
                      }
                    })
                    .catch(cb);
                },
              ], (parErr) => {
                logger.error(parErr);
                logger.debug(summary);
                mongoClient.close();
                res.status(200).json(summary);
              });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal server error' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal server error' });
      });
  })

  .get('/:id/wise_profiles', (req, res) => {
    Client.findById(req.params.id)
      .then((client) => {
        if (!client) { return res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` }); }

        if (client.userForbidden(req.curveUser)) { return res.status(403).json({ message: 'Forbidden' }); }

        client.getWiseProfiles(req.query.key)
          .then((profiles) => {
            // Return the list of profiles
            res.status(200).json({ profiles });
          })
          .catch((err) => {
            res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
          });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/wise_payment_requirements', (req, res) => {
    Client.findById(req.params.id)
      .then((client) => {
        if (!client) { return res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` }); }

        if (client.userForbidden(req.curveUser)) { return res.status(403).json({ message: 'Forbidden' }); }

        client.getWisePaymentRequirements(req.query.currency)
          .then((requirements) => {
            // Return the list of profiles
            res.status(200).json({ requirements });
          })
          .catch((err) => {
            res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
          });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/wise_list_recipients', (req, res) => {
    Client.findById(req.params.id)
      .then((client) => {
        if (!client) { return res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` }); }

        if (client.userForbidden(req.curveUser)) { return res.status(403).json({ message: 'Forbidden' }); }

        client.getWiseListOfRecipients(req.query.currency)
          .then((recipients) => {
            // Return the list of recipients
            res.status(200).json({ recipients });
          })
          .catch((err) => {
            res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
          });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  // TODO: Re-enable Zod validation once the client PUT is split into focused sub-endpoints
  // .put('/:id', validateRequest('PUT /clients/:id'), async (req, res) => {
  .put('/:id', async (req, res) => {
    try {
      const response = await ClientController.updateClient({ req, res });
      return response;
    } catch (err) {
      logger.error(`Could not update client ${req.params?.id}`, err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .put('/settingsFuga/:id', async (req, res) => {
    const response = await ClientController.saveFugaSettings({ req });
    res.status(response.code).json({ message: response.message });
  })

  .post('/verifyFtp', async (req, res) => {
    const response = await ClientController.verifyFtp({ req });
    res.status(response.code).json({});
  })

  .delete('/:id', (req, res) => {
    Client.findById(req.params.id)
      .then((foundClient) => {
        if (!foundClient) {
          res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
        } else if (foundClient.userForbidden(req.curveUser) || (!req.curveUser.internal && !req.curveUser.parentId && req.curveUser.clientId)) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundClient) {
          Client.findByIdAndDelete(req.params.id)
            .then(() => {
              res.status(200).json({ message: 'Client successfully deleted' });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/', parseUrlencoded, (req, res) => {
    if (!req.curveUser.internal && !req.curveUser.parentId && req.curveUser.clientId) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      req.body.createdBy = req.curveUser.id;
      req.body.lastModifiedBy = req.curveUser.id;
      // ensure encryptionKey can not be changed by API
      delete req.body.encryptionKey;
      // only client admin users (not internal users) can store encrypted fields
      req.body = encryption.encryptionUtils.deleteEncryptedFields(req.body, configShared.encryptedFields.client, req.curveUser);
      const client = new Client(req.body);
      if (req.curveUser.parentId) { client.parentId = req.curveUser.parentId; }
      client.save()
        .then((client) => {
          // I've not removed this lines because we will need them in the future. For now they're commented out to avoid
          // // ensure encryptionKey is never returned by API
          // client.encryptionKey = undefined;

          // // Setup Curve Pay
          // const curvePayApiKey = await ClientController.getCurvePayApiKey({ clientId: client._id.toString(), name: client.name });
          // if (curvePayApiKey) {
          //   client.paymentProviders.curvePay = { apiKey: curvePayApiKey };
          //   await client.save();
          // }

          res.status(200).json(client);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
        });
    }
  })

  .post('/:id/upload', upload.single('file'), (req, res) => {
    if (req.curveUser.clientId && req.file) {
      // Write to S3
      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(500).json({ message: `Could not find Client with ID ${req.params.id}` });
          } else if (client) {
            fileManager.uploadToS3(`clients/${client._id.toString()}/${req.file.originalname}`, req.file.path, (err, key) => {
              if (err) {
                logger.error(err);
                res.status(500).json({ message: 'There was an error uploading the file, please try again' });
              } else {
                client.logo = key;
                fileManager.publicS3Link(key, (err, link) => {
                  client.publicLogo = link;
                });
                // @TODO: we should restrict fields to be returned here to the same as for .get('/:id')
                client.save()
                  .then((savedClient) => {
                    // ensure encryptionKey is never returned by API
                    savedClient.encryptionKey = undefined;
                    // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
                    const clearedSavedClient = encryption.encryptionUtils.clearEncryptedFields(savedClient, configShared.encryptedFields.client, req.curveUser);
                    res.status(200).json(clearedSavedClient);
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json({ message: 'Internal error, please try again' });
                  });
              }
            });
          } else {
            res.status(500).json({ message: 'Internal error, please try again' });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else if (req.curveUser.clientId && !req.file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/export', (req, res) => {
    // Exports clients to excel - runs asynchronously
    // Only allow internal user
    if (req.curveUser.internal) {
      // When passed specific IDs
      if (req.body.ids && req.body.ids.length !== 0) {
        Client.sendExport({ _id: { $in: req.body.ids } }, req.curveUser);
        // When IDs are not present, fall back to filter
      } else {
        Client.sendExport(paramsToFilterField(req.body.filter, req.curveUser, null), req.curveUser);
      }
      res.status(200).json({ message: 'Your export will be sent to you via email shortly' });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/accept_legal_terms', (req, res) => {
    if (req.curveUser.clientId) {
      // Find client by user's current client
      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
          } else {
            client.tsAndCsAcceptedDate = new Date();
            client.tsAndCsAcceptedBy = req.curveUser.id;
            client.save()
              .then((client) => {
                res.status(200).json({ message: 'Legal terms and conditions accepted' });
              })
              .catch((err) => {
                logger.error(err);
                res.status(500).json({ message: 'Internal error, please try again' });
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/stripe_update_payment_method', (req, res) => {
    if (req.curveUser.clientId) {
      // Find client by user's current client
      Client.findById(req.curveUser.clientId)
        .then((client) => {
          if (!client) {
            res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });
          } else {
            // Only allow admin users
            if (!req.curveUser.rights?.[client._id.toString()]?.admin) { return res.status(403).json({ message: 'Forbidden' }); }

            client
              .updatePaymentMethod(req.body)
              .then(() => {
                res.status(200).json({ message: 'Payment method updated successfully' });
              })
              .catch((error) => {
                logger.error(error);
                res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .post('/import_config_settings', async (req, res) => {
    const { curveUser, body } = req;
    if (!curveUser.clientId) { return res.status(403).json({ message: 'Forbidden' }); }

    // TODO: Commenting this out until we confirm only admins should be importing configs
    // Only allow admin users
    // const client = await Client.findById(curveUser.clientId).catch(logger.error);
    // if (curveUser.rights?.[client?._id?.toString()]?.admin || !curveUser.internal) { return res.status(403).json({ message: 'Forbidden' }); }

    ClientController.importSettings({ params: body, clientId: curveUser.clientId }).then((client) => {
      res.status(200).json(client);
    }).catch((err) => {
      logger.error(err);
      res.status(500).json({ message: err.message });
    });
  })

  .post('/wise_webhook/:client_id', (req, res) => {
    PaymentController.processWiseWebhookRequest({ clientId: req.params.client_id, request: req.body }).catch(logger.error);
    res.status(200).json({});
  })

  .post('/:id/ftp_key_file', upload.single('file'), async (req, res) => {
    const { file } = req;
    const { ackFtpIngestionIndex } = req.query;

    if (!req.file) return res.status(400).json({ message: 'Requires a file to be uploaded' });

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });

    try {
      const savedClient = await ClientController.uploadFtpKeyfile({ client, file, ackFtpIngestionIndex });
      return res.status(200).json({ message: 'File upload done', client: savedClient });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  })

  .delete('/:id/ftp_key_file', async (req, res) => {
    const { ackFtpIngestionIndex } = req.query;

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: `Could not find Client with ID ${req.params.id}` });

    try {
      const isAckIndexDefined = ackFtpIngestionIndex !== undefined;
      const keyToDelete = isAckIndexDefined ? client.ackFtpIngestions[ackFtpIngestionIndex].fileKey : client.ftpFileKey;
      const deletedKey = await ClientController.deleteFtpKeyFile({ key: keyToDelete });
      return res.status(200).json({ message: 'File delete done', deletedKey });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
    }
  })

  .post('/curvepay_webhook', async (req, res) => {
    logger.info(`CurvePay Webhook received - Params: ${JSON.stringify(req.body)}`);

    try {
      if (!PaymentController.validCurvePayHmac({ req })) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const paymentEvent = req.body;
      await PaymentController.processCurvePayWebhook({ paymentEvent });

      return res.status(200).json({ message: 'Webhook request received' });
    } catch (err) {
      logger.error(err);
      return res.status(err.code || 500).json({ message: err.message });
    }
  });

function paramsToFilterField(query, curveUser, user) {
  const params = {};
  if (curveUser?.parentId) {
    params.parentId = curveUser.parentId;
  } else if (curveUser?.clientId) {
    params._id = curveUser.clientId;
  }
  if (query.name) {
    const regex = new RegExp(_.escapeRegExp(query.name), 'i');
    if (query.name.length === 24 && ObjectId.isValid(query.name)) {
      params.$or = [{ _id: query.name }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  if (!user?.qaInternal) { params.qaClient = { $ne: true }; }

  return params;
}

module.exports = router;
