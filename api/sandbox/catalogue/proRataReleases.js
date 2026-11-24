require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');
const Track = require('../models/track');

const clientId = '5cf62997a3d3de7c623b1261';
Release.find({ clientId }).skip(3000).exec((err, releases) => {
  console.log('Found Releases:', releases.length);
  let count = 0;
  async.eachSeries(releases, (release, cb) => {
    count += 1;
    console.log(count);
    console.log(release.catNo);
    release.proRataTrackContracts((err, output) => {
      release.salesReturnsRights = output;
      release.proRataTrackCostContracts((err, costOutput) => {
        release.costsRights = costOutput;
        release.save((err) => {
          if (err) {
            console.log(err);
          } else {
            cb();
          }
        });
      });
    });
  }, (err) => {
    console.log('Complete');
    if (err) { console.log(err); }
    process.exit(-1);
  });
});
