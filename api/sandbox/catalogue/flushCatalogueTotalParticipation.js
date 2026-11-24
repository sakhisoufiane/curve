require('dotenv').config();
require('../models/db');
const async = require('async');
const Track = require('../models/track');
const Release = require('../models/release');
const Work = require('../models/work');
const Client = require('../models/client');

const limit = 1000;
let offset = 0;
let count = 0;

function runTrack(client, skip, callback) {
  Track.find({ clientId: client._id }, { title: 1, salesReturnsRights: 1 }).limit(limit).skip(skip).exec((err, tracks) => {
    async.eachLimit(tracks, 50, (track, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${tracks.length+skip}`);
      track.calculateTotalParticipation();
      // console.log(track.title, track.totalParticipation);
      Track.findByIdAndUpdate(track._id, { $set: { totalParticipation: track.totalParticipation } }, { timestamps: false }, cb);
    }, (err) => {
      if (tracks && tracks.length === limit) {
        runTrack(client, skip += 1000, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

function runRelease(client, skip, callback) {
  Release.find({ clientId: client._id }, { title: 1, salesReturnsRights: 1 }).limit(limit).skip(skip).exec((err, releases) => {
    async.eachLimit(releases, 50, (release, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${releases.length+skip}`);
      release.calculateTotalParticipation();
      // console.log(release.title, release.totalParticipation);
      Release.findByIdAndUpdate(release._id, { $set: { totalParticipation: release.totalParticipation } }, { timestamps: false }, cb);
    }, (err) => {
      if (releases && releases.length === limit) {
        runRelease(client, skip += 1000, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

function runWork(client, skip, callback) {
  Work.find({ clientId: client._id }, { title: 1, salesReturnsRights: 1 }).limit(limit).skip(skip).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+skip}`);
      work.calculateTotalParticipation();
      // console.log(work.title, work.totalParticipation);
      Work.findByIdAndUpdate(work._id, { $set: { totalParticipation: work.totalParticipation } }, { timestamps: false }, cb);
    }, (err) => {
      if (works && works.length === limit) {
        runWork(client, skip += 1000, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through ALl works')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        // (cb) => {
        //   console.log('>>>>>> processing Tracks <<<<<<');
        //   offset = 0;
        //   count = 0;
        //   runTrack(client, offset, cb);
        // },
        // (cb) => {
        //   console.log('>>>>>> processing Releases <<<<<<');
        //   offset = 0;
        //   count = 0;
        //   runRelease(client, offset, cb);
        // },
        (cb) => {
          console.log('>>>>>> processing Works <<<<<<');
          offset = 0;
          count = 0;
          runWork(client, offset, cb);
        },
      ], eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
