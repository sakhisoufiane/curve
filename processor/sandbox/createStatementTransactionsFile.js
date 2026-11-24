require('../models/db');
const Statement = require('../models/statement');
const Client = require('../models/client');
const Period = require('../models/period');
const Contract = require('../models/contract');

const statementId = '5ec3d12230f9ae461bf19d03';

Statement.findById(statementId, (err, statement) => {
  Client.findById(statement.clientId, (err, client) => {
    Period.findById(statement.periodId, (err, period) => {
      Contract.findById(statement.contractId, (err, contract) => {
        statement.createTransactionPdf(client, period, contract, (err, result) => {
          console.log(err);
          console.log(result);
        });
      });
    });
  });
});
