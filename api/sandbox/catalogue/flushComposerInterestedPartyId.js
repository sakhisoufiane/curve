require('dotenv').config();
require('../../models/db');
const async = require('async');
const Client = require('../../models/client');
const Composer = require('../../models/composer');
const ComposerController = require('../../controllers/composer');

const limit = 1000;
let count = 0;

function runComposer(client, lastId, total, save, callback) {
  const filter = { clientId: client._id };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from composer and sort by _id - Should we include projection?
  Composer.find(filter).sort({ _id: 1 }).limit(limit).exec((err, composers) => {
    async.eachLimit(composers, 100, (composer, cb) => {
      count += 1;
      lastId = composer._id;
      // Do the issueInterestedPartyId of composer and update the interestedPartyId
      ComposerController.issueInterestedPartyId({ composer }).then(() => {
        if (save && save === 'true' && composer?.interestedPartyId) {
          Composer.findByIdAndUpdate(composer._id, { $set: { interestedPartyId: composer.interestedPartyId } }, { timestamps: false }, (err) => {
            console.log(`Saved ${composer.name}(${composer._id}) - interestedPartyId = ${composer.interestedPartyId}`);
            cb();
          });
        } else {
          console.log(`${composer.name}(${composer._id}) - interestedPartyId = ${composer.interestedPartyId}`);
          cb();
        }
      }).catch(cb);
    }, (err) => {
      // should we go get the next 'limit' documents
      if (composers && composers.length === limit) {
        runComposer(client, lastId, total + limit, save, callback);
      } else {
        callback();
      }
    });
  });
}

async.waterfall([
  (waterfallCb) => {
    const startTime = new Date();
    console.log(`------ Start: ${startTime} ------`); 
    if (process.argv[2]) {
      if (process.argv[2] === '--all') {
        console.log('------ processing ALL clients ------');
        const filter = {};
        waterfallCb(null, filter);
      } else {
        waterfallCb(null, { _id: process.argv[2] });
      }
    } else {
      waterfallCb('Please provide a client id, or use --all to flush through All Composer interestedPartyId')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    let clientsCount = 0;
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          count = 0;
          runComposer(client, null, 0, save, cb);
        },
      ], (err) => {
        clientsCount += 1;
        console.log(`Processed client ${client.name} ${clientsCount}/${clients.length}`);
        eachCb(err);
      });

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
  } else { 
    console.log('-----done----');
   }
  const endTime = new Date();
  console.log(`------ End: ${endTime} ------`); 
  process.exit(-1);
});
