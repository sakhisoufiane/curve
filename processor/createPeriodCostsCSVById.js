require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');

const AllCostsCsv = require('./libs/calculation/period/allCostsCsv');

const periodId = process.argv[2] || '60770fe43d0226540362cc9e';
const email = process.argv[3] || 'dite@curveroyaltysystems.com';

logger.info(`periodId:${periodId}`);
logger.info(`email:${email}`);

if (periodId) {
  Period.findById(periodId)
    .then((period) => {
      if (period) {
        logger.info('Processing Period');
        console.time('createSalesCsv');
        AllCostsCsv.create(period, email, (err) => {
          if (err) {
            logger.error(err);
          } else {
            logger.info('success');
          }
          console.timeEnd('createSalesCsv');
          process.exit(-1);
        });
      } else {
        logger.error(`No Period found with ID ${periodId}`);
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
