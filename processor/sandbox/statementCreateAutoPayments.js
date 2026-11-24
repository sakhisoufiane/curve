require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const Statement = require('../models/statement');

Statement.findById('6115621ac4de9d4248b352e7', (err, statement) => {
  const period = { endDate: moment().format() };
  statement.createAutoPayments(period, (err) => {
    console.log(err);
  })
});
