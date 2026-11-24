require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');
const Client = require('../models/client');

const limit = 50000;
let offset = 0;
let count = 0;

function runRelease(client, skip, callback) {
  Release.find({ clientId: client._id, mechanicalLicenses: { $exists: true } }, { title: 1, mechanicalLicenses: 1 }).limit(limit).skip(skip).exec((err, releases) => {
    async.eachLimit(releases, 50, (release, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${releases.length+skip}`);
      release.setMechanicalIds();
      // console.log(release.title, release.mechanicalComposerIds, release.mechanicalPublisherIds, release.mechanicalContractIds);
      Release.findByIdAndUpdate(release._id, { $set: { mechanicalComposerIds: release.mechanicalComposerIds, mechanicalPublisherIds: release.mechanicalPublisherIds, mechanicalContractIds: release.mechanicalContractIds } }, { timestamps: false }, cb);
    }, (err) => {
      if (releases && releases.length === limit) {
        runRelease(client, skip += 50000, callback);
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
      offset = 0;
      count = 0;
      runRelease(client, offset, eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
