require('../models/db');
const { MongoClient } = require('mongodb');
const Contract = require('../models/contract');

Contract.findById('5e14eb085da6e72833b1d645', (err, contract) => {
  contract.contractTermsForCalculation(100, (err, data) => {
    console.log(data.terms.sales);
    process.exit(-1);
  });
});
