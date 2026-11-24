const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const Excel = require('exceljs');
const appRootDir = require('app-root-dir').get();
const Statement = require('./statementCreator');

const GeneralLedgerSummary = function (params) {
// Set params to object
  Statement.call(this, params);
  const statement = this;

  // Initiate
  this.db = params.db;
  this.periodSalesDatabaseTable = params.periodSalesDatabaseTable;
  this.salesDatabaseTable = params.salesDatabaseTable;
  this.salesFilesIds = params.salesFilesIds;
  this.periodId = params.periodId;
  this.year = params.year;
  this.accountingPeriod = params.accountingPeriod;
  this.endDate = params.endDate;
  this.startDate = params.startDate;
  this.filters = params.filters;

  // TODO: Fix use from lambdaFunctions,
  this.create = function (filePath, callback) {
    const workbook = new Excel.Workbook();
    workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/General Ledger Template.xlsx`)
      .then(() => {
        statement.dataSheet = workbook.getWorksheet(1);
        async.waterfall([
          function (cb) {
          // Prepare Data
            statement.loadData(cb);
          },
          function (data, cb) {
          // Write to sheet
            statement.writeData(data, cb);
          },
        ], (err) => {
          if (err) {
            callback(err);
          } else {
          // Complete writing to sheet
            workbook.xlsx.writeFile(filePath).then(() => {
              callback(null, filePath);
            }).catch(callback);
          }
        });
      }).catch(callback);
  };

  this.loadData = function (callback) {
  // Loop through each filter
    async.map(statement.filters, (filter, cb) => {
      async.parallel([
        function (paraCb) {
        // Setup collection
          const collection = statement.db.collection(statement.salesDatabaseTable);
          // Set up aggregate to run on input table
          const match = statement.createFilter(filter);
          match.salesFileId = { $in: statement.salesFilesIds };
          match.units = { $gte: 0 };
          const aggregate = [
            { $match: match },
            {
              $group: {
                _id: '0', units: { $sum: '$units' }, grossAmount: { $sum: '$homeCurrencyGrossAmount' }, netAmount: { $sum: '$homeCurrencyNetAmount' },
              },
            },
          ];
          // Call DB
          collection.aggregate(aggregate, { allowDiskUse: true })
            .toArray(paraCb)
            .then((aggregate) => paraCb(null, aggregate))
            .catch(paraCb);
        },
        function (paraCb) {
        // Setup collection
          const collection = statement.db.collection(statement.salesDatabaseTable);
          // Set up aggregate to run on input table
          const match = statement.createFilter(filter);
          match.salesFileId = { $in: statement.salesFilesIds };
          match.units = { $lt: 0 };
          const aggregate = [
            { $match: match },
            {
              $group: {
                _id: '0', units: { $sum: '$units' }, grossAmount: { $sum: '$homeCurrencyGrossAmount' }, netAmount: { $sum: '$homeCurrencyNetAmount' },
              },
            },
          ];
          // Call DB
          collection.aggregate(aggregate, { allowDiskUse: true })
            .toArray(paraCb)
            .then((aggregate) => paraCb(null, aggregate))
            .catch(paraCb);
        },
        function (paraCb) {
        // Setup collection
          const collection = statement.db.collection(statement.periodSalesDatabaseTable);
          // Set up aggregate to run on output table
          const match = statement.createFilter(filter);
          match.periodId = statement.periodId;
          logger.debug(match);
          const aggregate = [
            { $match: match },
            { $group: { _id: '0', calculationOutput: { $sum: '$calculationOutput' } } },
          ];
          // Call DB
          collection.aggregate(aggregate, { allowDiskUse: true })
            .toArray(paraCb)
            .then((aggregate) => paraCb(null, aggregate))
            .catch(paraCb);
        },
      ], (err, results) => {
        if (err) {
          cb(err);
        } else if (results) {
          results[0] = results[0] || [];
          results[0][0] = results[0][0] || { units: 0, netAmount: 0, grossAmount: 0 };
          results[0][0].code = filter.code;
          results[0][0].glType = filter.glType;
          results[0][0].costCentre = filter.costCentre;
          results[0][0].profitCentre = filter.profitCentre;
          if (results[1] && results[1][0]) {
            results[0][0].negativeUnits = results[1][0].units;
            results[0][0].negativeGrossAmount = results[1][0].grossAmount;
            results[0][0].negativeNetAmount = results[1][0].netAmount;
          } else {
            results[0][0].negativeUnits = 0;
            results[0][0].negativeGrossAmount = 0;
            results[0][0].negativeNetAmount = 0;
          }
          if (results[2] && results[2][0]) { results[0][0].calculationOutput = results[2][0].calculationOutput; }
          cb(err, results[0][0]);
        } else {
          cb(null, null);
        }
      });
    }, (err, results) => {
    // Return results
      callback(null, results);
    });
  };

  this.createFilter = function (object) {
    if (object) {
      const output = {};
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
      return ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FO', 'FI', 'FR', 'DE', 'GI', 'GR', 'GG', 'VA', 'HU', 'IS', 'IE', 'IM', 'IT', 'JE', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD', 'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SJ', 'SE', 'CH', 'UA', 'GB', 'AX'];
    } if (territory === 'Oceania') {
      return ['AS', 'AQ', 'AU', 'BV', 'IO', 'CX', 'CC', 'CK', 'FJ', 'PF', 'TF', 'GU', 'HM', 'KI', 'MH', 'FM', 'NR', 'NC', 'NZ', 'NU', 'NF', 'MP', 'PW', 'PG', 'PN', 'SB', 'GS', 'TK', 'TO', 'TV', 'UM', 'VU', 'WF', 'WS'];
    } if (Array.isArray(territory)) {
      return territory;
    }
    return [territory];
  };

  this.writeData = function (data, callback) {
    logger.debug(data);
    const output = [];
    data.forEach((line) => {
      if (line) {
        let outputLine = [];
        if (line && line.costCentre) {
          outputLine = [
            String(statement.year) + statement.accountingPeriod,
            moment().format('YYYY-MM-DD'),
            1002,
            1002,
            127,
            line.costCentre,
            null,
            line.code,
            null,
            null,
            null,
            null,
          ];
        } else if (line && line.profitCentre) {
          outputLine = [
            String(statement.year) + statement.accountingPeriod,
            moment().format('YYYY-MM-DD'),
            1002,
            1002,
            127,
            null,
            line.profitCentre,
            line.code,
            null,
            null,
            null,
            null,
          ];
        } else {
          outputLine = [
            String(statement.year) + statement.accountingPeriod,
            moment().format('YYYY-MM-DD'),
            1002,
            1002,
            127,
            null,
            null,
            line.code,
            null,
            null,
            null,
            null,
          ];
        }
        if (line.glType === 'Net Amount') {
          outputLine.push(0 - line.negativeUnits);
          outputLine.push(0 - line.negativeNetAmount);
          outputLine.push(0 - line.units);
          outputLine.push(0 - line.netAmount);
        } else if (line.glType === 'Gross Amount') {
          outputLine.push(0 - line.negativeUnits);
          outputLine.push(0 - line.negativeGrossAmount);
          outputLine.push(0 - line.units);
          outputLine.push(0 - line.grossAmount);
        } else if (line.glType === 'Distribution Fee') {
          outputLine.push(line.units);
          outputLine.push(line.grossAmount - line.netAmount);
          outputLine.push(line.negativeUnits);
          outputLine.push(line.negativeGrossAmount - line.negativeNetAmount);
        } else if (line.glType === 'Royalty') {
          outputLine.push(line.units);
          outputLine.push(line.netAmount);
          outputLine.push(null);
          outputLine.push(line.calculationOutput);
        }
        output.push(outputLine);
      }
    });
    // Write data to excel
    output.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        statement.dataSheet.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
      });
    });
    callback();
  };
};

module.exports = GeneralLedgerSummary;
