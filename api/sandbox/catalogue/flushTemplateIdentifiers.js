require('dotenv').config();
require('../models/db');
const async = require('async');
const SalesTemplate = require('../models/salesTemplate');
const Client = require('../models/client');

Client.find({}, (err, clients) => {
  async.eachSeries(clients, (client, clientCb) => {
    console.log('------');
    console.log(client.name);
    SalesTemplate.find({ clientId: client._id.toString() }, (err, salesTemplates) => {
      let count = 0;
      async.eachLimit(salesTemplates, 5, (salesTemplate, templateCb) => {
        count += 1;
        console.log(client.name, ':', count, '/', salesTemplates.length);
        salesTemplate.extractExamplesLinesAndIdentifiers((err) => {
          if (err) {
            console.error(err);
          }
          templateCb();
        });
      }, clientCb);
    });
  }, (err) => {
    console.error(err);
    console.log('Complete');
  });
});
