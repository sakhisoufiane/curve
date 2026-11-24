require('dotenv').config();
require('../models/db');
const async = require('async');
const Report = require('../models/report');
const Payee = require('../models/payee');

Report.find({ clientId: null }, { payeeId: 1 }, (err, reports) => {
  async.eachSeries(reports, (report, cb) => {
    console.log('Processing report', report._id);
    Payee.findById( report.payeeId, (err, payee) => {
      if (err) {
        cb(err);
      } else if (payee) {
        if (payee.clientId) {
          console.log(`... adding clientId ${payee.clientId}`);
          Report.findByIdAndUpdate(report._id, { $set: { clientId: payee.clientId } }, { timestamps: false }, cb);
        } else {
          console.log(`Err: No clientId for payee ${report.payeeId}`)
          cb();
        }
      } else {
        console.log(`Err: Payee ${report.payeeId} not found`)
        cb();
      }
    });
  }, (err) => {
    if (err) {
      console.error('An error occurred: ', err)
    } else {
      console.log('Complete');
    }
    process.exit(-1);
  });
});

