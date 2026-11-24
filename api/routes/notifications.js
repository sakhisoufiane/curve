const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();
const { ObjectId } = require('mongodb');
const Notification = require('../models/notification');
const Payee = require('../models/payee');

router
  .get('/', async (req, res) => {
    if (req.curveUser.clientId || req.curveUser.payeeId) {
      const paginationParams = {
        page: Page.valueOrDefault(req.query.page, 1),
        limit: Page.valueOrDefault(req.query.limit, 25),
        sort: Page.sortOrDefault(req.query.orderBy, req.query.orderDir),
        select: '_id clientId userId name description link urls notificationErrors read createdAt',
      };
      Notification.paginate(await paramsToFilterField(req.query, req.curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ notifications: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(200).json({ message: 'Forbidden' });
    }
  })
  .get('/count', async (req, res) => {
    if (req.curveUser.clientId || req.curveUser.payeeId) {
      Notification.countDocuments(await paramsToFilterField(req.query, req.curveUser))
        .then((count) => {
          res.status(200).json({ count });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(200).json({ message: 'Forbidden' });
    }
  })
  .get('/mark_read', (req, res) => {
    if (req.curveUser.clientId && req.curveUser.payeeId) { return res.status(200).json({ message: 'Forbidden' }); }

    if (req.query && req.query.ids) {
      const ids = req.query.ids.map((id) => new ObjectId(id));
      Notification.updateMany({ _id: { $in: ids } }, { $set: { read: true } })
        .then(() => {
          res.status(200).json({ message: 'Notifications successfully marked read.' });
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message });
        });
    } else {
      res.status(200).json({ message: 'Notifications successfully marked read.' });
    }
  })
  .get('/:id', (req, res) => {
    if (req.curveUser.clientId && req.curveUser.payeeId) { return res.status(200).json({ message: 'Forbidden' }); }

    Notification.findById(req.params.id)
      .then((notification) => {
        if (!notification) {
          res.status(404).json({ message: `Could not find Notification with ID ${req.params.id}` });
        } else if (notification.userForbidden(req.curveUser)) {
          res.status(403).json({ message: 'Forbidden' });
        } else {
          res.status(200).json({ notification });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  });

async function paramsToFilterField(query, curveUser) {
  const params = {};
  if (curveUser.clientId) { params.clientId = curveUser.clientId; }
  if (curveUser.id) { params.userId = curveUser.id; }
  if (query.read) { params.read = query.read; }
  if (query.createdAfter || query.createdBefore) { params.createdAt = {}; }
  if (query.createdAfter) { params.createdAt.$gte = new Date(query.createdAfter); }
  if (query.createdBefore) { params.createdAt.$lte = new Date(query.createdBefore); }

  if (!params.clientId && curveUser.payeeId) {
    const payee = await Payee.findById(curveUser.payeeId, 'clientId');
    if (payee && payee.clientId) { params.clientId = payee.clientId; }
  }
  return params;
}

module.exports = router;
