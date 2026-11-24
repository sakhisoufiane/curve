const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const DeliveryProfile = require('../models/deliveryProfile');
const Payee = require('../models/payee');

const parseUrlencoded = bodyParser.urlencoded({ extended: true });
const router = express.Router();

router
  .get('/', (req, res) => {
    const { curveUser, query } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      const paginationParams = {
        page: Page.valueOrDefault(query.page, 1),
        limit: Page.valueOrDefault(query.limit, 25),
        sort: Page.sortOrDefault(query.orderBy, query.orderDir),
      };
      DeliveryProfile.paginate(paramsToFilterField(query, curveUser), paginationParams, (err, result) => {
        if (err) {
          logger.error(err);
          res.status(500).json({ message: 'Internal error, please try again' });
        } else {
          res.status(200).json({ deliveryProfiles: result.docs, meta: { currentPage: paginationParams.page, totalPages: result.totalPages, total: result.totalDocs } });
        }
      });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id', (req, res) => {
    const { curveUser, params } = req;

    DeliveryProfile.findById(params.id)
      .then(async (deliveryProfile) => {
        if (!deliveryProfile) {
          res.status(404).json({ message: `Could not find Delivery Profile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliveryProfile, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (deliveryProfile) {
          res.status(200).json(deliveryProfile);
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

    DeliveryProfile.findById(params.id)
      .then(async (foundDeliveryProfile) => {
        if (!foundDeliveryProfile) {
          res.status(404).json({ message: `Could not find Delivery Profile with ID ${params.id}` });
        } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliveryProfile, clientOnly: true })) {
          res.status(403).json({ message: 'Forbidden' });
        } else if (foundDeliveryProfile) {
          delete body.clientId;
          // eslint-disable-next-line guard-for-in
          for (const i in body) { foundDeliveryProfile[i] = body[i]; }
          foundDeliveryProfile.lastModifiedBy = curveUser.id;
          foundDeliveryProfile.notDeliveredTo = body.notDeliveredTo || null;
          foundDeliveryProfile.territory = body.territory || null;
          foundDeliveryProfile.workCreatedPeriod = body.workCreatedPeriod || null;
          foundDeliveryProfile.modifiedInLastPeriod = body.modifiedInLastPeriod || null;
          foundDeliveryProfile.approvedInLastPeriod = body.approvedInLastPeriod || null;
          foundDeliveryProfile.deliveryStatus = body.deliveryStatus || null;
          foundDeliveryProfile.save()
            .then(() => {
              res.status(200).json(foundDeliveryProfile);
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

  .delete('/:id', async (req, res) => {
    const { curveUser, params } = req;

    const foundDeliveryProfile = await DeliveryProfile.findById(params.id).catch(logger.error);
    if (!foundDeliveryProfile) { return res.status(404).json({ message: `Could not find Delivery Profile: ${params.id}` }); }

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: foundDeliveryProfile, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    DeliveryProfile.findByIdAndDelete(params.id)
      .then((deliveryProfile) => {
        if (!deliveryProfile) {
          res.status(404).json({ message: `Could not find Delivery Profile with ID ${params.id}` });
        } else if (deliveryProfile) {
          res.status(200).json(deliveryProfile);
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

    // Creates new deliveryProfile
    // Set clientId by the user
    body.clientId = curveUser.clientId;
    // Set createdBy and updatedBy to the user
    body.createdBy = curveUser.id;
    body.lastModifiedBy = curveUser.id;
    // Create new deliveryProfile
    const deliveryProfile = new DeliveryProfile(body);

    if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'catalogue', document: deliveryProfile, clientOnly: true })) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Save
    if (!deliveryProfile.name) {
      res.status(400).json({ message: 'Name is required' });
    } else {
      deliveryProfile.save()
        .then((savedDeliveryProfile) => {
          res.status(200).json(savedDeliveryProfile);
        })
        .catch((err) => {
          logger.error(err);
          res.status(500).json({ message: err.message || 'Internal error, please try again' });
        });
    }
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
