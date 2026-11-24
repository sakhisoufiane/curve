/**
 * @module runCostCalculations
 */
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Release = require('../../../models/release');
const Track = require('../../../models/track');
const Contract = require('../../../models/contract');

const calculateCosts = require('../../calculateCosts');
const ContractTerms = require('../contract/contractTerms');
const trackContractsForCostsCalculation = require('../track/contractsForCostsCalculation');
const releaseContractsForCostsCalculation = require('../release/contractsForCostsCalculation');

/**
 * Runs the calculation for the passed cost
 *
 * @param {object} cost - Instance of Cost model
 * @param {object} db - Instance of MongoDB connection
 * @param {object} bigQuery - Instance of BigQuery connection
 * @param {object} client - Instance of Client model
 * @param {object} period - Instance of Period model
 * @param {object} catalogueData - Catalogue data passed for mapping in the cost calculation
 * @param {object} contract - Instance of Contract model
 * @param {function(string)} callback - A callback that handles any errors
 */
module.exports = (cost, db, bigQuery, client, period, catalogueData, contract, completedItemsUpdater, callback) => {
  if (!cost || !client || !period) {
    return callback(new Error('Cost, Client and Period must all be passed to runCostCalculations'));
  }
  // Prepare general object
  const object = {
    costsDatabaseTable: 'costs',
    writeCostsDatabaseTable: client.periodCostsDatabaseTable,
    periodId: period._id.toString(),
    clientId: period.clientId,
    salesFileIds: period.salesFileIds, // used? doesn't seem to be
    costIds: [cost._id],
  };
  async.series([
    function (cb) {
      if (cost.releaseIds && cost.releaseIds.length > 0) {
        async.eachSeries(cost.releaseIds, (releaseId, releaseIdCb) => {
          Release.findById(releaseId)
            .then((release) => {
              if (release) {
                releaseContractsForCostsCalculation(release, period.accountingPeriodType, period.contractType, contract, (err, data) => {
                  const newObject = JSON.parse(JSON.stringify(object));
                  newObject.contracts = data;
                  newObject.type = 'Release';
                  newObject.id = release._id;
                  newObject.periodEndDate = period.endDate;
                  newObject.catalogueData = catalogueData;
                  newObject.exchangeRates = period.currencyExchangeRates;
                  newObject.db = db;
                  newObject.bigQuery = bigQuery;
                  newObject.costId = cost._id.toString();
                  calculateCosts(newObject, (calcErr) => {
                    // Increase completedCostCatalogueItems count if counter included
                    if (completedItemsUpdater) {
                      completedItemsUpdater.increaseCount(1);
                    }
                    releaseIdCb(calcErr);
                  });
                });
              } else {
                releaseIdCb();
              }
            })
            .catch((err) => {
              logger.error(err);
              releaseIdCb();
            });
        }, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (cost.trackIds && cost.trackIds.length > 0) {
        async.eachSeries(cost.trackIds, (trackId, trackIdCb) => {
          Track.findById(trackId)
            .then((track) => {
              if (track) {
                trackContractsForCostsCalculation(track, period.accountingPeriodType, period.contractType, contract, (err, data) => {
                  const newObject = JSON.parse(JSON.stringify(object));
                  newObject.contracts = data;
                  newObject.type = 'Track';
                  newObject.id = track._id;
                  newObject.catalogueData = catalogueData;
                  newObject.periodEndDate = period.endDate;
                  newObject.exchangeRates = period.currencyExchangeRates;
                  newObject.db = db;
                  newObject.bigQuery = bigQuery;
                  calculateCosts(newObject, (calcErr) => {
                    // Increase completedCostCatalogueItems count if counter included
                    if (completedItemsUpdater) {
                      completedItemsUpdater.increaseCount(1);
                    }
                    trackIdCb(calcErr);
                  });
                });
              } else {
                trackIdCb();
              }
            })
            .catch((err) => {
              logger.error(err);
              trackIdCb();
            });
        }, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (cost.contractIds && cost.contractIds.length > 0) {
        async.eachSeries(cost.contractIds, (contractId, contractIdCb) => {
          Contract.findById(contractId)
            .then((contract) => {
              if (contract) {
                ContractTerms.forCostsCalculation(contract, period.accountingPeriodType, (data) => {
                  const newObject = JSON.parse(JSON.stringify(object));
                  newObject.contracts = data;
                  newObject.type = 'Contract';
                  newObject.id = contract._id;
                  newObject.catalogueData = catalogueData;
                  newObject.periodEndDate = period.endDate;
                  newObject.exchangeRates = period.currencyExchangeRates;
                  newObject.db = db;
                  newObject.bigQuery = bigQuery;
                  calculateCosts(newObject, (calcErr) => {
                    // Increase completedCostCatalogueItems count if counter included
                    if (completedItemsUpdater) {
                      completedItemsUpdater.increaseCount(1);
                    }
                    contractIdCb(calcErr);
                  });
                });
              } else {
                contractIdCb();
              }
            })
            .catch((err) => {
              logger.error(err);
              contractIdCb();
            });
        }, cb);
      } else {
        cb();
      }
    },
  ], callback);
};
