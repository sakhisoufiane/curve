const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

module.exports = function (event, callback) {
  /* event = {
    salesInputDatabaseUrl: "mongo://user:pass@database",
    salesInputDatabaseTable: "someSales",
    salesOutputDatabaseUrl: "mongo://user:pass@database",
    salesOutputDatabaseTable: "someSales",
    costsInputDatabaseUrl: "mongo://user:pass@database",
    costsInputDatabaseTable: "someSales",
    costsOutputDatabaseUrl: "mongo://user:pass@database",
    costsOutputDatabaseTable: "someSales",
    inputFilter: { periodIds: "321" },
    outputFilter: { periodId: "321" }
  }
  */

  const object = {};
  async.parallel([
    function (cb) {
      if (event.inputFilter) {
        salesInput(event, (err, salesOutput) => {
          if (err) {
            logger.error(err);
            callback(err);
          } else if (salesOutput) {
            object.units = salesOutput.units;
            object.grossRevenue = salesOutput.grossRevenue;
            object.lines = salesOutput.lines;
            cb();
          } else {
            object.units = 0;
            object.grossRevenue = 0;
            object.lines = 0;
            cb();
          }
        });
      } else {
        cb();
      }
    },
    function (cb) {
      salesOutput(event, (err, salesOutput) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else if (salesOutput) {
          object.netPayout = salesOutput.netPayout;
          object.proRataGrossAmount = salesOutput.proRataGrossAmount;
          object.reservesWithheld = salesOutput.reservesWithheld;
          object.withholdingTax = salesOutput.withholdingTax;
          object.mechanicalDeduction = salesOutput.mechanicalDeduction;
          object.deduction = salesOutput.deduction;
          if ((!object.units || object.units === 0) && salesOutput.units) { object.units = salesOutput.units; }
          if ((!object.grossRevenue || object.grossRevenue === 0) && salesOutput.grossRevenue) { object.grossRevenue = salesOutput.grossRevenue; }
          if ((!object.lines || object.lines === 0) && salesOutput.lines) { object.lines = salesOutput.lines; }
          if ((!object.salesFileIds || object.salesFileIds === []) && salesOutput.salesFileIds) { object.salesFileIds = salesOutput.salesFileIds; }
          cb();
        } else {
          object.netPayout = 0;
          cb();
        }
      });
    },
    function (cb) {
      if (event.inputFilter) {
        costsInput(event, (err, costsOutput) => {
          if (err) {
            logger.error(err);
            callback(err);
          } else if (costsOutput) {
            object.grossCosts = costsOutput.grossCosts;
            cb();
          } else {
            object.grossCosts = 0;
            cb();
          }
        });
      } else {
        cb();
      }
    },
    function (cb) {
      costsOutput(event, (err, costsOutput) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else if (costsOutput) {
          object.netCosts = costsOutput.netCosts;
          if ((!object.grossCosts || object.grossCosts === 0) && costsOutput.grossCosts) { object.grossCosts = costsOutput.grossCosts; }
          if ((!object.costIds || object.costIds === []) && costsOutput.costIds) { object.costIds = costsOutput.costIds; }
          cb();
        } else {
          object.netCosts = 0;
          cb();
        }
      });
    },
  ], (err) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else {
      callback(null, object);
    }
  });
};

function salesInput(event, callback) {
  event.bigQuery.getSalesInputAggregate('periodId', [{ column: 'units', displayAs: 'units' }, { column: `${event.prefix}NetAmount`, displayAs: 'grossRevenue' }], 'lines', event.outputFilter, (err, result) => {
    if (err) {
      callback(err);
    } else if (result) {
      callback(null, result[0]);
    } else {
      callback(null, {});
    }
  });
}

function salesOutput(event, callback) {
  async.waterfall([
    function (cb) {
      const output = {};
      async.parallel([
        function (paraCb) {
          event.bigQuery.getAggregate(event.bigQuery.outputTable, 'periodId', [{ column: 'units', displayAs: 'units' }, { column: 'contractCurrencyNetAmount', displayAs: 'grossRevenue' }, { column: 'contractCurrencyProRataAmount', displayAs: 'proRataGrossAmount' }, { column: 'contractCurrencyCalculationOutput', displayAs: 'netPayout' }, { column: 'contractCurrencyReserve', displayAs: 'reservesWithheld' }, { column: 'contractCurrencyWithholdingTax', displayAs: 'withholdingTax' }, { column: 'contractCurrencyMechanicalDeduction', displayAs: 'mechanicalDeduction' }, { column: 'contractCurrencyDeduction', displayAs: 'deduction' }], 'lines', event.salesOutputFilter, {}, (err, groupedData) => {
            if (groupedData && groupedData.length > 0) {
              output.units = groupedData[0].units;
              output.grossRevenue = groupedData[0].grossRevenue;
              output.proRataGrossAmount = groupedData[0].proRataGrossAmount;
              output.lines = groupedData[0].lines;
              output.netPayout = groupedData[0].netPayout;
              output.reservesWithheld = groupedData[0].reservesWithheld;
              output.withholdingTax = groupedData[0].withholdingTax;
              output.mechanicalDeduction = groupedData[0].mechanicalDeduction;
              output.deduction = groupedData[0].deduction;
            }

            paraCb(err);
          });
        },
        function (paraCb) {
          event.bigQuery.getDistinct(event.bigQuery.outputTable, 'salesFileId', event.salesOutputFilter, (err, salesFileIds) => {
            output.salesFileIds = salesFileIds;
            paraCb(err);
          });
        },
      ], (err) => {
        cb(err, output);
      });
    },
  ], callback);
}

function costsInput(event, callback) {
  const collection = event.db.collection(event.costsInputDatabaseTable);
  collection.aggregate([{
    $match: event.inputFilter,
  }, {
    $group: {
      _id: '$periodId',
      grossCosts: { $sum: '$amount' },
    },
  }], { allowDiskUse: true })
    .toArray()
    .then((output) => {
      if (output && output.length > 0) {
        callback(null, output[0]);
      } else {
        callback(null, {});
      }
    })
    .catch(callback);
}

function costsOutput(event, callback) {
  async.waterfall([
    function (cb) {
      const output = {};
      async.parallel([
        function (paraCb) {
          event.bigQuery.getAggregate(event.bigQuery.costsTable, 'periodId', [{ column: 'contractCurrencyAmount', displayAs: 'grossCosts' }, { column: 'contractCurrencyCalculationOutput', displayAs: 'netCosts' }], 'lines', event.costsFilter ? event.costsFilter : event.outputFilter, {}, (err, groupedData) => {
            if (groupedData && groupedData.length > 0) {
              output.grossCosts = groupedData[0].grossCosts;
              output.netCosts = groupedData[0].netCosts;
            }
            paraCb(err);
          });
        },
        function (paraCb) {
          event.bigQuery.getDistinct(event.bigQuery.costsTable, 'costId', event.costsFilter ? event.costsFilter : event.outputFilter, (err, costIds) => {
            output.costIds = costIds;
            paraCb(err);
          });
        },
      ], (err) => {
        cb(err, output);
      });
    },
  ], callback);
}
