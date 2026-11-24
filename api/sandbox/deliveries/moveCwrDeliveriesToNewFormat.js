require('dotenv').config();
require('../models/db');
const async = require('async');
const CwrDelivery = require('../models/cwrDelivery');
const Client = require('../models/client')

const limit = 1000;
let count = 0;
let save = 'false';

function runCwrDelivery(client, lastId, total, save, callback) {
  // Filter is where filterType does not exist (old format)
  const filter = { clientId: client._id, filterType: { $exists: false } };
  if (lastId) {
    // if processing another batch, ensure you start after the last _id in previous batch.
    filter._id = { $gt: lastId };
  }
  // query elements from cwrDelivery and sort by _id - Should we include projection?
  CwrDelivery.find(filter).sort({ _id: 1 }).limit(limit).exec((err, cwrDeliveries) => {
    async.eachLimit(cwrDeliveries, 100, (cwrDelivery, cb) => {
      let specificWorkDelivery = false;
      let customWorkDelivery = true;
      // lets look for workId filters - we can convert these to specific works filters
      if ('filter' in cwrDelivery && typeof cwrDelivery.filter === 'object') {
        // Get all the keys from obj.filter
        const keys = Object.keys(cwrDelivery.filter);
        // Check if 'workIds' is the only key in cwrDelivery.filter
        keys.length === 1 && 'workIds' in cwrDelivery.filter ? specificWorkDelivery = true : specificWorkDelivery = false;
      }
      // check for workIds, excludeWorkIds in the filter
      const { workIds, excludeWorkIds } = cwrDelivery.filter;
      if ((Array.isArray(workIds) && workIds.length > 0) || (Array.isArray(excludeWorkIds) && excludeWorkIds.length > 0)) {
        customWorkDelivery = false; // workIds OR excludeWorkIds exist
      }
    
      const deliveryType = cwrDelivery.workIds?.length ? 'D' : isFilterEmpty(cwrDelivery) ? 'E' : specificWorkDelivery ? 'SW' : customWorkDelivery ? 'C' : '?';
      const deliveryCount = deliveryType === 'D' ? cwrDelivery.workIds?.length : deliveryType === 'E' ? 'All' : deliveryType === 'SW' ? cwrDelivery.filter?.workIds?.length : '?';
      if (specificWorkDelivery || cwrDelivery.workIds?.length || isFilterEmpty(cwrDelivery) || customWorkDelivery) {
        count += 1;
        lastId = cwrDelivery._id;
  
        //Update existing cwrDelivery to new format. Is this what we want to do? keep existing Ids?
        const oldFilter =  cwrDelivery.filter ?  cwrDelivery.filter : {};
        if (specificWorkDelivery && cwrDelivery.workIds?.length) {
          cwrDelivery.filter = {
            workIds: cwrDelivery.workIds.filter(Boolean).map((id) => id.toString()),
          };
          cwrDelivery.filterType = 'specific';
          cwrDelivery.fromScheduledDelivery = false;
          cwrDelivery.status = 'Delivered';
        } else if (cwrDelivery.workIds?.length) {
          cwrDelivery.filter = {
            workIds: cwrDelivery.workIds.filter(Boolean).map((id) => id.toString()),
          };
          cwrDelivery.filterType = 'specific';
          cwrDelivery.fromScheduledDelivery = false;
          cwrDelivery.status = 'Delivered';
        } else if (specificWorkDelivery) {
          cwrDelivery.filter = {
            workIds: cwrDelivery.filter.workIds.filter(Boolean).map((id) => id.toString()),
          };
          cwrDelivery.filterType = 'specific';
          cwrDelivery.fromScheduledDelivery = false;
          cwrDelivery.status = 'Pending';
        } else if (isFilterEmpty(cwrDelivery) || customWorkDelivery) {
          cwrDelivery.filterType = 'custom';
          cwrDelivery.fromScheduledDelivery = false;
          cwrDelivery.status = 'Pending';
        };
        process.stdout.write(`\r${count}/${cwrDeliveries.length+total} ${cwrDelivery._id} - (${deliveryType}) - (${deliveryCount})works - ${cwrDelivery.name ? cwrDelivery.name : ''} - ${cwrDelivery.fileName ? cwrDelivery.fileName : ''} filter: ${JSON.stringify(oldFilter)}`);
        if (save && save === 'true') {
          CwrDelivery.findByIdAndUpdate(cwrDelivery._id, { $set: { filter: cwrDelivery.filter, filterType: cwrDelivery.filterType, fromScheduledDelivery: cwrDelivery.fromScheduledDelivery, status: cwrDelivery.status } }, { timestamps: false }, (err) => {
            if (err) {
              console.log(err);
            }
            cb();
          });
        } else {
          cb();
        }   
      } else {
        count += 1;
        cwrDelivery.name = `(Archived)${cwrDelivery.name}`;
        cwrDelivery.filterType = 'custom';
        cwrDelivery.fromScheduledDelivery = false;
        cwrDelivery.status = 'Archived';
        process.stdout.write(`\r${count}/${cwrDeliveries.length+total} - (${cwrDelivery._id})Unable to convert ${cwrDelivery.name} filter: ${JSON.stringify(cwrDelivery.filter)}`);
        if (save && save === 'true') {
          CwrDelivery.findByIdAndUpdate(cwrDelivery._id, { $set: { name: cwrDelivery.name, filterType: cwrDelivery.filterType, fromScheduledDelivery: cwrDelivery.fromScheduledDelivery, status: cwrDelivery.status } }, { timestamps: false }, (err) => {
            if (err) {
              console.log(err);
            }
            cb();
          });
        } else {
          cb();
        }  
      }
    }, (err) => {
      // should we go get the next 'limit' documents
      if (cwrDeliveries && cwrDeliveries.length === limit) {
        runCwrDelivery(client, lastId, total + limit, save, callback);
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
      waterfallCb('Please provide a client id, or use --all to move All CwrDelivery')
    }
  },
  (clientFilter, waterfallCb) => {
    Client.find(clientFilter, { name: 1 }).sort({ name: 1 }).exec(waterfallCb);
  },
  (clients, waterfallCb) => {
    async.eachSeries(clients, (client, eachCb) => {
      save = (process.argv[3]) ? process.argv[3] : 'false';
      console.log(`---- processing client: ${client.name} ----`);
      async.waterfall([
        (cb) => {
          console.log('>>>>>> processing CwrDelivery <<<<<<');
          count = 0;
          runCwrDelivery(client, null, 0, save, cb);
        },
      ], eachCb);

    }, waterfallCb);
  },
], (err) => {
  if (err) { console.log(err); }
  else { console.log('Complete'); }
  process.exit(-1);
});

function isFilterEmpty(obj) {
  // Check if 'filter' property exists in the object
  if ('filter' in obj && typeof obj.filter === 'object' && !Array.isArray(obj.filter)) {
    // Check if 'filter' object is empty (has no own properties)
    return Object.keys(obj.filter).length === 0;
  }

  return true; // If 'filter' does not exist or is not an object, consider it as empty
}
