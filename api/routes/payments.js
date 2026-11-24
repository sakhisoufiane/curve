const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');
const { eachLimit } = require('async');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const Payment = require('../models/payment');
const Payee = require('../models/payee');
const PaymentController = require('../controllers/payment');

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods', adminOnly: true })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        populate: ['paymentGroupId', 'contractId', 'statementId'],
      };
      Payment.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ payments: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })
  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    Payment.findById(params.id)
      .then(async (payment) => {
        if (!payment) {
          res.status(404).json({ message: `Could not find Payment with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: payment, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          payment.patches.find({ ref: payment._id })
            .populate('author', 'email')
            .then((patches) => {
              res.status(200).json({ modelHistory: patches });
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })
  .get('/:id/pay', (req, res) => {
    const { curveUser, params } = req;

    Payment.findById(params.id)
      .then(async (payment) => {
        if (!payment) {
          res.status(404).json({ message: `Could not find Payment with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: payment, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          payment.status = 'Paid';
          payment.save()
            .then((payment) => {
              res.status(200).json(payment);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message || 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })
  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    Payment
      .findById(params.id)
      .populate({ path: 'statementId', model: 'Statement', select: 'name' })
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (payment) => {
        if (!payment) {
          res.status(404).json({ message: `Could not find Payment with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: payment, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json(payment);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })
  .put('/flushStatus', (req, res) => {
    const { curveUser, body } = req;
    if (body && body.id) {
      PaymentController.flushPaymentsStatus({ curveUser, paymentGroupId: body.id });
      res.status(200).json({ message: 'Flushing payments, you will be notified upon completion' });
    } else {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })
  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    Payment.findById(params.id)
      .then(async (foundPayment) => {
        if (!foundPayment) {
          res.status(404).json({ message: `Could not find Payment with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPayment, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          for (const i in body) {
            if (body) { foundPayment[i] = body[i]; }
          }
          body.lastModifiedBy = curveUser.id;
          foundPayment.save()
            .then((payment) => {
              res.status(200).json(payment);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: err.message });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })
  .delete('/', (req, res) => {
    const { curveUser, body } = req;

    if (body.ids && body.ids.length > 0) {
      let deletedCount = 0;
      Payment.find({ clientId: curveUser.clientId, _id: { $in: body.ids } })
        .then((payments) => {
          eachLimit(payments, 10, (payment, cb) => {
            payment.deleteTransactions = true;
            UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: payment, clientOnly: true, adminOnly: true })
              .then((forbidden) => {
                if (!forbidden) {
                  payment.deleteOne()
                    .then(() => {
                      deletedCount += 1;
                      // When deleting one document, return error to the frontend.
                      cb();
                    })
                    .catch((err) => {
                      logger.error(`Payment deletion Errored on ${payment._id.toString()}`, err);
                      cb(body.ids.length === 1 ? err : null);
                    });
                } else {
                  cb();
                }
              });
          }, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.message });
            } else {
              res.status(200).json({ deletedCount });
            }
          });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        });
    } else {
      res.status(404).json({ message: 'Required Payments to be selected' });
    }
  })
  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;
    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const payment = new Payment(body);
    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: payment, clientOnly: true, adminOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      payment.save()
        .then((payment) => {
          res.status(200).json(payment);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    }
  });

function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }
  return params;
}

module.exports = router;
