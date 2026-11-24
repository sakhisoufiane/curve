const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SalesCalculator = require('@curveroyaltysystems/sales-calculator');

const Period = require('../../../models/period');
const Contract = require('../../../models/contract');

const PeriodCalculateSales = require('../period/calculateSales');
const CalculateContract = require('../contract/calculateContract');
const CompletedItemsUpdater = require('../completedItemsUpdater');
const { CalculationHelpers } = require('../helpers');

const CalculateSales = {
  calculate: (statement, db, bigQuery, client, callback) => {
    bigQuery.setupFile((err) => {
      if (err) {
        callback(err);
      } else {
        // Refresh Period
        Period.findById(statement.periodId)
          .then(async (period) => {
            const salesFileIds = period.salesFilesIds; // NOTE salesFileIds (code) / salesFilesIds (db)
            let { salesPartitionNos } = period;
            const { resolvedGroupSalesFileIds, resolvedGroupSalesPartitionNos } = period;

            let salesFileIdsForFilter = [...salesFileIds];

            if (client.features?.suspense) {
              // Merge resolvedGroupSalesPartitionNos into salesPartitionNos ONLY when feature flag is set
              salesPartitionNos = [...new Set([...salesPartitionNos, ...resolvedGroupSalesPartitionNos])];
              // Merge resolvedGroupSalesFileIds into salesFileIds ONLY when feature flag is set - this is used for filtering sales in royalty calculator, not the select query to get relevant sales lines for processing
              salesFileIdsForFilter = [...new Set([...salesFileIds, ...resolvedGroupSalesFileIds])];
            }

            // Prepare general object
            const object = {
              salesDatabaseTable: client.salesDatabaseTable,
              writeSalesDatabaseTable: client.periodSalesDatabaseTable,
              periodId: period._id.toString(),
              salesFileIds: salesFileIdsForFilter,
              periodType: period.contractType,
            };

            logger.debug('calculateSales');
            logger.debug({ salesFileIds, salesPartitionNos, salesFileIdsForFilter });

            // Build query for filtering sales
            let mainQuery = await CalculationHelpers.buildMainQuery({ client, period, statement, bigQuery, salesFileIds }).catch((buildQueryErr) => {
              logger.error(`${period._id} ${statement?._id || ''} Error building main query: `, buildQueryErr);
              callback(buildQueryErr);
            });
            mainQuery = CalculationHelpers.addPartitionFilterToQuery({ mainQuery, salesPartitionNos });

            // Run new refactored sales calculations for: clients with the feature flag enabled, non-mechanical contracts, non MCPS contracts
            if (client.features?.refactoredSalesCalculation && period.contractType !== 'Mechanical' && period.contractType !== 'MCPS') {
              logger.info(`${period._id} Running Refactored Sales Calculation`);
              SalesCalculator.calculate({ period, client, object, query: mainQuery, contractId: statement.contractId }).then(() => {
              // Update sales file statuses
                PeriodCalculateSales.updateSalesFilesReportedStatus(period, callback);
              }).catch((callback));
            } else {
            // Call run sales
              CalculateSales.runContractSalesCalculations(statement, db, bigQuery, object, client, mainQuery, period, (err) => {
                if (err) {
                  callback(err);
                } else {
                // Write file to DB
                  bigQuery.writeFileToDb(bigQuery.outputTable, (err) => {
                    if (err) {
                    // Handle Errors
                      callback(err);
                    } else {
                    // Update sales file statuses
                      PeriodCalculateSales.updateSalesFilesReportedStatus(period, callback);
                    }
                  });
                }
              });
            }
          });
      }
    });
  },
  runContractSalesCalculations: (statement, db, bigQuery, object, client, mainQuery, period, callback) => {
    let totalLines = 0;
    // Find contracts for period
    const contractFilter = { clientId: period.clientId, accountingPeriod: period.accountingPeriodType };
    contractFilter.contractType = period.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
    Contract.findById(statement.contractId)
      .then((contract) => {
        PeriodCalculateSales.getContractSizes({ period, statement, bigQuery, contracts: [contract], client }, (err, contractSizes) => {
          if (err) {
            return callback(err);
          }
          if (contractSizes && contractSizes[contract._id.toString()]) {
            totalLines = contractSizes[contract._id.toString()];
          }
          // Init completedItemsUpdater
          const completedItemsUpdater = new CompletedItemsUpdater({
            periodId: period._id,
            fieldToIncrease: 'completedCatalogueItems',
          });
          CalculateContract.runSalesCalculation(contract, db, bigQuery, object, client, mainQuery, period, totalLines, null, completedItemsUpdater, null, (calcErr) => {
          // Stop completedItemsUpdater
            completedItemsUpdater.stop();
            callback(calcErr);
          });
        });
      })
      .catch(callback);
  },
};

module.exports = CalculateSales;
