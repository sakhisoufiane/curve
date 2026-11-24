const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const Statement = require('./statementCreator');

const Mcps = function (params) {
  // Set params to object
  Statement.call(this, params);
  const statement = this;

  // Initiate
  this.db = params.db;
  this.bigQuery = params.bigQuery;
  this.periodSalesDatabaseTable = params.periodSalesDatabaseTable;
  this.accountNo = params.accountNo;
  this.internationalBasis = params.internationalBasis;
  this.periodId = params.periodId;
  this.clientId = params.clientId;
  this.clientName = params.clientName;
  this.labelName = params.labelName;
  this.year = params.year;
  this.accountingPeriod = params.accountingPeriod;
  this.endDate = params.endDate;
  this.startDate = params.startDate;
  this.mcpsId = params.mcpsId;
  this.freeGoodsFilter = params.freeGoodsFilter;
  this.returnsFilter = params.returnsFilter;
  this.consignmentFilter = params.consignmentFilter;
  this.filter = params.filter;
  this.returnsNegativeSales = params.returnsNegativeSales;
  this.internationalBasis = params.internationalBasis;
  this.minPerUnitRate = params.minPerUnitRate;
  this.releases = params.releases;
  this.retentions = params.retentions;
  this.negatives = params.negatives;
  this.retentionsToTake = [];
  this.priorNegativesToCreate = [];
  this.completedReleaseIds = [];
  this.unreportedSales = [];

  this.create = function (filePath, callback) {
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/MCPS Template.xlsm`)
      .then(() => {
        statement.overviewSheet = workbook.getWorksheet(1);
        statement.dataSheet = workbook.getWorksheet('Normal shipments');
        statement.unreportedSheet = workbook.getWorksheet('Unreported');
        async.waterfall([
          statement.completeCoverSheet,
          statement.completeDataSheet,
          statement.completeUnreportedSheet,
          function (cb) {
            workbook.xlsx.writeFile(filePath).then(() => {
              cb();
            });
          },
          statement.createNewRetensions,
          statement.createNewNegatives,
        ], (err) => {
          callback(err, filePath);
        });
      }).catch((err) => {
        callback(err);
      });
  };

  this.completeCoverSheet = function (callback) {
    statement.overviewSheet.getRow(5).getCell(3).value = statement.clientName;
    statement.overviewSheet.getRow(7).getCell(3).value = statement.labelName;
    statement.overviewSheet.getRow(9).getCell(3).value = statement.mapAccountingPeriod(statement.accountingPeriod);
    statement.overviewSheet.getRow(11).getCell(3).value = statement.year;
    callback();
  };

  this.mapAccountingPeriod = function (period) {
    switch (period) {
      case 'Q1': return 1;
      case 'Q2': return 2;
      case 'Q3': return 3;
      case 'Q4': return 4;
      default: return 1;
    }
  };

  this.completeDataSheet = function (callback) {
    // Load Data
    statement.loadData((err, data) => {
      if (err) {
        logger.debug(err);
        callback(err);
      } else {
        // Loop through results
        let dataForExcel = [];
        Object.keys(data).forEach((releaseId) => {
          // Add row to data
          dataForExcel.push(statement.dataToRow(releaseId, data[releaseId]));
        });
        // Check all releases are covered in retentions and get batch to write to bottom of statement
        const retentionsToCover = statement.checkReleasesAreCovered();
        // Check all releases are covered prior quarterlies and get batch to write to bottom of statement
        const quarterliesToCover = statement.checkQuarterliesReleasesAreCovered();
        // Add rows for any that have been missed
        retentionsToCover.forEach((retentionToCover) => {
          // Get Previous Negatives
          const previousNegative = statement.getPreviousNegativeObject(retentionToCover.releaseId, retentionToCover.territory);
          // If Previous Negative found, remove from batch
          if (previousNegative) {
            const negativeIndex = quarterliesToCover.indexOf(previousNegative);
            quarterliesToCover.splice(negativeIndex, 1);
          }
          // Write retention row
          dataForExcel.push(statement.retentionToRow(retentionToCover, previousNegative));
        });
        // Add negative rows for any that have been missed
        quarterliesToCover.forEach((quarterlyToCover) => {
          dataForExcel.push(statement.quarterlyToRow(quarterlyToCover));
        });
        // Write to sheet
        // Clear any null values from lack of releases
        dataForExcel = dataForExcel.filter(Boolean);
        dataForExcel.forEach((row, rowIndex) => {
          row.forEach((cell, cellIndex) => {
            statement.dataSheet.getRow(4 + rowIndex).getCell(cellIndex + 1).value = cell;
          });
        });
        callback();
      }
    });
  };

  this.loadData = function (callback) {
    const statement = this;
    async.parallel([
      function (cb) {
      // Free Goods
        if (statement.freeGoodsFilter && statement.freeGoodsFilter.length > 0) {
          statement.bigQuery.getAggregate(statement.bigQuery.outputTable, [{ column: 'salesLineId', isSelector: true, isGroupBy: true }, { column: 'releaseId', isSelector: true, isGroupBy: true }, { column: 'territory', isSelector: true, isGroupBy: true }], [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyGrossAmount', displayAs: 'grossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'netAmount' }], 'lines', statement.setFilters(statement.freeGoodsFilter), cb);
        } else {
          cb(null, []);
        }
      },
      function (cb) {
      // Returns
        let filter;
        if (statement.returnsNegativeSales) {
          filter = statement.setFilters(statement.filter);
          filter.units = { $lt: 0 };
        } else {
          filter = statement.setFilters(statement.returnsFilter);
        }
        if (filter.$or && filter.$or.length > 0) {
          statement.bigQuery.getAggregate(statement.bigQuery.outputTable, [{ column: 'salesLineId', isSelector: true, isGroupBy: true }, { column: 'releaseId', isSelector: true, isGroupBy: true }, { column: 'territory', isSelector: true, isGroupBy: true }], [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyGrossAmount', displayAs: 'grossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'netAmount' }], 'lines', filter, cb);
        } else {
          cb(null, []);
        }
      },
      function (cb) {
      // Standard Sales
        if (statement.filter && statement.filter.length > 0) {
          const filter = statement.setFilters(statement.filter);
          filter.units = { $gte: 0 };
          statement.bigQuery.getAggregate(statement.bigQuery.outputTable, [{ column: 'salesLineId', isSelector: true, isGroupBy: true }, { column: 'releaseId', isSelector: true, isGroupBy: true }, { column: 'territory', isSelector: true, isGroupBy: true }], [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyGrossAmount', displayAs: 'grossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'netAmount' }], 'lines', filter, cb);
        } else {
          cb(null, []);
        }
      },
      function (cb) {
      // Consignment
        if (statement.consignmentFilter && statement.consignmentFilter.length > 0) {
          statement.bigQuery.getAggregate(statement.bigQuery.outputTable, [{ column: 'salesLineId', isSelector: true, isGroupBy: true }, { column: 'releaseId', isSelector: true, isGroupBy: true }, { column: 'territory', isSelector: true, isGroupBy: true }], [{ column: 'units', displayAs: 'units' }, { column: 'homeCurrencyGrossAmount', displayAs: 'grossAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'netAmount' }], 'lines', statement.setFilters(statement.consignmentFilter), cb);
        } else {
          cb(null, []);
        }
      },
    ], (err, results) => {
      if (err) {
        logger.debug(err);
        callback(err);
      } else {
      // Organise data into requisite parts
        const output = {};
        // Loop through sales
        results[2].forEach((item) => {
        // Create key string
          const keyString = `${item.releaseId}-${item.territory}`;
          // Set if it doesn't exist
          output[keyString] = output[keyString] || {
            sales: 0, salesGrossAmount: 0, salesNetAmount: 0, freeGoods: 0, freeGoodsGrossAmount: 0, freeGoodsNetAmount: 0, returns: 0, returnsGrossAmount: 0, returnsNetAmount: 0, consignment: 0, consignmentGrossAmount: 0, consignmentNetAmount: 0,
          };
          // Set units
          if (item.units && (item.netAmount || item.netAmount == 0) && statement.minPerUnitRate && ((item.netAmount / item.units >= 0 && item.netAmount / item.units < statement.minPerUnitRate) || (item.netAmount / item.units < 0 && item.netAmount / item.units > 0 - statement.minPerUnitRate))) {
            logger.debug('Not adding row', item.netAmount / item.units, '<', statement.minPerUnitRate, 'Units:', item.units);
            statement.unreportedSales.push(item);
          } else {
            output[keyString].sales += item.units;
            output[keyString].salesGrossAmount += item.grossAmount;
            output[keyString].salesNetAmount += item.netAmount;
          }
        });
        // Loop through free goods
        results[0].forEach((item) => {
        // Create key string
          const keyString = `${item.releaseId}-${item.territory}`;
          // Set if it doesn't exist
          output[keyString] = output[keyString] || {
            sales: 0, salesGrossAmount: 0, salesNetAmount: 0, freeGoods: 0, freeGoodsGrossAmount: 0, freeGoodsNetAmount: 0, returns: 0, returnsGrossAmount: 0, returnsNetAmount: 0, consignment: 0, consignmentGrossAmount: 0, consignmentNetAmount: 0,
          };
          // Set units
          output[keyString].freeGoods += item.units;
          output[keyString].freeGoodsGrossAmount += item.grossAmount;
          output[keyString].freeGoodsNetAmount += item.netAmount;
        });
        // Loop through returns
        results[1].forEach((item) => {
        // Create key string
          const keyString = `${item.releaseId}-${item.territory}`;
          // Set if it doesn't exist
          output[keyString] = output[keyString] || {
            sales: 0, salesGrossAmount: 0, salesNetAmount: 0, freeGoods: 0, freeGoodsGrossAmount: 0, freeGoodsNetAmount: 0, returns: 0, returnsGrossAmount: 0, returnsNetAmount: 0, consignment: 0, consignmentGrossAmount: 0, consignmentNetAmount: 0,
          };
          // Set units
          if (item.units && (item.netAmount || item.netAmount == 0) && statement.minPerUnitRate && ((item.netAmount / item.units >= 0 && item.netAmount / item.units < statement.minPerUnitRate) || (item.netAmount / item.units < 0 && item.netAmount / item.units > 0 - statement.minPerUnitRate))) {
            logger.debug('Not adding row', item.netAmount / item.units, '>', statement.minPerUnitRate, 'Units:', item.units);
            statement.unreportedSales.push(item);
          } else {
            output[keyString].returns += item.units;
            output[keyString].returnsGrossAmount += item.grossAmount;
            output[keyString].returnsNetAmount += item.netAmount;
          }
        });
        // Loop through consignment
        results[3].forEach((item) => {
        // Create key string
          const keyString = `${item.releaseId}-${item.territory}`;
          // Set if it doesn't exist
          output[keyString] = output[keyString] || {
            sales: 0, salesGrossAmount: 0, salesNetAmount: 0, freeGoods: 0, freeGoodsGrossAmount: 0, freeGoodsNetAmount: 0, returns: 0, returnsGrossAmount: 0, returnsNetAmount: 0, consignment: 0, consignmentGrossAmount: 0, consignmentNetAmount: 0,
          };
          // Set units
          output[keyString].consignment += item.units;
          output[keyString].consignmentGrossAmount += item.grossAmount;
          output[keyString].consignmentNetAmount += item.netAmount;
        });
        // Clear anything that only has 0 values - eg. all sales have been cleared out
        Object.keys(output).forEach((key) => {
          if (!output[key].sales && !output[key].freeGoods && !output[key].returns && !output[key].consignment) {
            delete output[key];
          }
        });
        callback(err, output);
      }
    });
  };

  this.setFilters = function (filters) {
    const result = { $or: [] };
    if (filters && filters.length !== 0) {
      filters.forEach((filter) => {
        const reducedFilter = statement.createFilter(filter);
        if (reducedFilter) {
          result.$or.push(reducedFilter);
        }
      });
      return result;
    }
    return {};
  };

  this.createFilter = function (object) {
    if (object) {
      const output = { periodId: statement.periodId };
      // Cat Type
      if (object.catType && object.catType !== 'All') { output.catType = object.catType; }
      // Territories
      if (Array.isArray(object.territory)) {
        output.territory = { $in: object.territory };
      } else if (object.territory && object.territory !== 'WW') {
        output.territory = { $in: statement.continentToTerritories(object.territory) };
      }
      // Distribution Channels
      if (Array.isArray(object.distributionChannel)) {
        output.distributionChannel = { $in: object.distributionChannel };
      } else if (object.distributionChannel && object.distributionChannel !== 'All') {
        output.distributionChannel = object.distributionChannel;
      } else if (Array.isArray(object.channel)) {
        output.distributionChannel = { $in: object.channel };
      } else if (object.channel && object.channel !== 'All') {
        output.distributionChannel = object.channel;
      }
      // Configs
      if (Array.isArray(object.configuration)) {
        output.configuration = { $in: object.configuration };
      } else if (object.configuration && object.configuration !== 'All') {
        output.configuration = object.configuration;
      }
      // Price Cats
      if (Array.isArray(object.priceCategory)) {
        output.priceCategory = { $in: object.priceCategory };
      } else if (object.priceCategory && object.priceCategory !== 'All') {
        output.priceCategory = object.priceCategory;
      }
      // Sources
      if (Array.isArray(object.source)) {
        output.source = { $in: object.source };
      } else if (object.source && object.source !== 'All') {
        output.source = object.source;
      }
      return output;
    }
    return null;
  };

  this.continentToTerritories = function (territory) {
    if (territory === 'Africa') {
      return ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
    } if (territory === 'Americas') {
      return ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI'];
    } if (territory === 'Asia') {
      return ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'HK', 'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KP', 'KR', 'KW', 'KG', 'LA', 'LB', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'];
    } if (territory === 'Europe') {
      return ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'XK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
    } if (territory === 'Oceania') {
      return ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
    } if (Array.isArray(territory)) {
      return territory;
    }
    return [territory];
  };

  this.dataToRow = function (key, rowData) {
    const releaseId = key.split('-')[0];
    const territory = key.split('-')[1];
    // Keep note of which releases have been covered
    statement.completedReleaseIds.push(key);
    // Set values if none found
    rowData.sales = rowData.sales ? rowData.sales : 0;
    rowData.freeGoods = rowData.freeGoods ? rowData.freeGoods : 0;
    rowData.returns = rowData.returns ? rowData.returns : 0;
    rowData.consignment = rowData.consignment ? rowData.consignment : 0;
    // Get Previous Negatives
    const previousNegative = statement.getPreviousNegative(releaseId, territory);
    // Get Retentions
    const retentions = statement.getRetention(releaseId, territory);
    let retention = retentions[0];
    let tvRetention = retentions[1];
    // Get Release
    const release = statement.releases[releaseId];
    // Set PPD Type
    let ppd = 0;
    let ppdType;
    if (release && (territory === 'GB' || statement.internationalBasis === 'PPD')) {
      ppd = release.dealerPrice;
      ppdType = 'D';
    } else if (statement.internationalBasis === 'Net Amount') {
      ppd = statement.averageUnitRate(rowData, 'NetAmount');
      ppdType = 'R';
    } else if (statement.internationalBasis === 'Gross Amount') {
      ppd = statement.averageUnitRate(rowData, 'GrossAmount');
      ppdType = 'R';
    }
    if (release) {
      // Make Retention
      const oneYearBefore = new Date(statement.startDate);
      oneYearBefore.setFullYear(oneYearBefore.getFullYear() - 1);
      const calculatedRetention = rowData.sales + rowData.returns - rowData.freeGoods - previousNegative;
      if (release.releaseDate > oneYearBefore && calculatedRetention > 4 && !release.mcpsTvAdvertised) {
        if (calculatedRetention > 0) {
          retention += Math.floor(calculatedRetention * 0.1);
        }
        statement.retentionsToTake.push({
          clientId: statement.clientId, periodId: statement.periodId, releaseId: release._id.toString(), releaseTitle: release.title, releaseCatNo: release.catNo, territory, retention, tvRetention: 0, year: statement.year + 1, accountingPeriod: statement.accountingPeriod,
        });
      }
      const calculatedTvRetention = rowData.sales + rowData.returns - rowData.freeGoods - previousNegative;
      if (release.releaseDate > oneYearBefore && calculatedTvRetention > 4 && release.mcpsTvAdvertised) {
        if (calculatedTvRetention > 0) {
          tvRetention += Math.floor(calculatedTvRetention * 0.25);
        }
        statement.retentionsToTake.push({
          clientId: statement.clientId, periodId: statement.periodId, releaseId: release._id.toString(), releaseTitle: release.title, releaseCatNo: release.catNo, territory, tvRetention, retention: 0, year: statement.year + 1, accountingPeriod: statement.accountingPeriod,
        });
      }
      // Create Prior Negative
      const totalUnits = rowData.sales;
      const priorNegative = totalUnits + rowData.returns - previousNegative - rowData.freeGoods - rowData.consignment - retention - tvRetention;
      if (priorNegative < 0) {
        const nextPeriod = statement.nextPeriod(statement.year, statement.accountingPeriod);
        statement.priorNegativesToCreate.push({
          clientId: statement.clientId, periodId: statement.periodId, releaseId: release._id.toString(), releaseTitle: release.title, releaseCatNo: release.catNo, territory, value: 0 - priorNegative, year: nextPeriod.year, accountingPeriod: nextPeriod.accountingPeriod,
        });
      }
      return [
        // Account No
        statement.accountNo,
        // Scheme Code
        'AP1',
        // Cat No
        release.catNo,
        // MCPS ID
        release.mcpsId,
        // Title
        release.title,
        // Artist
        release.artist,
        // Label
        release.label,
        // Format
        release.format,
        // Release Date
        release.releaseDate ? moment(release.releaseDate).format('DD/MM/YYYY') : '',
        // Territory
        territory,
        // Start Date
        moment(statement.startDate).format('DD/MM/YYYY'),
        // End Date
        moment(statement.endDate).format('DD/MM/YYYY'),
        // Gross Amount
        totalUnits,
        // Prior Quarterly Negatives
        previousNegative,
        // Promotional Copies
        rowData.freeGoods,
        // Returns
        0 - rowData.returns,
        // Equivalent Returns
        0,
        // Consignment
        rowData.consignment,
        // Blank
        null,
        // Retentions
        retention,
        // TV Retentions
        tvRetention,
        // Blank
        null,
        // PPD
        ppd,
        // Standard D
        ppdType,
      ];
    }
  };

  this.checkReleasesAreCovered = function (callback) {
    return statement.retentions.map((retention) => {
      if (!statement.completedReleaseIds.includes(`${retention.releaseId.toString()}-${retention.territory}`)) {
        return retention;
      }
    }).filter(Boolean);
  };

  this.checkQuarterliesReleasesAreCovered = function (callback) {
    return statement.negatives.map((negative) => {
      if (!statement.completedReleaseIds.includes(`${negative.releaseId.toString()}-${negative.territory}`)) {
        return negative;
      }
    }).filter(Boolean);
  };

  this.retentionToRow = function (incomingRetention, previousNegative) {
    const release = statement.releases[incomingRetention.releaseId];
    if (release) {
      if (previousNegative) {
        // Set up new negative to carry over
        const retention = incomingRetention && incomingRetention.retention ? 0 - incomingRetention.retention : 0;
        const tvRetention = incomingRetention && incomingRetention.tvRetention ? 0 - incomingRetention.tvRetention : 0;
        // Convert PQNs to negative number, this sets the correct nextPriorNegative value (net shipment) for condition
        const priorQuartelyNegative = previousNegative?.value ? 0 - previousNegative.value : 0;
        const nextPriorNegative = priorQuartelyNegative - retention - tvRetention;

        if (nextPriorNegative < 0) {
          const nextPeriod = statement.nextPeriod(statement.year, statement.accountingPeriod);
          statement.priorNegativesToCreate.push({
            clientId: statement.clientId,
            periodId: statement.periodId,
            releaseId: release._id.toString(),
            releaseTitle: release.title,
            releaseCatNo: release.catNo,
            territory: previousNegative.territory,
            // Convert nextPriorNegative back to a positive value, we display PQNs as positive numbers on the statement as part of the ap1 calculaton.
            value: 0 - nextPriorNegative,
            year: nextPeriod.year,
            accountingPeriod: nextPeriod.accountingPeriod,
          });
        }
      }
      return [
        // Account No
        statement.accountNo,
        // Scheme Code
        'AP1',
        // Cat No
        release.catNo,
        // MCPS ID
        release.mcpsId,
        // Title
        release.title,
        // Artist
        release.artist,
        // Label
        release.label,
        // Format
        release.format,
        // Release Date
        release.releaseDate ? moment(release.releaseDate).format('DD/MM/YYYY') : '',
        // Territory
        incomingRetention.territory,
        // Start Date
        moment(statement.startDate).format('DD/MM/YYYY'),
        // End Date
        moment(statement.endDate).format('DD/MM/YYYY'),
        // Gross Amount
        0,
        // Prior Quarterly Negatives
        previousNegative ? previousNegative.value : 0,
        // Promotional Copies
        0,
        // Returns
        0,
        // Equivalent Returns
        0,
        // Other
        0,
        // Blank
        null,
        // Retentions
        incomingRetention.retention ? 0 - incomingRetention.retention : 0,
        // TV Retentions
        incomingRetention.tvRetention ? 0 - incomingRetention.tvRetention : 0,
        // Blank
        null,
        // PPD
        release.dealerPrice,
        // Standard D
        'D',
      ];
    }
  };

  this.quarterlyToRow = function (quarterly) {
    // Find release
    const release = statement.releases[quarterly.releaseId];
    if (!release) {
      logger.info("Can't find release:", quarterly);
    }
    // Set up new negative to carry over
    const nextPeriod = statement.nextPeriod(statement.year, statement.accountingPeriod);
    statement.priorNegativesToCreate.push({
      clientId: statement.clientId, periodId: statement.periodId, releaseId: quarterly.releaseId, releaseTitle: release.title, releaseCatNo: release.catNo, territory: quarterly.territory, value: quarterly.value, year: nextPeriod.year, accountingPeriod: nextPeriod.accountingPeriod,
    });
    if (release) {
      return [
        // Account No
        statement.accountNo,
        // Scheme Code
        'AP1',
        // Cat No
        release.catNo,
        // MCPS ID
        release.mcpsId,
        // Title
        release.title,
        // Artist
        release.artist,
        // Label
        release.label,
        // Format
        release.format,
        // Release Date
        release.releaseDate ? moment(release.releaseDate).format('DD/MM/YYYY') : '',
        // Territory
        quarterly.territory,
        // Start Date
        moment(statement.startDate).format('DD/MM/YYYY'),
        // End Date
        moment(statement.endDate).format('DD/MM/YYYY'),
        // Gross Amount
        0,
        // Prior Quarterly Negatives
        quarterly.value,
        // Promotional Copies
        0,
        // Returns
        0,
        // Equivalent Returns
        0,
        // Other
        0,
        // Blank
        null,
        // Retentions
        0,
        // TV Retentions
        0,
        // Blank
        null,
        // PPD
        release.dealerPrice,
        // Standard D
        'D',
      ];
    }
  };

  this.getPreviousNegative = function (releaseId, territory) {
    if (statement.negatives) {
      let result = 0;
      statement.negatives.forEach((negative) => {
        if (negative && negative.territory === territory && negative.releaseId === releaseId) {
          result += negative.value;
        }
      });
      return result;
    }
    return 0;
  };

  this.getPreviousNegativeObject = function (releaseId, territory) {
    if (statement.negatives) {
      let result;
      statement.negatives.forEach((negative) => {
        if (negative && negative.territory === territory && negative.releaseId === releaseId) {
          result = negative;
        }
      });
      return result;
    }
  };

  this.getRetention = function (releaseId, territory) {
    if (statement.retentions) {
      let retentionValue = 0;
      let retentionTvValue = 0;
      statement.retentions.forEach((retention) => {
        if (retention && retention.territory === territory && retention.releaseId === releaseId) {
          retentionValue -= retention.retention;
          retentionTvValue -= retention.tvRetention;
        }
      });
      return [retentionValue, retentionTvValue];
    }
    return [0, 0];
  };

  this.averageUnitRate = function (rowData, type) {
    let amount = 0;
    let units = 0;
    ['sales', 'returns', 'freeGoods'].forEach((area) => {
      if (rowData[area + type]) { amount += rowData[area + type]; }
      if (rowData[area]) { units += rowData[area]; }
    });
    return amount / units;
  };

  this.nextPeriod = function (year, period) {
    if (period === 'Q4') {
      return { year: year + 1, accountingPeriod: 'Q1' };
    }
    const periodNo = parseInt(period.replace(/\D/g, ''));
    return { year, accountingPeriod: `Q${periodNo + 1}` };
  };

  this.createNewRetensions = function (callback) {
    if (statement.retentionsToTake.length > 0) {
      statement.db.collection('mcpsretentions')
        .insertMany(statement.retentionsToTake)
        .then(() => callback())
        .catch(callback);
    } else {
      callback();
    }
  };

  this.createNewNegatives = function (callback) {
    if (statement.priorNegativesToCreate.length > 0) {
      statement.db.collection('mcpsnegatives')
        .insertMany(statement.priorNegativesToCreate)
        .then(() => callback())
        .catch(callback);
    } else {
      callback();
    }
  };

  this.completeUnreportedSheet = function (callback) {
    let dataForExcel = [];
    statement.unreportedSales.forEach((rowData) => {
      // Add row to data
      dataForExcel.push(statement.unreportedRowData(rowData));
    });
    // Write to sheet
    // Clear any null values from lack of releases
    dataForExcel = dataForExcel.filter(Boolean);
    dataForExcel.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        statement.unreportedSheet.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
      });
    });
    callback();
  };

  this.unreportedRowData = function (rowData) {
    const { releaseId } = rowData;
    const { territory } = rowData;
    // Get Release
    let release = statement.releases[releaseId];
    // Set PPD Type
    let ppd = 0;
    let ppdType;
    if (release && (territory === 'GB' || statement.internationalBasis === 'PPD')) {
      ppd = release.dealerPrice;
      ppdType = 'D';
    } else if (statement.internationalBasis === 'Net Amount') {
      ppd = statement.averageUnitRate(rowData, 'NetAmount');
      ppdType = 'R';
    } else if (statement.internationalBasis === 'Gross Amount') {
      ppd = statement.averageUnitRate(rowData, 'GrossAmount');
      ppdType = 'R';
    }
    // Set release to blank object if it doesn't exist
    release = release || {};
    return [
      // Account No
      statement.accountNo,
      // Scheme Code
      'AP1',
      // Cat No
      release.catNo,
      // MCPS ID
      release.mcpsId,
      // Title
      release.title,
      // Artist
      release.artist,
      // Label
      release.label,
      // Format
      release.format,
      // Release Date
      release.releaseDate ? moment(release.releaseDate).format('DD/MM/YYYY') : '',
      // Territory
      territory,
      // Start Date
      moment(statement.startDate).format('DD/MM/YYYY'),
      // End Date
      moment(statement.endDate).format('DD/MM/YYYY'),
      // Units
      rowData.units,
      // Net Amount
      rowData.netAmount,
    ];
  };
};

module.exports = Mcps;
