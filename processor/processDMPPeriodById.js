require('dotenv').config();
require('./models/db');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const PeriodController = require('./libs/dmpPeriod/dmpPeriodController');

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  const periodId = new ObjectId(process.argv[2]);
  Period.findById(periodId, (err, period) => {
    if (err) { logger.error(err); }
    logger.info(period);
    if (period) {
      PeriodController.calculate(period, () => {
        process.exit();
      });
    } else {
      logger.error(`No Period found with ID ${periodId}`);
      process.exit(-1);
    }
  });
} else {
  logger.error('No Period ID passed as an argument');
  process.exit(-1);
}
