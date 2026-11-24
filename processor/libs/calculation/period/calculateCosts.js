const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');

const Cost = require('../../../models/cost');
const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Track = require('../../../models/track');

const listFromNumber = require('../../listFromNumber');
const CatalogueOverwritingData = require('../../catalogueOverwritingData');
const runCostCalculations = require('../cost/runCostCalculations');
const CompletedItemsUpdater = require('../completedItemsUpdater');

const CalculateCosts = {
  calculate: (period, db, bigQuery, client, callback) => {
    const { recalculation, costIds } = period;
    const params = [period, db, bigQuery, client, callback];

    // Only run the costs calculation if costs are attached to the period - otherwise skip the stage
    if (!costIds || costIds.length === 0) {
      logger.info(`${period._id} Skipping Costs Calculation - no costs attached`);
      return callback();
    }

    // If running a partial and only salesFiles have changed then we have nothing to do here
    if (recalculation.salesFiles && !recalculation.contractIds) {
      logger.info(`${period._id} Skipping Costs Calculation - Recalculation with only sales file changes`);
      return callback();
    }

    // Otherwise determine if we have contracts to recalculate or running a full/initial
    if (recalculation.contractIds?.length > 0) {
      CalculateCosts.recalculateCosts(...params);
    } else {
      CalculateCosts.calculateFullCosts(...params);
    }
  },
  recalculateCosts: (period, db, bigQuery, client, callback) => {
    Period.findById(period._id)
      .then((period) => {
        const { clientId, recalculation } = period;
        const affectedReleaseIds = [];
        const affectedTrackIds = [];
        const affectedContractIds = [];
        Contract.find({ _id: { $in: recalculation.contractIds } })
          .then((contracts) => {
            // Get catalogue for overwriting
            const options = { joinArraysToString: true };
            CatalogueOverwritingData.get(client, options, (clientErr, catalogueData) => {
              // Return error
              if (clientErr) { return callback(clientErr); }
              // Loop through affected contracts to retrieve data
              async.eachLimit(contracts, 10, (contract, contractCb) => {
                // Get unique releaseIds and trackIds associated with this contract
                async.parallel({
                  releaseIds(asyncCb) {
                    Release.distinct('_id', { clientId, 'costsRights.contractId': contract._id })
                      .then((releaseIds) => {
                        asyncCb(null, releaseIds);
                      })
                      .catch((err) => {
                        logger.error(err);
                        asyncCb(err);
                      });
                  },
                  trackIds(asyncCb) {
                    Track.distinct('_id', { clientId, 'costsRights.contractId': contract._id })
                      .then((trackIds) => {
                        asyncCb(null, trackIds);
                      })
                      .catch((err) => {
                        logger.error(err);
                        asyncCb(err);
                      });
                  },
                }, (catErr, distinctValues) => {
                  // Return error
                  if (catErr) { return callback(catErr); }
                  // Get costs associated with contract, releases and tracks
                  affectedContractIds.push(contract._id);
                  if (distinctValues.releaseIds?.length > 0) { affectedReleaseIds.push(...distinctValues.releaseIds); }
                  if (distinctValues.trackIds?.length > 0) { affectedTrackIds.push(...distinctValues.trackIds); }
                  contractCb();
                });
              }, (err) => {
                if (err) {
                  callback(err);
                } else {
                  // Setup BigQuery
                  bigQuery.setupFile((bqSetupErr) => {
                    if (bqSetupErr) { return callback(bqSetupErr); }
                    Cost.find({
                      clientId,
                      _id: { $in: period.costIds.map((id) => new ObjectId(id)) }, // can we get more granular here ... probably not
                      $or: [{ contractIds: { $in: affectedContractIds } }, { releaseIds: { $in: affectedReleaseIds } }, { trackIds: { $in: affectedTrackIds } }],
                    })
                      .then((costs) => {
                        // Init completedItemsUpdater
                        const completedItemsUpdater = new CompletedItemsUpdater({
                          periodId: period._id,
                          fieldToIncrease: 'completedCostCatalogueItems',
                        });
                        // Loop through costs
                        async.eachSeries(costs, (cost, costCb) => {
                          // Calculate Costs
                          runCostCalculations(cost, db, bigQuery, client, period, catalogueData, null, completedItemsUpdater, costCb);
                        }, (err) => {
                          // Stop completedItemsUpdater
                          completedItemsUpdater.stop();
                          if (err) {
                            callback(err);
                          } else {
                            // Finalise Big Query file
                            bigQuery.writeFileToDb(bigQuery.costsTable, callback);
                          }
                        });
                      })
                      .catch((costsErr) => {
                        logger.error(costsErr);
                        callback(costsErr);
                      });
                  });
                }
              });
            });
          })
          .catch((contractsErr) => {
            logger.error(contractsErr);
            callback(contractsErr);
          });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  calculateFullCosts: (period, db, bigQuery, client, callback) => {
    Period.findById(period._id)
      .then((period) => {
        // Only run if period have costs associated
        const { costIds } = period;

        if (costIds?.length > 0) {
          const options = { joinArraysToString: true };
          CatalogueOverwritingData.get(client, options, (clientErr, catalogueData) => {
            // Return error
            if (clientErr) { return callback(clientErr); }
            // Setup BigQuery
            const limit = 1000;
            const costsCount = costIds.length;
            const rounds = listFromNumber(Math.floor(costsCount / limit));
            bigQuery.setupFile((bqSetupErr) => {
              if (bqSetupErr) { return callback(bqSetupErr); }
              // Init completedItemsUpdater
              const completedItemsUpdater = new CompletedItemsUpdater({
                periodId: period._id,
                fieldToIncrease: 'completedCostCatalogueItems',
              });

              logger.info(`${period._id.toString()} Calculating ${costsCount} costs`);

              let count = 0;
              async.eachSeries(rounds, (round, loopCb) => {
                Cost.find({ _id: { $in: costIds } })
                  .sort({ _id: 1 })
                  .limit(limit)
                  .skip(limit * round)
                  .then((costs) => {
                    // Loop through costs
                    async.eachSeries(costs, (cost, costCb) => {
                      count += 1;
                      // Log after every 100 costs
                      if (count % 100 === 0) { logger.info(`${period._id.toString()} Calculating cost ${count} of ${costsCount}`); }
                      runCostCalculations(cost, db, bigQuery, client, period, catalogueData, null, completedItemsUpdater, costCb);
                    }, loopCb);
                  })
                  .catch((costErr) => {
                    logger.error(costErr);
                    // Bongo refactor: This one I am unsure of, seems incorrect to callback in the async.eachSeries loop
                    // The loopCb is the callback for the async.eachSeries, so we should pass the error to that
                    // It will call the callback with the error after gracefully exiting the loop
                    // return callback(costErr); // I think this is incorrect
                    loopCb(costErr);
                  });
              }, (err) => {
                // Stop completedItemsUpdater
                completedItemsUpdater.stop();
                if (err) {
                  callback(err);
                } else {
                  bigQuery.writeFileToDb(bigQuery.costsTable, callback);
                }
              });
            });
          });
        } else {
          callback();
        }
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
};

module.exports = CalculateCosts;
