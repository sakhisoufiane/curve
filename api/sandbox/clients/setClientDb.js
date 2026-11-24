require('dotenv').config();
require('../models/db');
const async = require('async');
const Client = require('../models/client');

Client.find({}, (err, clients) => {
  async.eachSeries(clients, (client, cb) => {
    client.save((err) => {
      console.log(client.name);
      cb();
    });
  }, (err) => {
    console.log('Complete');
  });
});
