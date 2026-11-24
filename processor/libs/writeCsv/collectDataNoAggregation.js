const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const collectDataLib = require('./collectData');

module.exports = {
  getData(bigQuery, table, filter, template, sort, suppressZeroValue, writeCsv, mappingData, format, logKey, callback) {
    logger.debug('No Aggregation on Data Collection');
    const collectData = this;
    const columns = collectData.getSelectAndSumColumnArray(template, filter);
    const limit = 1000000000;

    const options = { offset: 0, limit };
    const query = bigQuery.getDataQuery(table, columns.selectCols, filter, options);

    runQuery(callback);

    function runQuery(cb) {
      let count = 0;
      let calledBack = false;
      bigQuery.logQuery(bigQuery.inputTable, query, 'Calculation');
      bigQuery.client.createQueryStream(query)
        .on('error', (err) => {
          // Handle Errors
          logger.error(err);
          if (err && err.code == 409 || err.message.includes('Exceeded rate limits')) {
            logger.debug('RETRYING EXCEEDED RATE');
            // Wait two seconds
            setTimeout(() => {
              // Retry
              if (!calledBack) {
                calledBack = true;
                runQuery(cb);
              }
            }, 2000);
          } else if (!calledBack) {
            calledBack = true;
            return cb(err);
          }
        })
        .on('data', (row) => {
          // Check suppress zero value to suppressing values
          if (!suppressZeroValue || (suppressZeroValue && row.calculationOutput) || (suppressZeroValue && row.contractCurrencyCalculationOutput)) {
            count += 1;
            if (count % 10_000 === 0) {
              logger.info(`${logKey} - ${count} lines read`);
            }
            // Turn row to template
            row = collectData.lineToTemplate(row, template, null, format);
            // Add row to CSV
            writeCsv.addRow(row);
          }
        })
        .on('end', () => {
          logger.debug(`Completed CSV Write with ${count} lines`);
          // Needed in cases where callback is being called prior to completion
          if (!calledBack) {
            calledBack = true;
            return cb();
          }
        });
    }
  },
  getJoinedSalesData: collectDataLib.getJoinedSalesData,
  getTotals(bigQuery, table, filter, template, sort, writeCsv, format, callback) {
    const collectData = this;
    const columns = collectData.getTotalsSelectAndSumColumnArray(template, filter);
    bigQuery.getAggregate(table, columns.groupCols, columns.sumCols, 'lines', filter, {}, (err, res) => {
      if (err) { logger.error(err); }
      const mappedData = collectDataLib.mapData(res, template, null, null);
      // Add Total wording
      let finalBlankCell = 0;
      if (mappedData && mappedData[0]) {
        mappedData[0].forEach((item, index) => {
          if (!item && finalBlankCell == index - 1) { finalBlankCell = index; }
        });
        mappedData[0][finalBlankCell] = 'Total';
        writeCsv.addData(mappedData, callback);
      } else {
        callback();
      }
    });
  },
  mapData: collectDataLib.mapData,
  lineToTemplate: collectDataLib.lineToTemplate,
  flattenLine: collectDataLib.flattenLine,
  removeZeroValues: collectDataLib.removeZeroValues,
  getTotalsSelectAndSumColumnArray(template, filter) {
    const sumCols = [];
    const selectCols = [];
    const groupCols = [];

    for (let i = 0; i < template.length; i += 1) {
      if (template[i].type === 'Selector') {
        selectCols.push({
          column: template[i].field, displayAs: template[i].field, isSelector: true, isGroupBy: true,
        });
      } else if (template[i].type === 'Calculator') {
        sumCols.push({ column: template[i].field, displayAs: template[i].field });
      }
    }

    Object.keys(filter).forEach((filterKey) => {
      if (filterKey.includes('Id')) {
        groupCols.push({
          column: filterKey, displayAs: filterKey, isSelector: false, isGroupBy: true,
        });
      }
    });

    return { selectCols, sumCols, groupCols };
  },
  getSelectAndSumColumnArray(template, filter) {
    const sumCols = [];
    const selectCols = [];
    const groupCols = [];

    for (let i = 0; i < template.length; i += 1) {
      if (template[i].type === 'Selector') {
        selectCols.push(template[i].field);
      } else if (template[i].type === 'Calculator') {
        selectCols.push(template[i].field);
      }
    }

    Object.keys(filter).forEach((filterKey) => {
      if (filterKey.includes('Id')) {
        groupCols.push(filterKey);
      }
    });

    return { selectCols, sumCols, groupCols };
  },
};
