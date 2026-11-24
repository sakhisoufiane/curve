require('dotenv').config();
require('../../models/db');
const { ObjectId } = require('mongodb');
const async = require('async');
const Track = require('../../models/track');

const trackIds = [];
let count = 0;
Track.find({ clientId: "5eb2af3b4c4783034bd3f9a2" }, (err, tracks) => {
  async.eachLimit(tracks, 5, (track, cb) => {
    count += 1;
    console.log(count, '/', tracks.length);
    track.save((err) => {
      if(err) {
        trackIds.push(track._id.toString());
      }
      cb();
    })
  }, (err) => {
    console.log("Complete");
    console.log(trackIds);
  });
});