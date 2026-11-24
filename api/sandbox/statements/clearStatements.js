require('dotenv').config();
require('../models/db');
const async = require('async');
const Statement = require('../models/statement');

// var periodId = "5e7a248a59276152331e8f2c";
// var periodId = "5e7daf752d834c2d3718dc0e";
// var periodId = "5e7dafb1bdc2bb1f18221117";
const periodId = '5e7db6582d834c2d3718dc10';

Statement.find({ periodId }, (err, statements) => {
  async.eachSeries(statements, (statement, cb) => {
    statement.deleteOne(cb);
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
