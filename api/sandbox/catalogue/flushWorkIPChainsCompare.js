/*
Description: A script compare ip chain across two clients
Start Time: 
End Time: 
Time To Run On Staging: 
Ticket No: CUR-2663
Category: Publishing, Works
Author: Marco Giuliani
Changes required: { clientId: '653bcc9fed297483466b0376', foreignId: `CU${work.partyNo}` }
*/
require('dotenv').config();
require('../models/db');
const async = require('async');
const _ = require('lodash');
const { ObjectId } = require('@curveroyaltysystems/models/mongoose').Types;
const appRootDir = require('app-root-dir').get();
const WriteCsv = require('../libs/writeCsv');
const Work = require('../models/work');
const Client = require('../models/client')

const limit = 1000;
const diffIPChains = [];
let count = 0;
let errCount = 0;

function runWork(client, lastId, total, save, callback) {
  const filter = { clientId: client._id, valid: true };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id
  Work.find(filter, { _id: 1, partyNo: 1, title: 1, rightsChain: 1, composer: 1 }).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 100, (work, cb) => {
      lastId = work._id;
      // Do the comparison of Work against the other client. Match on foreignId against partyNo. This may need changed based on import used
      let update = false;
      Work.findOne({ clientId: '654ba80501c88be307e3c973', foreignId: `CU${work.partyNo}` }, { _id: 1, partyNo: 1, title: 1, rightsChain: 1, composer: 1 }, (err, foundWork) => {
        if (foundWork) {
          const keysToRemove = ['publisherId', 'composerId'];
          removeObjectKeyIteratively(foundWork.rightsChain, 'publisherId');
          removeObjectKeyIteratively(foundWork.rightsChain, 'composerId');
          removeObjectKeyIteratively(foundWork.rightsChain, 'interestedPartyNo');
          removeObjectKeyIteratively(work.rightsChain, 'publisherId');
          removeObjectKeyIteratively(work.rightsChain, 'composerId');
          removeObjectKeyIteratively(work.rightsChain, 'interestedPartyNo');
          // quick fix for miss ordered BQ, CW, we could sort codes and name.
          reorderRightsChain(work.rightsChain);
          reorderRightsChain(foundWork.rightsChain);
          // remove Kosovo from test.
          removeCodeFromRightsChain(work.rightsChain, 'XK');
          removeCodeFromRightsChain(foundWork.rightsChain, 'XK');
          // console.log(JSON.stringify(foundWork.rightsChain));
          // console.log(JSON.stringify(work.rightsChain));
          const isEqual = _.isEqual(foundWork.rightsChain, work.rightsChain);
          const isEqualComposer = foundWork.composer.toUpperCase() === work.composer.toUpperCase();
          if (!isEqual || !isEqualComposer) {
            diffIPChains.push({ client: client._id, title: work.title, composer: isEqualComposer });
            console.log(`${isEqual} ${work.title} = ${foundWork.title}, ${isEqualComposer}`);
            errCount += 1;
          } else {
            console.log(`${isEqual} ${work.title} = ${foundWork.title}`);
            count += 1;
          }
        }
        cb();
      });
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
      } else {
        console.log(`${count} works the same.`);
        console.log(`${errCount} works NOT the same.`);
        callback();
      }
    });
  });
}

function removeCodeFromRightsChain(rightsChain, isoCode) {
  rightsChain.forEach(chain => {
    if (chain.territory === 'specific' && chain.territoryCodes) {
      // Remove 'XK' from territoryCodes.codes array
      if (Array.isArray(chain.territoryCodes.codes)) {
        chain.territoryCodes.codes = chain.territoryCodes.codes.filter(code => code !== isoCode);
      }
      // Remove 'XK,' from territoryCodes.name
      if (typeof chain.territoryCodes.name === 'string') {
        chain.territoryCodes.name = chain.territoryCodes.name.replace(`,${isoCode}`, '');
      }
    }
  });
}

function reorderRightsChain(rightsChain) {
  rightsChain.forEach(chain => {
    if (chain.territory === 'specific' && chain.territoryCodes) {
      // Remove 'name' from territoryCodes
      if (typeof chain.territoryCodes.name === 'string') {
        chain.territoryCodes.name = '';
      }
      if (Array.isArray(chain.territoryCodes.codes)) {
        chain.territoryCodes.codes = chain.territoryCodes.codes.sort();
      }
    }
  });
}


function removeObjectKeyIteratively(obj, keyToRemove) {
  const stack = [obj];

  while (stack.length > 0) {
    const current = stack.pop();
    
    if (typeof current === 'object' && current !== null) {
      if (Array.isArray(current)) {
        for (let i = current.length - 1; i >= 0; i--) {
          if (current[i] === keyToRemove) {
            current.splice(i, 1);
          } else {
            stack.push(current[i]);
          }
        }
      } else {
        for (const key in current) {
          if (key === keyToRemove) {
            delete current[key];
          } else {
            stack.push(current[key]);
          }
        }
      }
    }
  }
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
      waterfallCb('Please provide a client id, or use --all to flush through All Works')
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
          runWork(client, null, 0, save, cb);
        },
      ], (err) => {
        clientsCount += 1;
        process.stdout.write(`\rProcessed client ${clientsCount}/${clients.length}`);
        eachCb(err);
      });

    }, waterfallCb);
  },
], (err) => {
  if (err) { 
    console.log(err);
  } else {
    const outputLocation = `${appRootDir}/tmp/flushWorkIPChainsCompare.csv`;
    const writer = new WriteCsv({ headers: ['client', 'title', 'composer'], outputLocation });
    const outputData = diffIPChains.map((line) => [line.client, line.title, line.composer]);
    writer.addData(outputData, () => {
      writer.write((err, location) => {
        console.log(location);
        console.log('Complete');
        process.exit(-1); 
      });
    });
  }
});