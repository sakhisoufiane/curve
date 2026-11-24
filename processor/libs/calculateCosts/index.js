const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient, ObjectId } = require('mongodb');
const async = require('async');
const CostCalculator = require('./costCalculator');
const Cost = require('../../models/cost');

module.exports = function (event, callback) {
  /* event = {
    returnErrorAPI: "someErrorApi",
    returnCompleteAPI: "someCompleteApi",
    type: "Track",
    id: 123,
    costsDatabaseUrl: "mongo://user:pass@database",
    costsDatabaseTable: "someSales",
    writeCostsDatabaseUrl: "mongo://user:pass@database",
    writeCostsDatabaseTable: "someCostSales",
    periodId: "12345",
    periodEndDate: 12/12/2018,
    costIds: ["123", "234"],
    clientId: "321",
    contracts: [
      {
        objectPercentage: 50,
        contractId: "54321",
        terms: [{ territory: "GB", type: "Promo", rate: 50 }]
      }
    ]
  }
  */
  try {
    // Create General Filter
    const costIds = event.costIds ? event.costIds.map((costId) => new ObjectId(costId)) : [];
    const filter = { clientId: event.clientId, _id: { $in: costIds } };
    if (event.type === 'Release') {
      filter.releaseIds = new ObjectId(event.id);
    } else if (event.type === 'Track') {
      filter.trackIds = new ObjectId(event.id);
    } else if (event.type === 'Work') {
      filter.workIds = new ObjectId(event.id);
    } else if (event.type === 'Contract') {
      filter.contractIds = new ObjectId(event.id);
    }
    let db;
    async.waterfall([
      function (cb) {
        if (!event.db) {
          MongoClient.connect(event.costsDatabaseUrl, databaseUtils.getMongoConnectOpts()).then((mongoClient) => {
            const database = mongoClient.db(event.costsDatabaseName);
            return cb(null, database);
          }).catch(cb);
        } else {
          cb(null, event.db);
        }
      },
      function (database, cb) {
        db = database;
        checkCatalogueToCalculate(filter, db, (err, count) => {
          if (err) {
            logger.error(err);
            cb(err);
          } else if (count === 0) {
            cb();
          } else {
            // Loop through each contract
            async.eachSeries(event.contracts, (contract, contractCb) => {
              CostCalculator.byContract(contract, db, event.bigQuery, event.costsDatabaseTable, event.periodId, filter, event.periodEndDate, event.catalogueData, event.exchangeRates, contractCb);
            }, cb);
          }
        });
      },
    ], (err) => {
      if (err) { logger.error(err); }
      if (!event.db) { db.close(); }
      callback(err);
    });
    // Check for catalogue to calculate
  } catch (err) {
    logger.error(err);
    // Return error
    callback(err);
  }

  function checkCatalogueToCalculate(filter, db, callback) {
    Cost.countDocuments(filter)
      .then((count) => {
        callback(null, count);
      })
      .catch((err) => {
        callback(err);
      });
  }
};
