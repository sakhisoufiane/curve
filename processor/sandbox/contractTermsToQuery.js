require('../models/db');
const Contract = require('../models/contract');

Contract.findById('5d7a60891d107658b15ff0d5', (err, contract) => {
  contract.mechanicalTermsToQuery((err, obj) => {
    console.log(obj);
  });
});
