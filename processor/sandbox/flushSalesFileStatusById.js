require('dotenv').config();
require('../models/db');
const async = require('async');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');

const salesFileId = '60c99ca8107166002aa061da';

SalesFile.findById(salesFileId, (err, salesFile) => {
  SalesFileController.updateReportedStatus(salesFile, (err) => {
    console.log('Complete');
    process.exit(-1);
  });
});
