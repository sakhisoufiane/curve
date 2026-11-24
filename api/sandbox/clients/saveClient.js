require('dotenv').config();
require('../models/db');
const Client = require('../models/client');

Client.findOne({ name: '+Test Publishing Client' }, (err, client) => {
  client.save();
});
