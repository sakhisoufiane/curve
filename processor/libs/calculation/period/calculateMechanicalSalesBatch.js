const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const mongoose = require('mongoose');

const Client = require('../../../models/client');

const CalculateContract = require('../contract/calculateContract');
const CalculateSalesBatch = require('./calculateSalesBatch');
const CompletedItemsUpdater = require('../completedItemsUpdater');

const CalculateMechanicalSalesBatch = {
  calculateMechanicalSalesBatch: (period, batchTask, callback) => {
    const { contracts, mainQuery, mechanicalQuery, object } = batchTask.value;

    Client.findById(period.clientId)
      .then((client) => {
        // Get MongoDB connection from mongoose
        const { db } = mongoose.connection;
        // Setup BigQuery connection
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        // Setup file for writing
        bigQuery.setupFile(() => {
          logger.debug(`${period._id} Running Mechanical Batch, No of contracts ${contracts.length}`);
          // Get filter
          // Instead of building this again, we are taking a copy of mainQuery. Could not see a reason why we are building the same query again
          const newFilter = { ...mainQuery };
          if (mechanicalQuery && mechanicalQuery.length > 0) {
            newFilter.$or2 = mechanicalQuery;
          }
          CalculateSalesBatch.buildMultiContractFilter(contracts, bigQuery, period, newFilter, null, 'Mechanical', (err, query) => {
            logger.debug(query);
            if (err) {
              // Handle Error and store against batch task
              batchTask.status = 'Errored';
              batchTask.error = 'Failed to build multi contract filter';
              batchTask.save()
                .then(() => {
                  callback(err);
                })
                .catch((saveErr) => {
                  logger.error(saveErr);
                  callback(err);
                });
            } else if (query) {
              // Get Data
              const selectFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
              const distinctFields = ['id', 'contractId', 'salesFileId', 'catType', 'releaseId', 'trackId', 'workId', 'distributionChannel', 'configuration', 'priceCategory', 'territory', 'saleDate', 'transactionDate', 'source', 'subSource', 'description', 'units', 'sharePercentage', 'returnUnits', 'originalCurrency', 'exchangeRate', 'grossAmount', 'netAmount', 'homeCurrencyGrossAmount', 'homeCurrencyNetAmount', 'perUnitRate', 'homeCurrencyPerUnitRate', 'retailPrice', 'homeCurrencyRetailPrice', 'salePrice', 'homeCurrencySalePrice', 'duration', 'production', 'episode', 'dateFrom', 'dateTo', 'catNo', 'barcode', 'catalogueReleaseTitle', 'catalogueReleaseVersion', 'catalogueReleaseArtist', 'catalogueReleaseLabel', 'catalogueCatNo', 'catalogueReleaseForeignId', 'catalogueBarcode', 'ppd', 'proRataAmount', 'catalogueFormat', 'mechanicalBasisPercentage', 'totalMechanicalAmount', 'catalogueTrackTitle', 'catalogueTrackVersion', 'catalogueTrackArtist', 'catalogueTrackLabel', 'catalogueIsrc', 'catalogueTrackForeignId', 'mechanicalRate', 'catalogueWorkTitle', 'catalogueWorkComposer', 'catalogueIdentifier', 'catalogueWorkForeignId', 'catalogueIswc', 'catalogueTunecode', 'status', 'currency2GrossAmount', 'currency2NetAmount', 'currency2PerUnitRate', 'currency2RetailPrice', 'currency2SalePrice', 'currency3GrossAmount', 'currency3NetAmount', 'currency3PerUnitRate', 'currency3RetailPrice', 'currency3SalePrice', 'currency4GrossAmount', 'currency4NetAmount', 'currency4PerUnitRate', 'currency4RetailPrice', 'currency4SalePrice', 'partitionNo'];
              // Set timestamp
              // const timestamp = moment().format('YYYYMMDDHHmmSSssss');
              bigQuery.joinSalesCalculationFilter(selectFields, distinctFields, query, { }, (err, salesData) => {
                if (err) {
                  // Handle Error and store against batch task
                  batchTask.status = 'Errored';
                  batchTask.error = err.message;
                  batchTask.save()
                    .then(() => {
                      callback(err);
                    })
                    .catch((saveErr) => {
                      logger.error(saveErr);
                      callback(err);
                    });
                } else {
                  logger.info(`${period._id} Batch Loaded, size ${salesData.length}`);
                  // Init completedItemsUpdater
                  const completedItemsUpdater = new CompletedItemsUpdater({
                    periodId: period._id,
                    fieldToIncrease: 'completedCatalogueItems',
                  });
                  async.eachLimit(contracts, 10, (contract, contractCb) => {
                    CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, null, salesData, completedItemsUpdater, null, contractCb);
                  }, (eachErr) => {
                    if (eachErr) {
                      // Stop completedItemsUpdater
                      completedItemsUpdater.stop();
                      // Handle Error and store against batch task
                      batchTask.status = 'Errored';
                      batchTask.error = eachErr.message;
                      batchTask.save()
                        .then(() => {
                          callback(eachErr);
                        })
                        .catch((saveErr) => {
                          logger.error(saveErr);
                          callback(eachErr);
                        });
                    } else {
                      bigQuery.writeFileToDb(bigQuery.outputTable, (writeErr) => {
                        if (writeErr) {
                          // Handle Error and store against batch task
                          logger.error(`${period._id} runBatchCalculation ${batchTask._id} Errored:`, writeErr);
                          batchTask.status = 'Errored';
                          batchTask.error = writeErr.message;
                          batchTask.save()
                            .then(() => {
                              callback(writeErr);
                            })
                            .catch((saveErr) => {
                              logger.error(saveErr);
                              callback(writeErr);
                            });
                        } else {
                          // Update batch task to be complete
                          logger.info(`${period._id} Completed Calculating Sales Batch ${batchTask._id}`);
                          batchTask.status = 'Complete';
                          batchTask.save()
                            .then(() => {
                              callback();
                            })
                            .catch((saveErr) => {
                              logger.error(saveErr);
                              callback(saveErr);
                            });
                        }
                      });
                    }
                  });
                }
              });
            } else {
              callback();
            }
          });
        });
      })
      .catch((err) => {
        logger.error(`${period._id} Error retrieving client for BatchTask ${batchTask._id}:`, err);
        batchTask.status = 'Errored';
        batchTask.error = 'Failed to retrieve client';
        batchTask.save()
          .then(() => {
            callback(err);
          })
          .catch((saveErr) => {
            logger.error(saveErr);
            callback(err);
          });
      });
  },

};

module.exports = CalculateMechanicalSalesBatch;
