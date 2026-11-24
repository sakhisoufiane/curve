require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Contract = require('../models/contract');

Period.findById('5c01270c6e36464b3a8d2631', (err, period) => {
  Statement.findById('5c07fcd0845bfb0dfe0ecd8f', (err, statement) => {
    Contract.findById(statement.contractId, (err, contract) => {
    // Set date to end of day to catch all other transactions
      const accountingDate = new Date(period.accountingDate);
      accountingDate.setDate(accountingDate.getDate() + 1);
      logger.info(period.accountingDate);
      logger.info('Accounting Date:', accountingDate);
      contract.balanceAtDate(accountingDate, (err, closingBalance) => {
        logger.info('Balance:', closingBalance);
      });
    });
  });
});
