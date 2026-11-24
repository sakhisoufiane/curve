require('dotenv').config();
require('../models/db');
const Client = require('../models/client');

Client.findOne({ name: 'Audiosalad' }, (err, client) => {
  client.contractLabels((err, mappings) => {
    console.log(mappings);
  });
});
