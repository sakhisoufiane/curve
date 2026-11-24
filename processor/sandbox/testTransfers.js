require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');

Period.findById('5c80d94353f77a35388f23bf', (err, period) => {
  Statement.findById('5c8530f015c49a3b59e6abcf', (err, statement) => {
    statement.createSubtractFromTransactions(period, (err) => {
      console.log('Complete');
    });
  });
});
