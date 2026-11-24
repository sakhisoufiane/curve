require('dotenv').config();
require('../../models/db');
const Contract = require('../../models/contract');

Contract.findById('5c0901c89ba5577f807a51ca', (err, contract) => {
  let reservesRemaining = 0;
  const endDate = new Date(2021, 1, 1);
  console.log(endDate);
  contract.getAssociatedTransactions(new Date(2100, 1, 1), () => {
    if (contract.transactions.length > 0) {
      // Get future reserves
      contract.transactions.map((transaction) => {
        if (transaction.date >= endDate && transaction.isReserveRelease) {
          reservesRemaining += transaction.amount;
        }
      }).filter(Boolean);
    }

    console.log(reservesRemaining);
  });
});
