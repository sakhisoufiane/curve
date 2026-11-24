const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const Statement = require('./statementCreator');

const Proper = function (params) {
  // Set params to object
  Statement.call(this, params);
  this.salesEarnings = 0;
  this.totalTransactions = 0;
  this.statementTotalRow = 19;
  const statement = this;

  const statementEndDate = moment.utc(statement.date).endOf('day').format();
  const statementStartDate = moment.utc(statement.startDate).endOf('day').subtract(1, 'day').format();

  // TODO: Fix use from lambdaFunctions,
  this.create = function (filePath, callback) {
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/proper.xlsx`)
      .then(() => {
        statement.worksheet = workbook.getWorksheet(1);
        async.waterfall([
          statement.header,
          statement.closingBalances,
          statement.payments,
          statement.transactionData,
          statement.salesData,
        ], () => {
          workbook.xlsx.writeFile(filePath).then(() => {
            callback(null, filePath);
          });
        });
      });
  };

  this.header = function (callback) {
    statement.worksheet.getRow(4).getCell(3).value = statement.payeeName;
    statement.worksheet.getRow(7).getCell(3).value = statement.contractName;
    statement.worksheet.getRow(10).getCell(1).value = `For the period ending ${statement.monthFromPeriod(statement.accountingPeriod)} ${statement.year}`;
    statement.worksheet.getRow(27).getCell(5).value = 'All amounts printed in Pound Sterling';
    callback();
  };

  this.monthFromPeriod = function (value) {
    switch (value) {
      case 'H1': return 'June';
      case 'H2': return 'December';
      case 'Q1': return 'March';
      case 'Q2': return 'June';
      case 'Q3': return 'September';
      case 'Q4': return 'December';
      default: return '';
    }
  };

  this.salesData = function (callback) {
    statement.getSalesData((err, salesData) => {
      logger.debug('Got Sales Data:', salesData.length);
      let totalEarnings = 0;
      async.eachSeries(salesData, (salesRow, salesRowCb) => {
        statement.worksheet.spliceRows(14, 0, salesRow);
        statement.worksheet.getCell('F14').numFmt = '0.00';
        statement.worksheet.getCell('I14').numFmt = '0.00';
        statement.worksheet.getCell('J14').numFmt = '0.00';
        totalEarnings += salesRow[salesRow.length - 1];
        salesRowCb();
      }, () => {
        statement.worksheet.getRow(14 + salesData.length).getCell(10).value = totalEarnings;
        statement.statementTotalRow += salesData.length;
        statement.worksheet.getRow(statement.statementTotalRow).getCell(10).value = totalEarnings + statement.totalTransactions;
        callback();
      });
    });
  };

  this.getSalesData = function (callback) {
    async.waterfall([
      function (cb) {
        if (!params.salesData) {
          // For large statements, get data from DB
          const collectData = require('../../../writeCsv/collectData');
          const columns = collectData.getSelectAndSumColumnArray(params.salesTemplate, params.filter);
          params.bigQuery.getAggregate(params.bigQuery.outputTable, columns.selectCols, columns.sumCols, 'lines', params.filter, {}, (err, res) => {
            if (err) {
              logger.error(err);
              cb(err);
            } else {
              params.salesData = res;
              cb();
            }
          });
        } else {
          cb();
        }
      },
      function (cb) {
        // Sales Data to Template
        params.salesData = params.salesData.map((item) => statement.lineToTemplate(item, params.salesTemplate));
        // Group data by config
        const groupedData = {};
        params.salesData.forEach((item) => {
          groupedData[item.configuration] = groupedData[item.configuration] || [];
          groupedData[item.configuration].push(item);
        });
        // Create output from groups
        const output = [];
        Object.keys(groupedData).forEach((config) => {
          // Setup output
          const item = {
            _id: config, units: 0, basePrice: 0, proportion: groupedData[config][0].objectPercentage, royaltyRate: groupedData[config][0].royaltyRate, contractCurrencyCalculationOutput: 0,
          };
          // Loop through lines
          groupedData[config].forEach((row) => {
            // Add values to item from each row
            if (row.units) {
              item.units += row.units;
            }
            if (row.basePrice) {
              item.basePrice += row.contractCurrencyCalculationInput;
            }
            if (row.contractCurrencyCalculationOutput) {
              item.contractCurrencyCalculationOutput += row.contractCurrencyCalculationOutput;
            }
          });
          // Add array to output
          const perUnitRate = item.units ? item.contractCurrencyCalculationOutput / item.units : 0;
          output.push([null, null, null, item._id, item.units, item.basePrice, Number(item.proportion), Number(item.royaltyRate), perUnitRate, item.contractCurrencyCalculationOutput]);
        });
        cb(null, output);
      },
    ], (err, output) => {
      callback(err, output);
    });
  };

  this.lineToTemplate = function (item, template) {
    if (Array.isArray(item)) {
      const object = {};
      item.forEach((field, index) => {
        if (field && template[index]) {
          object[template[index].field] = field;
        }
      });
      return object;
    }
    return item;
  };

  this.transactionData = function (callback) {
    statement.getCostsData((err, costsData) => {
      logger.debug(costsData);
      let totalCosts = 0;
      async.eachSeries(costsData, (costsRow, costsRowCb) => {
        statement.worksheet.spliceRows(17, 0, costsRow);
        statement.worksheet.getCell('J17').numFmt = '0.00';
        statement.totalTransactions += costsRow[costsRow.length - 1];
        totalCosts += 1;
        costsRowCb();
      }, () => {
        if (statement.reservesWithheld) {
          statement.worksheet.spliceRows(17, 0, [null, null, null, 'Reserve Withheld', null, null, null, null, null, 0 - statement.reservesWithheld]);
          statement.worksheet.getCell('J17').numFmt = '0.00';
          totalCosts += 1;
          statement.totalTransactions += 0 - statement.reservesWithheld;
        }
        if (statement.reservesReleased) {
          statement.worksheet.spliceRows(17, 0, [null, null, null, 'Reserve Released', null, null, null, null, null, statement.reservesReleased]);
          statement.worksheet.getCell('J17').numFmt = '0.00';
          totalCosts += 1;
          statement.totalTransactions += statement.reservesReleased;
        }
        statement.statementTotalRow += totalCosts;
        statement.worksheet.getRow(17 + totalCosts).getCell(10).value = statement.totalTransactions;
        callback();
      });
    });
  };

  this.getCostsData = function (callback) {
    const collectData = require('../../../writeCsv/collectData');
    const costFilter = { ...params.filter };
    delete costFilter.royaltyRate;
    const columns = collectData.getSelectAndSumColumnArray(params.costsTemplate, costFilter);
    params.bigQuery.getAggregate(params.bigQuery.costsTable, columns.selectCols, columns.sumCols, 'lines', costFilter, {}, (err, res) => {
      if (err) {
        callback(err);
      } else {
        // Group data by type
        const groupedData = {};
        res.forEach((item) => {
          groupedData[item.type] = groupedData[item.type] || [];
          groupedData[item.type].push(item);
        });
        // Create output from groups
        const output = [];
        Object.keys(groupedData).forEach((type) => {
          // Setup output
          const item = { _id: type, contractCurrencyCalculationOutput: 0 };
          // Loop through lines
          groupedData[type].forEach((row) => {
            // Add values to item from each row
            item.contractCurrencyCalculationOutput += row.contractCurrencyCalculationOutput;
          });
          // Add array to output
          output.push([null, null, null, item._id, null, null, null, null, null, 0 - item.contractCurrencyCalculationOutput]);
        });
        callback(err, output);
      }
    });
  };

  this.payments = function (callback) {
    let payments = 0;
    statement.transactions.forEach((transaction) => {
      const transactionDate = moment.utc(transaction.date).format();
      if (transactionDate >= statementStartDate && transactionDate <= statementEndDate && (transaction.date != statement.date && transaction.name != statement.periodName)) {
        if (transaction.type === 'Payment' || transaction.type === 'Advance') {
          payments += transaction.amount;
        }
      }
    });
    statement.worksheet.getRow(24).getCell(10).value = payments;
    callback();
  };

  this.closingBalances = function (callback) {
    // Profit Share Amount
    statement.worksheet.getRow(21).getCell(10).value = statement.profitShareNetAmount;
    // Opening Balance
    statement.worksheet.getRow(23).getCell(10).value = statement.openingBalance;
    // Total transfers
    let totalTransferTransactions = 0;
    statement.transactions.forEach((transaction) => {
      const transactionDate = moment.utc(transaction.date).format();
      if ((transaction.type === 'Transfer To' || transaction.type === 'Transfer From' || transaction.type === 'Contract Payment') && transactionDate >= statementStartDate && transactionDate <= statementEndDate) {
        totalTransferTransactions += transaction.amount;
      }
    });
    statement.worksheet.getRow(25).getCell(10).value = totalTransferTransactions;
    // Closing Balance
    statement.worksheet.getRow(26).getCell(10).value = statement.closingBalance;
    callback();
  };
};

module.exports = Proper;
