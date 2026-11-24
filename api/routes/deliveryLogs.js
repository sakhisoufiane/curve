const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const express = require('express');
const DeliveryLogController = require('../controllers/deliveryLog');

const router = express.Router();

router.get('/', async (req, res) => {
  const { curveUser } = req;
  if (
    !UserAccess.allowReadAccessToAll({ user: curveUser, type: 'catalogue' })
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const results = await DeliveryLogController.get({ req });
    return res.json(results);
  } catch (err) {
    logger.error(err);
    res
      .status(500)
      .json({
        message:
          "Unfortunately we couldn't complete your request. Please try again, or contact the support team.",
      });
  }
});

module.exports = router;
