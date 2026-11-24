require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const CwrExport = require('../libs/cwr/export');

const deliveryId = process.argv[2] || '67402f432425e1d9cfa495aa';
const email = process.argv[3] || 'louis.bluhm@curveroyaltysystems.com';
const markWorksAsDelivered = true;

logger.info(`deliveryId:${deliveryId}`);
logger.info(`email:${email}`);

async function main() {
  if (!deliveryId) {
    logger.error('No Delivery ID passed as an argument');
    process.exit(1);
  }
  try {
    console.time('createCwrDeliveryExport');
    await CwrExport.exportCwrDelivery({ deliveryId, markWorksAsDelivered, email });
    console.timeEnd('createCwrDeliveryExport');
    process.exit();
  } catch (err) {
    logger.error('Error creating CWR delivery export:', err);
    process.exit(1);
  }
}

main();
