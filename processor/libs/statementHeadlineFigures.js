const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

module.exports = function (event, callback) {
  /* event = {
    bigQuery,
    recalculation: period.recalculation,
    outputFilter: { periodId: "321" }
    salesOutputFilter: { periodId: "321" },
  }
  */

  const object = {};
  async.parallel({
    salesOutput(cb) {
      salesOutput(event, cb);
    },
    costsOutput(cb) {
      costsOutput(event, cb);
    },
  }, (err, result) => {
    if (err) {
      logger.error(err);
      callback(err);
    } else {
      // Loop through output data
      result.salesOutput.salesOutputData.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || {};
        object[item.contractId].units = item.units;
        object[item.contractId].grossAmount = item.grossRevenue;
        object[item.contractId].proRataGrossAmount = item.proRataGrossAmount;
        object[item.contractId].netAmount = item.netPayout;
        object[item.contractId].reservesWithheld = item.reservesWithheld;
        object[item.contractId].withholdingTax = item.withholdingTax;
        object[item.contractId].mechanicalDeduction = item.mechanicalDeduction;
        object[item.contractId].deduction = item.deduction;
      });
      result.salesOutput.salesFileIds.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || {};
        object[item.contractId].salesFilesIds = object[item.contractId].salesFilesIds || [];
        object[item.contractId].salesFilesIds.push(item.salesFileId);
      });
      // Loop thorugh cost data
      result.costsOutput.costsOutputData.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || {};
        object[item.contractId].grossCosts = item.grossCosts;
        object[item.contractId].netCosts = item.netCosts;
      });
      result.costsOutput.costIds.forEach((item) => {
        // Create statement object if it doesn't exist
        object[item.contractId] = object[item.contractId] || {};
        object[item.contractId].costIds = object[item.contractId].costIds || [];
        object[item.contractId].costIds.push(item.costId);
      });
      Object.keys(object).forEach((contractId) => {
        // logger.debug('statementHeadlineFigures: object.contractId', contractId);
        const sales = object[contractId].netAmount ? object[contractId].netAmount : 0;
        const costs = object[contractId].netCosts ? object[contractId].netCosts : 0;
        object[contractId].netOutput = sales - costs;
      });
      callback(null, object);
    }
  });
};

function salesOutput(event, callback) {
  async.parallel({
    salesOutputData(paraCb) {
      event.bigQuery.getAggregate(event.bigQuery.outputTable, [{ column: 'periodId', isSelector: true, isGroupBy: true }, { column: 'contractId', isSelector: true, isGroupBy: true }], [{ column: 'units', displayAs: 'units' }, { column: 'contractCurrencyNetAmount', displayAs: 'grossRevenue' }, { column: 'contractCurrencyProRataAmount', displayAs: 'proRataGrossAmount' }, { column: 'contractCurrencyCalculationOutput', displayAs: 'netPayout' }, { column: 'contractCurrencyReserve', displayAs: 'reservesWithheld' }, { column: 'contractCurrencyWithholdingTax', displayAs: 'withholdingTax' }, { column: 'contractCurrencyMechanicalDeduction', displayAs: 'mechanicalDeduction' }, { column: 'contractCurrencyDeduction', displayAs: 'deduction' }], 'lines', event.salesOutputFilter, {}, paraCb);
    },
    salesFileIds(paraCb) {
      event.bigQuery.getMultiDistinct(event.bigQuery.outputTable, ['salesFileId', 'contractId'], event.salesOutputFilter, paraCb);
    },
  }, callback);
}

function costsOutput(event, callback) {
  async.parallel({
    costsOutputData(paraCb) {
      event.bigQuery.getAggregate(event.bigQuery.costsTable, [{ column: 'periodId', isSelector: true, isGroupBy: true }, { column: 'contractId', isSelector: true, isGroupBy: true }], [{ column: 'contractCurrencyAmount', displayAs: 'grossCosts' }, { column: 'contractCurrencyCalculationOutput', displayAs: 'netCosts' }], 'lines', event.costsFilter ? event.costsFilter : event.outputFilter, {}, paraCb);
    },
    costIds(paraCb) {
      event.bigQuery.getMultiDistinct(event.bigQuery.costsTable, ['costId', 'contractId'], event.costsFilter ? event.costsFilter : event.outputFilter, paraCb);
    },
  }, callback);
}
