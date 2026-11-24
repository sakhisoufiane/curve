require('dotenv').config();
require('../../models/db');
const async = require('async');
const Client = require('../../models/client');

Client.find({}, (err, clients) => {
  const output = {};
  async.eachSeries(clients, (client, cb) => {
    output[client.bigQuerySalesTable] ? output[client.bigQuerySalesTable] += 1 : output[client.bigQuerySalesTable] = 1;
    cb();
  }, (err) => {
    Object.keys(output).forEach((key) => {
      if (output[key] > 1) {
        console.log(key, output[key]);
      }
    });
    console.log(err);
    console.log('Complete');
  });
});
