require('../models/db');
const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');

Contract.findById('62543a62e920d100242a153d', (err, contract) => {
  contract.mechanicalTermsToQuery((err, mechanicalQueries) => {
    console.log(mechanicalQueries);
  });
});