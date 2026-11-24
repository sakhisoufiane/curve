require('dotenv').config();
require('../models/db');
const { ObjectId } = require('mongodb');
const async = require('async');
const Statement = require('../models/statement');

const periodId = '61d472037afeb30026a607f4';

Statement.find({ periodId: periodId }, (err, statements) => {
  async.eachLimit(statements, 5, (statement, cb) => {
    statement.deleteOne(cb);
  }, (err) => {
    console.error(err);
    console.log('Complete');
  });
});