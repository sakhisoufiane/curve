require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const PeriodTransactions = require('../libs/calculation/period/periodTransactions');

Period.findById('63d70cb1faa86d28ca074346', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    PeriodTransactions.create(period, null, client, true, (err) => {
      console.log('COMPLETE');
    });
  });
});
