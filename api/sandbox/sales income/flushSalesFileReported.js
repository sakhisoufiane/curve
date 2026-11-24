require('dotenv').config();
require('../models/db');
const async = require('async');
const { ObjectId } = require('mongodb');
const SalesFile = require('../models/salesFile');

SalesFile.find({ _id: ObjectId('5f842a197c7cde000fd3896e') }, (err, salesFiles) => {
  async.eachSeries(salesFiles, (salesFile, cb) => {
    salesFile.updateReportedStatus(cb);
  }, () => {
    console.log('Complete');
  });
});
