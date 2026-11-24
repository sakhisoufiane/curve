require('../models/db');
const Contract = require('../models/contract');
const Client = require('../models/client');
const async = require('async');

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function runReport(query, clientType, callback) {
  async.waterfall([
    function(cb) {
      Contract.count({ "crossContracts.condition": query }, (err, count) => {
        cb(err, count)
      })
    },
    function(count, cb) {
      Contract.find({ "crossContracts.condition": query }, 'clientId', (err, contracts) => {
        const contractsNoDups = contracts.map((contract) => contract.clientId)
        cb(err, count, contractsNoDups)
      });
    },
    function(count, contracts, cb) {
        let clientTypeFilter = { $in: ['Label', 'Publisher', 'Distributor']}
        if (clientType) {
          clientTypeFilter = clientType;
        }
        Client.find({ _id: { $in: contracts.filter(onlyUnique) }, clientType: clientTypeFilter }, 'name', (err, clients) => {
          cb(err, count, clients)
        })
    }
  ], (err, count, clients) => {
    if (err) {
      console.log(err);
    }
    const clientNames = clients.map((client) => client.name);
    const clientIds = clients.map((client) => client._id.toString());
    console.log(`${query}:`, count, 'Client List:', clientNames);
    allClients = allClients.concat(clientNames);
    allClientIds = allClientIds.concat(clientIds);
    callback();
  });
}

let allClients = [];
let allClientIds = [];

async.waterfall([
  function(callback) {
    runReport("Income is Positive", null, callback)
  },
  function(callback) {
    runReport("Income is Negative", null, callback)
  },
  function(callback) {
    runReport("Income and Costs are Positive", null, callback)
  },
  function(callback) {
    runReport("Income and Costs are Negative", null, callback)
  },
  // Complex for publishing only
  function(callback) {
    runReport("Always transfer Income and Costs", 'Publisher', callback)
  },
  function(callback) {
    runReport("Income, Costs and Reserves are Positive", null, callback)
  },
  function(callback) {
    runReport("Income, Costs and Reserves are Negative", null, callback)
  },
  function(callback) {
    runReport("Negative", null, callback)
  },
  function(callback) {
    runReport("Balance Minus Opening is Positive", null, callback)
  },
  function(callback) {
    runReport("Balance Minus Opening is Negative", null, callback)
  },
  function(callback) {
    runReport("Always transfer Balance Minus Opening", null, callback)
  },
], function (err) {
  if (err) {
    console.log(err);
  } else {
    const uniqueClients = allClients.filter(onlyUnique);
    const uniqueClientIds = allClientIds.filter(onlyUnique);
    console.log(`\n\nUnique list of clients using complex cross contracts;`);
    console.log('-----------------------IDs------------------------------');
    console.log(uniqueClientIds);
    console.log('-----------------------Names----------------------------');
    console.log(JSON.stringify(uniqueClients, null, 2));
    if (process.argv[2]) {
      if (process.argv[2] === 'true') {
        console.log('----------------------- Setting features.complexCrossContracts ----------------------------');
        Client.updateMany({ _id: { $in: uniqueClientIds } }, { $set: { 'features.complexCrossContracts': true } }, (errUpdate, res) => {
          if (errUpdate) {
            console.log(errUpdate);
            console.log('-----------------------ERR-------------------------');
          } else {
            console.log(res);
            console.log('-----------------------DONE-------------------------');
          }
          process.exit(-1);
        });
      }
    } else {
      console.log('-----------------------DONE-------------------------');
      process.exit(-1);
    }
  }
});
