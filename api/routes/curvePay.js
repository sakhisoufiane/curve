const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');

const router = express.Router();

const Client = require('../models/client');
const Payee = require('../models/payee');
const curvePay = require('../controllers/curvePay');

router.post('/', async (req, res) => {
  const { curveUser } = req;

  if (!UserAccess.allowReadAccessToAll({ user: curveUser, type: 'periods', allowPayee: true })) return res.status(403).json({ message: 'Forbidden' });

  if (curveUser.type === 'payee') {
    const payee = await Payee.findById(curveUser.payeeId, { clientId: 1 });
    curveUser.clientId = payee.clientId;
    logger.info(`Payee ${curveUser.payeeId} updating Payment Details`);
  }

  if (curveUser.type === 'client') logger.info(`Client ${curveUser.clientId} updating Payment Details`);

  try {
    const client = await Client.findById(curveUser.clientId);
    const result = await curvePay.getiFrame({ req, client });
    if (result) {
      res.status(200).json({ url: result });
    } else {
      res.status(403).json({ message: 'Error interacting with payments server' });
    }
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'Internal error, please try again' });
  }
});

module.exports = router;
