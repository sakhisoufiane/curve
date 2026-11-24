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
        salesInput(event, (err, paramSalesOutput) => {
          if (err) {
            logger.error(err);
            callback(err);
          } else if (paramSalesOutput) {
            object.units = paramSalesOutput.units;
            object.grossRevenue = paramSalesOutput.grossRevenue;
            object.lines = paramSalesOutput.lines;
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
      salesOutput(event, (err, paramSalesOutput) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else if (paramSalesOutput) {
          object.netPayout = paramSalesOutput.netPayout;
          object.proRataGrossAmount = paramSalesOutput.proRataGrossAmount;
          object.reservesWithheld = paramSalesOutput.reservesWithheld;
          object.withholdingTax = paramSalesOutput.withholdingTax;
          if ((!object.units || object.units === 0) && paramSalesOutput.units) { object.units = paramSalesOutput.units; }
          if ((!object.grossRevenue || object.grossRevenue === 0) && paramSalesOutput.grossRevenue) { object.grossRevenue = paramSalesOutput.grossRevenue; }
          if ((!object.lines || object.lines === 0) && paramSalesOutput.lines) { object.lines = paramSalesOutput.lines; }
          if ((!object.salesFileIds || object.salesFileIds === []) && paramSalesOutput.salesFileIds) { object.salesFileIds = paramSalesOutput.salesFileIds; }
          cb();
        } else {
          object.netPayout = 0;
          cb();
        }
      });
    },
    function (cb) {
      // This will return a total of all cost input amounts after any conversion to the Home Currency
      costsInput(event, (err, grossCostsTotal) => {
        if (err) return cb(err);

        object.grossCosts = grossCostsTotal || 0;
        cb();
      });
    },
    function (cb) {
      costsOutput(event, (err, paramCostsOutput) => {
        if (err) {
          logger.error(err);
          callback(err);
        } else if (paramCostsOutput) {
          object.netCosts = paramCostsOutput.netCosts;

          if ((!object.costIds || object.costIds === []) && paramCostsOutput.costIds) { object.costIds = paramCostsOutput.costIds; }
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
  const sumColumns = [
    { column: 'units', displayAs: 'units' },
    { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
  ];
  event.bigQuery.getSalesInputAggregate('periodId', sumColumns, 'lines', event.outputFilter, (err, result) => {
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
      const sumColumns = [
        { column: 'units', displayAs: 'units' },
        { column: 'homeCurrencyNetAmount', displayAs: 'grossRevenue' },
        { column: 'proRataAmount', displayAs: 'proRataGrossAmount' },
        { column: 'calculationOutput', displayAs: 'netPayout' },
        { column: 'reserve', displayAs: 'reservesWithheld' },
        { column: 'withholdingTax', displayAs: 'withholdingTax' },
      ];
      async.parallel([
        function (paraCb) {
          event.bigQuery.getAggregate(event.bigQuery.outputTable, 'periodId', sumColumns, 'lines', event.salesOutputFilter, {}, (err, groupedData) => {
            if (groupedData && groupedData.length > 0) {
              output.units = groupedData[0].units;
              output.grossRevenue = groupedData[0].grossRevenue;
              output.proRataGrossAmount = groupedData[0].proRataGrossAmount;
              output.lines = groupedData[0].lines;
              output.netPayout = groupedData[0].netPayout;
              output.reservesWithheld = groupedData[0].reservesWithheld;
              output.withholdingTax = groupedData[0].withholdingTax;
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

// Get total costs input amounts (after any exchange rate conversion)
function costsInput(event, callback) {
  event.bigQuery.getMultiDistinct(event.bigQuery.costsTable, ['costId', 'calculationInput', 'amount'], event.outputFilter, (err, costs) => {
    if (!costs?.length) return callback();

    const grossCostTotal = costs.reduce((acc, cost) => acc + (cost.calculationInput || cost.amount), 0);
    callback(null, grossCostTotal);
  });
}

function costsOutput(event, callback) {
  async.waterfall([
    function (cb) {
      const output = {};
      async.parallel([
        function (paraCb) {
          event.bigQuery.getAggregate(event.bigQuery.costsTable, 'periodId', [{ column: 'amount', displayAs: 'grossCosts' }, { column: 'calculationInput', displayAs: 'homeCurrencyGrossCosts' }, { column: 'calculationOutput', displayAs: 'netCosts' }], 'lines', event.outputFilter, {}, (err, groupedData) => {
            if (groupedData && groupedData.length > 0) {
              // Get gross costs in the homeCurrency, fallback to cost amount otherwise.
              output.grossCosts = (groupedData[0].homeCurrencyGrossCosts || groupedData[0].homeCurrencyGrossCosts === 0) ? groupedData[0].homeCurrencyGrossCosts : groupedData[0].grossCosts;
              output.netCosts = groupedData[0].netCosts;
            }
            paraCb(err);
          });
        },
        function (paraCb) {
          event.bigQuery.getDistinct(event.bigQuery.costsTable, 'costId', event.outputFilter, (err, costIds) => {
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
