const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const appRootDir = require('app-root-dir').get();
const multer = require('multer');
const async = require('async');
const { applyDateFilters } = require('../../libs/dateFilters');
const { CSVRawExport } = require('../../libs/mongodb-export');
const Transaction = require('../../models/transaction');
const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');
const historyModelUser = require('../../libs/historyModelUser');

const TransactionController = require('../../controllers/transactions');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: false });

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
});

const upload = multer({ storage });

const INTERNAL_ERROR_MESSAGE = 'Internal error, please try again';
const FORBIDDEN_MESSAGE = 'Forbidden';
const INTERNAL_ERROR = { message: INTERNAL_ERROR_MESSAGE };
const FORBIDDEN = { message: FORBIDDEN_MESSAGE };

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;
    const paginationParams = {
      page: Page.valueOrDefault(query.page, 1),
      limit: Page.valueOrDefault(query.limit, 25),
      sort: Page.sortOrDefault(query.orderBy, query.orderDir),
    };

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      Transaction.paginate(await paramsToFilterField(curveUser, query), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        } else {
          res.status(200).json({ transactions: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
        }
      });
    } else if (curveUser.payeeId) {
      async.waterfall([
        function (cb) {
          Payee.findById(curveUser.payeeId)
            .then((payee) => {
              cb(null, payee);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (payees, cb) {
          if (query.contractId) {
            Contract.findOne({ _id: new ObjectId(query.contractId), 'payees.payeeId': curveUser.payeeId, clientId: payees.clientId })
              .then((contract) => {
                cb(null, payees, contract);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          } else {
            cb(new Error('Requires Contract ID'));
          }
        },
        function (payees, contract, cb) {
          if (contract) {
            contract.getAssociatedTransactions(new Date(), (err) => {
              cb(err, payees, contract);
            });
          } else {
            cb(new Error(FORBIDDEN_MESSAGE));
          }
        },
        function (payees, contract, cb) {
          Statement.find({ contractId: contract._id.toString(), status: 'Published', clientId: payees.clientId })
            .then((statements) => {
              cb(null, payees, contract, statements);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (payees, contract, statements, cb) {
          const statementIds = statements.map((statement) => statement._id.toString());
          const transactions = contract.transactions.map((transaction) => {
            if (transaction.date <= new Date() && (statementIds.includes(transaction.statementId) || transaction.userCreated)) {
              return transaction;
            }
          }).filter(Boolean);
          cb(null, transactions);
        },
      ], (err, transactions) => {
        if (err) {
          logger.error(err);
          res.status(403).json(FORBIDDEN);
        } else {
          res.status(200).json({ transactions });
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .post('/export', async (req, res) => {
    try {
      await TransactionController.export({
        curveUser: req.curveUser,
        ids: req.body?.ids ?? [],
        filter: req.body?.filter,
      });
      res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      logger.error(err);
      if (err.status) {
        res.status(err.status).json({ message: err.message });
      } else {
        res.status(500).json(INTERNAL_ERROR);
      }
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Transaction.findById(params.id)
      .then(async (transaction) => {
        if (!transaction) {
          res.status(404).json({ message: `Could not find Transaction with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: transaction, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          transaction.patches.find({ ref: transaction._id })
            .populate('author', 'email')
            .then((patches) => {
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
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;
    Transaction.findById(params.id)
      .then(async (transaction) => {
        if (!transaction) {
          res.status(404).json({ message: `Could not find Transaction with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'contracts', document: transaction, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          res.status(200).json(transaction);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    const validation = TransactionController.validateParams(body);

    if (!validation.success) {
      return res.status(400).json({ message: validation.errors });
    }

    Transaction.findById(params.id)
      .then(async (foundTransaction) => {
        if (!foundTransaction) {
          res.status(404).json({ message: `Could not find Transaction with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: foundTransaction, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          delete body.clientId;
          if (body.date) {
            foundTransaction.date = body.date;
            body.date = new Date(Date.UTC(foundTransaction.date.getFullYear(), foundTransaction.date.getMonth(), foundTransaction.date.getDate(), 0, 0, 0));
          }
          for (const i in body) { if (body[i]) { foundTransaction[i] = body[i]; } }

          // If invoiceNo is not present in request, remove from mongo object
          if (!body.invoiceNo) { foundTransaction.invoiceNo = null; }

          foundTransaction.save()
            .then((savedTransaction) => {
              // If we have successfully saved the transaction - update the related contract to ensure contract is recalculated on a partial period run
              Contract.findByIdAndUpdate(savedTransaction.contractId, { $set: { updatedAt: new Date() } })
                .then(() => {
                  res.status(200).json(savedTransaction);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;
    Transaction.findById(params.id)
      .then(async (transaction) => {
        if (!transaction) {
          res.status(404).json({ message: `Could not find Transaction with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          Contract.findById(transaction.contractId)
            .then(async (contract) => {
              if (!contract) {
                res.status(404).json({ message: `Could not find Contract with ID ${transaction.contractId}` });
              } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: contract, clientOnly: true })) {
                res.status(403).json(FORBIDDEN);
              } else {
                Transaction.findByIdAndDelete(params.id)
                  .then((transaction) => {
                    // If we have successfully deleted the transaction - update the related contract to ensure contract is recalculated on a partial period run
                    Contract.findByIdAndUpdate(transaction.contractId, { $set: { updatedAt: new Date() } })
                      .then(() => {
                        res.status(200).json(transaction);
                      })
                      .catch((err) => {
                        logger.error(err);
                        res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
                      });
                  })
                  .catch((err) => {
                    logger.error(err);
                    res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
                  });
              }
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

  .post('/bulkDelete', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      const { ids } = body;
      TransactionController.bulkDelete({ ids, curveUser }).then((message) => {
        res.status(200).json({ message });
      }).catch((err) => {
        res.status(500).json({ message: err.message });
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })
  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    body.userCreated = true;

    const validation = TransactionController.validateParams(body);

    if (!validation.success) {
      return res.status(400).json({ message: validation.errors });
    }

    const transaction = new Transaction(body);

    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'contracts', document: transaction, clientOnly: true })) {
      transaction.save()
        .then((transaction) => {
          // If we have successfully saved the transaction - update the related contract to ensure contract is recalculated on a partial period run
          Contract.findByIdAndUpdate(transaction.contractId, { $set: { updatedAt: new Date() } })
            .then(() => {
              res.status(200).json(transaction);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
            });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message || INTERNAL_ERROR_MESSAGE });
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })
  .post('/validate', (req, res) => {
    const { curveUser, body } = req;
    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      body.clientId = curveUser.clientId;
      Transaction.validateAgainstContract(body, (err) => {
        if (err) {
          res.status(201).json({ message: err });
        } else {
          res.status(200).json();
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })
  .post('/import', upload.single('file'), (req, res) => {
    const { curveUser, file } = req;
    if (!file) { return res.status(400).json({ errors: ['Requires a file to be uploaded'] }); }

    if (curveUser.clientId && !curveUser.payeeId && curveUser.rights?.[curveUser.clientId]?.contracts === 'Edit') {
      Transaction.importFromExcel(file, curveUser);
      res.status(200).json({ message: 'Transactions are importing, and a report will be sent to you shortly.' });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .post('/raw-export', async (req, res) => {
    const { curveUser, body } = req;
    const sync = body.sync === true;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'contracts' })) {
      const filter = await paramsToFilterField(curveUser, body.filter || {});

      if (sync) {
        try {
          const result = await CSVRawExport({ curveUser, collectionName: 'transactions', filter, sync: true });
          res.status(200).json(result);
        } catch (err) {
          logger.error(err);
          res.status(500).json({ message: 'Export failed', error: err.message });
        }
      } else {
        CSVRawExport({ curveUser, collectionName: 'transactions', filter });
        res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
      }
    } else {
      res.status(403).json(FORBIDDEN);
    }
  });

async function paramsToFilterField(user, inputParams = {}) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (user.contractId) {
    params.contractId = user.contractId;
  } else if (inputParams.contractId) {
    params.contractId = inputParams.contractId;
  }
  if (inputParams?.type) {
    params.type = inputParams.type;
  }
  // Regex
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [
      { name: { $regex: regex } },
      { description: { $regex: regex } },
    ];
  }

  if (inputParams.userCreated === 'true' || inputParams.userCreated === true) { params.userCreated = true; }
  if (inputParams.userCreated === 'false' || inputParams.userCreated === false) { params.userCreated = false; }

  if (!params.clientId && user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId');
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }

  const paramsWithDateFilters = applyDateFilters(inputParams, params);
  return paramsWithDateFilters;
}

module.exports = router;
