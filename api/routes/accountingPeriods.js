const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const AccountingPeriod = require('../models/accountingPeriod');
const SalesFile = require('../models/salesFile');
const Statement = require('../models/statement');
const Payee = require('../models/payee');

const router = express.Router();
const parseUrlencoded = bodyParser.urlencoded({ extended: true });

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      AccountingPeriod.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ accountingPeriods: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    AccountingPeriod.findById(params.id)
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod) {
          accountingPeriod.patches.find({ ref: accountingPeriod._id })
            .populate('author', 'email')
            .then((patches) => {
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
        res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    // Do not load salesFileIds, costIds or analytics - all are loaded separately
    AccountingPeriod.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod) {
          // Filter out any blank deliveries
          accountingPeriod.deliveries = accountingPeriod.deliveries.filter(Boolean);
          res.status(200).json(accountingPeriod);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .get('/:id/sales_files', (req, res) => {
    const { curveUser, params } = req;

    // Loads only sales files associated with the accountingPeriod
    AccountingPeriod.findById(params.id, '_id clientId salesFilesIds')
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod) {
          const paginationParams = {
            page: Page.valueOrDefault(req.query.page, 1),
            limit: Page.valueOrDefault(req.query.limit, 25),
            sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
            select: '_id clientId name invoiceNo targetPeriod salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount grossAmount validationNetAmount homeCurrencyNetAmount homeCurrencyGrossAmount viewed lines validationLines valid invalidLines reportedStatus reportedLines',
          };
          SalesFile.paginate({ _id: { $in: accountingPeriod.salesFilesIds } }, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .get('/:id/unincluded_sales_files', (req, res) => {
    const { curveUser, params, query } = req;

    // Loads only sales files that aren't associated with accountingPeriod - this is required here due to not wanting all costs on the accountingPeriod page to make work by not including param on costs
    AccountingPeriod.findById(params.id, '_id clientId salesFilesIds')
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod) {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 25),
            sort: Page.sortOrDefault(query.orderBy, query.orderDir),
            select: '_id clientId name invoiceNo targetPeriod salesAccountName salesTemplateName salesTemplateId status file publicLink units validationUnits netAmount validationNetAmount homeCurrencyNetAmount lines validationLines valid invalidLines reportedStatus reportedLines',
          };
          query.notInclude = accountingPeriod.salesFilesIds;
          const filter = SalesFile.paramsToFilterField(query, curveUser);
          SalesFile.paginate(filter, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            } else {
              res.status(200).json({ salesFiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages } });
            }
          });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    AccountingPeriod.findById(params.id)
      .then(async (foundAccountingPeriod) => {
        if (!foundAccountingPeriod) {
          res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundAccountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundAccountingPeriod) {
          delete body.clientId;
          body.lastModifiedBy = curveUser.id;
          AccountingPeriod.findByIdAndUpdate(params.id, body, { new: true })
            .then((accountingPeriod) => {
              Statement.updateMany({ accountingPeriodId: params.id }, { $set: { locked: accountingPeriod.locked } })
                .then(() => {
                  res.status(200).json(accountingPeriod);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: err.message });
                });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
      });
  })

  .get('/:id/include_all_sales_files', (req, res) => {
    const { curveUser, params, body } = req;

    AccountingPeriod.findById(params.id, '_id name clientId status')
      .then(async (foundAccountingPeriod) => {
        if (!foundAccountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundAccountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundAccountingPeriod) {
          delete body.clientId;
          SalesFile.find({ clientId: foundAccountingPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              AccountingPeriod.findByIdAndUpdate(params.id, { $set: { salesFilesIds: ids } }, { new: true })
                .then((accountingPeriod) => {
                  res.status(200).json(accountingPeriod);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
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
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .get('/:id/include_filtered_sales_files', (req, res) => {
    const { curveUser, params, body, query } = req;

    AccountingPeriod.findById(params.id, '_id name clientId status')
      .then(async (foundAccountingPeriod) => {
        if (!foundAccountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundAccountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundAccountingPeriod) {
          delete body.clientId;
          const filter = SalesFile.paramsToFilterField(query, curveUser);
          SalesFile.find(filter)
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              AccountingPeriod.findByIdAndUpdate(params.id, { $push: { salesFilesIds: { $each: ids } } }, { new: true })
                .then((accountingPeriod) => {
                  res.status(200).json(accountingPeriod);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
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
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .get('/:id/include_selected_sales_files', (req, res) => {
    const { curveUser, params, query } = req;

    AccountingPeriod.findById(params.id, '_id name clientId status')
      .then(async (foundAccountingPeriod) => {
        if (!foundAccountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundAccountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundAccountingPeriod) {
          const salesFileIds = query.salesFileIds.map((id) => new ObjectId(id));
          SalesFile.find({ _id: { $in: salesFileIds }, clientId: foundAccountingPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              AccountingPeriod.findByIdAndUpdate(params.id, { $push: { salesFilesIds: { $each: ids } } }, { new: true })
                .then((accountingPeriod) => {
                  res.status(200).json(accountingPeriod);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
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
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .get('/:id/remove_selected_sales_files', (req, res) => {
    const { curveUser, params, query } = req;

    AccountingPeriod.findById(params.id, '_id name clientId status')
      .then(async (foundAccountingPeriod) => {
        if (!foundAccountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: foundAccountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundAccountingPeriod) {
          const salesFileIds = query.salesFileIds.map((id) => new ObjectId(id));
          SalesFile.find({ _id: { $in: salesFileIds }, clientId: foundAccountingPeriod.clientId })
            .then((salesFiles) => {
              const ids = salesFiles.map((salesFile) => salesFile._id.toString());
              AccountingPeriod.findByIdAndUpdate(params.id, { $pullAll: { salesFilesIds: ids } }, { new: true })
                .then((accountingPeriod) => {
                  res.status(200).json(accountingPeriod);
                })
                .catch((err) => {
                  logger.error(err);
                  res.status(500).json({ message: 'Internal error, please try again' });
                });
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
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  })

  .delete('/:id', (req, res) => {
    const { curveUser, params } = req;

    AccountingPeriod.findById(params.id)
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod.status === 'Processing') {
          res.status(403).json({ message: "You can't delete an Accounting Period that is processing. Wait for it to complete calculating before trying again." });
        } else {
          accountingPeriod.deleteOne()
            .then(() => {
              res.status(200).json(accountingPeriod);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find Accounting Period with ID ${params.id}` });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    logger.debug(body);
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const accountingPeriod = new AccountingPeriod(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: accountingPeriod, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      accountingPeriod.save()
        .then((accountingPeriod) => {
          res.status(200).json(accountingPeriod);
        })
        .catch((err) => {
          logger.error(err);
          res.status(201).json({ message: err.message });
        });
    }
  })

  .post('/:id/calculate', parseUrlencoded, (req, res) => {
    const { curveUser, params } = req;

    AccountingPeriod.findById(params.id, '_id name clientId status')
      .then(async (accountingPeriod) => {
        if (!accountingPeriod) {
          res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: accountingPeriod, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (accountingPeriod) {
          accountingPeriod.calculate((err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json({ message: 'AccountingPeriod sent for calculation' });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(404).json({ message: `Could not find AccountingPeriod with ID ${params.id}` });
      });
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.name = { $regex: regex };
  }
  return params;
}

module.exports = router;
