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
        Client.find({ _id: { $in: contracts.filter(onlyUnique) } }, 'name', {sort: {name: 1}}, (err, clients) => {
          cb(err, count, clients)
        })
    }
  ], (err, count, clients) => {
    if (err) {
      console.log(err);
    }
    const clientNames = clients.map((client) => client.name)
    console.log(`${query}:`, count, '\nClient List:')
    console.log(JSON.stringify(clientNames, null, 2));
    uniqueClients = uniqueClients.concat(clientNames);
    callback();
  });
}

let uniqueClients = [];

async.waterfall([
  function(callback) {
    runReport("Income is Positive", callback)
  },
  function(callback) {
    runReport("Income is Negative", callback)
  },
  function(callback) {
    runReport("Always Transfer Income", callback)
  },
  function(callback) {
    runReport("Income and Costs are Positive", callback)
  },
  function(callback) {
    runReport("Income and Costs are Negative", callback)
  },
  function(callback) {
    runReport("Always transfer Income and Costs", callback)
  },
  function(callback) {
    runReport("Income, Costs and Reserves are Positive", callback)
  },
  function(callback) {
    runReport("Income, Costs and Reserves are Negative", callback)
  },
  function(callback) {
    runReport("Always tranfer Income, Costs and Reserves", callback)
  },
  function(callback) {
    runReport("Positive", callback)
  },
  function(callback) {
    runReport("Balance is Greater Than Minimum Payout", callback)
  },
  function(callback) {
    runReport("Negative", callback)
  },
  function(callback) {
    runReport("Always", callback)
  },
  function(callback) {
    runReport("Balance Minus Opening is Positive", callback)
  },
  function(callback) {
    runReport("Balance Minus Opening is Negative", callback)
  },
  function(callback) {
    runReport("Always transfer Balance Minus Opening", callback)
  },
], function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log(`\n\nUnique list of clients using cross contracts;`);
    console.log('-----------------------------------------------------');
    console.log(JSON.stringify(uniqueClients.filter(onlyUnique), null, 2));
    process.exit(-1);
  }
})
