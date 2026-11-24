require('../models/db');
const Release = require('../models/release');
const Client = require('../models/client');
const Track = require('../models/track');
const Contract = require('../models/contract');
const { eachLimit } = require('async');

Client.findById('5e88578f66c0bd3616238c3f', (err, client) => {
  Release.find({ clientId: client._id.toString() }, (err, releases) => {
    eachLimit(releases, 5, (release, cb) => {
      release.mechanicalAmount(client, new Date(), (err, amount) => {
        console.log(`${release._id}|${amount.US}`);
        cb();
      });
    });
  });
});



// Track.findById("5bfecbd933c2e561d464ab57", function(err, track){
// track.mechanicalAmount(function(err, amount) {
// console.log(amount);
// });
// });

// Contract.findById('5bbb9c4c0beffc58da7e21ca', (err, contract) => {
//   contract.getReleasesByProRataAmount(['5c091a7adfc2dc7e4ff2a772'], 0, 5, (err, batches, mechanicalAmounts) => {
//     console.log(mechanicalAmounts);
//   });
// });
