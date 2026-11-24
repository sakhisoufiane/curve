require('dotenv').config();
require('../../models/db');
const async = require('async');
const Work = require('../../models/work');
const Client = require('../../models/client');
const Composer = require('../../models/composer');
const { WorkController } = require('@curveroyaltysystems/curve-shared-logic');

const limit = 1000;
let count = 0;

function runWork(client, lastId, total, save, callback) {
  const filter = { clientId: client._id };
  // Should we include the projection below to only query the elements to be validated?
  // const projection = { valid: 1, validationErrors: 1, title: 1 };
  if (lastId) {
    // if processing another batch, ensure you start after the last work in previous batch.
    filter._id = { $gt: lastId };
  }
  // query all elements from Works and sort by _id - Should we include projection?
  Work.find(filter).sort({ _id: 1 }).limit(limit).exec((err, works) => {
    async.eachLimit(works, 100, (work, cb) => {
      count += 1;
      if (save && save === 'true') {
        process.stdout.write(`\r${count}/${works.length+total} - ${work._id} - ${work.title}`);
      }
      lastId = work._id;
      const workWasValid = work.valid;
      // Do the validation of Work and update the valid status and validationErrors array
      WorkController.checkIswcEligibility({ work, Composer }).then(() => {
        if (save && save === 'true' && work?.isIswcIrsEligible) {
          Work.findByIdAndUpdate(work._id, { $set: { isIswcIrsEligible: work.isIswcIrsEligible } }, { timestamps: false }, (err) => {
            console.log(`Saved ${work.title} - isIswcIrsEligible = ${work.isIswcIrsEligible}`);
            cb();
          });
        } else {
          console.log(`${work.title} - isIswcIrsEligible = ${work.isIswcIrsEligible}`);
          cb();
        }
      }).catch(cb);
    }, (err) => {
      // should we go get the next 'limit' documents
      if (works && works.length === limit) {
        runWork(client, lastId, total + limit, save, callback);
      } else {
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
      waterfallCb('Please provide a client id, or use --all to flush through All Work validations')
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
    console.log('-----done----');
   }
  process.exit(-1);
});
