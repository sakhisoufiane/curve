require('../models/db');
const Track = require('../models/track');
const Contract = require('../models/contract');

Track.findById('5a6a494c24866f7393921777', (err, track) => {
  // track.mechanicalAmount(function(err, amount) {
  // console.log(amount);
  // });
  Contract.findById('5e146f5d7f08d7395fd34caa', (err, contract) => {
    track.contractsForMechanicalCalculation(contract, (err, output) => {
      console.log(output);
    });
  });
});
