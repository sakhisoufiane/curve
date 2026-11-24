require('dotenv').config();
require('../models/db');
const Client = require('../models/client');
const SalesFile = require('../models/salesFile');

Client.find({}, 'name', (err, clients) => {
  const clientsMapping = {};
  clients.forEach((client) => {
    clientsMapping[client._id.toString()] = client.name;
  });

  SalesFile.find({ updatedAt: { $gt: new Date('2021-02-02T08:00:00') } }, (err, salesFiles) => {
    console.log(salesFiles.length);
    const clientCounts = {};
    salesFiles.forEach((salesFile) => {
      const clientName = clientsMapping[salesFile.clientId];
      clientCounts[clientName] = clientCounts[clientName] || 0;
      clientCounts[clientName] += 1;
    });
    console.log(clientCounts);
  });
});
