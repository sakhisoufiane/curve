require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');

async.parallel([
  // Find any works no valid status and that have a clientId of a deleted client
  function (cb) {
    Work.find({ valid: { $exists: false } }, '_id title clientId', (err, works) => {
      console.log(`${works.length} no valid status`);
      async.eachLimit(works, 50, (work, eachCb) => {
        Client.findById(work.clientId, '_id name', (err, client) => {
          if (client) {
            console.log(`${work.title} Client: ${client.name}`);
            eachCb();
          } else {
            console.log(`${work.title} No Client(${work.clientId})`);
            work.deleteOne((err) => {
              if (err) {
                console.log(err);
              }
              eachCb();
            });
          }
        });
      }, cb);
    });
  },
  // Find works that are attached to Label clients
  function (cb) {
    Client.find({ clientType: 'Label' }, '_id name', (err, clients) => {
      async.eachLimit(clients, 50, (client, eachCb) => {
        Work.countDocuments({ clientId: client._id }, (err, count) => {
          if (count) {
            console.log(`Label - ${client.name} Works: ${count}`);
          }
          eachCb();
        });
      }, cb);
    });
  },
  // Find works that are attached to Distributor clients
  function (cb) {
    Client.find({ clientType: 'Distributor' }, '_id name', (err, clients) => {
      async.eachLimit(clients, 50, (client, eachCb) => {
        Work.countDocuments({ clientId: client._id }, (err, count) => {
          if (count) {
            console.log(`Distributor - ${client.name} Works: ${count}`);
          }
          eachCb();
        });
      }, cb);
    });
  },
  // Find works that are attached to NO clients
  function (cb) {
    Client.find({clientType: {$nin: ['Label', 'Publisher', 'Distributor']}}, '_id name', (err, clients) => {
      async.eachLimit(clients, 50, (client, eachCb) => {
        Work.countDocuments({ clientId: client._id }, (err, count) => {
          if (count) {
            console.log(`No clientType - ${client.name} Works: ${count}`);
          }
          eachCb();
        });
      }, cb);
    });
  },
], () => {
  console.log('Complete');
  process.exit(-1);
});

