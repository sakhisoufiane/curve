/*
Description: A script to set feature flag for all Pro users
Time To Run: 00:01:20s (Staging)
Ticket No: CUR-2832
Category: Clients, Publishing
Author: Marco Giuliani
*/
require('../models/db');
const Client = require('../models/client');
const async = require('async');

async.waterfall([
  function(cb) {
    Client.count({ paymentTier: {$ne: 'Lite'} }, (err, count) => {
      const startTime = new Date();
      console.log(`\n\nStart Time: ${startTime}`);
      console.log(`\n\nGet Clients to set fixed reports feature flag`);
      console.log(`${count} non Lite Clients`);
      cb(err)
    })
  },
  function(cb) {
    Client.count({ paymentTier: {$ne: 'Lite'}, 'features.fixedReports': { $exists: false } }, (err, count) => {
      console.log(`${count} non Lite Clients with feature.fixedReports does NOT exist`);
      cb(err)
    })
  },
  function(cb) {
    Client.count({ paymentTier: {$ne: 'Lite'}, 'features.fixedReports': { $exists: true } }, (err, count) => {
      console.log(`${count} non Lite Clients with feature.fixedReports exists`);
      cb(err)
    })
  },
  function(cb) {
    Client.count({ paymentTier: {$ne: 'Lite'}, 'features.fixedReports': true }, (err, count) => {
      console.log(`${count} non Lite Clients with feature already set to true`);
      cb(err)
    })
  },
  function(cb) {
    Client.find({ paymentTier: {$ne: 'Lite'} }, '_id name features', (err, clients) => {
      cb(err, clients)
    })
  },
  function(clients, cb) {
    console.log('----------------------- Setting features.fixedReports ----------------------------');
    let count = 0;
    async.eachSeries(clients, (client, clientCb) => {
      count = count + 1;
      console.log(`${count} Client: ${client.name} features.fixedReports:  ${client.features.fixedReports}`);
      if (process.argv[2] && process.argv[2] === 'true') {
        if (client.features.fixedReports) {
          console.log(`${count} Client: ${client.name} features.fixedReports:  Already True`);
          clientCb();
        } else {
          Client.findByIdAndUpdate(client._id, { $set: { 'features.fixedReports': true } }, (err, res) => {
            if (err) {
              console.log(`Error: ${client.name} ${err}`);
              clientCb();
            } else {
              console.log(`${count} Client: ${client.name} features.fixedReports: Set to true`);
              clientCb();
            }
          });
        }
      } else {  
        clientCb();
      }
    }, cb);
  }
], (err) => {
  if (err) {
    console.log(err);
  }
  console.log('-----------------------EXIT-------------------------');
  const endTime = new Date();
  console.log(`\n\nEnd Time: ${endTime}`);
  process.exit(-1);
});
