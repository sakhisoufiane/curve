require('../models/db');
const Release = require('../models/release');
const Client = require('../models/client');
const Track = require('../models/track');
const Contract = require('../models/contract');

Release.findById("6237d8338e8493002531df0c", (err, release) => {
  Client.findById(release.clientId, (err, client) => {
    release.mechanicalAmount(client, new Date(), (err, amount) => {
      console.log(amount);
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
