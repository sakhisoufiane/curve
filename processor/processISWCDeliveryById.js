require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const IswcDelivery = require('./models/iswcDelivery');
const IswcDeliveryController = require('./controllers/iswcDelivery');

const userId = '6310c02fa03bdc014751e5a6';
const iswcDeliveryId = '6656e3196e13017fc72d3d09';
if (iswcDeliveryId) {
  logger.info({ iswcDeliveryId });
  iswcDelivery(iswcDeliveryId, userId);
} else {
  logger.error('No iswcDeliveryId ID set');
  process.exit(-1);
}

async function iswcDelivery(iswcDeliveryId, userId) {
  const iswcDelivery = await IswcDelivery.findById(iswcDeliveryId);
  if (iswcDelivery) {
    logger.info(`Delivering ISWC Delivery: ${iswcDeliveryId}`);
    try {
      await IswcDeliveryController.deliver({ iswcDeliveryId, userId });
    } catch (err) {
      logger.error(`Error ISWC Delivery: ${err}`);
    }
  } else {
    logger.error(`No ISWC Delivery found with ID ${iswcDeliveryId}`);
  }
}
