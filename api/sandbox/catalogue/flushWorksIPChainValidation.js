require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');

const limit = 1000;
let count = 0;

function runWork(client, lastId, total, callback) {
  const filter = { clientId: client._id, valid: { $ne: true } };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Work.find(filter).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+total} - ${work._id}`);
      work.checkValidationErrors(() => {
        lastId = work._id;
        if (work.valid) {
          console.log(` turned valid`);
          Work.findByIdAndUpdate(work._id, { $set: { valid: work.valid, validationErrors: work.validationErrors } }, { timestamps: false }, cb);
        } else {
          cb();
        }
      });
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
      count = 0;
      runWork(client, null, 0, eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
