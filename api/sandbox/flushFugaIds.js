require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const Track = require('../models/track');
const Release = require('../models/release');

Release.find({ clientId: '657892a97467fc6239653cf1'}, (err, tracks) => {
  let count = 0;
  eachLimit(tracks, 5, (track, cb) => {
    count += 1;
    console.log(count);
    // Copy externalIngestionId into fugaId
    track.fugaId = track.externalIngestionId;
    Track.findByIdAndUpdate(track._id, { $set: { fugaId: track.externalIngestionId } }, (err) => {
      if (err) {
        console.log(err);
      }
      cb();
    });
  }, () => {
    console.log('Done');
  });
});
