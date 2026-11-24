require('../models/db');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');
const logger = require('../libs/logger');
const BigQuery = require('../libs/bigQuery');

Statement.findById('6093d3adb773377180cda202', (err, statement) => {
  Period.findById(statement.periodId, (err, period) => {
    statement.manageNegativeBalanceFromTransfers();
  });
});
