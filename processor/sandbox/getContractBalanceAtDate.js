const { logger } = require('@curveroyaltysystems/platform-shared-utils');
require('../models/db');
const Contract = require('../models/contract');
const Period = require('../models/period');
const Statement = require('../models/statement');

Statement.findById('6060b47cde8a0e74f2945bd1', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Contract.findById('5e1494197f08d7395fd358cc', (err, contract) => {
      const endDate = new Date(period.endDate);
      endDate.setDate(endDate.getDate() + 1);
      contract.balanceAtDate(endDate, (err, closingBalance) => {
        logger.info(closingBalance);
      });
    });
  });
});
