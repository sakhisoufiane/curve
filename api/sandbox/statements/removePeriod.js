const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

require('../../models/db');
const Period = require("../../models/period");

// Script used to clear down periods that are in the status 'Deleting'
(async () => {
  const periods = await Period.find({ status: 'Deleting' });
  if (!periods?.length) {
    logger.info('No periods to remove');
    process.exit(0);
  }

  logger.info(`Removing ${periods.length} periods...`);

  let count = 0;
  await eachLimit(periods, 5, async (period) => {
    await new Promise((resolve) => {
      period.deleteOne((err) => {
        if (err) {
          logger.error(`Could not delete period ${period._id.toString()}`, err);
          resolve();
        } else {
          resolve();
        }
      });
    });
    count += 1;
    logger.info(`Removed ${count} periods`);
  });

  logger.info('✅ Periods removed successfully');
  process.exit(0);
})()
