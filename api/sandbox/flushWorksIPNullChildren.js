/*
Description: A script the find null ip chain elements
Start Time: 
End Time: 
Time To Run On Staging: 
Ticket No: SUP-1001
Category: Publishing, Works
Author: Marco Giuliani
*/

require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');

const limit = 1000;
let count = 0;

function hasNullChildren(chain) {
  if (!chain || typeof chain !== 'object') {
    return false; // Base case: if chain is not an object or is null, return false
  }

  // Check if the 'children' property is an array and contains at least one null value
  if (Array.isArray(chain.children) && chain.children.some(child => child === null)) {
    return true;
  }

  // Recursively check the children
  if (chain.children && Array.isArray(chain.children)) {
    for (const child of chain.children) {
      if (hasNullChildren(child)) {
        return true; // Stop checking further if any child has null 'children'
      }
    }
  }

  return false; // If no null 'children' found in the current chain and its children
}

function removeNullChildren(chain) {
  if (!chain || typeof chain !== 'object') {
    return null; // Base case: if chain is not an object or is null, return null
  }

  // Filter out null values from the 'children' array
  if (Array.isArray(chain.children)) {
    chain.children = chain.children.filter(child => child !== null);
  }

  // Recursively remove null children
  if (chain.children && Array.isArray(chain.children)) {
    chain.children = chain.children.map(removeNullChildren);
  }

  return chain;
}

function runWork(client, lastId, total, save, callback) {
  const filter = { clientId: client._id };
  if (lastId) {
    filter._id = { $gt: lastId };
  }
  Work.find(filter).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 50, (work, cb) => {
      count += 1;
      lastId = work._id;
      const hasNullChildrenInRightsChain = work.rightsChain.some(hasNullChildren);
      if (hasNullChildrenInRightsChain) {
        console.log(`(${work._id})${work.title}`);
        work.rightsChain = work.rightsChain.map(removeNullChildren);
        if (save && save === 'true') {
          Work.findByIdAndUpdate(work._id, { $set: { rightsChain: work.rightsChain } }, { timestamps: false }, (err, updatedWork) => {
            if (err) {
              console.log(err);
            }
            cb();
          });
        } else {
          cb(err);
        }
      } else {
        cb();
      }
    }, (err) => {
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
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
      waterfallCb('Please provide a client id, or use --all to flush through ALl clients')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      const save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      count = 0;
      runWork(client, null, 0, save, eachCb);
    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});
