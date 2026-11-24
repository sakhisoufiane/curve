require('dotenv').config();
require('../models/db');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Client = require('../models/client');
const SalesFile = require('../models/salesFile');
const Cost = require('../models/cost');

Client.find({ parentId: '5a30fcc7e819142d310d79eb' }, (err, clients) => {
  const clientIds = clients.map((client) => { return client._id.toString(); });
  const clientCurrencies = {};
  clients.forEach((client) => {
    clientCurrencies[client._id.toString()] = client.homeCurrency ? client.homeCurrency : 'GBP';
  });
  Period.aggregate([
    { $match: { clientId: { $in: clientIds }, createdAt: { $gt: new Date(2021, 3, 15), $lt: new Date(2021, 9, 15) } } },
    { $group: { _id: '$clientId', count: { $sum: 1 }, net: { $sum: '$netAmount' }, units: { $sum: '$units' } } }
  ], (err, result) => {
    if (err) {
      console.error(err);
    } else {
      let total = 0;
      const output = {};
      result.forEach((res) => {
        total += res.count;
        //units += res.units;
        const currency = clientCurrencies[res._id];
        output[currency] = output[currency] || 0;
        output[currency] += res.net;
      });
      console.log(output);
      console.log(`Total: ${total}`);
      //console.log(`Units: ${units}`); 
    }
  })
});