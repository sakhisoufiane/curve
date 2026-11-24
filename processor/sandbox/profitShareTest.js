require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');

Statement.findById('61602f59b117be001e197594', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    statement.profitShareFigures(period, (err, figures) => {
      console.log(err);
      console.log(figures);
    });
  });
});