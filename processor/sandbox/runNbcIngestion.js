require('../models/db');
const async = require('async');

const SalesFileController = require('../libs/salesIngestion/salesFileController');

const SalesFile = require('../models/salesFile');

SalesFile.find({ clientId: '5d1e303d4151b60ec77c1e36', updatedAt: { $lt: new Date('2020-04-16T17:00:24.991Z') } }, (err, salesFiles) => {
  async.eachSeries(salesFiles, (salesFile, cb) => {
    SalesFileController.ingest(salesFile, cb);
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
