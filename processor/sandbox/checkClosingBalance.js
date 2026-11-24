require('../models/db');
const Contract = require('../models/contract');
const Statement = require('../models/statement');

Statement.findById('60771ed4dbf9eb3556381e3d', (err, statement) => {
  Contract.findById('5e6a18cd41e8f67adf7f9150', (err, contract) => {
    contract.balanceAtDate(statement.date, {}, (err, closingBalance) => {
      console.log(closingBalance);
      console.log(contract.autoPayment && closingBalance - statement.withholdingTax >= contract.minPayout);
    });
  });
});
