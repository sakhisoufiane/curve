require('dotenv').config();
require('../models/db');
const async = require('async');
const Client = require('../models/client');

Client.find({ name: 'Kartel Music Group' }, (err, clients) => {
  async.eachSeries(clients, (client, cb) => {
    client.save(() => {
      client.createBigQueryTables(cb);
    });
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
