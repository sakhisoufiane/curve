require('dotenv').config();
require('../models/db');
const Period = require('../models/period');
const Statement = require('../models/statement');
const SalesFile = require('../models/salesFile');
const Client = require('../models/client');
const Transaction = require('../models/transaction');

// Total in periods
Client.find({}, 'homeCurrency', (err, clients) => {
  const currency = {};
  clients.forEach(client => { currency[client._id.toString()] = client.homeCurrency });
  Period.aggregate([
    { $match: { createdAt: { $gt: new Date('2022-01-01T00:00:00.646+00:00') } } },
    { $group: { _id: '$_id', clientId: { $first: '$clientId' }, lines: { $sum: '$lines' }, gross: { $sum: '$grossAmount' }, net: { $sum: '$netAmount' }, calculations: { $sum: '$runNo' } } }
  ], (err, data) => {
    const output = { lines: 0, gross: 0, net: 0 }
    // data.forEach((line) => {
    //   output.lines += (line.lines * line.calculations);
    //   output.gross += (line.gross * line.calculations);
    //   output.net += (line.net * line.calculations);
    // });
    //console.log(output);
    console.log(err);
    const currencyOutputs = {};
    data.forEach((line) => {
      const lineCurrency = currency[line.clientId];
      currencyOutputs[lineCurrency] = currencyOutputs[lineCurrency] || 0;
      currencyOutputs[lineCurrency] += line.net;
    });
    console.log(currencyOutputs);
    console.log(output.lines);
  });
});

// Client.find({}, 'homeCurrency', (err, clients) => {
//   const currency = {};
//   clients.forEach(client => { currency[client._id.toString()] = client.homeCurrency });
//   SalesFile.aggregate([
//     { $match: { createdAt: { $gt: new Date('2022-01-01T00:00:00.646+00:00') }, netAmount: { $lt: 1000000 } } },
//     { $group: { _id: '$_id', clientId: { $first: '$clientId' }, lines: { $sum: '$lines' }, gross: { $sum: '$grossAmount' }, net: { $sum: '$netAmount' } } }
//   ], (err, data) => {
//     const output = { lines: 0, gross: 0, net: 0 }
//     data.forEach((line) => {
//       output.lines += (line.lines * line.calculations);
//       output.gross += (line.gross * line.calculations);
//       output.net += (line.net * line.calculations);
//     });
//     //console.log(output);
//     console.log(err);
//     const currencyOutputs = {};
//     data.forEach((line) => {
//       const lineCurrency = currency[line.clientId];
//       currencyOutputs[lineCurrency] = currencyOutputs[lineCurrency] || 0;
//       currencyOutputs[lineCurrency] += line.net;
//     });
//     console.log(currencyOutputs);
//   });
// });

// Total Transactions
// Client.find({}, 'homeCurrency', (err, clients) => {
//   const currency = {};
//   clients.forEach(client => { currency[client._id.toString()] = client.homeCurrency });
//   Transaction.aggregate([
//     { $match: { type: 'Payment', createdAt: { $gt: new Date('2022-01-01T00:00:00.646+00:00') } } },
//     { $group: { _id: '$_id', clientId: { $first: '$clientId' }, amount: { $sum: '$amount' } } }
//   ], (err, data) => {
//     const currencyOutputs = {};
//     data.forEach((line) => {
//       const lineCurrency = currency[line.clientId];
//       currencyOutputs[lineCurrency] = currencyOutputs[lineCurrency] || 0;
//       currencyOutputs[lineCurrency] += line.amount;
//     });
//     console.log(currencyOutputs);
//   });
// });

// Client.find({ createdAt: { $gte: new Date(2022, 0, 1) } }, (err, clients) => {
//   if (err) {
//     console.log(err);
//   }
//   clients.forEach((client) => {
//     if (client.name.toLowerCase().indexOf('test') === -1 && client.name.toLowerCase().indexOf('demo') === -1) {
//       console.log(`${client.name}|${client.clientType}|${client.paymentTier}`);
//     }
//   });
//   console.log(clients.length);
// });