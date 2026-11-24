const { logger, utils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const collectData = require('../../../writeCsv/collectData');
const Statement = require('./statementCreator');

const Proper = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;

  this.create = function (filePath, callback) {
    // Specific file name for late night tales;
    const splitPath = filePath.split('/');
    let fileName = splitPath.pop();
    fileName = statement.payeeName ? `${utils.safeName(statement.payeeName)} - ${fileName}` : fileName;
    splitPath.push(fileName);
    filePath = splitPath.join('/');
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/lateNightTales.xlsx`)
      .then(() => {
        statement.worksheet = workbook.getWorksheet(1);
        async.waterfall([
          statement.header,
          statement.salesDataFunction,
          statement.closingBalances,
        ], () => {
          workbook.xlsx.writeFile(filePath).then(() => {
            callback(null, filePath);
          });
        });
      });
  };

  this.header = function (callback) {
    statement.worksheet.getRow(5).getCell(2).value = `${statement.periodName}: ${statement.contractName}`;
    statement.worksheet.getRow(6).getCell(2).value = statement.payeeName;
    statement.worksheet.getRow(7).getCell(2).value = statement.contractName;
    statement.worksheet.getRow(9).getCell(2).value = `${statement.monthFromPeriod(statement.accountingPeriod)} ${statement.year}`;
    callback();
  };

  this.monthFromPeriod = function (value) {
    switch (value) {
      case 'H1': return 'January - June';
      case 'H2': return 'July - December';
      default: return '';
    }
  };

  this.salesDataFunction = function (callback) {
    statement.getSalesData((err, salesData, rates) => {
      // Write Rates
      statement.worksheet.getRow(10).getCell(2).value = rates.CD && rates.CD.royaltyRate ? `${rates.CD.royaltyRate}%` + ` ${rates.CD.calculationType}` : '0%';
      statement.worksheet.getRow(11).getCell(2).value = rates['Download (Album)'] && rates['Download (Album)'].royaltyRate ? `${rates['Download (Album)'].royaltyRate}%` + ` ${rates['Download (Album)'].calculationType}` : '0%';
      statement.worksheet.getRow(12).getCell(2).value = rates.LP && rates.LP.royaltyRate ? `${rates.LP.royaltyRate}%` + ` ${rates.LP.calculationType}` : '0%';
      statement.worksheet.getRow(13).getCell(2).value = rates['Download (Track)'] && rates['Download (Track)'].royaltyRate ? `${rates['Download (Track)'].royaltyRate}%` + ` ${rates['Download (Track)'].calculationType}` : '0%';
      statement.worksheet.getRow(14).getCell(2).value = rates.Deduction ? `${rates.Deduction}%` : '0%';
      statement.worksheet.getRow(15).getCell(2).value = rates.Export ? `${rates.Export}%` : '0%';
      // Write Sales Data
      statement.salesRow(salesData.CD, 19);
      statement.salesRow(salesData['Download (Album)'], 20);
      statement.salesRow(salesData['Download (Track)'], 21);
      statement.salesRow(salesData.Streaming, 22);
      statement.salesRow(salesData.LP, 23);
      statement.salesRow(salesData['Vinyl Single'], 24);
      statement.salesRow(salesData.Merchandise, 25);
      statement.salesRow(salesData.Sync, 26);
      statement.worksheet.getRow(27).getCell(5).value = `£${statement.netAmount.toFixed(2)}`;
      callback();
    });
  };

  this.salesRow = function (item, rowNo) {
    if (item && item.netAmount) {
      logger.info(item);
      const units = item.units ? item.units : 0;
      const returnUnits = item.returnUnits ? item.returnUnits : 0;
      statement.worksheet.getRow(rowNo).getCell(2).value = units;
      statement.worksheet.getRow(rowNo).getCell(3).value = returnUnits;
      statement.worksheet.getRow(rowNo).getCell(4).value = units + returnUnits;
      statement.worksheet.getRow(rowNo).getCell(5).value = `£${item.netAmount.toFixed(2)}`;
    } else {
      statement.worksheet.getRow(rowNo).getCell(2).value = 0;
      statement.worksheet.getRow(rowNo).getCell(3).value = 0;
      statement.worksheet.getRow(rowNo).getCell(4).value = 0;
      statement.worksheet.getRow(rowNo).getCell(5).value = '£0.00';
    }
  };

  this.getSalesData = function (callback) {
    async.waterfall([
      function (cb) {
        if (!params.salesData && !Array.isArray(params.salesData)) {
          logger.info('RELOADING DATA');
          logger.info(params.salesData);
          // For large statements, get data from DB
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
        cb();
      },
    ], (err) => {
      if (err) {
        logger.error(err);
        callback(err);
      } else {
        const salesData = statement.organiseSalesData(params.salesData);
        const rates = statement.organiseRates();
        callback(err, salesData, rates);
      }
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

  this.organiseSalesData = function (salesData) {
    const output = {};
    salesData.forEach((item) => {
      const config = statement.mapConfig(item.configuration);
      output[config] = output[config] || { units: 0, returnUnits: 0, netAmount: 0 };
      if (item.priceCategory === 'Returns') {
        output[config].returnUnits += item.units ? item.units : 0;
        output[config].netAmount += item.contractCurrencyCalculationOutput ? item.contractCurrencyCalculationOutput : 0;
      } else {
        output[config].units += item.units ? item.units : 0;
        output[config].netAmount += item.contractCurrencyCalculationOutput ? item.contractCurrencyCalculationOutput : 0;
      }
    });
    logger.info(output);
    return output;
  };

  this.mapConfig = function (config) {
    if (['CD', 'CD2', 'CD Boxset', 'CD Single'].includes(config)) {
      return 'CD';
    } if (['LP Vinyl', '12 Inch Vinyl', '12 Inch', 'LP', 'LP2', 'Double Vinyl Album', '10 Inch', 'Mixed Format Boxset'].includes(config)) {
      return 'LP';
    } if (['Digital Album', 'Download (Album)'].includes(config)) {
      return 'Download (Album)';
    } if (['Digital Download Track', 'Download (Track)', 'Video (Download)', 'Download (Single)', 'Ringtone'].includes(config)) {
      return 'Download (Track)';
    } if (['Digital Stream', 'Streaming', 'Video (Streaming)', 'Streaming Bonus'].includes(config)) {
      return 'Streaming';
    } if (['Vinyl Single', '7 Inch'].includes(config)) {
      return 'Vinyl Single';
    } if (['Merchandise'].includes(config)) {
      return 'Merchandise';
    } if (['Sync'].includes(config)) {
      return 'Sync';
    }
  };

  this.organiseRates = function () {
    const rates = {
      CD: { royaltyRate: 0, calculationType: '' },
      'Download (Album)': { royaltyRate: 0, calculationType: '' },
      LP: { royaltyRate: 0, calculationType: '' },
      'Vinyl Single': { royaltyRate: 0, calculationType: '' },
      'Download (Track)': { royaltyRate: 0, calculationType: '' },
      Deduction: 0,
      Export: 0,
    };
    if (statement.salesTerms) {
      statement.salesTerms.forEach((term) => {
        if (term.channel === 'Physical') {
          rates.CD.royaltyRate = term.rate;
          rates.CD.calculationType = statement.mapCalculationType(term.type);
          rates.LP.royaltyRate = term.rate;
          rates.LP.calculationType = statement.mapCalculationType(term.type);
          rates['Vinyl Single'].royaltyRate = term.rate;
          rates['Vinyl Single'].calculationType = statement.mapCalculationType(term.type);
        } else if (term.channel === 'Digital') {
          if (term.configuration === 'Download (Single)') {
            rates['Download (Track)'].royaltyRate = term.rate;
            rates['Download (Track)'].calculationType = statement.mapCalculationType(term.type);
          } else if (term.catType === 'Track' || rates['Download (Track)'] === 0) {
            rates['Download (Track)'].royaltyRate = term.rate;
            rates['Download (Track)'].calculationType = statement.mapCalculationType(term.type);
          } else {
            rates['Download (Album)'].royaltyRate = term.rate;
            rates['Download (Album)'].calculationType = statement.mapCalculationType(term.type);
          }
        } else if (term.channel === 'All' && term.configuration === 'All' && term.priceCategory === 'All') {
          if (rates.CD.royaltyRate == 0) {
            rates.CD.royaltyRate = term.rate;
            rates.CD.calculationType = statement.mapCalculationType(term.type);
          }
          if (rates['Download (Album)'].royaltyRate == 0) {
            rates['Download (Album)'].royaltyRate = term.rate;
            rates['Download (Album)'].calculationType = statement.mapCalculationType(term.type);
          }
          if (rates.LP.royaltyRate == 0) {
            rates.LP.royaltyRate = term.rate;
            rates.LP.calculationType = statement.mapCalculationType(term.type);
          }
          if (rates['Vinyl Single'].royaltyRate == 0) {
            rates['Vinyl Single'].royaltyRate = term.rate;
            rates['Vinyl Single'].calculationType = statement.mapCalculationType(term.type);
          }
        }
        if (term.reductionRate && (term.reductionRate != 100 || term.reductionRate !== '100')) {
          rates.Export = term.reductionRate;
        }
      });
    }
    if (statement.deductionsTerms && statement.deductionsTerms[0]) {
      rates.Deduction = statement.deductionsTerms[0].rate;
    } else {
      rates.Deduction = 0;
    }
    return rates;
  };

  this.mapCalculationType = function (type) {
    switch (type) {
      case 'Net Receipts': return 'Net';
      case 'Gross Receipts': return 'Gross';
      default: return 'Net';
    }
  };

  this.closingBalances = function (callback) {
    const netOutput = statement.netOutput ? statement.netOutput : 0;
    const closingBalance = statement.closingBalance ? statement.closingBalance : 0;
    let openingBalance = statement.openingBalance ? statement.openingBalance : 0;
    let adjustments = 0;
    // Include payments in transactions
    statement.transactions.forEach((transaction) => {
      if (transaction.date >= statement.startDate && (transaction.type === 'Payment' || transaction.type === 'Advance')) {
        openingBalance += transaction.amount;
      }
      if (transaction.date >= statement.startDate && (transaction.type === 'Other' || transaction.type === 'Transfer From' || transaction.type === 'Transfer To')) {
        adjustments += transaction.amount;
      }
    });
    statement.worksheet.getRow(31).getCell(5).value = `£${netOutput.toFixed(2)}`;
    statement.worksheet.getRow(33).getCell(5).value = `£${openingBalance.toFixed(2)}`;
    statement.worksheet.getRow(35).getCell(5).value = `£${adjustments.toFixed(2)}`;
    if (statement.closingBalance > 0) {
      statement.worksheet.getRow(37).getCell(5).value = `£${closingBalance.toFixed(2)}`;
      statement.worksheet.getRow(39).getCell(5).value = '£0.00';
    } else {
      statement.worksheet.getRow(37).getCell(5).value = '£0.00';
      statement.worksheet.getRow(39).getCell(5).value = `£${closingBalance.toFixed(2)}`;
    }
    callback();
  };
};

module.exports = Proper;
