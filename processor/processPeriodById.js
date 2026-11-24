require('dotenv').config();
require('./models/db');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('./models/period');
const Client = require('./models/client');
const PeriodController = require('./libs/calculation/periodController');
const DmpPeriodController = require('./libs/dmpPeriod/dmpPeriodController');

async function run() {
  try {
    logger.debug(process.argv[2]);
    const periodId = new ObjectId(process.argv[2]);
    const period = await Period.findByIdAndUpdate(periodId, { $set: { forceFull: true } }, { new: true });
    logger.info(period);
    if (period) {
      const client = await Client.findById(period.clientId);
      if (client?.features?.dmp) {
        logger.info(`${period._id} Using DMP Period Controller for client ${client.name} (${client._id})`);
        DmpPeriodController.calculate(period, (calcErr) => {
          if (calcErr) {
            logger.error(calcErr);
            process.exit(-1);
          } else {
            process.exit();
          }
        });
      } else {
        PeriodController.calculate(period, (calcErr) => {
          if (calcErr) {
            logger.error(calcErr);
            process.exit(-1);
          } else {
            process.exit();
          }
        });
      }
    } else {
      logger.error(`No Period found with ID ${periodId}`);
      process.exit(-1);
    }
  } catch (err) {
    logger.error(err);
    process.exit(-1);
  }
}

if (process.argv[2]) {
  run();
} else {
  logger.error('No Period ID passed as an argument');
  process.exit(-1);
}
