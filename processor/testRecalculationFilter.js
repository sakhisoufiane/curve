require('dotenv').config();
require('./models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const Client = require('./models/client');
const recalculationFilter = require('./libs/calculation/recalculationFilter');

if (process.argv[2]) {
  logger.debug(process.argv[2]);
  Period.findById(process.argv[2])
    .then((period) => {
      if (period) {
        logger.info(period);
        Client.findById(period.clientId)
          .then((client) => {
            const { db } = Period;
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            const modComparisonTime = period.processStartTime;
            const overrideAlwaysRunFull = false;
            period.runNo += 1;

            recalculationFilter.createFilter(db, bigQuery, period.toObject(), client, modComparisonTime, overrideAlwaysRunFull, (calculationError, recalculation) => {
              if (calculationError) {
                logger.error(`${period._id} Error building recalculation filter`);
                logger.error(calculationError);
              } else {
                logger.info(`${period._id} Recalculation: ${recalculation.type} | ${recalculation.status}`);
                logger.info({ recalculation });
              }
              process.exit();
            });
          })
          .catch((err) => {
            logger.error(err);
            process.exit();
          });
      } else {
        logger.error(`No Period found with ID ${process.argv[2]}`);
        process.exit();
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit();
    });
} else {
  logger.error('No Period ID passed as an argument');
  process.exit();
}
