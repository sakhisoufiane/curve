require('../models/db');
const { ObjectId } = require('mongodb');
const Client = require('../models/client');
const Contract = require('../models/contract');

Contract.distinct('clientId', { type: 'Profit Share', reserves: { $size: 5 } }, (err, ids) => {
  console.log(ids);
  ids = ids.map((id) => ObjectId(id));
  Client.find({ _id: { $in: ids } }, 'name', (err, clients) => {
    clients.forEach((client) => {
      console.log(client.name);
    });
  });
});
