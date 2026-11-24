require('dotenv').config();
require('../../models/db');
const async = require('async');
const Client = require('../../models/client');
const Publisher = require('../../models/publisher');
const PublisherController = require('../../controllers/publisher');

const limit = 1000;
let count = 0;

function runPublisher(client, lastId, total, save, callback) {
  const filter = { clientId: client._id };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Publisher and sort by _id - Should we include projection?
  Publisher.find(filter).sort({ _id: 1 }).limit(limit).exec((err, publishers) => {
    async.eachLimit(publishers, 100, (publisher, cb) => {
      count += 1;
      lastId = publisher._id;
      // Do the issueInterestedPartyId of Publisher and update the interestedPartyId
      PublisherController.issueInterestedPartyId({ publisher }).then(() => {
        if (save && save === 'true' && publisher?.interestedPartyId) {
          Publisher.findByIdAndUpdate(publisher._id, { $set: { interestedPartyId: publisher.interestedPartyId } }, { timestamps: false }, (err) => {
            console.log(`Saved ${publisher.name}(${publisher._id}) - interestedPartyId = ${publisher.interestedPartyId}`);
            cb();
          });
        } else {
          console.log(`${publisher.name}(${publisher._id}) - interestedPartyId = ${publisher.interestedPartyId}`);
          cb();
        }
      }).catch(cb);
    }, (err) => {
      // should we go get the next 'limit' documents
      if (publishers && publishers.length === limit) {
        runPublisher(client, lastId, total + limit, save, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through All Publisher interestedPartyId')
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
          runPublisher(client, null, 0, save, cb);
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
