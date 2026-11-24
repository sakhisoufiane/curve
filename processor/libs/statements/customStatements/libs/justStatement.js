const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const Statement = require('./statementCreator');

const Proper = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;

  // TODO: Fix use from lambdaFunctions,
  this.create = function (filePath, callback) {
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/just.xlsx`)
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
        callback();
      });
    });
  };

  this.getSalesData = function (callback) {
    const collection = this.db.collection(this.salesTable);
    const aggregate = [
      { $match: statement.dbFilter },
      {
        $group: {
          _id: '$configuration', units: { $sum: '$units' }, basePrice: { $sum: '$calculationInput' }, proportion: { $first: '$objectPercentage' }, royaltyRate: { $first: '$royaltyRate' }, calculationOutput: { $sum: '$calculationOutput' },
        },
      },
    ];
    collection.aggregate(aggregate, { allowDiskUse: true })
      .toArray()
      .then((findResult) => {
        const result = findResult.map((item) => [null, null, null, item._id, item.units, item.basePrice, Number(item.proportion), Number(item.royaltyRate), item.calculationOutput / item.units, item.calculationOutput]);
        callback(null, result);
      })
      .catch(callback);
  };

  this.transactionData = function (callback) {
    statement.getCostsData((err, costsData) => {
      let totalEarnings = 0;
      async.eachSeries(costsData, (costsRow, costsRowCb) => {
        statement.worksheet.spliceRows(17, 0, costsRow);
        statement.worksheet.getCell('J14').numFmt = '0.00';
        totalEarnings += costsRow[costsRow.length - 1];
        costsRowCb();
      }, () => {
        statement.worksheet.getRow(17 + costsData.length).getCell(10).value = totalEarnings;
        callback();
      });
    });
  };

  this.getCostsData = function (callback) {
    const collection = this.db.collection(this.costsTable);
    const dbFilter = { periodId: statement.dbFilter.periodId, contractId: statement.dbFilter.contractId };
    const aggregate = [
      { $match: dbFilter },
      { $group: { _id: '$type', calculationOutput: { $sum: '$calculationOutput' } } },
    ];
    collection.aggregate(aggregate, { allowDiskUse: true })
      .toArray()
      .then((findResult) => {
        const result = findResult.map((item) => [null, null, null, item._id, null, null, null, null, null, 0 - item.calculationOutput]);
        callback(null, result);
      })
      .catch(callback);
  };

  this.payments = function (callback) {
    let payments = 0;
    statement.transactions.forEach((transaction) => {
      if (transaction.date >= statement.startDate && transaction.date <= statement.date && (transaction.date != statement.date && transaction.name != statement.periodName)) {
        if (transaction.type === 'Payment' || transaction.type === 'Advance') {
          payments += transaction.amount;
        }
      }
    });
    statement.worksheet.getRow(22).getCell(10).value = payments;
    callback();
  };

  this.closingBalances = function (callback) {
    statement.worksheet.getRow(21).getCell(10).value = statement.openingBalance;
    statement.worksheet.getRow(23).getCell(10).value = statement.closingBalance;
    statement.worksheet.getRow(19).getCell(10).value = statement.netOutput;
    callback();
  };
};

module.exports = Proper;
