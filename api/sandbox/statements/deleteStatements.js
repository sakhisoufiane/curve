require('dotenv').config();
require('../models/db');
const async = require('async');
const Statement = require('../models/statement');

Statement.find({ periodId: '5f5b3ce93698bf03241ebf50' }, (err, statements) => {
  console.log(statements.length);
  if (statements.length > 0) {
    async.eachLimit(statements, 5, (statement, cb) => {
      statement.deleteOne((err) => {
        cb(err);
      });
    }, (err) => {
    	console.log(err);
    	console.log('Complete');
    });
  }
});
