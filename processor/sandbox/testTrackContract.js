// File not functional to to non existent lmabda library
/* eslint-disable max-len, no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Track = require('../models/track');
const Period = require('../models/period');
const Client = require('../models/client');
const RoyaltyCalculator = require('../libs/lambdaFunctions/lambdaCalculation/libs/royaltyCalculator');
const lambda = require('../libs/lambda');

// Release.findById("5a78bb2a7c45f17f0862bdf5", function(err, release) {
// logger.info(release);
// release.contractsForSalesCalculation("Quarterly", function(contracts) {
// logger.info(contracts[0].terms.sales);
// var sales = contracts[0].terms.sales;
// var filter = { salesFileId: { $in: ["5b36223e4762dd6993653cbc"] } }
// var objs = sales.map(function(sale) { return RoyaltyCalculator.createSaleFilterAndCalculation(sales[0], 100, "5b380d804762dd6993653d7c", filter); })
// RoyaltyCalculator.createFilterAndCalculations({ terms: { sales: contracts, deductions: [] }, objectPercentage: 100 }, filter, "5b380d804762dd6993653d7c", function(err, specificFilters) {
// logger.info(err);
// logger.info(specificFilters.sales[0].filter);
// });
//
// });
// });

// Period.findById("5b380d804762dd6993653d7c", function(err, period) {
// logger.info(period.usedReleaseIds.includes("5a78bb2a7c45f17f0862bdf5"));
// });

Period.findById('5b47db486ab271325ec7c40b', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      Track.findById('5a6a479f24866f7393920e78', (err, track) => {
        const object = {
          salesDatabaseTable: client.salesDatabaseTable,
          writeSalesDatabaseTable: client.periodSalesDatabaseTable,
          periodId: period._id.toString(),
          salesFileIds: period.salesFilesIds,
        };
        track.contractsForSalesCalculation(period.accountingPeriodType, (data) => {
          const newObject = JSON.parse(JSON.stringify(object));
          newObject.contracts = data;
          newObject.type = 'Track';
          newObject.id = track._id;
          newObject.db = db;
          lambda.salesCalculation(newObject, (err, payload) => {
            logger.info(payload);
          });
        });
      });
    });
  });
});
