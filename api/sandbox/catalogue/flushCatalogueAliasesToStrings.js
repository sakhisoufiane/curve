require('dotenv').config();
require('../models/db');
const async = require('async');
const Track = require('../models/track');
const Release = require('../models/release');
const Work = require('../models/work');
const Client = require('../models/client');

const limit = 1000;
let count = 0;

function runWork(client, lastId, total, callback) {
  const filter = { clientId: client._id, $or: [{aliases: { $type: ['int', 'double'] }}, { 'societyIdentifiers.identifier': { $type: ['int', 'double'] } }]};
  const projection = { aliases: 1, societyIdentifiers: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Work.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+total} - ${work._id}`);
      lastId = work._id;
      Work.findByIdAndUpdate(work._id, { $set: { aliases: work.aliases, societyIdentifiers: work.societyIdentifiers } }, { timestamps: false }, cb);
    }, (err) => {
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

function runTrack(client, lastId, total, callback) {
  const filter = { clientId: client._id, aliases: { $type: ['int', 'double'] } };
  const projection = { aliases: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Track.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, tracks) => {
    async.eachLimit(tracks, 50, (track, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${tracks.length+total} - ${track._id}`);
      lastId = track._id;
      Track.findByIdAndUpdate(track._id, { $set: { aliases: track.aliases } }, { timestamps: false }, cb);
    }, (err) => {
      if (tracks && tracks.length === limit) {
        runTrack(client, lastId, total + limit, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

function runRelease(client, lastId, total, callback) {
  const filter = { clientId: client._id, aliases: { $type: ['int', 'double'] } };
  const projection = { aliases: 1 };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Release.find(filter, projection).sort({ _id: 1 }).limit(limit).exec((err, releases) => {
    async.eachLimit(releases, 50, (release, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${releases.length+total} - ${release._id}`);
      lastId = release._id;
      Release.findByIdAndUpdate(release._id, { $set: { aliases: release.aliases } }, { timestamps: false }, cb);
    }, (err) => {
      if (releases && releases.length === limit) {
        runRelease(client, lastId, total + limit, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through ALl clients')
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
          console.log('>>>>>> processing Works <<<<<<');
          count = 0;
          runWork(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Tracks <<<<<<');
          count = 0;
          runTrack(client, null, 0, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Releases <<<<<<');
          count = 0;
          runRelease(client, null, 0, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
