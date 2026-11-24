const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { DeliveredWorkController, Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const DeliveredWork = require('../models/deliveredWork');
const Work = require('../models/work');
const Payee = require('../models/payee');

const router = express.Router();

router
  .get('/', (req, res) => {
    const { curveUser } = req;

    if (UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })) {
      DeliveredWorkController.paginate({ DeliveredWork, Page, req })
        .then((result) => {
          DeliveredWorkController.getWorkData({ Work, req, deliveries: result.data.deliveries, select: 'title composer identifier' })
            .then((combinedData) => {
              res.status(200).json({ deliveredWorks: combinedData, meta: { currentPage: result.data.meta.currentPage, totalPages: result.data.meta.totalPages, total: result.data.meta.total } });
            })
            .catch((error) => {
              logger.error(error);
              res.status(500).json({ message: 'Internal error, please try again' });
            });
        })
        .catch((error) => {
          logger.error(error);
          res.status(500).json({ message: 'Internal error, please try again' });
        });
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  })

  .get('/:id/history', async (req, res) => {
    const { curveUser, params } = req;

    const deliveredWork = await DeliveredWorkController.findById(params.id);

    if (!deliveredWork) {
      res.status(404).json({ message: `Could not find deliveredWork with ID ${params.id}` });
    } else if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'catalogue', document: deliveredWork, clientOnly: true })) {
      res.status(403).json({ message: 'Forbidden' });
    } else if (deliveredWork) {
      deliveredWork.patches.find({ ref: deliveredWork._id }).populate('author', 'email').exec((err, patches) => {
        res.status(200).json({ modelHistory: patches });
      });
    } else {
      res.status(500).json({ message: 'Internal error, please try again' });
    }
  });

module.exports = router;
