require('../models/db');
const Contract = require('../models/contract');

Contract.findById('5e259f1ba79f7c2551e2dc39', (err, contract) => {
  contract.mechanicalTermsToQuery((err, terms) => {
    console.log(terms);
  });
});
