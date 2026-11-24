const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Period = require('../../../../models/period');
const Contract = require('../../../../models/contract');
const Statement = require('../../../../models/statement');
const PaymentGroup = require('../../../../models/paymentGroup');
const Payment = require('../../../../models/payment');
const Escalation = require('../../../../models/escalation');
const BatchTask = require('../../../../models/batchTask');

const clearPeriodData = require('../../../clearPeriod');

let period; let recalculation; let db; let bigQuery;

const Clear = {
  clearPeriod: async (inputPeriod, inputDb, inputBigQuery) => {
    period = inputPeriod;
    db = inputDb;
    bigQuery = inputBigQuery;
    ({ recalculation } = period); // read period recalculation {} to determine if we are running a partial

    const deletePayments = new Promise((resolve, reject) => {
      Clear.deletePayments((err) => {
        if (err) { reject(err); } else { resolve(); }
      });
    });

    const deleteStatemetns = Clear.deleteStatements();

    const deleteFiles = new Promise((resolve, reject) => {
      Clear.deleteFiles((err) => {
        if (err) { reject(err); } else { resolve(); }
      });
    });

    const setPeriodValues = Clear.setPeriodValues();
    const clearPeriodValues = Clear.clearPeriodValues();
    const resetEscalationTrackingFigures = Clear.resetEscalationTrackingFigures();

    await Promise.all([deletePayments, deleteStatemetns, deleteFiles, setPeriodValues, clearPeriodValues, resetEscalationTrackingFigures]);
  },
  deleteFiles: (callback) => {
    logger.info(`${period._id} DELETING FILES`);
    async.parallel([
      function (cb) {
        if (period.allCalculatedSalesCsv) {
          fileManager.deleteFromS3(period.allCalculatedSalesCsv, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.allCalculatedCostsCsv) {
          fileManager.deleteFromS3(period.allCalculatedCostsCsv, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.unreportedSalesCsv) { // && !!period.recalculation.salesFiles
          fileManager.deleteFromS3(period.unreportedSalesCsv, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // do we need to add modified costs ids array to recalculation object?
        if (period.unreportedCostsCsv) { // && !!period.recalculation.costIds
          fileManager.deleteFromS3(period.unreportedCostsCsv, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.suspenseCsv) {
          fileManager.deleteFromS3(period.suspenseCsv, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.generalLedgerSummary) {
          fileManager.deleteFromS3(period.generalLedgerSummary, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.customStatement) {
          fileManager.deleteFromS3(period.customStatement, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        if (period.statementsZip) {
          fileManager.deleteFromS3(period.statementsZip, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Remove any previously incomplete batch tasks
        BatchTask.deleteMany({ periodId: period._id.toString(), status: { $ne: 'Complete' } }).then(() => cb()).catch(cb);
      },
    ], callback);
  },
  deletePayments: (callback) => {
    logger.info(`${period._id} DELETING PAYMENTS`);
    PaymentGroup.findOne({ clientId: period.clientId, periodId: period._id.toString() })
      .then((paymentGroup) => {
        if (!paymentGroup) {
          callback();
        } else {
          const deletePaymentsFilter = { clientId: period.clientId, paymentGroupId: paymentGroup._id.toString() };

          // Only delete payments for modified contracts when running  partial (unless recalc contains modified sales files, then process all)
          if (period.recalculation?.type === 'Partial' && (period.recalculation?.contractIds?.length > 0 && !period.recalculation?.salesFiles)) {
            logger.info(`${period._id} Only deleting payments for ${period.recalculation?.contractIds}`);
            deletePaymentsFilter.contractId = { $in: period.recalculation?.contractIds };
          }

          Payment.find(deletePaymentsFilter)
            .then((payments) => {
              async.eachLimit(payments, 5, (payment, cb) => {
                payment.deleteTransactions = true;
                payment.deleteOne()
                  .then(() => {
                    cb();
                  })
                  .catch((err) => {
                    logger.error(`Payment Deletion Errored on ${payment._id.toString()} Period ID: ${period._id.toString()}`);
                    logger.error(err);
                    cb();
                  });
              }, () => {
                // Only remove the payment group if it's full recalculation, if the group is empty it will be deleted automatically as part of the calculation at a later stage anyway.
                if (period.recalculation.type === 'Partial' && (period.recalculation?.contractIds && !period.recalculation?.salesFiles)) {
                  callback();
                } else {
                  paymentGroup.deleteOne()
                    .then(() => {
                      callback();
                    })
                    .catch((err) => {
                      logger.error(`Payment Group Deletion Errored on ${paymentGroup._id.toString()} Period ID: ${period._id.toString()}`);
                      logger.error(err);
                      callback();
                    });
                }
              });
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        }
      })
      .catch((err) => {
        logger.error(err);
        // Project Bongo: Same as previous functionality, maybe not correct
        callback();
      });
  },
  deleteStatements: async () => {
    logger.info(`${period._id} Deleting associated statements`);

    const deleteStatementFilter = { clientId: period.clientId, periodId: period._id.toString() };
    // If running a partial AND we have modified contracts but NO modified sales files - just delete affected statements
    if (period.recalculation?.type === 'Partial' && period.recalculation?.contractIds && !period.recalculation?.salesFiles) {
      logger.info(`${period._id} Only deleting statements for ${period.recalculation.contractIds}`);
      deleteStatementFilter.contractId = { $in: period.recalculation.contractIds };
    }
    logger.debug({ deleteStatementFilter });

    const statements = await Statement.find(deleteStatementFilter);
    if (!statements?.length) return;

    await async.eachLimit(statements, 5, async (statement) => {
      await statement.deleteOne();
    });
  },
  setPeriodValues: async () => {
    logger.info(`${period._id} Setting Period Values`);

    const values = {
      completedCatalogueItems: 0,
      completedCostCatalogueItems: 0,
      units: null,
      grossAmount: null,
      netAmount: null,
      grossCosts: null,
      netCosts: null,
      lines: null,
      valid: false,
      completedCatalinvalidLinesogueItems: null,
      calculationStatus: null,
      calculationError: null,
      allCalculatedSalesCsv: null,
      allCalculatedCostsCsv: null,
      statementsZipPublicLink: null,
      unreportedSalesCsv: null,
      unreportedCostsCsv: null,
      statementsZip: null,
      analysis: null,
      processEndTime: null,
      calculationNotes: [],
    };

    // Clear Period Values
    await Period.findByIdAndUpdate(period._id, { $set: values });
  },
  clearPeriodValues: async () => {
    logger.info(`${period._id} Clearing Period Values`);
    const filter = { clientId: period.clientId };
    if (period.contractType === 'Mechanical') {
      filter.contractType = 'Mechanical';
    }
    if (recalculation.contractIds) {
      filter._id = { $in: recalculation.contractIds };
    }

    const contractIds = await Contract.distinct('_id', filter).catch(logger.error);

    const data = {
      db,
      bigQuery,
      recalculation,
      costsDatabaseTable: 'costs',
      clientId: period.clientId,
      periodId: period._id.toString(),
      periodSalesFiles: period.salesFilesIds,
      periodCostIds: period.costIds,
      contractIds: [],
    };
    if (contractIds?.length) { data.contractIds = contractIds.map((contractId) => contractId.toString()); }

    // Manage MCPS contract ID when period is MCPS
    if (period.contractType === 'MCPS') {
      data.contractIds = ['MCPS'];
    }
    // Call clearPeriod lib
    await new Promise((resolve, reject) => {
      clearPeriodData(data, (err) => {
        if (err) { reject(err); } else { resolve(); }
      });
    });
  },
  resetEscalationTrackingFigures: async () => {
    // Reset Escalation Tracking Figures
    logger.info(`${period._id} Resetting Escalation Tracking Figures`);
    const filter = { clientId: period.clientId, periodId: period._id };
    // When dealing with a recalculation, only reset the escalations for the recalculated contracts
    if (recalculation.contractIds?.length) {
      filter.contractId = { $in: recalculation.contractIds };
    } else {
      // Otherwise get all the contracts the period is going to calculate
      const contractsFilter = { clientId: period.clientId, accountingPeriod: period.accountingPeriodType, active: true };
      contractsFilter.contractType = period.contractType === 'Mechanical' ? 'Mechanical' : { $ne: 'Mechanical' };
      const contractIds = (await Contract.find(contractsFilter).select('_id')).map((contract) => contract._id);
      filter.contractId = { $in: contractIds };
    }
    const escalations = await Escalation.find(filter);
    await async.eachLimit(escalations, 20, async (escalation) => {
      // Only copy the trackers object when it has keys in it, to make sure we're not losing the previous calculation trackers when a period is rerun after it's errored before setting the new escalations.
      if (escalation.trackers && Object.keys(escalation.trackers).length) {
        escalation.previousCalculationTrackers = escalation.trackers;
        escalation.trackers = {};
        await escalation.save();
      }
    });
  },
};

module.exports = Clear;
