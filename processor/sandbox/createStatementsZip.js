require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Period = require('../models/period');
const CreatePeriodZip = require('../libs/calculation/period/createZip');

const createStatementsZip = (periodId, email, file) => {
  Period.findById(periodId, (err, period) => {
    if (err) { logger.error(err); }
    logger.info(`Creating Statements Zip for Period: ${period}`);
    if (period) {
      CreatePeriodZip.createStatementZip(period, email, file, (err) => {
        if (err) {
          logger.error(err);
        } else {
          logger.info('Done');
        }
        process.exit();
      });
    } else {
      logger.error(`No Period found with ID ${periodId}`);
      process.exit();
    }
  });
};

const periodId = '6604316f56c402aad8c1f668';
const email = 'louis.bluhm@curveroyaltysystems.com';
// Possible statement files to download
const files = [
  'pdf',
  'salesCsv',
  'costsCsv',
  'statementOfAccount',
  'feesInvoice',
  'selfBillingInvoice',
];
createStatementsZip(periodId, email, files[0]);
