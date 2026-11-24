require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const Client = require('./models/client');

Period.updateMany({ processStartTime: { $exists: true } }, { $set: { forceFull: true } })
  .then((res) => {
    if (res) {
      logger.info(res);
      Client.updateMany({}, { $set: { allowPeriodFilters: true } })
        .then((res) => {
          if (res) {
            logger.info(res);
          }
          process.exit();
        })
        .catch((err) => {
          logger.error(err);
          process.exit();
        });
    }
  })
  .catch((err) => {
    logger.error(err);
    process.exit();
  });
