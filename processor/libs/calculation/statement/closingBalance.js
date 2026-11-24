const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Contract = require('../../../models/contract');

const balanceAtDate = require('../contract/balanceAtDate');

const ClosingBalance = (statement, period, callback) => {
  if (statement.contractType !== 'Profit Share' && statement.contractType !== 'Profit Share - Flexible') {
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (contract) {
          const endDate = new Date(period.endDate);
          endDate.setDate(endDate.getDate() + 1);
          balanceAtDate(contract, endDate, (err, closingBalance) => {
            statement.closingBalance = closingBalance;
            statement.save()
              .then((statement) => {
                callback(null, statement);
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          });
        } else { callback(); }
      })
      .catch((err) => {
        logger.error(err);
        callback();
      });
  } else {
    callback();
  }
};

module.exports = ClosingBalance;
