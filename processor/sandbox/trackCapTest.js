require('../models/db');
const Release = require('../models/release');
const Contract = require('../models/contract');

Release.findById('5a738ed70a860c6353b97345', (err, release) => {
  // release.mechanicalAmount(function(err, amount) {
  // console.log(amount);
  // })
  Contract.findById('5e1369b1880d157085f476e2', (err, contract) => {
    release.contractsForMechanicalCalculation(contract, (err, output) => {
      console.log(output);
    });
  });
});
