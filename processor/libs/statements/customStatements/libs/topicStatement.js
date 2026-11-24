const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const Statement = require('./statementCreator');
const collectData = require('../../../writeCsv/collectData');

const Proper = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;

  // TODO: Fix use from lambdaFunctions,
  this.create = function (filePath, callback) {
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/topic.xlsx`)
      .then(() => {
        statement.worksheet = workbook.getWorksheet(1);
        async.waterfall([
          statement.header,
          statement.closingBalances,
          statement.payments,
          statement.transactionData,
          statement.costData,
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
    const year = statement.monthFromPeriod(statement.accountingPeriod) === 'March' ? statement.year + 1 : statement.year;
    statement.worksheet.getRow(10).getCell(1).value = `For the period ending ${statement.monthFromPeriod(statement.accountingPeriod)} ${year}`;
    statement.worksheet.getRow(27).getCell(6).value = 'All amounts printed in Pound Sterling';
    callback();
  };

  this.monthFromPeriod = function (value) {
    switch (value) {
      case 'H1': return 'September';
      case 'H2': return 'March';
    }
  };

  this.salesData = function (callback) {
    statement.getSalesData((err, releaseData, trackData) => {
      const totalEarnings = 0;
      let currentLine = 14;
      const catNos = Object.keys(releaseData);
      async.eachSeries(catNos, (catNo, catNoCb) => {
        releaseData[catNo].sort(sortRows);
        let subtotal = 0;
        async.eachSeries(releaseData[catNo], (salesRow, salesRowCb) => {
          statement.worksheet.spliceRows(currentLine, 0, salesRow);
          formatRow(currentLine);
          currentLine += 1;
          subtotal += salesRow[salesRow.length - 1];
          salesRowCb();
        }, (err) => {
          // Subtotal Line
          // Only if lines have been written above
          if (releaseData[catNo] && releaseData[catNo].length > 0) {
            statement.worksheet.spliceRows(currentLine, 0, [null, null, null, null, 'Subtotal:', null, null, null, null, null, '£', subtotal]);
            formatSubtotalRow(currentLine);
            currentLine += 1;
            statement.worksheet.spliceRows(currentLine, 0, []);
            currentLine += 1;
          }
          catNoCb();
        });
      }, (err) => {
        // Track Data
        trackData.sort(sortRows);
        let trackSubtotal = 0;
        async.eachSeries(trackData, (salesRow, salesRowCb) => {
          statement.worksheet.spliceRows(currentLine, 0, salesRow);
          formatRow(currentLine);
          currentLine += 1;
          trackSubtotal += salesRow[salesRow.length - 1];
          salesRowCb();
        }, (err) => {
          // Subtotal Line
          statement.worksheet.spliceRows(currentLine, 0, [null, null, null, null, 'Subtotal:', null, null, null, null, null, '£', trackSubtotal]);
          formatSubtotalRow(currentLine);
          currentLine += 1;
          statement.worksheet.spliceRows(currentLine, 0, []);
          currentLine += 1;
          callback();
        });
      });
    });

    function formatRow(currentLine) {
      statement.worksheet.getRow(currentLine).getCell(6).numFmt = '0.00';
      statement.worksheet.getRow(currentLine).getCell(7).numFmt = '0.00';
      statement.worksheet.getRow(currentLine).getCell(8).value = statement.worksheet.getRow(currentLine).getCell(8).value / 100;
      statement.worksheet.getRow(currentLine).getCell(8).numFmt = '0.00%';
      statement.worksheet.getRow(currentLine).getCell(9).value = statement.worksheet.getRow(currentLine).getCell(9).value / 100;
      statement.worksheet.getRow(currentLine).getCell(9).numFmt = '0.00%';
      statement.worksheet.getRow(currentLine).getCell(10).value = statement.worksheet.getRow(currentLine).getCell(10).value / 100;
      statement.worksheet.getRow(currentLine).getCell(10).numFmt = '0.00%';
      statement.worksheet.getRow(currentLine).getCell(11).numFmt = '0.00';
      statement.worksheet.getRow(currentLine).getCell(12).numFmt = '0.00';
    }

    function formatSubtotalRow(currentLine) {
      statement.worksheet.getRow(currentLine).getCell(5).font = { bold: true };
      statement.worksheet.getRow(currentLine).getCell(11).font = { bold: true };
      statement.worksheet.getRow(currentLine).getCell(12).font = { bold: true };
      statement.worksheet.getRow(currentLine).getCell(12).border = { top: { style: 'thin' } };
      statement.worksheet.getRow(currentLine).getCell(12).numFmt = '0.00';
    }

    function sortRows(a, b) {
      if (a[0] < b[0]) {
        return -1;
      } if (a[0] > b[0]) {
        return 1;
      }
      return 0;
    }
  };

  this.getSalesData = function (callback) {
    async.waterfall([
      function (cb) {
        if (!params.salesData) {
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
        // Loop through lines and organise into sections
        const ukReleases = []; const rowReleases = []; const ukDigitalReleases = []; const rowDigitalReleases = []; const ukTracks = []; const rowTracks = []; const
          other = [];
        params.salesData.forEach((line) => {
          if (line.catType === 'Release' && line.distributionChannel === 'Physical' && line.territory === 'GB') {
            ukReleases.push(line);
          } else if (line.catType === 'Release' && line.distributionChannel === 'Physical' && line.territory !== 'GB') {
            rowReleases.push(line);
          } else if (line.catType === 'Release' && line.distributionChannel === 'Digital' && line.territory === 'GB') {
            ukDigitalReleases.push(line);
          } else if (line.catType === 'Release' && line.distributionChannel === 'Digital' && line.territory !== 'GB') {
            rowDigitalReleases.push(line);
          } else if (line.distributionChannel === 'Digital' && line.territory === 'GB') {
            ukTracks.push(line);
          } else if (line.distributionChannel === 'Digital' && line.territory !== 'GB') {
            rowTracks.push(line);
          } else {
            other.push(line);
          }
        });
        const releases = {}; const tracks = []; const
          others = [];
        // Organise Release data
        const ukReleaseData = {}; const rowReleaseData = {}; const ukDigitalReleaseData = {}; const
          rowDigitalReleaseData = {};
        ukReleases.forEach((line) => {
          // Initialise mapping object
          ukReleaseData[line.catalogueCatNo + line.configuration] = ukReleaseData[line.catalogueCatNo + line.configuration] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { ukReleaseData[line.catalogueCatNo + line.configuration].units += line.units; }
          if (line.deduction) { ukReleaseData[line.catalogueCatNo + line.configuration].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { ukReleaseData[line.catalogueCatNo + line.configuration].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) { ukReleaseData[line.catalogueCatNo + line.configuration].calculationOutput += line.contractCurrencyCalculationOutput; }
        });
        ukDigitalReleases.forEach((line) => {
          // Initialise mapping object
          ukDigitalReleaseData[line.catalogueCatNo + line.configuration] = ukDigitalReleaseData[line.catalogueCatNo + line.configuration] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { ukDigitalReleaseData[line.catalogueCatNo + line.configuration].units += line.units; }
          if (line.deduction) { ukDigitalReleaseData[line.catalogueCatNo + line.configuration].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { ukDigitalReleaseData[line.catalogueCatNo + line.configuration].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) {
            ukDigitalReleaseData[line.catalogueCatNo + line.configuration].calculationOutput += line.contractCurrencyCalculationOutput;
          }
        });
        rowReleases.forEach((line) => {
          // Initialise mapping object
          rowReleaseData[line.catalogueCatNo + line.configuration] = rowReleaseData[line.catalogueCatNo + line.configuration] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice:
            line.perUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { rowReleaseData[line.catalogueCatNo + line.configuration].units += line.units; }
          if (line.deduction) { rowReleaseData[line.catalogueCatNo + line.configuration].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { rowReleaseData[line.catalogueCatNo + line.configuration].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) { rowReleaseData[line.catalogueCatNo + line.configuration].calculationOutput += line.contractCurrencyCalculationOutput; }
        });
        rowDigitalReleases.forEach((line) => {
          // Initialise mapping object
          rowDigitalReleaseData[line.catalogueCatNo + line.configuration] = rowDigitalReleaseData[line.catalogueCatNo + line.configuration] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { rowDigitalReleaseData[line.catalogueCatNo + line.configuration].units += line.units; }
          if (line.deduction) { rowDigitalReleaseData[line.catalogueCatNo + line.configuration].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { rowDigitalReleaseData[line.catalogueCatNo + line.configuration].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) {
            rowDigitalReleaseData[line.catalogueCatNo + line.configuration].calculationOutput += line.contractCurrencyCalculationOutput;
          }
        });
        // Combine releases into catNo object
        Object.keys(ukReleaseData).forEach((key) => {
          // Setup array
          releases[ukReleaseData[key].catNo] = releases[ukReleaseData[key].catNo] || [];
          const item = ukReleaseData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          releases[ukReleaseData[key].catNo] = releases[ukReleaseData[key].catNo] || [];
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          releases[ukReleaseData[key].catNo].push([
            item.configuration, 'UK', item.catNo, item.title, item.units, baseRate, item.netReceipts,
            item.proportion, item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        Object.keys(ukDigitalReleaseData).forEach((key) => {
          // Setup array
          releases[ukDigitalReleaseData[key].catNo] = releases[ukDigitalReleaseData[key].catNo] || [];
          const item = ukDigitalReleaseData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          releases[ukDigitalReleaseData[key].catNo] = releases[ukDigitalReleaseData[key].catNo] || [];
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          releases[ukDigitalReleaseData[key].catNo].push([
            item.configuration, 'UK', item.catNo, item.title, item.units, baseRate, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        Object.keys(rowReleaseData).forEach((key) => {
          // Setup array
          releases[rowReleaseData[key].catNo] = releases[rowReleaseData[key].catNo] || [];
          const item = rowReleaseData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          releases[rowReleaseData[key].catNo] = releases[rowReleaseData[key].catNo] || [];
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          releases[rowReleaseData[key].catNo].push([
            item.configuration, 'EX', item.catNo, item.title, item.units, baseRate, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        Object.keys(rowDigitalReleaseData).forEach((key) => {
          // Setup array
          releases[rowDigitalReleaseData[key].catNo] = releases[rowDigitalReleaseData[key].catNo] || [];
          const item = rowDigitalReleaseData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          releases[rowDigitalReleaseData[key].catNo] = releases[rowDigitalReleaseData[key].catNo] || [];
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          releases[rowDigitalReleaseData[key].catNo].push([
            item.configuration, 'UK', item.catNo, item.title, item.units, baseRate, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        // Organise track data
        const ukTrackData = {}; const
          rowTrackData = {};
        ukTracks.forEach((line) => {
          // Initialise mapping object
          ukTrackData[`${line.catalogueCatNo}D${line.configuration}`] = ukTrackData[`${line.catalogueCatNo}D${line.configuration}`] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) {
            ukTrackData[`${line.catalogueCatNo}D${line.configuration}`].units += line.units;
          }
          if (line.deduction) { ukTrackData[`${line.catalogueCatNo}D${line.configuration}`].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { ukTrackData[`${line.catalogueCatNo}D${line.configuration}`].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) { ukTrackData[`${line.catalogueCatNo}D${line.configuration}`].calculationOutput += line.contractCurrencyCalculationOutput; }
        });
        rowTracks.forEach((line) => {
          // Initialise mapping object
          rowTrackData[`${line.catalogueCatNo}D${line.configuration}`] = rowTrackData[`${line.catalogueCatNo}D${line.configuration}`] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { rowTrackData[`${line.catalogueCatNo}D${line.configuration}`].units += line.units; }
          if (line.deduction) { rowTrackData[`${line.catalogueCatNo}D${line.configuration}`].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { rowTrackData[`${line.catalogueCatNo}D${line.configuration}`].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) { rowTrackData[`${line.catalogueCatNo}D${line.configuration}`].calculationOutput += line.contractCurrencyCalculationOutput; }
        });
        // Combine releases into catNo object
        Object.keys(ukTrackData).forEach((key) => {
          const item = ukTrackData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          tracks.push([
            item.configuration, 'UK', item.catNo, item.title, item.units, null, item.netReceipts,
            item.proportion, item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        Object.keys(rowTrackData).forEach((key) => {
          const item = rowTrackData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (!item.basePrice && item.units) {
              item.basePrice = item.netReceipts / item.units;
            } else if (!item.basePrice) {
              item.basePrice = 0;
            }
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          tracks.push([
            item.configuration, 'EX', item.catNo, item.title, item.units, null, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });
        // Others
        const otherData = {};
        other.forEach((line) => {
          // Initialise mapping object
          otherData[line.catalogueCatNo + line.configuration] = otherData[line.catalogueCatNo + line.configuration] || {
            configuration: line.configuration,
            proportion: line.objectPercentage,
            royaltyRate: line.royaltyRate,
            reductionRate: line.reductionRate,
            calculationType: line.calculationType,
            deductionRate: line.deductionRate,
            catNo: line.catalogueCatNo,
            title: line.catalogueReleaseTitle,
            units: 0,
            basePrice: line.contractCurrencyPerUnitRate,
            deduction: 0,
            netReceipts: 0,
            calculationOutput: 0,
          };
          // Add values from line to totals
          if (line.units) { otherData[line.catalogueCatNo + line.configuration].units += line.units; }
          if (line.deduction) { otherData[line.catalogueCatNo + line.configuration].deduction += line.contractCurrencyDeduction; }
          if (line.contractCurrencyNetAmount) { otherData[line.catalogueCatNo + line.configuration].netReceipts += line.contractCurrencyNetAmount; }
          if (line.contractCurrencyCalculationOutput) { otherData[line.catalogueCatNo + line.configuration].calculationOutput += line.contractCurrencyCalculationOutput; }
        });
        Object.keys(otherData).forEach((key) => {
          const item = otherData[key];
          let baseRate = 0;
          if (item.calculationType === 'Unit Price') {
            const deductionRate = item.deductionRate && item.deductionRate != 100 ? item.deductionRate : 0;
            if (item.basePrice) {
              baseRate = item.basePrice * ((100 - deductionRate) / 100);
            }
          } else if (item.units) {
            baseRate = (item.netReceipts - item.deduction) / item.units;
          } else {
            baseRate = 0;
          }
          releases[otherData[key].catNo] = releases[otherData[key].catNo] || [];
          const baseAmount = item.units ? item.calculationOutput / item.units : 0;
          releases[otherData[key].catNo].push([
            item.configuration, null, item.catNo, item.title, item.units, null, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, baseAmount, item.calculationOutput,
          ]);
        });

        cb(null, releases, tracks);
      },
    ], callback);
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

  // TODO this is dead....
  // @Arjun is this using mongodb natively and not being used any more?
  this.getSalesDataOld = function (callback) {
    const collection = this.db.collection(this.salesTable);
    const result = {};
    let trackResult = [];
    const releaseFilter = { catType: 'Release', periodId: statement.dbFilter.periodId, contractId: statement.dbFilter.contractId };
    async.waterfall([
      function (cb) {
        // Get unique cat nos
        collection.distinct('catalogueCatNo', releaseFilter, cb);
      },
      function (catNos, cb) {
        async.eachSeries(catNos, (catNo, catNoCb) => {
          releaseFilter.catalogueCatNo = catNo;
          async.parallel([
            function (territoryCb) {
              // UK Data
              const ukFilter = { ...releaseFilter };
              ukFilter.territory = 'GB';
              ukFilter.distributionChannel = 'Physical';
              const aggregate = [
                { $match: ukFilter },
                { $group: {
                  _id: {
                    configuration: '$configuration',
                    proportion: '$objectPercentage',
                    royaltyRate: '$royaltyRate',
                    reductionRate: '$reductionRate',
                  },
                  calculationType: { $first: '$calculationType' },
                  deductionRate: { $first: '$deductionRate' },
                  catNo: { $first: '$catalogueCatNo' },
                  title: { $first: '$catalogueReleaseTitle' },
                  units: { $sum: '$units' },
                  basePrice: { $first: '$perUnitRate' },
                  deduction: { $sum: '$deduction' },
                  netReceipts: { $sum: '$calculationInput' },
                  proportion: { $first: '$objectPercentage' },
                  royaltyRate: { $first: '$royaltyRate' },
                  reductionRate: { $first: '$reductionRate' },
                  calculationOutput: { $sum: '$calculationOutput' } } },
              ];
              collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
                if (err) {
                  logger.error(err);
                }
                const mappedData = findResult.map((item) => {
                  let baseRate = 0;
                  if (item.calculationType === 'Unit Price') {
                    const deductionRate = item.deductionRate ? item.deductionRate : 0;
                    baseRate = item.basePrice * (100 - deductionRate) / 100;
                  } else {
                    baseRate = (item.netReceipts - item.deduction) / item.units;
                  }
                  return [
                    item._id.configuration, 'UK', item.catNo, item.title, item.units, baseRate, item.netReceipts,
                    item.proportion, item.royaltyRate, 100 - item.reductionRate, item.calculationOutput / item.units, item.calculationOutput,
                  ];
                });
                result[catNo] = result[catNo] || [];
                result[catNo] = result[catNo].concat(mappedData);
                territoryCb(err);
              });
            },
            function (territoryCb) {
              // ROW Data
              const rowFilter = { ...releaseFilter };
              rowFilter.territory = { $ne: 'GB' };
              rowFilter.distributionChannel = 'Physical';
              const aggregate = [
                { $match: rowFilter },
                {
                  $group: {
                    _id: { configuration: '$configuration', proportion: '$objectPercentage', royaltyRate: '$royaltyRate', reductionRate: '$reductionRate' },
                    calculationType: { $first: '$calculationType' },
                    deductionRate: { $first: '$deductionRate' },
                    catNo: { $first: '$catalogueCatNo' },
                    title: { $first: '$catalogueReleaseTitle' },
                    units: { $sum: '$units' },
                    basePrice: { $first: '$perUnitRate' },
                    netReceipts: { $sum: '$calculationInput' },
                    proportion: { $first: '$objectPercentage' },
                    deduction: { $sum: '$deduction' },
                    royaltyRate: { $first: '$royaltyRate' },
                    reductionRate: { $first: '$reductionRate' },
                    calculationOutput: { $sum: '$calculationOutput' },
                  },
                },
              ];
              collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
                if (err) { logger.error(err); }
                const mappedData = findResult.map((item) => {
                  let baseRate = 0;
                  if (item.calculationType === 'Unit Price') {
                    const deductionRate = item.deductionRate ? item.deductionRate : 0;
                    baseRate = item.basePrice * ((100 - deductionRate) / 100);
                  } else {
                    baseRate = (item.netReceipts - item.deduction) / item.units;
                  }
                  return [
                    item._id.configuration, 'EX', item.catNo, item.title, item.units, baseRate, item.netReceipts,
                    item.proportion, item.royaltyRate, 100 - item.reductionRate, item.calculationOutput / item.units, item.calculationOutput,
                  ];
                });
                result[catNo] = result[catNo] || [];
                result[catNo] = result[catNo].concat(mappedData);
                territoryCb(err);
              });
            },
            function (territoryCb) {
              // UK Data
              const ukFilter = { ...releaseFilter };
              ukFilter.territory = 'GB';
              ukFilter.distributionChannel = 'Digital';
              const aggregate = [
                { $match: ukFilter },
                {
                  $group: {
                    _id: { configuration: '$configuration', proportion: '$objectPercentage', royaltyRate: '$royaltyRate', reductionRate: '$reductionRate' },
                    catNo: { $first: '$catalogueCatNo' },
                    title: { $first: '$catalogueReleaseTitle' },
                    units: { $sum: '$units' },
                    basePrice: { $first: '$perUnitRate' },
                    netReceipts: { $sum: '$calculationInput' },
                    proportion: { $first: '$objectPercentage' },
                    royaltyRate: { $first: '$royaltyRate' },
                    reductionRate: { $first: '$reductionRate' },
                    calculationOutput: { $sum: '$calculationOutput',
                    },
                  },
                },
              ];
              collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
                if (err) { logger.error(err); }
                const digitalCatNo = `${catNo}D`;
                const mappedData = findResult.map((item) => [
                  item._id.configuration, 'UK', digitalCatNo, item.title, item.units, null, item.netReceipts, item.proportion,
                  item.royaltyRate, 100 - item.reductionRate, item.calculationOutput / item.units, item.calculationOutput,
                ]);
                result[digitalCatNo] = result[digitalCatNo] || [];
                result[digitalCatNo] = result[digitalCatNo].concat(mappedData);
                territoryCb(err);
              });
            },
            function (territoryCb) {
              // ROW Data
              const rowFilter = { ...releaseFilter };
              rowFilter.territory = { $ne: 'GB' };
              rowFilter.distributionChannel = 'Digital';
              const aggregate = [
                { $match: rowFilter },
                {
                  $group: {
                    _id: { configuration: '$configuration', proportion: '$objectPercentage', royaltyRate: '$royaltyRate', reductionRate: '$reductionRate' },
                    catNo: { $first: '$catalogueCatNo' },
                    title: { $first: '$catalogueReleaseTitle' },
                    units: { $sum: '$units' },
                    basePrice: { $first: '$perUnitRate' },
                    netReceipts: { $sum: '$calculationInput' },
                    proportion: { $first: '$objectPercentage' },
                    royaltyRate: { $first: '$royaltyRate' },
                    reductionRate: { $first: '$reductionRate' },
                    calculationOutput: { $sum: '$calculationOutput' },
                  },
                },
              ];
              collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
                if (err) { logger.error(err); }
                const digitalCatNo = `${catNo}D`;
                const mappedData = findResult.map((item) => [
                  item._id.configuration, 'EX', digitalCatNo, item.title, item.units, null, item.netReceipts, item.proportion,
                  item.royaltyRate, 100 - item.reductionRate, item.calculationOutput / item.units, item.calculationOutput,
                ]);
                result[digitalCatNo] = result[digitalCatNo] || [];
                result[digitalCatNo] = result[digitalCatNo].concat(mappedData);
                territoryCb(err);
              });
            },
            function (territoryCb) {
              // Others Data
              const otherFilter = { ...releaseFilter };
              otherFilter.distributionChannel = { $in: ['Licensing', 'Neighbouring Rights', 'Mail Order'] };
              const aggregate = [
                { $match: otherFilter },
                {
                  $group: {
                    _id: {
                      distributionChannel: '$distributionChannel',
                      configuration: '$configuration',
                      proportion: '$objectPercentage',
                      royaltyRate: '$royaltyRate',
                      reductionRate: '$reductionRate',
                    },
                    catNo: { $first: '$catalogueCatNo' },
                    title: { $first: '$catalogueReleaseTitle' },
                    units: { $sum: '$units' },
                    basePrice: { $first: '$perUnitRate' },
                    netReceipts: { $sum: '$calculationInput' },
                    proportion: { $first: '$objectPercentage' },
                    royaltyRate: { $first: '$royaltyRate' },
                    reductionRate: { $first: '$reductionRate' },
                    calculationOutput: { $sum: '$calculationOutput' } } },
              ];
              collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
                if (err) { logger.error(err); }
                const mappedData = findResult.map((item) => [
                  item._id.configuration, null, item.catNo, item.title, item.units, item.basePrice, item.netReceipts, item.proportion,
                  item.royaltyRate, 100 - item.reductionRate, item.calculationOutput / item.units, item.calculationOutput,
                ]);
                result[catNo] = result[catNo] || [];
                result[catNo] = result[catNo].concat(mappedData);
                territoryCb(err);
              });
            },
          ], (err) => {
            catNoCb(err);
          });
        }, cb);
      },
      function (cb) {
        // Track UK Data
        const trackFilter = { ...statement.dbFilter };
        trackFilter.catType = 'Track';
        trackFilter.territory = 'GB';
        const aggregate = [
          { $match: trackFilter },
          {
            $group: {
              _id: { configuration: '$configuration', proportion: '$objectPercentage', royaltyRate: '$royaltyRate', reductionRate: '$reductionRate' },
              title: { $first: '$catalogueReleaseTitle' },
              units: { $sum: '$units' },
              basePrice: { $first: '$perUnitRate' },
              netReceipts: { $sum: '$calculationInput' },
              proportion: { $first: '$objectPercentage' },
              royaltyRate: { $first: '$royaltyRate' },
              reductionRate: { $first: '$reductionRate' },
              calculationOutput: { $sum: '$calculationOutput' },
            },
          },
        ];
        collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
          if (err) { logger.error(err); }
          const mappedData = findResult.map((item) => [
            item._id.configuration, 'UK', null, item.title, item.units, null, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, null, item.calculationOutput,
          ]);
          trackResult = trackResult.concat(mappedData);
          cb(err);
        });
      },
      function (cb) {
        // Track ROW Data
        const trackFilter = { ...statement.dbFilter };
        trackFilter.catType = 'Track';
        trackFilter.territory = { $ne: 'GB' };
        const aggregate = [
          { $match: trackFilter },
          {
            $group: {
              _id: { configuration: '$configuration', proportion: '$objectPercentage', royaltyRate: '$royaltyRate', reductionRate: '$reductionRate' },
              title: { $first: '$catalogueReleaseTitle' },
              units: { $sum: '$units' },
              basePrice: { $first: '$perUnitRate' },
              netReceipts: { $sum: '$calculationInput' },
              proportion: { $first: '$objectPercentage' },
              royaltyRate: { $first: '$royaltyRate' },
              reductionRate: { $first: '$reductionRate' },
              calculationOutput: { $sum: '$calculationOutput' },
            },
          },
        ];
        collection.aggregate(aggregate, { allowDiskUse: true }).toArray((err, findResult) => {
          if (err) { logger.error(err); }
          const mappedData = findResult.map((item) => [
            item._id.configuration, 'EX', null, item.title, item.units, null, item.netReceipts, item.proportion,
            item.royaltyRate, 100 - item.reductionRate, null, item.calculationOutput,
          ]);
          trackResult = trackResult.concat(mappedData);
          cb(err);
        });
      },
    ], (err) => {
      callback(err, result, trackResult);
    });
  };

  this.costData = function (callback) {
    statement.getCostsData((err, costsData) => {
      let totalEarnings = 0;
      async.eachSeries(costsData, (costsRow, costsRowCb) => {
        statement.worksheet.spliceRows(17, 0, costsRow);
        statement.worksheet.getCell('J14').numFmt = '0.00';
        totalEarnings += costsRow[costsRow.length - 1];
        costsRowCb();
      }, () => {
        let linePosition = 17 + costsData.length;
        if (statement.reservesWithheld) {
          linePosition += 1;
          statement.worksheet.spliceRows(17, 0, [null, null, 'Reserve Withheld', null, null, null, null, null, null, null, null, 0 - statement.reservesWithheld]);
          statement.worksheet.getRow(17).getCell(12).numFmt = '0.00';
          totalEarnings += 0 - statement.reservesWithheld;
        }
        if (statement.reservesReleased) {
          linePosition += 1;
          statement.worksheet.spliceRows(17, 0, [null, null, 'Reserve Released', null, null, null, null, null, null, null, null, statement.reservesReleased]);
          statement.worksheet.getRow(17).getCell(12).numFmt = '0.00';
          statement.worksheet.getCell('J18').numFmt = '0.00';
          totalEarnings += statement.reservesReleased;
        }
        statement.worksheet.getRow(linePosition).getCell(12).value = totalEarnings;
        callback();
      });
    });
  };

  this.getCostsData = function (callback) {
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

  this.transactionData = function (callback) {
    const transactions = statement.transactions.map((transaction) => {
      if (['Transfer From', 'Transfer To', 'Royalties', 'Other'].includes(transaction.type) && transaction.date >= statement.startDate && transaction.date <= statement.date) {
        return transaction;
      }
    }).filter(Boolean);
    if (transactions && transactions.length > 0) {
      let totalTransactions = 0;
      async.eachSeries(transactions, (transaction, transactionCb) => {
        statement.worksheet.spliceRows(20, 0, [null, null, transaction.name, null, null, null, null, null, null, null, null, transaction.amount]);
        statement.worksheet.getRow(20).getCell(12).numFmt = '0.00';
        totalTransactions += transaction.amount;
        transactionCb();
      }, () => {
        statement.worksheet.getRow(20 + transactions.length).getCell(12).numFmt = '0.00';
        statement.worksheet.getRow(20 + transactions.length).getCell(12).value = totalTransactions;
        callback();
      });
    } else {
      callback();
    }
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
    statement.worksheet.getRow(25).getCell(12).value = payments;
    callback();
  };

  this.closingBalances = function (callback) {
    statement.worksheet.getRow(24).getCell(12).value = statement.openingBalance;
    statement.worksheet.getRow(26).getCell(12).value = statement.closingBalance;
    statement.worksheet.getRow(22).getCell(12).value = statement.netOutput;
    statement.worksheet.getRow(14).getCell(12).value = statement.netAmount;
    callback();
  };
};

module.exports = Proper;
