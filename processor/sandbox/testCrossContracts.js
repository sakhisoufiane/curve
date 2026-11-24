require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');

// Period.findById("5a95271118982a59f93fcabf", function(err, period) {
// Statement.findById("5a97e7f922c58e515c598e30", function(err, statement) {
// statement.crossContracts(period, function(err, result) {
// console.log("Complete");
// });
// });
// });

Statement.findById('5d700c502a13cd0e05db06af', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    statement.createSubtractFromTransactions(period, (err, result) => {
      process.exit(-1);
    });
  });
});
