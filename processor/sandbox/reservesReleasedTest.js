require('../models/db');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const Statement = require('../models/statement');

Period.findById('5b38f116179d0a13b30d9e05', (err, period) => {
  Statement.findById('5b3c81e1e27c106b67402700', (err, statement) => {
    statement.getReleasedReserves(period, (err) => {
      console.log('Complete');
    });
  });
});
