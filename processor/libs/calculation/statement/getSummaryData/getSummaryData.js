const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Contract = require('../../../../models/contract');
const Company = require('../../../../models/company');
const Statement = require('../../../../models/statement');

const headlineFigures = require('../../../singleStatementHeadlineFigures');
const analysisFigures = require('../../../singleStatementAnalysisFigures');
const GetStatementData = require('../getStatementData');
const associatedAddToContractIds = require('../associatedAddToContractIds');
const { statementHelpers } = require('../statementHelpers');

const GetSummaryData = {
  checkForSummary: (statement, db, bigQuery, client, period, callback) => {
    // Find contract associated with statement
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (!contract) {
          return callback(new Error(`Could not find contract with the ID ${statement.contractId} in checking for summary`));
        }
        // Check it is found, and if it is set for summary totals
        if (contract && contract.summaryContractTotals) {
          let company = {};
          Company.findById(contract.companyId)
            .then((foundCompany) => {
              // Call getSummaryData
              company = foundCompany || {};
            })
            .catch((err) => {
              logger.error(`Error finding company for contract ${contract._id}: ${err.message}`, err);
            })
            .finally(() => {
              GetSummaryData.getSummaryData(statement, db, bigQuery, client, company, period, callback);
            });
        } else {
          // Return with any find errors
          callback();
        }
      })
      .catch((err) => {
        logger.error(`Error checking for summary for statement ${statement._id}: ${err.message}`, err);
        callback(new Error(`Could not find contract with the ID ${statement.contractId} in checking for summary`));
      });
  },
  getSummaryData: (statement, db, bigQuery, client, company, period, callback) => {
    async.waterfall([
      function (cb) {
        GetSummaryData.getSummaryHeadlineData(statement, db, bigQuery, client, company, cb);
      },
      function (cb) {
        Statement.findById(statement._id)
          .then((found) => {
            statement = found;
          })
          .catch((err) => {
            // Project Bongo: This seems like a bug @Arjun
            statement = null;
          })
          .finally(() => {
            if (client.features?.dmp === true) return cb();
            GetSummaryData.getSummaryAnalysisData(statement, db, bigQuery, client, company, cb);
          });
      },
      function (cb) {
        GetStatementData.setContractFigures(statement, db, cb);
      },
    ], callback);
  },
  getSummaryHeadlineData: (incomingStatement, db, bigQuery, client, company, callback) => {
    Statement.findById(incomingStatement._id)
      .then((statement) => {
        Contract.findById(statement.contractId)
          .then((contract) => {
            // Get Contracts transferring into the contract
            associatedAddToContractIds(statement, (err, contractIds) => {
              // Build object for statement building
              const object = {
                db,
                bigQuery,
                salesOutputDatabaseTable: client.periodSalesDatabaseTable,
                costsOutputDatabaseTable: client.periodCostsDatabaseTable,
                outputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
                salesOutputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
                costsFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
              };

              if (statement.partitionNo && !contract.summaryContractTotals) {
                object.outputFilter.contractPartitionNo = statement.partitionNo;
                object.salesOutputFilter.contractPartitionNo = statement.partitionNo;
              }

              const suppressZeroValueInExport = company.suppressZeroValueInExport || client.suppressZeroValueInExport;
              if (suppressZeroValueInExport) {
                object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
              }

              // Set display separated deductions from the company settings, fallback to the client.
              let displaySeparatedDeductions = false;
              let customDeductionName;

              if (contract.companyId && contract.contractType !== 'Mechanical') {
                displaySeparatedDeductions = company.displaySeparatedDeductions === true;
                ({ customDeductionName } = company);
              } else if (contract.contractType !== 'Mechanical') {
                displaySeparatedDeductions = client.displaySeparatedDeductions === true;
                ({ customDeductionName } = client);
              }

              headlineFigures(object, (err, output) => {
                if (err) {
                  callback(err);
                } else {
                  // Set values here, for use in calculation later on
                  const units = output.units ? output.units : 0;
                  let grossAmount = output.grossRevenue ? output.grossRevenue : 0;
                  const proRataGrossAmount = output.proRataGrossAmount ? output.proRataGrossAmount : 0;
                  const netAmount = output.netPayout ? output.netPayout : 0;
                  const grossCosts = output.grossCosts ? output.grossCosts : 0;
                  const netCosts = output.netCosts ? output.netCosts : 0;
                  const reservesWithheld = output.reservesWithheld ? output.reservesWithheld : 0;
                  const { withholdingTax } = output;
                  const lines = output.lines ? output.lines : 0;
                  const deductionAmount = output.deduction ? output.deduction : 0;
                  // Set gross amount to pro rata amount for distributors
                  if (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution') {
                    grossAmount = proRataGrossAmount;
                  }
                  const updateObject = {
                    units,
                    grossAmount,
                    proRataGrossAmount,
                    netAmount,
                    grossCosts,
                    netCosts,
                    reservesWithheld,
                    lines,
                    deductionAmount,
                    salesFilesIds: output.salesFileIds,
                    costIds: output.costIds,
                    contractType: contract.type,
                    profitShareRate: contract.profitSharePercentage,
                    netOutput: netAmount - netCosts,
                    displaySeparatedDeductions,
                    customDeductionName,
                  };
                  // Only update withholding if there is data for it
                  if (withholdingTax) {
                    updateObject.withholdingTax = withholdingTax;
                  }
                  Statement.findByIdAndUpdate(statement._id, { $set: updateObject })
                    .then(() => {
                      callback();
                    })
                    .catch((err) => {
                      logger.error(`Error updating statement in getSummaryHeadlineData for statement id ${statement._id}: ${err.message}`, err);
                      callback(err);
                    });
                }
              });
            });
          })
          .catch((err) => {
            logger.error(`Error in getSummaryHeadlineData finding contract with id ${incomingStatement.contractId}: ${err.message}`, err);
            callback(err);
          });
      })
      .catch((err) => {
        logger.error(`Error in getSummaryHeadlineData finding statement with id ${incomingStatement._id}: ${err.message}`, err);
        callback(err);
      });
  },
  getSummaryAnalysisData: (statement, db, bigQuery, client, company, callback) => {
    // Find contract
    Contract.findById(statement.contractId)
      .then((contract) => {
        // Get Contracts transferring into the contract
        associatedAddToContractIds(statement, (err, contractIds) => {
          // Build object for statement building
          const object = {
            db,
            bigQuery,
            client,
            salesOutputDatabaseTable: client.periodSalesDatabaseTable,
            costsOutputDatabaseTable: client.periodCostsDatabaseTable,
            outputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
            salesOutputFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
            costsFilter: { periodId: statement.periodId, contractId: { $in: contractIds } },
            outputSalesValue: 'contractCurrencyCalculationOutput',
          };

          if (statement.partitionNo && !contract.summaryContractTotals) {
            object.outputFilter.contractPartitionNo = statement.partitionNo;
            object.salesOutputFilter.contractPartitionNo = statement.partitionNo;
          }

          const suppressZeroValueInExport = company.suppressZeroValueInExport || client.suppressZeroValueInExport;
          if (suppressZeroValueInExport) {
            object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
          }
          // Call AnalysisFigures
          analysisFigures(object, (err, output) => {
            if (err) {
              // Handle Errors
              callback(err);
            } else {
              // Set gross amount to pro rata amount for distributors
              if (output && output.gross && (client.clientType === 'Distributor' || contract.statementDesign === 'Distribution')) {
                // Update fields to take pro-rata amount rather than gross amount
                ['territories', 'distributionChannels', 'configurations', 'sources', 'subSources', 'releases', 'tracks', 'works'].forEach((field) => {
                  if (output.gross[field]) {
                    output.gross[field] = output.gross[field].map((item) => {
                      item.value = item.proRataGrossAmount;
                      return item;
                    });
                  }
                });
              }
              // Limit to top 10,000 releases, tracks and works
              const analysis = statementHelpers.sortAndLimitCatalogueAnalysisData(output, 10_000);
              // Update Statement Data
              Statement.findByIdAndUpdate(statement._id, { $set: { analysis } })
                .then(() => {
                  callback();
                })
                .catch((err) => {
                  logger.error(`Error updating statement in getSummaryAnalysisData for statement id ${statement._id}: ${err.message}`, err);
                  callback(err);
                });
            }
          });
        });
      })
      .catch((err) => {
        logger.error(`Error in getSummaryAnalysisData finding contract with id ${statement.contractId}: ${err.message}`, err);
        callback(err);
      });
  },
};

module.exports = GetSummaryData;
