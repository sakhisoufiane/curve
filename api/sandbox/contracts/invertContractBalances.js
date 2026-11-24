require('dotenv').config();
require('../models/db');
const async = require('async');
const Contract = require('../models/contract');

const clientId = '60be1f0c9c69c900199b0def'; // '6076f9b07b256100d9601bfd'

Contract.find({ clientId }, (err, contracts) => {
  let count = 0;
  if (err) {
    return console.error(err);
  }
  async.each(contracts, (contract, cb) => {
    count += 1;
    console.log(count, contract._id, contract.name, contract.openingBalance, -contract.openingBalance );

    if (contract.openingBalance && contract.openingBalance != 0) {
      contract.openingBalance = -contract.openingBalance;
    }
    Contract.updateOne({ _id: contract._id }, { $set: { openingBalance: contract.openingBalance } }, { timestamps: false }, cb);

  }, (err) => {
    if (err) {
      console.error(err);
    }
    console.log('Complete');
    process.exit(0);
  });
});
