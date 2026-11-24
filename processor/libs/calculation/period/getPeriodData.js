const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Client = require('../../../models/client');
const Period = require('../../../models/period');

const headlineFigures = require('../../periodHeadlineFigures');
const analysisFigures = require('../../periodAnalysisFigures');

const GetPeriodData = {
  getData: (period, db, bigQuery, callback) => {
    async.waterfall([
      function (cb) {
        // Write headline figures for period
        GetPeriodData.getHeadlineData(period, db, bigQuery, cb);
      },
      function (cb) {
        // Write analysis data for period
        GetPeriodData.getAnalysisData(period, db, bigQuery, cb);
      },
    ], callback);
  },
  getHeadlineData: (period, db, bigQuery, callback) => {
    Client.findById(period.clientId)
      .then((client) => {
        const object = {
          db,
          bigQuery,
          salesInputDatabaseTable: client.salesDatabaseTable,
          salesOutputDatabaseTable: client.periodSalesDatabaseTable,
          costsInputDatabaseTable: 'costs',
          costsOutputDatabaseTable: client.periodCostsDatabaseTable,
          clientId: period.clientId,
          inputFilter: { periodIds: period._id.toString() },
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: { periodId: period._id.toString() },
        };

        if (client.suppressZeroValueInExport) {
          object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
        }

        headlineFigures(object, (err, output) => {
          if (err) {
            callback(err);
          } else {
            Period.findByIdAndUpdate(period._id, {
              $set: {
                units: output.units ? output.units : 0,
                grossAmount: output.grossRevenue ? output.grossRevenue : 0,
                netAmount: output.netPayout ? output.netPayout : 0,
                grossCosts: output.grossCosts ? output.grossCosts : 0,
                netCosts: output.netCosts ? output.netCosts : 0,
                lines: output.lines ? output.lines : 0,
              },
            })
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  getAnalysisData: (period, db, bigQuery, callback) => {
    Client.findById(period.clientId)
      .then((client) => {
        // @todo clean down deprecated object props
        const object = {
          db,
          bigQuery,
          salesInputDatabaseTable: client.salesDatabaseTable,
          salesOutputDatabaseTable: client.periodSalesDatabaseTable,
          costsInputDatabaseTable: 'costs',
          costsOutputDatabaseTable: client.periodCostsDatabaseTable,
          clientId: period.clientId,
          inputFilter: { periodIds: period._id.toString() },
          outputFilter: { periodId: period._id.toString() },
          salesOutputFilter: { periodId: period._id.toString() },
          outputSalesValue: 'calculationInput',
          type: 'Period',
        };

        if (client.suppressZeroValueInExport) {
          object.salesOutputFilter.contractCurrencyCalculationOutput = { $ne: 0 };
        }

        analysisFigures(object, (analysysErr, output) => {
          if (analysysErr) {
            callback(analysysErr);
          } else {
            Period.findByIdAndUpdate(period._id, { $set: { analysis: output } })
              .then(() => {
                callback();
              })
              .catch((err) => {
                logger.error(err);
                callback(err);
              });
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
};

module.exports = GetPeriodData;
