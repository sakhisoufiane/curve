require('dotenv').config();
require('../models/db');
const async = require('async');
const { ObjectId } = require('mongodb');
const Work = require('../models/work');
const Client = require('../models/client');
const DeliveredWork = require('../models/deliveredWork');
const CwrDelivery = require('../models/cwrDelivery');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');

async.parallel([
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
  // count works with deliveries
  function (cb) {
    Work.countDocuments({deliveries: { $exists: true }}, (err, count) => {
      if (count) {
        console.log(`Works with deliveries: ${count}`);
      }
      cb();
    });
  },
  // count works with non empty deliveries
  function (cb) {
    Work.countDocuments({deliveries: { $type: 3 }}, (err, count) => {
      if (count) {
        console.log(`Works with non empty deliveries: ${count}`);
      }
      cb();
    });
  },
  // count ALL works
  function (cb) {
    Work.countDocuments({}, (err, count) => {
      if (count) {
        console.log(`Works: ${count}`);
      }
      cb();
    });
  },
  // count ALL DeliveredWork entries
  function (cb) {
    DeliveredWork.countDocuments({}, (err, count) => {
      if (count) {
        console.log(`DeliveredWorks: ${count}`);
      }
      cb();
    });
  },
  // Check how many deliveredWorks entries there should be. If key in deliveries references a cwrDelivery OR cwrAcknowledgement create a deliveredWork entry.
  // function (cb) {
  //   Work.find({deliveries: { $exists: true }}, '_id deliveries', (err, works) => {
  //     let totalCount = 0;
  //     let totalDWCount = 0;
  //     async.eachLimit(works, 50, (work, eachCb) => {
  //       const keysCount = Object.keys(work.deliveries).length;
  //       async.eachLimit(Object.keys(work.deliveries), 10, (deliveryId, eachCb2) => {
  //         async.parallel([
  //           function (paraCb) {
  //             CwrDelivery.findById(ObjectId(deliveryId), '_id', (err, cwrDelivery) => {
  //               if (cwrDelivery) {
  //                 totalDWCount += 1;
  //               }
  //               paraCb();
  //             });
  //           },
  //           function (paraCb) {
  //             CwrAcknowledgement.findById(deliveryId, '_id', (err, cwrAcknowledgement) => {
  //               if (cwrAcknowledgement) {
  //                 totalDWCount += 1;
  //               }
  //               paraCb();
  //             });
  //           },
  //         ], eachCb2);
  //       }, () => {
  //         totalCount += keysCount;
  //         eachCb();
  //       });
  //     }, () => {
  //       console.log('Total count of all deliveries expected:', totalCount);
  //       console.log('cwrDelivery or cwrAcknowledgement exists(should match delivered works):', totalDWCount);
  //       cb();
  //     });
  //   });
  // },
  // count ALL Archived cwrDeliveries
  function (cb) {
    CwrDelivery.countDocuments({name: /(Archived)/}, (err, count) => {
      if (count) {
        console.log(`Archived cwrDeliveries: ${count}`);
      }
      cb();
    });
  },
], () => {
  console.log('Complete');
  process.exit(-1);
});

