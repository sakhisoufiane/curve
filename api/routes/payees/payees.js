const { logger, configShared, encryption } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const async = require('async');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const historyModelUser = require('../../libs/historyModelUser');
const modelHistoryUtils = require('../../libs/modelHistoryUtils');
const payeeSelectFields = require('../../libs/payeeSelectFields');
const Payee = require('../../models/payee');
const User = require('../../models/user');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const PayeeController = require('../../controllers/payee');
const { applyDateFilters } = require('../../libs/dateFilters');
const PayeeTransactionController = require('../../controllers/payeeTransaction');
const { CSVRawExport } = require('../../libs/mongodb-export');

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

const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
/**
 * @api {get} /payees/ Get all Payees
 * @apiGroup payees
 *
 * @apiUse TokenParams
 * @apiParam {String} [text] - Filter on supplied text string
 * @apiParam {String} [name] - Filter by Payee name
 * @apiParam {Number} [page] - Page number to return
 * @apiParam {Number} [limit] - Number of items to return per page
 * @apiParam {String} [orderBy] - Column to order by
 * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
 *
 * @apiSuccess {Object[]} payees - Array of Payees
 * @apiSuccess {Object} meta - Meta data
 * @apiSuccess {Number} meta.currentPage - Number of page returned
 * @apiSuccess {Number} meta.totalPages - Total number of pages
 * @apiSuccess {Number} meta.total - Total number of Payees
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "payees": [
 *      {
 *        _id: "5e1494037f08d7395fd31111",
 *        name: "Payee 1",
 *        ...
 *      },
 *      {
 *        _id: "5e1494037f08d7395fd31112",
 *        name: "Payee 2",
 *        ...
 *      },
 *      ...
 *    ],
 *    "meta": {
 *      "currentPage": 1,
 *      "totalPages": 1,
 *      "total": 25
 *    }
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 */
  .get('/', (req, res) => {
    // Only allow if client
    const { curveUser, query } = req;
    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        projection: undefined, // Explicitly disable projection to prevent encryption plugin from clearing clientId
      };
      let filterParams = Payee.paramsToFilterField(query, curveUser);
      filterParams = applyDateFilters(query, filterParams);
      Payee.paginate(filterParams, paginationParams, (findErr, result) => {
        // Handle find errors
        if (findErr) {
          logger.error(findErr);
          // Return internal error
          res.status(500).json({ message: findErr.showToUser ? findErr.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
        } else {
          // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
          const payees = result.docs.map((payee) => encryption.encryptionUtils.clearEncryptedFields(payee, configShared.encryptedFields.payee, curveUser));
          // Return result
          res.status(200).json({ payees, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {get} /payees/:id/history Get Payee's edit history
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Payee ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    modelHistory: [
   *      {
   *        author: 'Author Name'
   *        ops: [{op: "replace", path: "/lastModifiedBy", value: "600ff2f8d497a0001b460d6d",…},…]
   *        ref: "5e1493ff7f08d7395fd354ef"
   *        timestamp: "2021-03-24T09:28:56.839Z"
   *        __v: 0
   *        _id: "605b0658770577c1ad08797e"
   *      },
   *      ...
   *    ]
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Payee with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Payee.findById(params.id)
      .then(async (payee) => {
        if (!payee) {
          res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: payee, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          payee.patches.find({ ref: payee._id, clientId: payee.clientId })
            .populate('author', 'email')
            .then(async (patches) => {
              patches = await modelHistoryUtils.decryptPatches(patches, payee, configShared.encryptedFields.payee, encryption.encryptionUtils.isClientAdminUser(curveUser));
              historyModelUser.addModifiedBy(patches, (err, patches) => {
                res.status(200).json({ modelHistory: patches });
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

/**
   * @api {get} /payees/:id Get single Payee
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Payee ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    _id: "5e1494037f08d7395fd35511",
   *    name: 'Payee 1',
   *    ...
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Payee with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const client = await Client.findById(curveUser.clientId, 'features').catch(logger.error);

    // Only allow if client or payee
    const selectFields = (encryption.encryptionUtils.isClientAdminUser(req.curveUser)) ? payeeSelectFields.getClientAdminFields() : payeeSelectFields.getClientFields();
    const select = client?.features?.payeeBalances ? `${selectFields.join(' ')} openingBalance minPayout selfBilling autoPayment payeeBalanceCurrency` : selectFields.join(' ');
    // Find using ID
    Payee.findById(params.id)
      .select(select)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (payee) => {
        if (!payee) {
        // None found
          res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
        // Check if forbidden
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: payee, clientOnly: true, payeeOnly: true })) {
          res.status(403).json(FORBIDDEN);
        // Return payee
        } else {
          // Get client values before returning
          payee.getClientValues(async (err, payeeWithClientValues) => {
          // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
            const clearedPayeeWithClientValues = encryption.encryptionUtils.clearEncryptedFields(payeeWithClientValues, configShared.encryptedFields.payee, curveUser);
            // Return payee
            if (clearedPayeeWithClientValues?.paymentProviders?.wise?.paymentFields) {
              clearedPayeeWithClientValues.paymentProviders.wise.paymentFields = Payee.escapeDotsFromWiseFields(clearedPayeeWithClientValues.paymentProviders.wise.paymentFields, false);
            }

            if (client?.features?.payeeBalances && !payee.payeeBalanceCurrency) {
              clearedPayeeWithClientValues.validationErrors.push('When Payee Balances is enabled: Currency should be set');
            }

            res.status(200).json(clearedPayeeWithClientValues);
          });
        // Hand find errors
        }
      })
      .catch((findErr) => {
        logger.error(findErr);
        res.status(500).json({ message: findErr.showToUser ? findErr.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
      });
  })

  /**
   * @api {get} /payees/:id/summary Get a Payee's royalties summary
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Payee ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    _id: '5e1494037f08d7395fd31111',
   *    name: 'Payee Name',
   *    totalRevenuesToDate: 12220,
   *    totalCostsToDate: 8990
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Payee with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/summary', (req, res) => {
    // Returns summary royalty info on payee
    // Find using ID
    const { curveUser, params } = req;

    Payee.findById(params.id)
      .then(async (payee) => {
        // Handle find errors
        if (!payee) {
          res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
          // Check if forbidden
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: payee, payeeOnly: true, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
          // Return payee
        } else {
          // Get summary info
          payee.summary((err, summary) => {
            // Handle summary error
            if (err) {
              res.status(500).json({ message: 'Internal server error' });
              // Return payee
            } else {
              res.status(200).json(summary);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  /**
   * @api {get} /payees/:id/analytics Get a Payee's statements analytics
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiParam {String} id - Payee ID
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    net:{
   *      distributionChannels: [...],
   *      configurations: [...],
   *      territories: [...],
   *      sources: [...],
   *      subSources: [...],
   *      costs: [...]
   *    },
   *    overTime: {
   *      data: [ [...], [...], ...],
   *      labels: [...]
   *    }
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError NotFound Could not find Payee with ID
   * @apiErrorExample {json} NotFound Response:
   *  HTTP/1.1 404 NotFound
   *  {
   *    message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
   *  }
   */
  .get('/:id/detail', (req, res) => {
    // Gets analytics for payee
    const { curveUser, params } = req;

    Payee.findById(params.id)
      .then(async (payee) => {
        // Handle find errors
        if (!payee) {
          res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
          // Check if forbidden
        } else if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: payee, payeeOnly: true, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
          // Return payee analytics
        } else {
          // Get analytics from found payee
          payee.analytics((err, result) => {
            // Handle any errors
            if (err) {
              res.status(500).json({ message: 'Internal server error' });
              // Return result
            } else {
              res.status(200).json(result);
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .get('/:id/payee_balance', (req, res) => {
    const { curveUser, params } = req;

    if (!curveUser.payeeId) return res.status(403).json(FORBIDDEN);

    PayeeController.getPayeeBalance({ id: params.id, curveUser }).then((payeeBalance) => {
      res.status(200).json(payeeBalance);
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  .get('/:id/get_contracts_and_transactions', async (req, res) => {
    const { params, curveUser } = req;
    try {
      const payee = await Payee.findById(params.id);
      if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', clientOnly: true, document: payee })) {
        res.status(403).json({ message: 'Forbidden' });
      } else {
        const payeeBalance = await PayeeController.getContractsAndTransactions({ payeeId: params.id });
        res.status(200).json(payeeBalance);
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  // TODO The following transactions are based on a feature switch, probably not worth exposing these on Swagger for now
  .get('/:id/transactions', async (req, res) => {
    // Gets analytics for payee
    const { curveUser, params } = req;

    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      return res.status(403).json(FORBIDDEN);
    }

    PayeeTransactionController.getTransactions({ payeeId: params.id, curveUser }).then((transactions) => {
      res.status(200).json(transactions);
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  /**
   * @api {post} /payees/transactions/import Import Payee Transactions
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiBody {Object} file - Excel/CSV file to import
   * @apiBody {String} [overwriteBlanks] - set to "true" to overwrite blank values
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Payee Transactions are importing, and a report will be sent to you shortly."
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   * @apiError BadRequest No file uploaded
   * @apiErrorExample {json} BadRequest Response:
   *  HTTP/1.1 400 BadRequest
   *  {
   *    errors: ["Requires a file to be uploaded"]
   *  }
   */
  .post('/transactions/import', upload.single('file'), async (req, res) => {
    const { curveUser, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    try {
      // Check if client has payee balances feature enabled
      const client = await Client.findById(curveUser.clientId, 'features');
      if (!client?.features?.payeeBalances) {
        return res.status(403).json({ message: 'This client is not allowed to import payee transactions' });
      }

      if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
        PayeeTransactionController.importPayeeTransactions({ file, curveUser });
        res.status(200).json({ message: 'Payee Transactions are importing, and a report will be sent to you shortly.' });
      } else {
        res.status(403).json(FORBIDDEN);
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    }
  })

  /**
   * @api {post} /payees/transactions/export Export Transactions for a specific Payee
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Payee IDs to export
   * @apiBody {Object} [filter] - Filter the transactions to export
   * @apiBody {String} [filter.startDate] - Filter transactions from this date
   * @apiBody {String} [filter.endDate] - Filter transactions to this date
   * @apiBody {String} [filter.type] - Filter by transaction type
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Your payeetransactions export will be sent to you via email shortly"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/transactions/export', async (req, res) => {
    const { curveUser, body } = req;

    try {
      // Check if client has payee balances feature enabled
      const client = await Client.findById(curveUser.clientId, 'features');
      if (!client?.features?.payeeBalances) {
        return res.status(403).json({ message: 'This client is not allowed to export payee transactions' });
      }

      if (curveUser.clientId && !curveUser.payeeId && ['View', 'Edit'].includes(curveUser.rights[curveUser.clientId].contracts)) {
        PayeeTransactionController.exportTransactions({
          curveUser,
          ids: body?.ids ?? [],
          filter: body?.filter,
        });
        res.status(200).json({ message: 'Your payee transactions export will be sent to you via email shortly' });
      } else {
        res.status(403).json(FORBIDDEN);
      }
    } catch (err) {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    }
  })

  .get('/:id/statements', async (req, res) => {
    // Gets analytics for payee
    const { curveUser, params } = req;

    if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      return res.status(403).json(FORBIDDEN);
    }

    PayeeController.getStatements({ payeeId: params.id, curveUser }).then((statements) => {
      res.status(200).json(statements);
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  .post('/:id/transaction', async (req, res) => {
    const { curveUser, params, body } = req;

    PayeeTransactionController.createTransaction({ payeeId: params.id, body, curveUser }).then((transaction) => {
      res.status(200).json(transaction);
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  .put('/:id/transaction', async (req, res) => {
    const { curveUser, body } = req;

    PayeeTransactionController.updateTransaction({ transactionId: body._id, body, curveUser }).then((transaction) => {
      res.status(200).json(transaction);
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  .delete('/:id/transaction/:id', async (req, res) => {
    const { curveUser, params } = req;

    if (!params.id) { return res.status(400).json({ message: 'Transaction ID is required' }); }

    PayeeTransactionController.deleteTransaction({ transactionId: params.id, curveUser }).then(() => {
      res.status(200).json({ message: 'Transaction deleted' });
    }).catch((err) => {
      logger.error(err);
      res.status(err.code).json({ message: err.message });
    });
  })

  /**
     * @api {get} /payees/:id/users Get all Payee's Users
     * @apiGroup payees
     *
     * @apiUse TokenParams
     * @apiParam {String} id - Payee ID
     * @apiParam {Number} [page] - Page number to return
     * @apiParam {Number} [limit] - Number of items to return per page
     * @apiParam {String} [orderBy] - Column to order by
     * @apiParam {String} [orderDir] - Order direction ("asc", "desc")
     *
     * @apiSuccess {Object[]} payees - Array of Payees
     * @apiSuccess {Object} meta - Meta data
     * @apiSuccess {Number} meta.currentPage - Number of page returned
     * @apiSuccess {Number} meta.totalPages - Total number of pages
     * @apiSuccess {Number} meta.total - Total number of Payees
     * @apiSuccessExample {json} Success Response:
     *  HTTP/1.1 200 OK
     *  {
     *    "users": [
     *      {
     *        _id: "5e1494037f08d7395fd31111",
     *        email: "user1@email.com",
     *        ...
     *      },
     *      {
     *        _id: "5e1494037f08d7395fd31112",
     *        email: "user2@email.com",
     *        ...
     *      },
     *      ...
     *    ],
     *    "meta": {
     *      "currentPage": 1,
     *      "totalPages": 1,
     *      "total": 25
     *    }
     *  }
     *
     * @apiUse ErrorForbidden
     * @apiUse ErrorInternalServerError
     */
  .get('/:id/users', (req, res) => {
    const { curveUser, params, query } = req;

    if (curveUser.clientId && !curveUser.payeeId) {
      async.waterfall([
        (cb) => {
          User.findById(curveUser.id)
            .then((foundUser) => {
              cb(null, foundUser);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        (foundUser, cb) => {
          if (foundUser.internal || foundUser.adminClientIds.includes(curveUser.clientId)) {
            cb();
          } else if (foundUser.parentId) {
            Client.findById(curveUser.clientId)
              .then((foundClient) => {
                if (!foundClient) {
                  cb('client not found');
                } else if (foundClient.parentId === foundUser.parentId) {
                  cb();
                } else {
                  cb('Forbidden');
                }
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            cb('Forbidden');
          }
        },
      ], (err) => {
        if (err && err === 'Forbidden') {
          res.status(403).json(FORBIDDEN);
        } else if (err) {
          res.status(500).json(INTERNAL_ERROR);
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: 'email status createdAt',
          };
          User.paginate({ payeeIds: params.id }, paginationParams, (err, users) => {
            if (err) {
              res.status(500).json(INTERNAL_ERROR);
            } else {
              res.status(200).json({
                users: users.docs,
                meta: {
                  currentPage: paginationParams.page,
                  totalPages: users.totalPages,
                  total: users.totalDocs,
                },
              });
            }
          });
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/:id/tipalti_iframe_authentication', (req, res) => {
    const { curveUser, params } = req;

    if (!curveUser.clientId && curveUser.payeeId !== params.id) { return res.status(403).json(FORBIDDEN); }

    Payee.findById(params.id)
      .then(async (payee) => {
        if (!payee) { return res.status(404).json({ message: `Could not find Payee with ID ${params.id}` }); }
        if (await UserAccess.isUserForbidden({ Contract, Payee, user: curveUser, operation: 'read', type: 'contracts', document: payee, adminOnly: true, payeeOnly: true })) { return res.status(403).json(FORBIDDEN); }
        // Get payee tipalti iframe authentication
        await payee.getTipaltiIframeAuthentication()
          .then((url) => {
            res.status(200).json({ url });
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
          });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

/**
* @api {put} /payees/:id Update single Payee
* @apiGroup payees
*
* @apiUse TokenParams
* @apiParam {String} id - Payee ID
* @apiBody {Object} body - Payee document
*
* @apiSuccess {json} Success Response
* @apiSuccessExample {json} Success Response:
*  HTTP/1.1 200 OK
*  {
*    _id: "5e1494037f08d7395fd35511",
*    name: "Payee 1",
*    ...
*  }
*
* @apiUse ErrorForbidden
* @apiUse ErrorInternalServerError
* @apiError NotFound Could not find Payee with ID
* @apiErrorExample {json} NotFound Response:
*  HTTP/1.1 404 NotFound
*  {
*    message: "Could not find Payee with ID 5e1494037f08d7395fd31111"
*  }
*/
  .put('/:id', (req, res) => {
    // Update payee
    const { curveUser, params } = req;

    // Find using ID
    Payee.findById(params.id)
      .then(async (foundPayee) => {
        if (!foundPayee) {
          // When no payee is found
          res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
          // Check if forbidden
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundPayee, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
          // Update payee
        } else {
          // only client admin users (not internal users) can update encrypted fields
          const body = encryption.encryptionUtils.deleteEncryptedFields(req.body, configShared.encryptedFields.payee, curveUser);
          // Retain original clientId on payee
          delete body.clientId;
          // Replace dots from the payee payment fields
          if (body.paymentProviders?.wise?.paymentFields) {
            body.paymentProviders.wise.paymentFields = Payee.escapeDotsFromWiseFields(body.paymentProviders.wise.paymentFields, true);
          }
          // Loop through passed values and update against payee
          Object.keys(body).forEach((key) => {
            foundPayee[key] = body[key];
          });
          // Set last modified by
          foundPayee.lastModifiedBy = curveUser.id;
          // Save payee
          foundPayee.save()
            .then((payee) => {
              // only client admin users (not internal users) can retrieve encrypted fields. Clear fields for others
              const clearedPayee = encryption.encryptionUtils.clearEncryptedFields(payee, configShared.encryptedFields.payee, curveUser);
              if (clearedPayee?.paymentProviders?.wise?.paymentFields) {
                clearedPayee.paymentProviders.wise.paymentFields = Payee.escapeDotsFromWiseFields(clearedPayee.paymentProviders.wise.paymentFields, false);
              }
              res.status(200).json(clearedPayee);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Internal error, please try again' });
            });
        }
      })
      .catch((findErr) => {
        logger.error(findErr);
        res.status(500).json({ message: findErr.showToUser ? findErr.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
      });
  })

/**
 * @api {delete} /payees/bulk Bulk delete Payees
 * @apiGroup payees
 *
 * @apiUse TokenParams
 * @apiBody {String[]} ids - Payee IDs to delete
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    deletedCount: 1,
 *    n: 1,
 *    ok: 1,
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 * @apiError NotFound Could not find Payee with ID
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 NotFound
 *  {
 *    message: "Could not find Payees"
 *  }
 */
  .delete('/bulk', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      if (body.ids && body.ids.length > 0) {
        const ids = body.ids.map((id) => new ObjectId(id)); const errors = [];
        let deletedCount = 0;
        // Retrieves docs for deletion and delete each ducument individually so that we can store the data in patches collections for recalculation filters
        Payee.find({ clientId: curveUser.clientId, _id: { $in: ids } })
          .then((payees) => {
            async.eachLimit(payees, 10, (payee, cb) => {
              payee.deleteOne()
                .then(() => {
                  deletedCount += 1;
                  cb();
                })
                .catch((err) => {
                  err = err.toString().substring(7, err.toString().length);
                  errors.push({
                    payee: payee.name,
                    errors: (err.includes('"reason"')) ? JSON.parse(err) : [{ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' }],
                  });
                  cb();
                });
            }, () => {
            // Following the established pattern but 201 obviously not the correct code here
              const status = (errors.length > 0) ? 201 : 200;
              res.status(status).json({ deletedCount, errors });
            });
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json(INTERNAL_ERROR);
          });
      } else {
        res.status(404).json({ message: 'Could not find Payees' });
      }
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

/**
 * @api {delete} /payees/:id Delete a single Payee
 * @apiGroup payees
 *
 * @apiUse TokenParams
 * @apiParam {String} id - Payee ID to delete
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    _id: "5e1494037f08d7395fd35511",
 *    name: "Payee 1",
 *    ...
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 * @apiError NotFound Could not find Payee with ID
 * @apiErrorExample {json} NotFound Response:
 *  HTTP/1.1 404 NotFound
 *  {
 *    message: "Could not find Payee with ID 5e1494037f08d7395fd35511"
 *  }
 */
  .delete('/:id', (req, res) => {
    // Deletes payee
    const { curveUser, params } = req;
    // Only allow if client
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      // Find using ID
      Payee.findById(params.id)
        .then(async (payee) => {
          // When no payee is found
          if (!payee) {
            res.status(404).json({ message: `Could not find Payee with ID ${params.id}` });
            // Check if forbidden
          } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: payee, clientOnly: true })) {
            res.status(403).json(FORBIDDEN);
            // Delete payee
          } else {
            // Call remove on payee
            payee.deleteOne()
              .then(() => {
                res.status(200).json(payee);
              })
              .catch((err) => {
                err = err.toString().substring(7, err.toString().length);
                let isErrorsArray = false;
                try {
                  isErrorsArray = Array.isArray(JSON.parse(err));
                } catch (e) {}
                const response = isErrorsArray ? JSON.parse(err) : [INTERNAL_ERROR];
                res.status(201).json(response);
                // Return positive response
              });
          }
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        });
      // When not a client with correct rights
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

/**
* @api {post} /payees/ Create new Payee
* @apiGroup payees
*
* @apiUse TokenParams
* @apiBody {Object} body - Payee document
*
* @apiSuccess {json} Success Response
* @apiSuccessExample {json} Success Response:
*  HTTP/1.1 200 OK
*  {
*    "_id": "5e1494037f08d7395fd35511",
*    "name": "New Payee",
*    ...
*  }
*
* @apiUse ErrorForbidden
* @apiUse ErrorInternalServerError
*/
  .post('/', parseUrlencoded, async (req, res) => {
    // Creates new payee
    const { curveUser } = req;
    // Only allow if client
    // only client admin users (not internal users) can store encrypted fields
    const body = encryption.encryptionUtils.deleteEncryptedFields(req.body, configShared.encryptedFields.payee, curveUser);
    // Set clientId by the user
    body.clientId = curveUser.clientId;
    // Set createdBy and updatedBy to the user
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // Replace dots from the payee payment fields
    if (body.paymentProviders?.wise?.paymentFields) {
      body.paymentProviders.wise.paymentFields = Payee.escapeDotsFromWiseFields(body.paymentProviders.wise.paymentFields, true);
    }
    // Create new payee
    const payee = new Payee(body);
    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: payee, clientOnly: true })) {
      // Save
      payee.save()
        .then((payee) => {
          if (payee?.paymentProviders?.wise?.paymentFields) {
            payee.paymentProviders.wise.paymentFields = Payee.escapeDotsFromWiseFields(payee.paymentProviders.wise.paymentFields, false);
          }
          res.status(200).json(payee);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message || 'Internal error, please try again' });
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
 * @api {post} /payees/import Import Payees
 * @apiGroup payees
 *
 * @apiUse TokenParams
 * @apiBody {Object} body - file to import
 * @apiBody {String} overwriteBlanks - set to "true" to overwrite blank values
 *
 * @apiSuccess {json} Success Response
 * @apiSuccessExample {json} Success Response:
 *  HTTP/1.1 200 OK
 *  {
 *    message: "Payees are importing, and a report will be sent to you shortly."
 *  }
 *
 * @apiUse ErrorForbidden
 * @apiUse ErrorInternalServerError
 * @apiError BadRequest No file uploaded
 * @apiErrorExample {json} BadRequest Response:
 *  HTTP/1.1 400 BadRequest
 *  {
 *    errors: ["Requires a file to be uploaded"]
 *  }
 */
  .post('/import', upload.single('file'), (req, res) => {
    // Imports a payee file - runs asynchronously
    const { curveUser, query, file } = req;
    // Only allow if client and file is present
    const overwriteBlanks = query.overwriteBlanks === 'true';
    if (curveUser.clientId && !curveUser.payeeId && file && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      // Calls import function from model - acts asynchronously
      Payee.importFromExcel(file, curveUser, overwriteBlanks);
      // Returns positive response stating payees are importing
      res.status(200).json({ message: 'Payees are importing, and a report will be sent to you shortly.' });
      // When file is missing
    } else if (!file) {
      res.status(400).json({ errors: ['Requires a file to be uploaded'] });
      // When user does not have the correct rights
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  /**
   * @api {post} /payees/raw-export Raw Export Payees
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiBody {Boolean} [sync=false] - When true, returns the CSV download link directly
   * @apiBody {Object} filter - Filter the Payees to export
   * @apiBody {String} filter.text - Filter based on the supplied text string
   * @apiBody {String} filter.name - Filter based on the name
   * @apiBody {String} filter.createdAfter - Filter payees created on or after this date (YYYY-MM-DD)
   * @apiBody {String} filter.createdBefore - Filter payees created on or before this date (YYYY-MM-DD)
   * @apiBody {String} filter.updatedAfter - Filter payees updated on or after this date (YYYY-MM-DD)
   * @apiBody {String} filter.updatedBefore - Filter payees updated on or before this date (YYYY-MM-DD)
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Async Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Your report will be sent to you via email shortly"
   *  }
   * @apiSuccessExample {json} Sync Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    csvPublicLink: "https://example.com/export.csv"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    // Raw exports payees to CSV - runs asynchronously unless sync=true
    // Only allow if client with correct user privileges
    if (!await UserAccess.allowReadAccessToAll({ modelName: 'Payee', user: curveUser, type: 'contracts' })) {
      return res.status(403).json(FORBIDDEN);
    }

    let filter = Payee.paramsToFilterField(body.filter || {}, curveUser);
    filter = applyDateFilters(body.filter || {}, filter);

    // Always exclude all sensitive fields (encrypted fields and client admin only fields)
    const excludeFields = [
      ...configShared.encryptedFields.payee,
      ...payeeSelectFields.getClientAdminOnlyFields(),
    ];

    if (sync) {
      try {
        const result = await CSVRawExport({
          curveUser,
          collectionName: 'payees',
          filter,
          sync: true,
          excludeFields,
        });
        return res.status(200).json(result);
      } catch (err) {
        logger.error(err);
        return res.status(500).json({ message: 'Export failed', error: err.message });
      }
    } else {
      CSVRawExport({
        curveUser,
        collectionName: 'payees',
        filter,
        excludeFields,
      }).catch((err) => {
        logger.error('Async raw-export failed:', err);
      });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    }
  })

  /**
   * @api {post} /payees/export Export Payees
   * @apiGroup payees
   *
   * @apiUse TokenParams
   * @apiBody {String[]} ids - Payee IDs to export
   * @apiBody {Object} filter - Filter the Payees to export
   * @apiBody {String} filter.text - Filter based on the supplied text string
   * @apiBody {String} filter.name - Filter based on the name
   *
   * @apiSuccess {json} Success Response
   * @apiSuccessExample {json} Success Response:
   *  HTTP/1.1 200 OK
   *  {
   *    message: "Your report will be sent to you via email shortly"
   *  }
   *
   * @apiUse ErrorForbidden
   * @apiUse ErrorInternalServerError
   */
  .post('/export', (req, res) => {
    const { curveUser, body } = req;
    // Exports payees to excel - runs asynchronously
    // Only allow if client
    if (curveUser.clientId && !curveUser.payeeId && ['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.contracts)) {
      // When passed specific IDs
      if (body.ids && body.ids.length !== 0) {
        Payee.sendExport({ _id: { $in: body.ids } }, curveUser);
        // When IDs are not present, fall back to filter
      } else {
        Payee.sendExport(Payee.paramsToFilterField(body.filter, curveUser), curveUser);
      }
      // Return response, letting user know report with be sent via email
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      // When not a client with correct user privileges
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .post('/:id/create_wise_recipient', (req, res) => {
    const { curveUser, params, body } = req;

    Payee.findById(params.id)
      .then(async (payee) => {
        if (!payee) { return res.status(404).json({ message: `Could not find Payee with ID ${params.id}` }); }
        if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: payee, clientOnly: true })) { return res.status(403).json(FORBIDDEN); }

        PayeeController
          .createWiseRecipient({ id: params.id, targetCurrency: body.paymentCurrency, wise: body.wise })
          .then(() => {
            res.status(200).json({ message: 'Recipient created successfully' });
          })
          .catch((error) => {
            logger.error(error);
            res.status(500).json({ message: error.showToUser ? error.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team' });
          });
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  });

module.exports = router;
