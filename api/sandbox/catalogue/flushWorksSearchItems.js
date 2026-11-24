require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');

const limit = 50000;
let offset = 0;
let count = 0;

function runWork(client, skip, callback) {
  Work.find({ clientId: client._id }, { title :1, composer: 1, identifier: 1, iswc: 1, tunecode: 1, aliases: 1, societyIdentifiers: 1 }).limit(limit).skip(skip).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+skip}`);
      work.setSearchItems();
      Work.findByIdAndUpdate(work._id, { $set: { searchItems: work.searchItems } }, { timestamps: false }, cb);
    }, (err) => {
      if (works && works.length === limit) {
        runWork(client, skip += 50000, callback);
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
      offset = 0;
      count = 0;
      runWork(client, offset, eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
