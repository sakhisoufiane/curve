require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const AccountingPeriod = require('./models/accountingPeriod');

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  AccountingPeriod.findById(process.argv[2])
    .then((accountingPeriod) => {
      logger.info(JSON.stringify(accountingPeriod));
      if (accountingPeriod) {
        accountingPeriod.calculate((err) => {
          logger.error(err.message);
          process.exit(-1);
        });
      } else {
        logger.error(`No Period found with ID ${process.argv[2]}`);
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Period ID passed as an argument');
  process.exit(-1);
}
