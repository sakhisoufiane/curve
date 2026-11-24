require('dotenv').config();
require('../models/db');
const async = require('async');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');

const clientId = '5e135b617f08d7395fd340e5';

SalesFile.find({ clientId, archived: { $ne: true } }, (err, salesFiles) => {
  console.log('Total Sales Files:', salesFiles.length);
  async.eachSeries(salesFiles, (salesFile, cb) => {
    SalesFileController.updateReportedStatus(salesFile, (err) => {
      cb(err);
    });
  }, (err) => {
    console.log('Complete');
  });
});
