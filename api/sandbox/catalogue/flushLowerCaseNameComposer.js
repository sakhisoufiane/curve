require('dotenv').config();
require('../models/db');
const async = require('async');
const Composer = require('../models/composer');
const Client = require('../models/client');
const lowerCaseString = require('../libs/lowerCaseString');

const limit = 1000;
let count = 0;
let save = 'false';

function runComposer(client, lastId, total, save, callback) {
  // Filter is where filterType does not exist (old format)
  const filter = { clientId: client._id } ;
  if (lastId) {
    // if processing another batch, ensure you start after the last _id in previous batch.
    filter._id = { $gt: lastId };
  }
  // query elements from cwrDelivery and sort by _id - Should we include projection?
  Composer.find(filter).select(' _id lowerCaseName name').sort({ _id: 1 }).limit(limit).exec((err, composers) => {
    async.eachLimit(composers, 100, (composer, cb) => {
      lastId = composer._id;
      let toUpdate = false;
      if (composer?.name && composer.lowerCaseName !== lowerCaseString(composer.name)) {
        composer.lowerCaseName = lowerCaseString(composer.name);
        toUpdate = true;
        console.log(`${composer.name}(${composer._id}) lowerCaseName set to ${composer.lowerCaseName}`);
      } else {
        console.log(`${composer.name}(${composer._id}) not updated lowerCaseName is ${composer.lowerCaseName}`);
      }
      if (save && save === 'true' && toUpdate) {
        Composer.findByIdAndUpdate(composer._id, { $set: { lowerCaseName: composer.lowerCaseName } }, { timestamps: false }, (err) => {
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
      if (composers && composers.length === limit) {
        runComposer(client, lastId, total + limit, save, callback);
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
      waterfallCb('Please provide a client id, or use --all to lowerCaseName All Client composers')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 20, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing cwrAcknowledgements <<<<<<');
          count = 0;
          runComposer(client, null, 0, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
