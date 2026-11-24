require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');
const Client = require('../models/client');
const ObjectId = require('mongodb').ObjectId;

Client.find({}, 'name', (err, clients) => {
  let run = false;
  async.eachLimit(clients, 3, (client, cb) => {
    if (client.name === 'North Music Group - Publishing') {
      run = true;
    }
    console.log(`Running ${client.name}`);
    if (run) {
      getWorks(client, 0, cb);
    } else {
      cb();
    }
  });
});

function getWorks(client, skip, callback) {
  Work.find({ clientId: client._id.toString(), valid: { $ne: true } }).limit(10000).skip(skip).sort({ _id: 1 }).exec((err, works) => {
    let index = 0;
    async.eachLimit(works, 10, (work, workCb) => {
      index += 1;
      console.log(`Running ${index}/${works.length + skip}`);
      work.checkValidationErrors(() => {
        work.calculateTotalCollection(() => {
          Work.findByIdAndUpdate(work._id, { $set: { valid: work.valid, validationErrors: work.validationErrors, totalCollection: work.totalCollection } }, (err) => {
            workCb();
          });
        });
      });
    }, (err) => {
      if (works.length === 10000) {
        works = null;
        getWorks(client, skip += 10000, callback);
      } else {
        works = null;
        callback();
      }
    });
  });
}
