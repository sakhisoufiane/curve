require('../models/db');
const Contract = require('../models/contract');

Contract.findById('59da571c96a95e61da9ee6e2', (err, contract) => {
  contract.statementDesignData((err, data) => {
    console.log(data);
  });
});
