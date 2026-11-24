const async = require('async');

module.exports = function (event, callback) {
  const object = { gross: {}, net: {} };
  async.parallel([
    function (cb) {
      if (event.inputFilter) {
        salesInput(event, (err, salesOutput) => {
          if (err) {
            cb(err);
          } else {
            object.gross = Object.assign(object.gross, salesOutput);
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
          cb(err);
        } else {
          object.net = Object.assign(object.net, salesOutput.net);
          if (!event.inputFilter) { object.gross = Object.assign(object.gross, salesOutput.gross); }
          cb();
        }
      });
    },
    function (cb) {
      if (event.inputFilter) {
        costsInput(event, (err, costsOutput) => {
          if (err) {
            cb(err);
          } else if (costsOutput) {
            object.gross.costs = costsOutput;
            cb();
          } else {
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
          cb(err);
        } else if (costsOutput) {
          object.net.costs = costsOutput.net;
          if (!object.gross.costs || object.gross.costs.length === 0) { object.gross.costs = costsOutput.gross; }
          cb();
        } else {
          cb();
        }
      });
    },
  ], (err) => {
    if (err) {
      callback(err);
    } else {
      callback(null, object);
    }
  });
};

function salesInput(event, callback) {
  salesInputCalculations(event.outputFilter, `${event.prefix}NetAmount`, event.bigQuery, event.bigQuery.inputTable, event.type, callback);
}

function salesOutput(event, callback) {
  async.parallel({
    gross(paraCb) {
      salesCalculations(event.outputFilter, 'contractCurrencyCalculationInput', event.bigQuery, event.bigQuery.outputTable, event.type, event.client, paraCb);
    },
    net(paraCb) {
      salesCalculations(event.outputFilter, event.outputSalesValue, event.bigQuery, event.bigQuery.outputTable, event.type, event.client, paraCb);
    },
  }, callback);
}

function costsInput(event, callback) {
  const collection = event.db.collection(event.costsInputDatabaseTable);
  collection.aggregate([{
    $match: event.inputFilter,
  }, {
    $group: {
      _id: '$type',
      value: { $sum: '$amount' },
    },
  }])
    .toArray()
    .then((output) => {
      if (output) {
        output = output
          .map((o) => ({ type: o._id, value: o.value }))
          .filter((o) => o.value !== 0);
      }

      callback(null, output);
    })
    .catch(callback);
}

function costsOutput(event, callback) {
  async.parallel({
    gross(paraCb) {
      event.bigQuery.getAggregate(
        event.bigQuery.costsTable,
        'type',
        [
          { column: 'contractCurrencyAmount', displayAs: 'value' },
        ],
        'lines',
        event.costsFilter ? event.costsFilter : event.outputFilter,
        {},
        (err, output) => {
          if (output) {
            output = output
              .map((o) => ({ type: o.type, value: o.value }))
              .filter((o) => o.value !== 0);
          }
          paraCb(err, output);
        },
      );
    },
    net(paraCb) {
      event.bigQuery.getAggregate(
        event.bigQuery.costsTable,
        'type',
        [
          { column: 'contractCurrencyCalculationOutput', displayAs: 'value' },
        ],
        'lines',
        event.costsFilter ? event.costsFilter : event.outputFilter,
        {},
        (err, output) => {
          if (output) {
            output = output
              .map((o) => ({ type: o.type, value: o.value }))
              .filter((o) => o.value !== 0);
          }
          paraCb(err, output);
        },
      );
    },
  }, callback);
}

function salesInputCalculations(standardFilter, valueSource, bigQuery, table, objectType, callback) {
  const object = {};
  async.parallel([
    function (cb) {
      // Distribution Channel
      bigQuery.getSalesInputAggregate(
        'distributionChannel',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
        ],
        'lines',
        standardFilter,
        (err, output) => {
          if (output) {
            object.distributionChannels = output.map((o) => ({ type: o.distributionChannel, units: o.units, value: o.value }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Configuration
      bigQuery.getSalesInputAggregate(
        'configuration',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
        ],
        'lines',
        standardFilter,
        (err, output) => {
          if (output) {
            object.configurations = output.map((o) => ({ type: o.configuration, units: o.units, value: o.value }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Territory
      bigQuery.getSalesInputAggregate(
        'territory',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
        ],
        'lines',
        standardFilter,
        (err, output) => {
          if (output) {
            object.territories = output.map((o) => ({ type: o.territory, units: o.units, value: o.value }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Source
      bigQuery.getSalesInputAggregate(
        'source',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
        ],
        'lines',
        standardFilter,
        (err, output) => {
          if (output) {
            object.sources = output.map((o) => ({ type: o.source, units: o.units, value: o.value }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Sub Source
      bigQuery.getSalesInputAggregate(
        'subSource',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
        ],
        'lines',
        standardFilter,
        (err, output) => {
          if (output) {
            object.subSources = output.map((o) => ({ type: o.subSource, units: o.units, value: o.value }));
          }
          cb(err);
        },
      );
    },
  ], (err) => {
    callback(err, object);
  });
}

function salesCalculations(standardFilter, valueSource, bigQuery, table, objectType, client, callback) {
  const object = {};
  async.parallel([
    function (cb) {
      // Distribution Channel
      bigQuery.getAggregate(
        table,
        'distributionChannel',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.distributionChannels = output.map((o) => ({
              type: o.distributionChannel, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Configuration
      bigQuery.getAggregate(
        table,
        'configuration',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.configurations = output.map((o) => ({
              type: o.configuration, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Territory
      bigQuery.getAggregate(
        table,
        'territory',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.territories = output.map((o) => ({
              type: o.territory, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Source
      bigQuery.getAggregate(
        table,
        'source',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.sources = output.map((o) => ({
              type: o.source, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Sub Source
      bigQuery.getAggregate(
        table,
        'subSource',
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.subSources = output.map((o) => ({
              type: o.subSource, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
    function (cb) {
      // Release
      if (objectType !== 'Period') {
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
          ],
          [
            { column: 'units', displayAs: 'units' },
            { column: valueSource, displayAs: 'value' },
            { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
            { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
          ],
          'lines',
          filter,
          {},
          (err, output) => {
            if (output) {
              object.releases = output.map((o) => {
                const title = (o.catalogueReleaseVersion && o.catalogueReleaseVersion !== '') ? `${o.catalogueReleaseTitle} (${o.catalogueReleaseVersion})` : o.catalogueReleaseTitle;
                return {
                  type: o.catalogueCatNo, title, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
                };
              });
            }
            cb(err);
          },
        );
      } else {
        cb();
      }
    },
    function (cb) {
      // Track
      if (objectType !== 'Period') {
        const filter = JSON.parse(JSON.stringify(standardFilter));
        filter.catType = 'Track';

        bigQuery.getAggregate(
          table,
          [
            { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
            { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
            { column: "IFNULL(catalogueTrackVersion, '') AS catalogueTrackVersion", isSelector: true, isGroupBy: false },
            { column: "IFNULL(catalogueTrackVersion, '')", isSelector: false, isGroupBy: true },
          ],
          [
            { column: 'units', displayAs: 'units' },
            { column: valueSource, displayAs: 'value' },
            { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
            { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
          ],
          'lines',
          filter,
          {},
          (err, output) => {
            if (output) {
              object.tracks = output.map((o) => {
                const title = (o.catalogueTrackVersion && o.catalogueTrackVersion !== '') ? `${o.catalogueTrackTitle} (${o.catalogueTrackVersion})` : o.catalogueTrackTitle;
                return {
                  type: o.catalogueIsrc, title, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
                };
              });
            }
            cb(err);
          },
        );
      } else {
        cb();
      }
    },
    function (cb) {
      // Work
      if (objectType !== 'Period') {
        const filter = JSON.parse(JSON.stringify(standardFilter));
        filter.catType = 'Work';

        bigQuery.getAggregate(
          table,
          [
            { column: 'workId', isSelector: true, isGroupBy: true },
            { column: 'catalogueIdentifier', isSelector: true, isGroupBy: true },
            { column: 'catalogueWorkTitle', isSelector: true, isGroupBy: true },
          ],
          [
            { column: 'units', displayAs: 'units' },
            { column: valueSource, displayAs: 'value' },
            { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
            { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
          ],
          'lines',
          filter,
          {},
          (err, output) => {
            if (output) {
              object.works = output.map((o) => ({
                type: o.catalogueIdentifier, title: o.catalogueWorkTitle, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
              }));
            }
            cb(err);
          },
        );
      } else {
        cb();
      }
    },
    function (cb) {
      // Configuration by Distribution Channel
      bigQuery.getAggregate(
        table,
        [
          { column: 'configuration', isSelector: true, isGroupBy: true },
          { column: 'distributionChannel', isSelector: true, isGroupBy: true },
        ],
        [
          { column: 'units', displayAs: 'units' },
          { column: valueSource, displayAs: 'value' },
          { column: 'contractCurrencyProRataAmount', displayAs: 'proRataAmount' },
          { column: 'contractCurrencyDeduction', displayAs: 'deduction' },
        ],
        'lines',
        standardFilter,
        {},
        (err, output) => {
          if (output) {
            object.configurationByDistributionChannel = output.map((o) => ({
              distributionChannel: o.distributionChannel, configuration: o.configuration, units: o.units, value: o.value, proRataGrossAmount: o.proRataAmount, deduction: o.deduction,
            }));
          }
          cb(err);
        },
      );
    },
  ], (err) => {
    callback(err, object);
  });
}
