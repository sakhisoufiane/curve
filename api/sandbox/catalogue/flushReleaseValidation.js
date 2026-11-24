require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');
const Client = require('../models/client')

const limit = 1000;
let count = 0;

function runRelease(client, lastId, total, save, nowValidArray, callback) {
  const filter = { clientId: client._id, valid: { $ne: true } };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last release in previous batch.
    filter._id = { $gt: lastId };
  } else {
    nowValidArray = [];
  }
  // query all elements from Releases and sort by _id - Should we include projection?
  Release.find(filter).sort({ _id: 1 }).limit(limit).exec((err, releases) => {
    async.eachLimit(releases, 50, (release, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${releases.length+total} - ${release._id} - ${release.title}`);
      lastId = release._id;
      // Do the validation of Release and update the valid status and validationErrors array
      release.checkValidationErrors(() => {
        if (release.valid === true) {
          nowValidArray.push(`${release._id} - ${release.title} - now valid`);
        };
        if (save && save === 'true') {
          Release.findByIdAndUpdate(release._id, { $set: { valid: release.valid, validationErrors: release.validationErrors } }, { timestamps: false }, (err) => {
            cb();
          });
        } else {
          cb();
        }
      });
    }, (err) => {
      // should we go get the next 'limit' documents
      if (releases && releases.length === limit) {
        runRelease(client, lastId, total + limit, save, nowValidArray, callback);
      } else {
        console.log();
        if (nowValidArray?.length > 0) {
          console.log(nowValidArray);
        }
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
      waterfallCb('Please provide a client id, or use --all to flush through All Release validations')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing Releases <<<<<<');
          count = 0;
          runRelease(client, null, 0, save, null, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
