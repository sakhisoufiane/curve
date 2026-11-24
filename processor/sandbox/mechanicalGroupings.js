require('../models/db');
const Period = require('../models/period');
const Client = require('../models/client');
const Contract = require('../models/contract');

Period.findById('627a530bb56f4f001fc1acd3', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    const contractFilter = { clientId: period.clientId, active: true, accountingPeriod: period.accountingPeriodType };
    contractFilter.contractType = period.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
    Contract.find(contractFilter, (err, contracts) => {
      period.groupMechanicalContracts(contracts, (err, result) => {
      console.log(result);
      });
    });
  });
});
