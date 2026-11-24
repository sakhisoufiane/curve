require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');
const Track = require('../models/track');

Release.find({ clientId: '5e88578f66c0bd3616238c3f', distributionChannel: 'Digital' }, (err, releases) => {
  let count = 0;
  async.eachSeries(releases, (release, cb) => {
    count += 1;
    console.log(count, '/', releases.length, '-', release.catNo);
    async.eachSeries(release.trackIds, (trackId, trackIdCb) => {
      Track.findById(trackId, (err, track) => {
        track.salesReturnsRights = release.salesReturnsRights;
        track.costsRights = release.costsRights;
        track.save((err) => {
          if (err) {
            console.log(err);
          }
          trackIdCb();
        });
      });
    }, cb);
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
