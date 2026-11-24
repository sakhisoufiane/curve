const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const { ObjectId } = require('mongodb');
const historyModelUser = require('../../libs/historyModelUser');
const Report = require('../../models/report');
const User = require('../../models/user');
const Payee = require('../../models/payee');
const ReportsController = require('../../controllers/reports');

// Temporary hotfix to resolve PEN issue at 11th hour - CUR-3019. This ticket will be picked up
// for full resolution against all non HTML fields. This should take account of malformed html which temp solution does not
const stripHtml = (htmlString) => htmlString.replace(/<[^>]*>/g, '');
const INTERNAL_ERROR = { message: 'Internal error, please try again' };
const FORBIDDEN = { message: 'Forbidden' };

router
  .get('/', async (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'sales', allowPayee: true })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      Report.paginate(await paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json(INTERNAL_ERROR);
        } else {
          res.status(200).json({ reports: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;
    Report.findById(params.id)
      .then(async (report) => {
        if (!report) {
          res.status(404).json({ message: `Could not find Report with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: report, clientOnly: true })) {
          res.status(403).json(FORBIDDEN);
        } else {
          report.patches.find({ ref: report._id })
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

  .get('/:id/export', async (req, res) => {
    try {
      const { curveUser, params } = req;
      await ReportsController.createReportExportTask({ reportId: params?.id, curveUser });
      return res.status(200).json({ message: 'Your report will be sent to you via email shortly' });
    } catch (err) {
      logger.error(err);
      if (err?.code) return res.status(err.code).json({ message: err.message });
      return res.status(500).json(INTERNAL_ERROR);
    }
  })

  .get('/:id/exportFixedReport', (req, res) => {
    const { curveUser, params } = req;
    Report.findById(params.id)
      .then(async (report) => {
        if (!report) {
          res.status(404).json({ message: `Could not find Report with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: report })) {
          res.status(403).json(FORBIDDEN);
        } else {
          User.findById(curveUser.id)
            .then((user) => {
              report.exportFixedReport(user.email, (err) => {
                if (err) {
                  res.status(500).json({ message: err.message });
                } else {
                  res.status(200).json(report);
                }
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

  .get('/:id/display', (req, res) => {
    const { curveUser, params } = req;
    Report.findById(params.id)
      .then(async (report) => {
        if (!report) {
          res.status(404).json({ message: `Could not find Report with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: report })) {
          res.status(403).json(FORBIDDEN);
        } else {
          logger.info(`generating report display data for ${report._id}`);
          ReportsController.createReportPreview(report, (err, data) => {
            if (err) {
              logger.error(err);
              res.status(500).json(INTERNAL_ERROR);
            } else {
              res.status(200).json(data);
            }
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
    Report.findById(params.id)
      .populate('createdBy', 'email')
      .populate('lastModifiedBy', 'email')
      .then(async (report) => {
        if (!report) {
          res.status(404).json({ message: `Could not find Report with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'sales', document: report })) {
          res.status(403).json(FORBIDDEN);
        } else {
          res.status(200).json(report);
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json(INTERNAL_ERROR);
      });
  })

  .put('/:id', async (req, res) => {
    const { curveUser, params, body } = req;

    const foundReport = await Report.findById(params.id).populate('createdBy', 'email').catch(logger.error);
    body.name = stripHtml(body.name);

    if (!foundReport) {
      return res.status(404).json({ message: `Could not find Report with ID ${params.id}` });
    }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: foundReport })) {
      return res.status(403).json(FORBIDDEN);
    }

    try {
      body.lastModifiedBy = curveUser.id;
      const updatedReport = await Report.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
      return res.status(200).json(updatedReport);
    } catch (err) {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    }
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const report = await Report.findById(params.id).populate('createdBy', 'email').catch(logger.error);
    if (!report) return res.status(404).json({ message: `Could not find Client ID: ${params.id}` });

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: report })) return res.status(403).json(FORBIDDEN);

    try {
      await Report.findByIdAndDelete(params.id).catch(logger.error);
      res.status(200).json({});
    } catch (err) {
      logger.error(err);
      res.status(500).json(INTERNAL_ERROR);
    }
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    if (curveUser.clientId) { body.clientId = curveUser.clientId; }
    if (curveUser.payeeId) { body.payeeId = curveUser.payeeId; }
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    body.name = stripHtml(body.name);

    const report = new Report(body);

    if (!await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'sales', document: report })) {
      report.save()
        .then((savedReport) => {
          res.status(200).json(savedReport);
        })
        .catch((err) => {
          logger.error(err);
          // Because we are saving here, the error could be a validation error we want to pass to the client
          // Not ideal because it also passes the other error messages from mongoose, but we don't have a better
          // way to do it at the moment. This would otherwise fail regression
          res.status(500).json({ message: err.message || 'Internal error, please try again' });
        });
    } else {
      res.status(403).json(FORBIDDEN);
    }
  });

async function paramsToFilterField(inputParams, user) {
  const params = {};
  if (user.clientId) {
    params.clientId = user.clientId;
    params.payeeId = { $exists: false };
  }
  if (user.payeeId) { params.createdBy = user.id; }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');

    if (inputParams.text.length === 24 && ObjectId.isValid(inputParams.text)) {
      params.$or = [{ _id: inputParams.text }, { name: { $regex: regex } }];
    } else {
      params.name = { $regex: regex };
    }
  }

  if (!params.clientId && user.payeeId) {
    const payee = await Payee.findById(user.payeeId, 'clientId');
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }
  return params;
}

module.exports = router;
