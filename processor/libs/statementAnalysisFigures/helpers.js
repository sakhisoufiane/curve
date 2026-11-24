const async = require('async');

function costsOutput(event, callback) {
  event.bigQuery.getAggregate(
    event.bigQuery.costsTable,
    [
      { column: 'periodId', isSelector: true, isGroupBy: true },
      { column: 'contractId', isSelector: true, isGroupBy: true },
      { column: 'type', isSelector: true, isGroupBy: true },
    ],
    [
      { column: 'contractCurrencyAmount', displayAs: 'gross' },
      { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
    ],
    'lines',
    event.outputFilter,
    callback,
  );
}

function salesCalculations(standardFilter, bigQuery, table, objectType, client, callback) {
  async.parallel({
    distributionChannels(cb) {
      // Distribution Channel
      bigQuery.getAggregate(
        table,
        [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
    configurations(cb) {
      // Configuration
      bigQuery.getAggregate(
        table,
        [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'configuration', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
    territories(cb) {
      // Territory
      bigQuery.getAggregate(
        table,
        [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'territory', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
    sources(cb) {
      // Source
      bigQuery.getAggregate(
        table,
        [
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
          { column: 'source', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
    subSources(cb) {
      // Sub Source
      bigQuery.getAggregate(
        table,
        [{
          column: 'periodId', isSelector: true, isGroupBy: true,
        }, {
          column: 'contractId', isSelector: true, isGroupBy: true,
        }, {
          column: 'subSource', isSelector: true, isGroupBy: true,
        }],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
    releases(cb) {
      // Release
      const filter = JSON.parse(JSON.stringify(standardFilter));
      filter.catType = 'Release';
      if (client?.features?.releaseAnalyticsForTrackSales) {
        filter.catType = { $in: ['Release', 'Track'] };
        filter.releaseId = { $nin: [''] };
      }

      bigQuery.getAggregate(
        table,
        [
          { column: 'catalogueCatNo', isSelector: true, isGroupBy: true },
          { column: 'catalogueReleaseTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueReleaseVersion, '') AS catalogueReleaseVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueReleaseVersion, '')", isSelector: false, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        filter,
        cb,
      );
    },
    tracks(cb) {
      // Track
      const filter = JSON.parse(JSON.stringify(standardFilter));
      filter.catType = 'Track';

      bigQuery.getAggregate(
        table,
        [
          { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
          { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
          { column: "IFNULL(catalogueTrackVersion, '') AS catalogueTrackVersion", isSelector: true, isGroupBy: false },
          { column: "IFNULL(catalogueTrackVersion, '')", isSelector: false, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        filter,
        cb,
      );
    },
    works(cb) {
      // Work
      const filter = JSON.parse(JSON.stringify(standardFilter));
      filter.catType = 'Work';

      bigQuery.getAggregate(
        table,
        [
          { column: 'workId', isSelector: true, isGroupBy: true },
          { column: 'catalogueIdentifier', isSelector: true, isGroupBy: true },
          { column: 'catalogueWorkTitle', isSelector: true, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        filter,
        cb,
      );
    },
    configChannels(cb) {
      // Configuration by Distribution Channel
      bigQuery.getAggregate(
        table,
        [
          { column: 'configuration', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
          { column: 'periodId', isSelector: true, isGroupBy: true },
          { column: 'contractId', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: 'contractCurrencyCalculationInput', displayAs: 'gross' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyCalculationOutput', displayAs: 'net' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        cb,
      );
    },
  }, callback);
}

module.exports = {
  costsOutput,
  salesCalculations,
};
