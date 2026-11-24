require('../models/db');
const async = require('async');
const Contract = require('../models/contract');
const Statement = require('../models/statement');
const Period = require('../models/period');

Statement.findById('5ce6939feed80c0e05086732', (err, statement) => {
  Period.findById('5ce2de3287dfb8556e730b61', (err, period) => {
    let closingBalance;
    let openingBalance;
    Contract.findById('5bec4200e0144a193afd7e02', (err, contract) => {
      async.waterfall([
        function (waterfallCb) {
          contract.balanceAtDate(period.startDate, { excludeReserves: true }, (err, opening) => {
            closingBalance = opening;
            openingBalance = opening;
            waterfallCb(err);
          });
        },
        function (waterfallCb) {
          contract.getAssociatedTransactions(waterfallCb);
        },
        function (waterfallCb) {
          if (contract.transactions.length > 0) {
            // Remove any future transactions
            contract.transactions = contract.transactions.map((transaction) => {
              // Set date to beginning of next day, to include all transactions
              const endDate = new Date(statement.date);
              endDate.setDate(endDate.getDate() + 1);
              endDate.setUTCHours(0, 0, 0, 0);
              if (transaction.date < endDate && transaction.date >= period.startDate) {
                return transaction;
              }
            }).filter(Boolean);
            // Get closing balance from last transaction in this time period
            if (contract.transactions[contract.transactions.length - 1]) { closingBalance = contract.transactions[contract.transactions.length - 1].balance; }
            waterfallCb();
          } else {
            waterfallCb();
          }
        },
      ], (err) => {
        console.log('Opening:', openingBalance);
        process.exit(-1);
      });
    });
  });
});
