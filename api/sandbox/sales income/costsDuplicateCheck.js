require('dotenv').config();
require('../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const WriteCsv = require('../libs/writeCsv');
const Cost = require('../models/cost');
const Client = require('../models/client');

const limit = 1000;
let count = 0;
const outputTemp = `${appRootDir}/tmp/costsWithMultiCatalogueReport-${moment().format('X')}.csv`;
const invalidCosts = [];

const checkCosts = (client, lastId, total, callback) => {
  const filter = { clientId: client._id }
  if (lastId) { filter._id = { $gt: lastId } }

  Cost.find(filter).sort({ _id: 1 }).limit(limit).exec((err, costs) => {
    if (err) { return callback(err); }
    async.eachLimit(costs, 50, (cost, eachLimitCb) => {
      count += 1;
      process.stdout.write(`\r${count}/${costs.length + total} - ${cost._id}`);
      lastId = cost._id;
      if (cost.contractIds.length > 1 || cost.releaseIds.length > 1 || cost.trackIds.length > 1) {
        invalidCosts.push([client.name, cost._id])
      }
      eachLimitCb();
    }, (err) => {
      if (err) { return callback(err); }

      if (costs && costs.length === limit) {
        checkCosts(client, lastId, total + limit, callback);
      } else {
        callback();
      }
    });
  });
};


async.waterfall([
  (cb) => {
    const filter = {};
    Client.find(filter, { name: 1 }).sort({ name: 1 }).exec(cb)
  },
  (clients, cb) => {
    async.eachSeries(clients, (client, eachCb) => {
      logger.info(`============= Checking client: ${client.name} ==================`);
      checkCosts(client, null, 0, (err) => eachCb(err));
    }, cb);
  },
  (cb) => {
    const writer = new WriteCsv({ headers: ['Client ID', 'Cost ID'], outputLocation: outputTemp });
    writer.addData(invalidCosts, () => {
      writer.write(cb);
  });
  }
], (err) => {
  if (err) { logger.error(err) }
  logger.info(`================== 🗂 Report written to ${outputTemp} 🗂 ==================`);
  logger.info(`================== ⭐️ Check Complete ⭐️ ==================`);
  process.exit(0);
});
