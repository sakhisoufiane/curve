require('dotenv').config();
require('../models/db');
const async = require('async');
const Work = require('../models/work');

async.waterfall([
  function (cb) {
    // Work.updateMany({ valid: true }, { $set: { approvalStatus: 'Approved', approvedDate: Date.now() } }, { timestamps: false }, (err, result) => {
    Work.countDocuments({ valid: true }, (err, result) => {
      console.log(`${result} valid`);
      cb();
    });
  },
  function (cb) {
    Work.countDocuments({ approvalStatus: 'Approved' }, (err, result) => {
      console.log(`${result} Approved`);
      cb();
    });
  },
  function (cb) {
    // Work.updateMany({ valid: false }, { $set: { approvalStatus: 'Invalid' } }, { timestamps: false }, (err, result) => {
    Work.countDocuments({ valid: false }, (err, result) => {
      console.log(`${result} invalid`);
      cb();
    });
  },
  function (cb) {
    Work.countDocuments({ approvalStatus: 'Invalid' }, (err, result) => {
      console.log(`${result} Invalid`);
      cb();
    });
  },
  function (cb) {
    Work.countDocuments({ valid: { $exists: false } }, (err, result) => {
      console.log(`${result} no valid status`);
      cb();
    });
  },
], () => {
  console.log('Complete');
  process.exit(-1);
});

