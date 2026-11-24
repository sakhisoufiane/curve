require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Payee = require('../../models/payee');

const limit = 1000;
const updateFlag = false; // Change this to true to update the country field
let count = 0;
const errors = [];

function processPayees(lastId, total, callback) {
  const filter = {
    // for later use, we could incorporate the new country type and check for any rogue entries (made via API)
    country: { $in: ['WW', 'Europe', 'Asia', 'Americas', 'Oceania'] },
  };

  if (lastId) {
    filter._id = { $gt: lastId };
  }

  Payee.find(filter, '_id name clientId country').sort({ _id: 1 }).limit(limit).exec((err, payees) => {
    if (err) {
      logger.error(`Error fetching payees: ${err}`);
      return callback(err);
    }

    if (payees.length === 0) {
      logger.info('No more payees found');
      return callback();
    }

    payees.forEach(payee => {
      logger.info(`Payee ID: ${payee._id}, Name: ${payee.name}, Client ID: ${payee.clientId}, Country: ${payee.country}`);
    });

    lastId = payees[payees.length - 1]._id;
    count += payees.length;


    if (updateFlag) {
      const payeeIds = payees.map(payee => payee._id);
      Payee.updateMany({ _id: { $in: payeeIds } }, { $set: { country: '' } }, (err) => {
        if (err) {
          errors.push(`Error updating payees: ${err}`);
        }
        processPayees(lastId, total + payees.length, callback);
      });
    } else {
      processPayees(lastId, total + payees.length, callback);
    }
  });
}

processPayees(null, 0, () => {
  if (errors.length > 0) {
    logger.error('Errors encountered during this run');
    errors.forEach(error => logger.error(error));
  }
  logger.info('Process completed');
  logger.info('Total payees - ', count)
  process.exit(0);
});
