require('../models/db');
const Contract = require('../models/contract');
const Period = require('../models/period');

Period.findById('5daf3ba51ded187c5b870a32', (err, period) => {
  Contract.findById('5d8b7b9d080e2c6df181e0ed', (err, contract) => {
    contract.contractTermsForCalculation(100, (err, data) => {
      console.log(data.sales);
    });
  });
});
