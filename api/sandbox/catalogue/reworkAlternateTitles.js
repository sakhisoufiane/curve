require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
let count = 0;

function runWork(client, lastId, total, saveBoolean, callback) {
  const filter = { clientId: client._id, alternateTitles: { $exists: true, $ne: [] } };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id - Should we include projection?
  Work.find(filter).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      lastId = work._id;
      if (Array.isArray(work.alternateTitles) && work.alternateTitles.some(element => typeof element === 'string')) {
        console.log(`\r${count}/${works.length+total} - ${work._id} - ${work.title}`);
        work.alternateTitles = work.alternateTitles.map(title => {
          if (typeof title === 'string') {
            return { title: title, language: '' };
          } else {
            return title;
          }
        });
        if (saveBoolean && saveBoolean === 'true') {
          Work.findByIdAndUpdate(work._id, { $set: { alternateTitles: work.alternateTitles } }, { timestamps: false }, (err) => {
            cb();
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, saveBoolean, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

const save = (process.argv[3]) ? process.argv[3] : 'false';
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
      waterfallCb('Please provide a client id, or use --all to rework All Work alternative titles')
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
          runWork(client, null, 0, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
