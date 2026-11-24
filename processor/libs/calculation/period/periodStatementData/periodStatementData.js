const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');

const Statement = require('../../../../models/statement');
const Contract = require('../../../../models/contract');
const Company = require('../../../../models/company');

const listFromNumber = require('../../../listFromNumber');
const statementHeadlineFigures = require('../../../statementHeadlineFigures');
const { statementAnalysisFigures } = require('../../../statementAnalysisFigures');
const calculationHelper = require('../../../calculationHelper');
const ProfitShare = require('../../profitShare');
const { GetSummaryData } = require('../../statement/getSummaryData');
const GetStatementData = require('../../statement/getStatementData');

const statementBatches = 500;

const PeriodStatementData = {
  statementBatches: (period, callback) => {
    Statement.countDocuments({ clientId: period.clientId, periodId: period._id.toString() })
      .then((count) => {
        const rounds = listFromNumber(Math.floor(count / statementBatches));
        callback(null, rounds);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getStatementData: (period, db, bigQuery, client, callback) => {
    // @todo only run for affected contracts if partial and no salesFiles changed ??????
    const { recalculation } = period;
    async.waterfall([
      function (cb) {
        // Get headline data for statements
        PeriodStatementData.getStatementHeadlineData(period, db, bigQuery, client, cb);
      },
      function (cb) {
        // Get analysis data for statements
        PeriodStatementData.getStatementAnalysisData(period, db, bigQuery, client, cb);
      },
    ], (err) => {
      if (err) {
        logger.error(`${period._id} getStatementData Errored:`, err);
        callback(err);
      } else {
        // Loop through statements
        // Get batches of statements
        PeriodStatementData.statementBatches(period, (err, rounds) => {
          // Loop through batches
          async.eachSeries(rounds, (round, roundCb) => {
            // Find statements in batch
            const statementFilter = { clientId: period.clientId, periodId: period._id.toString() };

            if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
              statementFilter.contractId = { $in: recalculation.contractIds };
            }
            Statement.find(statementFilter)
              .sort({ _id: 1 })
              .limit(statementBatches)
              .skip(round * statementBatches)
              .then((statements) => {
                // Run 5 statements concurrently
                async.eachLimit(statements, 5, (statement, statementCb) => {
                  // Get data for each statemment
                  async.waterfall([
                    function (cb) {
                      GetStatementData.getReleasedReserves(statement, period, cb);
                    },
                    function (cb) {
                      GetStatementData.getWithheldReserves(statement, period).then(cb).catch(cb);
                    },
                    function (cb) {
                      GetStatementData.setContractFigures(statement, db, cb);
                    },
                    function (cb) {
                      Statement.findById(statement._id)
                        .then((statement) => {
                          if (statement.contractType === 'Profit Share') {
                            ProfitShare.profitShare100Negative(statement, period, cb);
                          } else if (statement.contractType === 'Profit Share - Flexible') {
                            ProfitShare.profitShareSplitNegative(statement, period, cb);
                          } else {
                            cb();
                          }
                        })
                        .catch((err) => {
                          logger.error(err);
                          // Project Bongo: Normally if it errored it would actually throw a runtime error
                          // but this is clearly the intention of the previous code
                          // so we just call the callback without the error
                          cb();
                        });
                    },
                    function (cb) {
                      // Set default analysis figures if none picked up
                      if (!statement.analysis || !statement.analysis.net) {
                        statement.analysis = { gross: {}, net: {} };
                        statement.save()
                          .then((statement) => {
                            cb(null, statement);
                          })
                          .catch((err) => {
                            logger.error(err);
                            cb(err);
                          });
                      } else {
                        cb();
                      }
                    },
                  ], statementCb);
                }, roundCb);
              })
              .catch((err) => {
                logger.error(err);
                roundCb(err);
              });
          }, callback);
        });
      }
    });
  },
  getStatementHeadlineData: (period, db, bigQuery, client, callback) => {
    const { recalculation } = period;
    // Prepare query for StatementHeadlineFigures
    const object = {
      db,
      bigQuery,
      recalculation: period.recalculation,
      outputFilter: { periodId: period._id.toString() },
      salesOutputFilter: { periodId: period._id.toString(), royaltyRate: { $ne: 0 }, objectPercentage: { $ne: 0 } },
      costsFilter: { periodId: period._id.toString() },
    };

    if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
      object.salesOutputFilter.contractId = { $in: recalculation.contractIds };
      object.outputFilter.contractId = { $in: recalculation.contractIds };
    }

    if (client.suppressZeroValueInExport) {
      object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
    }

    // Call StatementHeadlineFigures lib
    statementHeadlineFigures(object, (err, output) => {
      if (err) {
        // Handle Errors
        callback(err);
      } else {
        // Loop through returned data
        async.eachSeries(Object.keys(output), (contractId, cb) => {
          // Find contract
          let contract;
          Contract.findById(contractId)
            .then(async (foundContract) => {
              contract = foundContract;
            })
            .catch((err) => {
              logger.error(`Error finding a contract for statementHeadlineFigures: ${err}`);
            })
            .finally(async () => {
              // Set gross amount to pro rata amount for distributors
              if (client.clientType === 'Distributor' || (contract && contract.statementDesign === 'Distribution')) {
                output[contractId].grossAmount = output[contractId].proRataGrossAmount;
              }

              // Set display separated deductions from the company settings, fallback to the client
              output[contractId].deductionAmount = output[contractId].deduction || 0;
              if (contract) {
                if (contract.companyId && contract.contractType !== 'Mechanical') {
                  const company = await Company.findById(contract.companyId);
                  output[contractId].displaySeparatedDeductions = company?.displaySeparatedDeductions === true;
                  output[contractId].customDeductionName = company?.customDeductionName;
                } else if (contract.contractType !== 'Mechanical') {
                  output[contractId].displaySeparatedDeductions = client?.displaySeparatedDeductions === true;
                  output[contractId].customDeductionName = client?.customDeductionName;
                }
              }

              // Update Statement Data
              Statement.updateOne({ clientId: client._id.toString(), contractId, periodId: period._id.toString() }, { $set: output[contractId] })
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            });
        }, callback);
      }
    });
  },
  getStatementAnalysisData: (period, db, bigQuery, client, callback) => {
    const { recalculation } = period;
    // Prepare query for StatementAnalysisFigures
    const object = {
      db,
      bigQuery,
      outputFilter: { periodId: period._id.toString() },
      salesOutputFilter: { periodId: period._id.toString() },
      client,
    };

    if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
      object.salesOutputFilter.contractId = { $in: recalculation.contractIds };
      object.outputFilter.contractId = { $in: recalculation.contractIds };
    }

    if (client.suppressZeroValueInExport) {
      object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
    }

    // Call StatementAnalysisFigures
    statementAnalysisFigures(object, (err, output) => {
      if (err) {
        // Handle Errors
        callback(err);
      } else {
        // Loop through returned data
        async.eachSeries(Object.keys(output), (contractId, cb) => {
          // Find contract
          let contract;
          Contract.findById(contractId)
            .then(async (foundContract) => {
              contract = foundContract;
            })
            .catch((err) => {
              logger.error(`Error finding a contract for statementAnalysisData: ${err.message}`, err);
            })
            .finally(async () => {
              // Set gross amount to pro rata amount for distributors
              if (output[contractId].gross && (client.clientType === 'Distributor' || (contract && contract.statementDesign === 'Distribution'))) {
                // Update fields to take pro-rata amount rather than gross amount
                ['territories', 'distributionChannels', 'configurations', 'sources', 'subSources', 'releases', 'tracks', 'works'].forEach((field) => {
                  if (output[contractId].gross[field]) {
                    output[contractId].gross[field] = output[contractId].gross[field].map((item) => {
                      item.value = item.proRataGrossAmount;
                      return item;
                    });
                  }
                });
              }

              // Set display separated deductions from the company settings, fallback to the client
              output[contractId].deductionAmount = output[contractId].deduction || 0;
              if (contract) {
                if (contract.companyId && contract.contractType !== 'Mechanical') {
                  const company = await Company.findById(contract.companyId);
                  output[contractId].displaySeparatedDeductions = company?.displaySeparatedDeductions === true;
                  output[contractId].customDeductionName = company?.customDeductionName;
                } else if (contract.contractType !== 'Mechanical') {
                  output[contractId].displaySeparatedDeductions = client?.displaySeparatedDeductions === true;
                  output[contractId].customDeductionName = client?.customDeductionName;
                }
              }
              // Limit to top 1000 releases, tracks and works
              if (output[contractId].gross?.releases) {
                output[contractId].gross.releases = calculationHelper.sortAndLimit(output[contractId].gross.releases, 'value', 10000);
              }
              if (output[contractId].gross?.tracks) {
                output[contractId].gross.tracks = calculationHelper.sortAndLimit(output[contractId].gross.tracks, 'value', 10000);
              }
              if (output[contractId].gross?.works) {
                output[contractId].gross.works = calculationHelper.sortAndLimit(output[contractId].gross.works, 'value', 10000);
              }
              if (output[contractId].net?.releases) {
                output[contractId].net.releases = calculationHelper.sortAndLimit(output[contractId].net.releases, 'value', 10000);
              }
              if (output[contractId].net?.tracks) {
                output[contractId].net.tracks = calculationHelper.sortAndLimit(output[contractId].net.tracks, 'value', 10000);
              }
              if (output[contractId].net?.works) {
                output[contractId].net.works = calculationHelper.sortAndLimit(output[contractId].net.works, 'value', 10000);
              }

              // Update Statement Data
              Statement.updateOne({ clientId: client._id.toString(), contractId, periodId: period._id.toString() }, { $set: { analysis: output[contractId] } })
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(err);
                  cb(err);
                });
            });
        }, callback);
      }
    });
  },
  setSummaryStatementHeadlineAndAnalysis: (period, db, bigQuery, client, callback) => {
    PeriodStatementData.summaryStatements(period, (err, statements) => {
      if (err) {
        return callback(err);
      }

      // Run 5 statements concurrently
      async.eachLimit(statements, 5, (statement, cb) => {
        // Get data for each statemment
        GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, cb);
      }, callback);
    });
  },
  summaryStatements: (period, callback) => {
    // Returns all contracts that have a balance transferred to it
    const { recalculation } = period;
    // Get all contracts with Add To cross contracts
    const filter = {
      clientId: period.clientId, contractType: period.contractType, accountingPeriod: period.accountingPeriodType, summaryContractTotals: true,
    };
    if (period.contractType === 'Mechanical') {
      filter.contractType = 'Mechanical';
    } else {
      filter.contractType = { $ne: 'Mechanical' };
    }

    if (recalculation?.contractIds?.length > 0 && !recalculation.salesFiles) {
      filter._id = { $in: recalculation.contractIds.map((id) => ObjectId.createFromHexString(id)) };
    }

    Contract.find(filter, '_id')
      .then((contracts) => {
        if (contracts?.length > 0) {
          // Find contracts from the output array, and return to callback
          const statementFilter = { clientId: period.clientId, periodId: period._id.toString(), contractId: { $in: contracts.map((contract) => contract._id.toString()) } };
          Statement.find(statementFilter)
            .then((statements) => {
              callback(null, statements);
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
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

module.exports = PeriodStatementData;
