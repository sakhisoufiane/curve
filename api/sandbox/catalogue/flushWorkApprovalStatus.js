require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
let count = 0;

// Could change this for an updateMany if we dont want a report?
function runWork(client, lastId, total, save, callback) {
  const filter = { clientId: client._id, approvalStatus: { $exists: false } };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id - Should we include projection?
  Work.find(filter).select({ _id: 1, title: 1, valid: 1, approvedDate: 1 }).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 100, (work, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${works.length+total} - ${work._id} - ${work.title} - ${work.valid && !work.approvedDate ? 'Approved' : 'Invalid'}`);
      lastId = work._id;
      // Do the validation of Work and update the valid status and validationErrors array
      if (work.valid && !work.approvedDate) {
        work.approvedDate = Date.now();
        work.approvalStatus = 'Approved';
      }
      // set invalid
      if (!work.valid) {
        work.approvalStatus = 'Invalid';
      }
      if (save && save === 'true') {
        Work.findOneAndUpdate({ _id: work._id }, { $set: { approvalStatus: work.approvalStatus, approvedDate: work.approvedDate } }, { timestamps: false }, (err) => {
          cb();
        });
      } else {
        cb();
      }
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
      } else {
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
      waterfallCb('Please provide a client id, or use --all to flush through All Work validations')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    let clientsCount = 0;
    async.eachLimit(clients, 10, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          count = 0;
          runWork(client, null, 0, save, cb);
        },
      ], (err) => {
        clientsCount += 1;
        process.stdout.write(`\rProcessed client ${clientsCount}/${clients.length}`);
        eachCb(err);
      });

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
  } else { 
    console.log('Complete');
  }
  process.exit(-1);
});
