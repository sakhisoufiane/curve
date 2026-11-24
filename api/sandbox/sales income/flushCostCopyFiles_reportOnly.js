require('dotenv').config();
require('../models/db');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Cost = require('../models/cost');
const Client = require('../models/client');

const limit = 1000;
let count = 0;
let allContainsInvaidFiles = [];

function runCost(client, lastId, total, save, containsInvaidFiles, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    // if processing another batch, ensure you start after the last release in previous batch.
    filter._id = { $gt: lastId };
  } else {
    containsInvaidFiles = [];
  }
  // query all elements from Costs and sort by _id - Should we include projection?
  Cost.find(filter).sort({ _id: 1 }).limit(limit).exec((err, costs) => {
    async.eachLimit(costs, 50, (cost, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${costs.length+total} - ${cost._id} - ${cost.name}`);
      lastId = cost._id;
      // Do the RegEx check of files for the ObjectId to see if its a valid cost file
      if (cost?.files?.length > 0) {
        const pattern = new RegExp(`/${cost._id}/`);
        const filteredFiles = cost.files.filter(file => !pattern.test(file.key));
        if (filteredFiles.length > 0) {
          // this cost is invalid
          let uniqueKeys = filteredFiles.reduce((acc, current) => {
            let clientId = current.key.match(/\/(.*?)\//)[1]
            if (acc.indexOf(clientId) === -1) {
              acc.push(clientId);
            }
            return acc;
          }, []);
          let originalCostName = '';
          async.each(uniqueKeys, (uniqueKey, uniqueKeyCb) => {
            Cost.findById(uniqueKey, (err, originalCost) => {
              if (originalCost?.name) {
                originalCostName = `${originalCostName} ${originalCost.name}`;
              } else {
                originalCostName = `${originalCostName} Not Found`;
              }
              uniqueKeyCb();
            });
          }, (err) => {
            if (err) { console.log(err) };
            containsInvaidFiles.push({ client: client.name, id: cost._id, costName: cost.name, original: originalCostName });
            if (save && save === 'true') {
              // need to decide what we are doing here
              cb();
            } else {
              cb();
            }
          });
        } else {
          cb();
        }
      } else {
        cb();
      }
    }, (err) => {
      if (err) { console.log(err) };
      // should we go get the next 'limit' documents
      if (costs && costs.length === limit) {
        runCost(client, lastId, total + limit, save, containsInvaidFiles, callback);
      } else {
        if (containsInvaidFiles?.length > 0) {
          const combinedArray = allContainsInvaidFiles.concat(containsInvaidFiles);
          allContainsInvaidFiles = combinedArray;
        }
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
      waterfallCb('Please provide a client id, or use --all to flush through All copied Costs')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachLimit(clients, 5, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing copied Cost <<<<<<');
          count = 0;
          runCost(client, null, 0, save, null, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
    process.exit(-1);
  } else {
    const outputLocation = `${appRootDir}/tmp/flushCostCopyFiles.csv`;
    const writer = new WriteCsv({ headers: ['client', 'id', 'cost', 'original'], outputLocation });
    const outputData = allContainsInvaidFiles.map((line) => [line.client, line.id, line.costName, line.original]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});
