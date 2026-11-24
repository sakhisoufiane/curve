require('dotenv').config();
require('../models/db');
const async = require('async');
const Contract = require('../models/contract');

const clientId = '5e14dcf8b13d8904cfd5eeaf';

Contract.find({}, 'name', (err, contracts) => {
  let count = 0;
  async.eachLimit(contracts, 50, (contract, cb) => {
    count += 1;
    console.log(`${count}/${contracts.length}`);
    contract.setPartitionNo();
    Contract.findByIdAndUpdate(contract._id, { $set: { partitionNo: contract.partitionNo } }, cb);
  }, () => {
    console.log('Complete');
  });
});
