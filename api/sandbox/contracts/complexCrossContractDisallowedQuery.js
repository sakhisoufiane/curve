require('../models/db');
const Contract = require('../models/contract');
const Client = require('../models/client');
const async = require('async');

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function runReport(query, callback) {
  async.waterfall([
    function(cb) {
      Contract.count(query, (err, count) => {
        cb(err, count)
      })
    },
    function(count, cb) {
      Contract.find(query, 'clientId', (err, contracts) => {
        const contractsNoDups = contracts.map((contract) => contract.clientId)
        cb(err, count, contractsNoDups)
      });
    },
    function(count, contracts, cb) {
        Client.find({ _id: { $in: contracts.filter(onlyUnique) } }, 'name', (err, clients) => {
          cb(err, count, clients)
        })
    }
  ], (err, count, clients) => {
    if (err) {
      console.log(err);
    }
    const clientNames = clients.map((client) => client.name)
    console.log(`${JSON.stringify(query)}:`, count, 'Client List:', clientNames)
    uniqueClients = uniqueClients.concat(clientNames);
    callback();
  });
}

let uniqueClients = [];

async.waterfall([
  function(callback) {
    const query = { crossContracts: { $elemMatch: { condition: "Always", process: "Subtract From"  }}};
    runReport(query, callback);
  },
  function(callback) {
    const query = { "crossContracts.condition": "Always", type: "Profit Share"  }
    runReport(query, callback);
  },
], function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log(`\n\nUnique list of clients using disallowed complex cross contracts;`);
    console.log('-----------------------------------------------------');
    console.log(uniqueClients.filter(onlyUnique));
    process.exit(-1);
  }
})
