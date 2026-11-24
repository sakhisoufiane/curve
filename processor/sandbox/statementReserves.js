require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');

Statement.findById('5c6447f43f667b16a033aede', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    statement.getReleasedReserves(period, (err, result) => {
      console.log(result);
    });
  });
});
