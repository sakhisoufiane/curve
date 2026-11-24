require('dotenv').config();
require('../models/db');
const async = require('async');
const Period = require('../models/period');

Period.findById('5e7ceb7703f51020629ff8dd', (err, period) => {
  async.waterfall([
    function (cb) {
      console.log('Deleting Statements');
      period.deleteStatements((err) => {
        cb(err);
      });
    },
    function (cb) {
      console.log('Deleting Files');
      period.deleteFiles((err) => {
        cb(err);
      });
    },
  ], (err) => {
  	Period.findByIdAndRemove('5e7ceb7703f51020629ff8dd', (err, res) => {
  		console.log('Complete');
  	});
  });
});
