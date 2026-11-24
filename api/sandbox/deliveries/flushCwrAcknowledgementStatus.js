require('dotenv').config();
require('../models/db');
const async = require('async');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let save = 'false';

function runCwrAcknowledgement(client, lastId, total, save, callback) {
  // Filter is where filterType does not exist (old format)
  const filter = { clientId: client._id, updatedAt: { $lt: new Date('2023-08-07') } } ;
  if (lastId) {
    // if processing another batch, ensure you start after the last _id in previous batch.
    filter._id = { $gt: lastId };
  }
  // query elements from cwrDelivery and sort by _id - Should we include projection?
  CwrAcknowledgement.find(filter).sort({ _id: 1 }).limit(limit).exec((err, cwrAcknowledgements) => {
    async.eachLimit(cwrAcknowledgements, 100, (cwrAcknowledgement, cb) => {
      lastId = cwrAcknowledgement._id;
      if (cwrAcknowledgement?.workIds?.length) {
        const oldStatus = cwrAcknowledgement.status ? cwrAcknowledgement.status : 'None';
        cwrAcknowledgement.status = 'Complete';
        console.log(`${cwrAcknowledgement.name}(${cwrAcknowledgement._id}) Status set to 'Complete' from ${oldStatus}`);
      } else {
        console.log(`${cwrAcknowledgement.name}(${cwrAcknowledgement._id}) Status not updated`);
      }
      if (save && save === 'true') {
        CwrAcknowledgement.findByIdAndUpdate(cwrAcknowledgement._id, { $set: { status: cwrAcknowledgement.status } }, { timestamps: false }, (err) => {
          if (err) {
            console.log(err);
          }
          cb();
        });
      } else {
        cb();
      }  
    }, (err) => {
      // should we go get the next 'limit' documents
      if (cwrAcknowledgements && cwrAcknowledgements.length === limit) {
        runCwrAcknowledgement(client, lastId, total + limit, save, callback);
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
      waterfallCb('Please provide a client id, or use --all to move All cwrAcknowledgements')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 5, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing cwrAcknowledgements <<<<<<');
          count = 0;
          runCwrAcknowledgement(client, null, 0, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});

function isFilterEmpty(obj) {
  // Check if 'filter' property exists in the object
  if ('filter' in obj && typeof obj.filter === 'object' && !Array.isArray(obj.filter)) {
    // Check if 'filter' object is empty (has no own properties)
    return Object.keys(obj.filter).length === 0;
  }

  return true; // If 'filter' does not exist or is not an object, consider it as empty
}
