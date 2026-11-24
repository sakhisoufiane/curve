require('dotenv').config();
require('../models/db');
const async = require('async');
const Contract = require('../models/contract');
const Client = require('../models/client')

const limit = 1000;
let count = 0;

function runContract(client, lastId, total, callback) {
  const filter = { clientId: client._id, valid: { $ne: true } };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last contract in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Contracts and sort by _id - Should we include projection?
  Contract.find(filter).sort({ _id: 1 }).limit(limit).exec((err, contracts) => {
    async.eachLimit(contracts, 50, (contract, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${contracts.length+total} - ${contract._id} - ${contract.name}`);
      lastId = contract._id;
      // Do the validation of Track and update the valid status and validationErrors array
      contract.checkValidationErrors().then(() => {
        Contract.findByIdAndUpdate(contract._id, { $set: { valid: contract.valid, validationErrors: contract.validationErrors } }, { timestamps: false }, (err) => {
          cb();
        });
      });
    }, (err) => {
      // should we go get the next 'limit' documents
      if (contracts && contracts.length === limit) {
        runContract(client, lastId, total + limit, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through All Contract validations')
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
          console.log('>>>>>> processing Contracts <<<<<<');
          count = 0;
          runContract(client, null, 0, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
