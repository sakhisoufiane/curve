require('dotenv').config();
require('../models/db');
const async = require('async');
const Client = require('../models/client');

Client.find({}, (err, clients) => {
  async.eachSeries(clients, (client, cb) => {
    console.log('Running on client', client.name);
    client.ensureIndexes(cb);
  }, (err) => {
    if (err) { console.log(err); }
    console.log('Complete');
  });
});
