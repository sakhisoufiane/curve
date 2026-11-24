require('../models/db');
const Contract = require('../models/contract');

Contract.findById('5a7dbe446def2066c5a2f80f', (err, contract) => {
  contract.seperatedSalesTerms((err, salesTerms) => {
    console.log(salesTerms);
  });
});
