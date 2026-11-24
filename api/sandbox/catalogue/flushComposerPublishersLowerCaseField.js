require('dotenv').config();
require('../models/db');
const async = require('async');
const Composer = require('../models/composer');
const Publisher = require('../models/publisher');
const Client = require('../models/client');
const lowerCaseString = require('../libs/lowerCaseString');

const limit = 50;
let offset = 0;
let count = 0;

function runComposer(client, lastId, skip, callback) {
  const filter = { clientId: client._id, lowerCaseName: { $exists: false } };
  if (lastId) {
    filter._id = { $gt: lastId };
  }

  Composer.find(filter).sort({ _id: 1 }).limit(limit).exec((err, composers) => {
    lastId = composers[composers.length -1]?._id
    async.each(composers, (composer, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${composers.length+skip}`);
      const lowerCase = lowerCaseString(composer.name);
      Composer.findByIdAndUpdate(composer._id, { $set: { lowerCaseName: lowerCase } }, { timestamps: false }, cb);
    }, (err) => {
      if (composers?.length === limit) {
        runComposer(client, lastId, skip += 50, callback);
      } else {
        console.log();
        callback();
      }
    });
  });
}

function runPublisher(client, lastId, skip, callback) {
  const filter = { clientId: client._id, lowerCaseName: { $exists: false } };
  if (lastId) {
    filter._id = { $gt: lastId };
  }

  Publisher.find(filter).sort({ _id: 1 }).limit(limit).exec((err, publishers) => {
    lastId = publishers[publishers.length -1]?._id
    async.each(publishers, (publisher, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${publishers.length+skip}`);
      const lowerCase = lowerCaseString(publisher.name);
      Publisher.findByIdAndUpdate(publisher._id, { $set: { lowerCaseName: lowerCase } }, { timestamps: false }, cb);
    }, (err) => {
      if (publishers?.length === limit) {
        runPublisher(client, lastId, skip += 50, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through Publishers & Composers')
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
          console.log('>>>>>> processing Composers <<<<<<');
          offset = 0;
          count = 0;
          runComposer(client, null, offset, cb);
        },
        (cb) => {
          console.log('>>>>>> processing Publishers <<<<<<');
          offset = 0;
          count = 0;
          runPublisher(client, null, offset, cb);
        },
      ], eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});