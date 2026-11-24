const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');

const express = require('express');

const router = express.Router();
const bodyParser = require('body-parser');

const parseUrlencoded = bodyParser.urlencoded({ extended: false });
const _ = require('lodash');
const DeliverySchedule = require('../models/deliverySchedule');
const Payee = require('../models/payee');
const historyModelUser = require('../libs/historyModelUser');
const DeliveryScheduleController = require('../controllers/deliverySchedule');

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
        populate: 'deliveryPartnerId',
      };
      DeliverySchedule.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ deliverySchedules: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/queuedWorks', async (req, res) => {
    const { curveUser, query, params } = req;
    if (!curveUser.clientId || curveUser.payeeId || !['View', 'Edit'].includes(curveUser.rights?.[curveUser.clientId]?.catalogue)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const queuedWorks = await DeliveryScheduleController.queuedWorks({ deliveryId: params.id, query, curveUser });
      res.status(200).json(queuedWorks);
    } catch (error) {
      logger.error(error);
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    DeliverySchedule.findById(params.id)
      .then(async (deliverySchedule) => {
        if (!deliverySchedule) {
          res.status(404).json({ message: `Could not find Delivery Schedule with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliverySchedule, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (deliverySchedule) {
          res.status(200).json(deliverySchedule);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .put('/:id', (req, res) => {
    const { curveUser, params, body } = req;

    DeliverySchedule.findById(params.id)
      .then(async (foundDeliverySchedule) => {
        if (!foundDeliverySchedule) {
          res.status(404).json({ message: `Could not find Delivery Schedule with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliverySchedule, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundDeliverySchedule) {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundDeliverySchedule[i] = body[i]; }
          foundDeliverySchedule.save()
            .then((deliverySchedule) => {
              res.status(200).json(deliverySchedule);
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
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .post('/', parseUrlencoded, async (req, res) => {
    const { curveUser, body } = req;

    body.clientId = curveUser.clientId;
    const deliverySchedule = new DeliverySchedule(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: deliverySchedule, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    deliverySchedule.save()
      .then((deliverySchedule) => {
        res.status(200).json(deliverySchedule);
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: err.showToUser ? err.message : 'Unfortunately we couldn\'t complete your request. Please try again, or contact the support team.' });
      });
  })

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const foundDeliverySchedule = await DeliverySchedule.findById(params.id).catch(logger.error);
    if (!foundDeliverySchedule) { return res.status(404).json({ message: `Could not find Delivery Schedule: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliverySchedule, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    DeliverySchedule.findByIdAndDelete(params.id)
      .then((deliverySchedule) => {
        if (!deliverySchedule) {
          res.status(404).json({ message: `Could not find Delivery Schedule with ID ${params.id}` });
        } else if (deliverySchedule) {
          res.status(200).json(deliverySchedule);
        } else {
          res.status(500).json({ message: 'Internal error, please try again' });
        }
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).json({ message: 'Internal error, please try again' });
      });
  })

  .get('/:id/history', (req, res) => {
    const { curveUser, params } = req;

    DeliverySchedule.findById(params.id, async (err, deliverySchedule) => {
      if (!deliverySchedule) {
        res.status(404).json({ message: `Could not find Delivery Schedule with ID ${params.id}` });
      } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliverySchedule, clientOnly: true })) {
        res.status(403).json({ message: 'Forbidden' });
      } else if (deliverySchedule) {
        deliverySchedule.patches
          .find({ ref: deliverySchedule._id })
          .populate('author', 'email')
          .then((patches) => {
            historyModelUser.addModifiedBy(patches, (err, patches) => {
              res.status(200).json({ modelHistory: patches });
            });
          })
          .catch((err) => {
            logger.error(err);
            res.status(500).json({ message: 'Internal error, please try again' });
          });
      } else {
        res.status(500).json({ message: 'Internal error, please try again' });
      }
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
