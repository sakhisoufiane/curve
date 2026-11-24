require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Statement.findById('61f98fdfd1cfe80fcc971bbd', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    Client.findById(period.clientId, (err, client) => {
      statement.profitShareFigures(period, (err) => {
        console.log('Complete');
      });
    });
  });
});
