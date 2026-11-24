const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');

const Cost = require('../../../models/cost');
const Period = require('../../../models/period');
const Contract = require('../../../models/contract');
const Release = require('../../../models/release');
const Track = require('../../../models/track');

const CatalogueOverwritingData = require('../../catalogueOverwritingData');
const runCostCalculations = require('../cost/runCostCalculations');

const CalculateCosts = {
  calculate: (statement, db, bigQuery, client, callback) => {
    Period.findById(statement.periodId)
      .then((period) => {
        if (!period) {
          return callback(new Error('Period could not be found when attempting to calculate costs'));
        }
        Contract.findById(statement.contractId)
          .then((contract) => {
            if (!contract) {
              return callback(new Error(`Contract with ID ${statement.contractId} could not be found when trying to calculate costs`));
            }
            // Only run if period have costs associated
            if (period.costIds?.length > 0) {
              // Get catalogue for overwriting
              const options = { joinArraysToString: true };
              CatalogueOverwritingData.get(client, options, (err, catalogueData) => {
                // Setup BigQuery
                bigQuery.setupFile(() => {
                  // Get unique releaseIds and trackIds associated with this contract
                  async.parallel({
                    releaseIds(asyncCb) {
                      Release.distinct('_id', { clientId: statement.clientId, 'costsRights.contractId': statement.contractId })
                        .then((releaseIds) => {
                          asyncCb(null, releaseIds);
                        })
                        .catch((err) => {
                          logger.error(err);
                          asyncCb(err);
                        });
                    },
                    trackIds(asyncCb) {
                      Track.distinct('_id', { clientId: statement.clientId, 'costsRights.contractId': statement.contractId })
                        .then((trackIds) => {
                          asyncCb(null, trackIds);
                        })
                        .catch((err) => {
                          logger.error(err);
                          asyncCb(err);
                        });
                    },
                  }, (err, distinctValues) => {
                    // Get costs associated with contract, releases and tracks
                    Cost.find({ clientId: statement.clientId, _id: { $in: period.costIds.map((id) => ObjectId.createFromHexString(id)) }, $or: [{ contractIds: statement.contractId }, { releaseIds: { $in: distinctValues.releaseIds } }, { trackIds: { $in: distinctValues.trackIds } }] })
                      .then((costs) => {
                        // Loop through costs
                        async.eachSeries(costs, (cost, costCb) => {
                          // Calculate Costs
                          runCostCalculations(cost, db, bigQuery, client, period, catalogueData, contract, null, costCb);
                        }, (err) => {
                          if (err) {
                            callback(err);
                          } else {
                            // Finalise Big Query file
                            bigQuery.writeFileToDb(bigQuery.costsTable, (err) => {
                              callback(err);
                            });
                          }
                        });
                      })
                      .catch((err) => {
                        logger.error(err);
                        callback(err);
                      });
                  });
                });
              });
            } else {
              callback();
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(new Error(`Contract with ID ${statement.contractId} could not be found when trying to calculate costs`));
          });
      })
      .catch((err) => {
        logger.error(err);
        callback(new Error('Period could not be found when attempting to calculate costs'));
      });
  },
};

module.exports = CalculateCosts;
