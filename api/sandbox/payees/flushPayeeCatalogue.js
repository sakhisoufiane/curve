require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Payee = require('../models/payee');

const limit = 1000;
let count = 0;
const errors = [];


function flushPayeesDetails(lastId, total, callback) {
  const filter = { clientId: '5daf25c777d4b607aa68a29d' };

  if (lastId) {
    filter._id = { $gt: lastId };
  }

  Payee.find(filter).sort({ _id: 1 }).limit(limit).exec((err, payees) => {
    async.eachLimit(payees, 50, (payee, cb) => {
      count += 1;
      process.stdout.write(`\r${count}/${payees.length+total} - ${payee._id} - ${payee.name}`);
      lastId = payee._id;

      payee.save((err) => {
        if (err) { errors.push(`Payee has errored: ${payee._id} (${payee.name}) - ${err}`); }
        cb();
      });
    }, (err) => {
      if (payees && payees.length === limit) {
        flushPayeesDetails(lastId, total + limit, callback);
      } else {
        if (errors.length > 0) {
          logger.error('🤬 There were some errors during this run 🤬')
          errors.forEach((error) => logger.error(error) );
        }

        logger.info('Completed payees save')
        callback();
      }
    });
  });
}

flushPayeesDetails(null, 0, () => {
  process.exit(0);
})