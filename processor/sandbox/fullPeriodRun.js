require('../models/db');
const { MongoClient } = require('mongodb');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');

Period.findById('5e83a573e531a5230e59331b', (err, period) => {
  period.calculate(() => {
    console.log('Complete');
  });
});
