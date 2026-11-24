require('dotenv').config();
require('../models/db');
const async = require('async');
const Track = require('../models/track');
const Client = require('../models/client')

const limit = 1000;
let count = 0;

function runTrack(client, lastId, total, callback) {
  const filter = { clientId: client._id, valid: { $ne: true } };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last track in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Tracks and sort by _id - Should we include projection?
  Track.find(filter).sort({ _id: 1 }).limit(limit).exec((err, tracks) => {
    async.eachLimit(tracks, 50, (track, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${tracks.length+total} - ${track._id} - ${track.title}`);
      lastId = track._id;
      // Do the validation of Track and update the valid status and validationErrors array
      track.checkValidationErrors().then(() => {
        Track.findByIdAndUpdate(track._id, { $set: { valid: track.valid, validationErrors: track.validationErrors } }, { timestamps: false }, (err) => {
          cb();
        });
      });
    }, (err) => {
      // should we go get the next 'limit' documents
      if (tracks && tracks.length === limit) {
        runTrack(client, lastId, total + limit, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

async.waterfall([
  (waterfallCb) => {
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Track validations')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing Tracks <<<<<<');
          count = 0;
          runTrack(client, null, 0, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
