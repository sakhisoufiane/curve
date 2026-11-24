const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');

const Contract = require('../../../models/contract');
const Statement = require('../../../models/statement');
const Escalation = require('../../../models/escalation');

const clearPeriod = require('../../clearPeriod');
const DeleteAssociations = require('./deleteAssociations');

const Clear = {
  clearStatement: (statement, db, bigQuery, client, callback) => {
    async.parallel([
      function (cb) {
        DeleteAssociations.clearTransactionsForRerunningPeriod(statement, cb);
      },
      (cb) => DeleteAssociations.deletePayeeTransactions(statement).then(cb).catch(cb),
      function (cb) {
        DeleteAssociations.deleteFiles(statement, cb);
      },
      function (cb) {
        DeleteAssociations.deletePayments(statement, cb);
      },
      function (cb) {
        // Clear Period Values
        Statement.findByIdAndUpdate(statement._id, {
          $set:
          {
            openingBalance: null,
            units: null,
            grossAmount: null,
            netAmount: null,
            grossCosts: null,
            netCosts: null,
            reservesWithheld: null,
            reservesReleased: null,
            netOutput: null,
            closingBalance: null,
            lines: null,
            valid: null,
            profitShareRate: null,
            profitShareBalance: null,
            profitShareNetAmount: null,
            profitShareUnrecoupedAdvanceStart: null,
            profitShareAdvanceRecouped: null,
            otherTransactions: null,
            payments: null,
            analysis: {},
            allFilesZip: null,
            allFilesZipPublicLink: null,
            salesCsv: null,
            salesCsvPublicLink: null,
            costsCsv: null,
            costsCsvPublicLink: null,
            pdf: null,
            pdfPublicLink: null,
            statementOfAccount: null,
            statementOfAccountPublicLink: null,
            selfBillingInvoice: null,
            selfBillingInvoicePublicLink: null,
            feesInvoice: null,
            feesInvoicePublicLink: null,
            calculationError: null,
            withholdingTax: null,
            customStatement: null,
            customStatementPublicLink: null,
            platoonRevenueReport: null,
            platoonRevenueReportPublicLink: null,
          },
        })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        Contract.findOne(new ObjectId(statement.contractId))
          .then((contract) => {
            const data = {
              db,
              bigQuery,
              type: 'Statement',
              salesDatabaseTable: client.salesDatabaseTable,
              writeSalesDatabaseTable: client.periodSalesDatabaseTable,
              costsDatabaseTable: 'costs',
              writeCostsDatabaseTable: client.periodCostsDatabaseTable,
              statementsDatabaseTable: 'statements',
              clientId: statement.clientId,
              periodId: statement.periodId,
              contractIds: [statement.contractId],
              partitionNos: [statement.partitionNo].filter(Boolean),
            };
            clearPeriod(data, (err) => {
              cb(err);
            });
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      },
      function (cb) {
        // Reset Escalation Tracking Figures
        Clear.resetEscalationTrackingFigures(statement)
          .then(cb)
          .catch((e) => cb(e.message));
      },
    ], callback);
  },
  resetEscalationTrackingFigures: async (statement) => {
    // Reset Escalation Tracking Figures
    logger.info(`${statement._id} Resetting Escalation Tracking Figures`);
    const filter = { clientId: statement.clientId, periodId: statement.periodId, contractId: statement.contractId };
    const escalation = await Escalation.findOne(filter);
    // Only copy the trackers object when it has keys in it, to make sure we're not losing the previous calculation trackers when a period is rerun after it's errored before setting the new escalations.
    if (escalation?.trackers && Object.keys(escalation.trackers).length) {
      escalation.previousCalculationTrackers = escalation.trackers;
      escalation.trackers = {};
      await escalation.save();
    }
  },
};

module.exports = Clear;
