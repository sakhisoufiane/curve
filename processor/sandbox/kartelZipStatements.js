require('dotenv').config();
require('../models/db');
const async = require('async');
const Statement = require('../models/statement');
const Period = require('../models/period');

const clientId = '5acc86007c07cb3a8b1a480c';

Period.find({ clientId }, (err, periods) => {
  async.eachSeries(periods, (period, cb) => {
    Statement.find({ periodId: period._id.toString() }, (err, statements) => {
      async.eachSeries(statements, (statement, statementCb) => {
        statement.createZipOfFiles(statementCb);
      }, cb);
    });
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
