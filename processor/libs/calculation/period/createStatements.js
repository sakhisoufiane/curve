const createStatementsLib = require('../../createStatements');

const CreateStatements = {
  create: (period, db, client, callback) => {
    if (period.contractType !== 'MCPS') {
      const object = {
        db,
        clientId: period.clientId,
        recalculation: period.recalculation,
        periodId: period._id.toString(),
        year: period.year,
        accountingPeriod: period.accountingPeriod,
        accountingPeriodType: period.accountingPeriodType,
        contractType: period.contractType,
        periodType: period.contractType,
        date: period.endDate,
      };
      createStatementsLib(object, callback);
    } else {
      callback();
    }
  },
};

module.exports = CreateStatements;
