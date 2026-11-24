require('dotenv').config();
require('../models/db');
const async = require('async');
const CwrDelivery = require('../models/cwrDelivery');

async.waterfall([
  function (cb) {
    CwrDelivery.countDocuments({ name: /(Archived)/, status: 'Pending' }, { timestamps: false }, (err, result) => {
      console.log(`${result} Archived`);
      cb();
    });
  },
  function (cb) {
    CwrDelivery.updateMany({ name: /(Archived)/, status: 'Pending' }, { $set: { status: 'Archived' } }, (err, result) => {
      console.log(`${JSON.stringify(result)} updated to Archived`);
      cb();
    });
  },
  function (cb) {
      CwrDelivery.countDocuments({ status: 'Archived' }, (err, result) => {
      console.log(`${result} Archived`);
      cb();
    });
  },
], () => {
  console.log('Complete');
  process.exit(-1);
});

