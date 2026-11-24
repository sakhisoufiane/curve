require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Period.findById(process.argv[2])
    .then((period) => {
      logger.debug(period);
      if (period) {
        console.time('Creating File');
        period.createSalesCsv(process.argv[3], () => {
          console.timeEnd('Creating File');
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
