require('../models/db');

const ingestSalesFile = require('../libs/salesIngestion/ingestSalesFile');

const SalesFile = require('../models/salesFile');
const Client = require('../models/client');

SalesFile.findById('663e3b3dd24c2201b29fa820', (err, salesFile) => {
  Client.findById(salesFile.clientId, (err, client) => {
    client.getMappingsForIngestion((err, mappings) => {
      console.log(mappings);
    })
  });
  // ingestSalesFile.ingestionProcessData(salesFile, (err, data) => {
  //   console.log(data);
  // });
});