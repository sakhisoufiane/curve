const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const multer = require('multer');
const appRootDir = require('app-root-dir').get();
const { ObjectId } = require('mongodb');
const { eachLimit } = require('async');
const moment = require('moment');
const PaymentGroupController = require('../../controllers/paymentGroup');

const Payee = require('../../models/payee');
const Payment = require('../../models/payment');
const PaymentGroup = require('../../models/paymentGroup');

const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, `${appRootDir}/tmp/`); },
  filename(req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); },
});

const upload = multer({ storage });

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods', adminOnly: true })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      PaymentGroup.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
        } else {
          res.status(200).json({ paymentGroups: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          paymentGroup.patches.find({ ref: paymentGroup._id })
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

  .get('/:id/payments', (req, res) => {
    const { curveUser, params, query } = req;
    // Check if the id is a valid ObjectId, when creating a new paymentgroup we call this route from the front-end, so this condition initialises that page with an empty array of payments.
    if (!ObjectId.isValid(params.id)) {
      return res.status(200).json({ payments: [], meta: { currentPage: 1, totalPages: 1, total: 0 } });
    }

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(200).json({ payments: [], meta: { currentPage: 1, totalPages: 1, total: 0 } });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const paginationParams = {
            page: Page.valueOrDefault(query.page, 1),
            limit: Page.valueOrDefault(query.limit, 100),
            sort: Page.sortOrDefault(query.orderBy || 'creartedAt', query.orderDir || 'desc'),
            select: 'payeeId name currency amount status warnings paymentDetails',
            populate: { path: 'payeeId', model: 'Payee', select: 'name' },
          };
          const filter = { clientId: curveUser.clientId, paymentGroupId: paymentGroup._id.toString() };
          if (query.showPayments === 'WarningsOnly') { filter['warnings.0'] = { $exists: true }; }
          if (query.showPayments === 'MissingInfo') { filter.status = 'Missing Info'; }
          if (query.showPayments === 'Pending') { filter.status = 'Pending'; }
          if (query.showPayments === 'PaymentError') { filter.status = 'Payment Error'; }
          if (query.showPayments === 'Paid') {
            filter.status = 'Paid';
            filter.$or = [
              { 'paymentDetails.paidOffline': false },
              { 'paymentDetails.paidOffline': { $exists: false } },
            ];
          }
          if (query.showPayments === 'PaidOffline') { filter.status = 'Paid'; filter['paymentDetails.paidOffline'] = true; }

          Payment.paginate(filter, paginationParams, (err, result) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
            } else {
              res.status(200).json({ payments: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .get('/:id/payer_balance', (req, res) => {
    const { curveUser, params } = req;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          await paymentGroup.getPayerBalance()
            .then(({ balance, currency }) => {
              res.status(200).json({ balance, currency });
            })
            .catch((error) => {
              res.status(error.status || 500).json({ message: error.showToUser ? error.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  // trigger paymentGroup on selected IDs (do this in a bulkPayment kind of function and pass it the set of IDs)
  .post('/:id/pay_selected', (req, res) => {
    const { curveUser, params } = req;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const filter = { clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString(), _id: { $in: req.body.ids }, status: { $nin: ['Paid', 'Processing'] } };
          const payments = await Payment.find(filter);
          await Payment.updateMany(filter, { $set: { status: 'Processing' } });
          paymentGroup.pay(payments, req.curveUser).catch(logger.error);
          res.status(200).json({ message: 'Payments have been sent for payment' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/:id/pay_all', (req, res) => {
    const { curveUser, params } = req;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const filter = { clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString(), status: { $nin: ['Paid', 'Processing'] } };
          const payments = await Payment.find(filter);
          if (payments.length === 0) {
            res.status(409).json({ message: 'There are currently no Payments to process' });
            return;
          }
          await Payment.updateMany(filter, { $set: { status: 'Processing' } });
          paymentGroup.pay(payments, req.curveUser).catch(logger.error);
          res.status(200).json({ message: 'Payments have been sent for payment' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/:id/mark_payments', (req, res) => {
    const { curveUser, params, body } = req;
    const { status, ids } = body;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          const filter = { _id: { $in: ids }, clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString() };
          const payments = await Payment.find(filter);
          const invalidPayments = payments.filter((payment) => {
            const isPaidWithCsv = payment.status === 'Paid' && payment.paymentDetails?.provider === 'Standard CSV';

            if (status === 'Paid Offline') {
              return !(['Pending', 'Payment Error', 'Missing Info'].includes(payment.status) || isPaidWithCsv);
            }

            if (status === 'Pending') {
              return !((payment.status === 'Paid' && payment.paymentDetails?.paidOffline === true) || isPaidWithCsv);
            }

            return true;
          });
          if (invalidPayments.length > 0) {
            const invalidIds = invalidPayments.map((p) => p._id);
            res.status(400).json({
              message: `The following payments cannot be marked as ${status}: ${invalidIds.join(', ')}`,
            });
          } else {
            await Payment.updateMany(
              { _id: { $in: ids } },
              {
                $set: {
                  status: status === 'Paid Offline' ? 'Paid' : status,
                  'paymentDetails.paidOffline': status === 'Paid Offline',
                  'paymentDetails.manuallyChangedAt': moment().format(),
                  lastModifiedBy: curveUser.id,
                },
              },
            );
            await paymentGroup.updateStatus();
            res.status(200).json({ message: `${payments.length} payment(s) marked as ${status} successfully.` });
          }
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/:id/export_payments', (req, res) => {
    const { curveUser, params, body } = req;

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          PaymentGroup.sendExport(params.id, body.ids, curveUser).catch(logger.error);
          res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .post('/:id/import_payments', upload.single('file'), (req, res) => {
    const { curveUser, params, file } = req;

    if (!file) { return res.status(400).json({ message: 'Requires a file to be uploaded' }); }

    if (!(file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      return res.status(400).json({ message: 'Requires .xlsx file to be uploaded' });
    }

    PaymentGroup.findById(params.id)
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          PaymentGroup.importFromExcel(params.id, file, curveUser).catch(logger.error);
          res.status(200).json({ message: 'Payments are importing, and a report will be sent to you shortly.' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    PaymentGroup.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (paymentGroup) => {
        if (!paymentGroup) {
          res.status(404).json({ message: `Could not find PaymentGroup with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
          return res.status(403).json({ message: 'Forbidden' });
        } else {
          paymentGroup = await PaymentGroupController.getHeadlineData({ paymentGroup });
          return res.status(200).json(paymentGroup);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;
    PaymentGroup.findById(params.id)
      .then(async (foundPaymentGroup) => {
        if (!foundPaymentGroup) {
          res.status(404).json({ message: `Could not find payment group with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: foundPaymentGroup, clientOnly: true, adminOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          delete body.clientId;
          for (const i in body) { if (body) { foundPaymentGroup[i] = body[i]; } }
          body.lastModifiedBy = curveUser.id;
          foundPaymentGroup.save()
            .then(async (paymentGroup) => {
              paymentGroup = await PaymentGroupController.getHeadlineData({ paymentGroup });
              res.status(200).json(paymentGroup);
            })
            .catch((err) => {
              logger.error(err);
              res.status(500).json({ message: 'Internal error, please try again' });
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
      PaymentGroup.find({ clientId: curveUser.clientId, _id: { $in: body.ids } })
        .then((paymentGroups) => {
          eachLimit(paymentGroups, 10, (paymentGroup, cb) => {
            UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })
              .then((forbidden) => {
                if (!forbidden) {
                  paymentGroup.deleteOne()
                    .then(() => {
                      deletedCount += 1;
                      cb();
                    })
                    .catch((err) => {
                      // When deleting one document, return error to the frontend.
                      logger.error(`Payment deletion Errored on ${paymentGroup._id.toString()}`, err);
                      cb(body.ids.length === 1 ? err : null);
                    });
                } else {
                  cb();
                }
              });
          }, (err) => {
            if (err) {
              logger.error(err);
              res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
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
      res.status(404).json({ message: 'Required Payment Groups to be selected' });
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    const paymentGroup = new PaymentGroup(body);
    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: paymentGroup, clientOnly: true, adminOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      paymentGroup.save()
        .then((paymentGroup) => {
          res.status(200).json(paymentGroup);
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
