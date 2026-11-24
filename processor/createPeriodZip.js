require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const CreatePeriodZip = require('./libs/calculation/period/createZip');

const periodId = process.argv[2] || '60770fe43d0226540362cc9e';
const email = process.argv[3] || 'dite@curveroyaltysystems.com';
// List of available file options can be found in libs/calculation/period/createZip
const file = process.argv[4] || 'pdf';

logger.debug(`periodId: ${periodId}; email: ${email}`);

if (periodId) {
  Period.findById(periodId)
    .then((period) => {
      CreatePeriodZip.createStatementZip(period, email, file, (err) => {
        if (err) {
          logger.error(err);
        } else {
          logger.info('Complete');
        }
        process.exit(0);
      });
    })
    .catch((err) => {
      logger.error(err);
      process.exit(0);
    });
} else {
  logger.error('No Period ID passed as an argument');
  process.exit(0);
}
