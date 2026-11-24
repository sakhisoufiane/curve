require('../models/db');
const Track = require('../models/track');
const Release = require('../models/release');
const Contract = require('../models/contract');

Track.findById('5ed1009eff18397592a4767a', (err, track) => {
  track.mechanicalAmount((err, amount) => {
    console.log(amount);
  });
});

// Contract.findById("5e25ca64520f0c2b6fd9060c", function(err, contract) {
// Release.findById("5b7436fb3daac522f5be82e0", function(err, release) {
// release.contractsForMechanicalCalculation(contract, function(err, data) {
/// /console.log(data);
// process.exit(-1);
// })
// });
// });

// Release.findById("59da524796a95e61da9ee6d1", function(err, release) {
// release.mechanicalAmount(function(err, amount) {
// console.log(amount);
// process.exit(-1);
// });
// });
