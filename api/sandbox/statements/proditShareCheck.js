require('dotenv').config();
require('../models/db');
const Statement = require('../models/statement');
const Client = require('../models/client');

Client.find({}, { name: 1 }, (err, clients) => {
  const clientMappings = {};
  clients.forEach((client) => {
    clientMappings[client._id.toString()] = client.name;
  });
  Statement.find({ contractType: 'Profit Share', openingBalance: { $gt: 0 }, closingBalance: { $lt: 0 }, createdAt: { $gt: new Date('2020-05-18T11:48:28.824Z') } }, (err, statements) => {
    statements.forEach((statement) => {
      console.log(clientMappings[statement.clientId], '|', statement.name, '|', statement.openingBalance, '|', statement.closingBalance);
    });
  });
});
