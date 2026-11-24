require('dotenv').config();
require('../models/db');
const async = require('async');
const Track = require('../models/track');
const Release = require('../models/release');

const clientId = '5e14dcf8b13d8904cfd5eeaf';

async.waterfall([
  function (cb) {
    let count = 0;
    Track.find({ clientId }, (err, tracks) => {
      console.log('Total:', tracks.length);
      async.eachSeries(tracks, (track, trackCb) => {
        count += 1;
        console.log('No:', count);
        track.save((err) => {
          if (err) {
            console.log(err);
          }
          trackCb();
        });
      }, cb);
    });
  },
  function (cb) {
    let releaseCount = 0;
    Release.find({ clientId }, (err, releases) => {
      console.log('Total:', releases.length);
      async.eachSeries(releases, (release, releaseCb) => {
        releaseCount += 1;
        console.log('No:', releaseCount);
        release.save((err) => {
          if (err) {
            console.log(err);
          }
          releaseCb();
        });
      }, cb);
    });
  },
], (err) => {
  console.log('Complete');
});
