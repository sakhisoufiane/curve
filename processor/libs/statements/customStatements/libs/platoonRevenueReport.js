const { logger, fileManager, utils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const appRootDir = require('app-root-dir').get();
const Excel = require('exceljs');
const Contract = require('../../../../models/contract');
// const Statement = require('../../../../models/statement');

const createPlatoonRevenueReport = function (bigQuery, statement, salesData, callback) {
  logger.debug(`Creating custom Platoon Statement for - ${statement._id}`);

  // Config
  const selectColumns = [
    { column: 'contractId', isSelector: true, isGroupBy: true },
    { column: 'catType', isSelector: true, isGroupBy: true },
    { column: 'source', isSelector: true, isGroupBy: true },
    { column: 'territory', isSelector: true, isGroupBy: true },
    { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
    { column: 'catalogueTrackArtist', isSelector: true, isGroupBy: true },
    { column: 'catalogueIsrc', isSelector: true, isGroupBy: true },
    { column: 'catalogueReleaseTitle', isSelector: true, isGroupBy: true },
    { column: 'catalogueReleaseArtist', isSelector: true, isGroupBy: true },
    { column: 'catalogueBarcode', isSelector: true, isGroupBy: true },
    { column: 'catalogueCatNo', isSelector: true, isGroupBy: true },
    { column: 'catalogueLabel', isSelector: true, isGroupBy: true },
    { column: 'contractCurrency', isSelector: true, isGroupBy: true },
    { column: 'proRataAmount', isSelector: false, isGroupBy: false },
    { column: 'contractCurrencyCalculationOutput', isSelector: false, isGroupBy: false },
  ];

  const sumCols = [
    { column: 'contractId', isSelector: false, isGroupBy: false },
    { column: 'catType', isSelector: true, isGroupBy: true },
    { column: 'source', isSelector: true, isGroupBy: true },
    { column: 'territory', isSelector: true, isGroupBy: true },
    { column: 'catalogueTrackTitle', isSelector: true, isGroupBy: true },
    { column: 'catalogueTrackArtist', isSelector: true, isGroupBy: true },
    { column: 'catalogueIsrc', isSelector: false, isGroupBy: false },
    { column: 'catalogueReleaseTitle', isSelector: false, isGroupBy: false },
    { column: 'catalogueReleaseArtist', isSelector: false, isGroupBy: false },
    { column: 'catalogueBarcode', isSelector: false, isGroupBy: false },
    { column: 'catalogueCatNo', isSelector: false, isGroupBy: false },
    { column: 'catalogueLabel', isSelector: false, isGroupBy: false },
    { column: 'contractCurrency', isSelector: false, isGroupBy: false },
    { column: 'proRataAmount', displayAs: 'netReciept' },
    { column: 'contractCurrencyCalculationOutput', displayAs: 'reportedRoyalty' },
  ];

  const filter = {
    periodId: statement.periodId,
    contractId: statement.contractId,
  };

  let sales = [];
  const convertedAssets = [];
  const convertedReleases = [];
  const convertedTerritories = [];
  const convertedSources = [];
  async.waterfall([
    function (cb) {
      if (!salesData) {
        logger.debug(`Platoon Revenue Report: Collecting Data from Big Query ${filter.periodId} - ${filter.contractId}`);
        bigQuery.getAggregate(bigQuery.outputTable, selectColumns, sumCols, 'lines', filter, {}, (err, statementSales) => {
          if (err) {
            logger.error(`Error querying data to Big Query: ${err}`);
            return cb(err);
          }

          if (sales) {
            logger.debug(`Platoon Revenue Report: Converting ${statementSales.length} sales for contract ${filter.contractId}`);
            sales = statementSales;
            cb();
          } else {
            cb();
          }
        });
      } else {
        logger.debug(`Platoon Revenue Report: Preparing sales data for ${statement._id} custom Platoon report`);
        Contract.findOne({ _id: statement.contractId }, 'name')
          .then((contract) => {
            if (salesData?.[contract?.name]) {
              salesData[contract?.name].forEach((data) => {
                sales.push({
                  source: data[4],
                  territory: data[7],
                  catalogueIsrc: data[15],
                  catalogueTrackTitle: data[16],
                  catalogueTrackArtist: data[18],
                  catalogueReleaseTitle: data[10],
                  catalogueReleaseArtist: data[12],
                  catalogueBarcode: data[8],
                  catalogueCatNo: data[9],
                  catalogueLabel: data[13],
                  contractCurrency: data[50],
                  netReciept: data[34],
                  reportedRoyalty: data[45],
                });
              });
              cb();
            } else {
              logger.debug(`Platoon Revenue Report: No sales for statement ${statement._id}`);
              cb();
            }
          })
          .catch((err) => {
            logger.error(`Platoon Revenue Report: Could not retrieve contract name from statement ${statement._id}`);
            cb(err);
          });
      }
    },
    function (cb) {
    //  Group sales via ISRC
      if (sales?.length === 0) { return cb(); }

      const assetsDictionary = sales.reduce((acc, curr) => {
        acc[curr.catalogueIsrc] = {
          catalogueTrackTitle: curr.catalogueTrackTitle,
          catalogueTrackArtist: curr.catalogueTrackArtist,
          catalogueIsrc: curr.catalogueIsrc,
          catalogueReleaseTitle: curr.catalogueReleaseTitle,
          catalogueReleaseArtist: curr.catalogueReleaseArtist,
          catalogueBarcode: curr.catalogueBarcode,
          catalogueCatNo: curr.catalogueCatNo,
          catalogueLabel: curr.catalogueLabel,
          currency: curr.contractCurrency,
          netReciept: acc[curr.catalogueIsrc]?.netReciept || 0,
          reportedRoyalty: acc[curr.catalogueIsrc]?.reportedRoyalty || 0,
        };
        acc[curr.catalogueIsrc].netReciept += curr.netReciept;
        acc[curr.catalogueIsrc].reportedRoyalty += curr.reportedRoyalty;
        return acc;
      }, {});
      const assets = Object.keys(assetsDictionary).map((key) => assetsDictionary[key]);
      assets.forEach((asset) => {
        convertedAssets.push([asset.catalogueTrackTitle, asset.catalogueTrackArtist, asset.catalogueIsrc, asset.catalogueReleaseTitle, asset.catalogueReleaseArtist, asset.catalogueBarcode, asset.catalogueCatNo, asset.catalogueLabel, asset.currency, Number(asset.netReciept.toFixed(4)), Number(asset.reportedRoyalty.toFixed(4))]);
      });
      logger.debug(`Platoon Revenue Report: (${filter.contractId}) -  Reduced ${sales.length} sales to ${assets.length} Assets`);
      cb();
    },
    function (cb) {
    //  Group sales via barcode
      if (sales?.length === 0) { return cb(); }

      const releasesDictionary = sales.reduce((acc, curr) => {
        acc[curr.catalogueBarcode] = {
          catalogueReleaseTitle: curr.catalogueReleaseTitle,
          catalogueReleaseArtist: curr.catalogueReleaseArtist,
          catalogueBarcode: curr.catalogueBarcode,
          catalogueCatNo: curr.catalogueCatNo,
          catalogueLabel: curr.catalogueLabel,
          currency: curr.contractCurrency,
          netReciept: acc[curr.catalogueBarcode]?.netReciept || 0,
          reportedRoyalty: acc[curr.catalogueBarcode]?.reportedRoyalty || 0,
        };

        acc[curr.catalogueBarcode].netReciept += curr.netReciept;
        acc[curr.catalogueBarcode].reportedRoyalty += curr.reportedRoyalty;
        return acc;
      }, {});
      const releases = Object.keys(releasesDictionary).map((key) => releasesDictionary[key]);
      releases.forEach((release) => {
        convertedReleases.push([release.catalogueReleaseTitle, release.catalogueReleaseArtist, release.catalogueBarcode, release.catalogueCatNo, release.catalogueLabel, release.currency, Number(release.netReciept.toFixed(4)), Number(release.reportedRoyalty.toFixed(4))]);
      });
      logger.debug(`Platoon Revenue Report: (${filter.contractId}) -  Reduced ${sales.length} sales to ${releases.length} Releases`);
      cb();
    },
    function (cb) {
    // Group sales via territory
      if (sales?.length === 0) { return cb(); }

      const territoryDictionary = sales.reduce((acc, curr) => {
        acc[curr.territory] = {
          territory: curr.territory,
          netReciept: acc[curr.territory]?.netReciept || 0,
          reportedRoyalty: acc[curr.territory]?.reportedRoyalty || 0,
        };
        acc[curr.territory].netReciept += curr.netReciept;
        acc[curr.territory].reportedRoyalty += curr.reportedRoyalty;
        return acc;
      }, {});
      const territories = Object.keys(territoryDictionary).map((key) => territoryDictionary[key]);
      territories.forEach((territory) => {
        convertedTerritories.push([territory.territory, Number(territory.netReciept.toFixed(4)), Number(territory.reportedRoyalty.toFixed(4))]);
      });
      logger.debug(`Platoon Revenue Report: (${filter.contractId}) -  Reduced ${sales.length} sales to ${territories.length} Territories`);
      cb();
    },
    function (cb) {
    // Group sales via sources
      if (sales?.length === 0) { return cb(); }

      const sourceDictionary = sales.reduce((acc, curr) => {
        acc[curr.source] = {
          source: curr.source,
          netReciept: acc[curr.source]?.netReciept || 0,
          reportedRoyalty: acc[curr.source]?.reportedRoyalty || 0,
        };
        acc[curr.source].netReciept += curr.netReciept;
        acc[curr.source].reportedRoyalty += curr.reportedRoyalty;
        return acc;
      }, {});
      const sources = Object.keys(sourceDictionary).map((key) => sourceDictionary[key]);
      sources.forEach((source) => {
        convertedSources.push([source.source, Number(source.netReciept.toFixed(4)), Number(source.reportedRoyalty.toFixed(4))]);
      });
      logger.debug(`Platoon Revenue Report: (${filter.contractId}) -  Reduced ${sales.length} sales to ${sources.length} Sources`);
      cb();
    },
    function (cb) {
      // Writing data to excel file
      logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Preparing to write to XLSX`);
      const workbook = new Excel.Workbook();
      workbook.xlsx.readFile(`${appRootDir}/libs/statements/customStatements/templates/platoonRevenueReport.xlsx`)
        .then(() => {
          statement.assets = workbook.getWorksheet(1);
          statement.releases = workbook.getWorksheet(2);
          statement.territories = workbook.getWorksheet(3);
          statement.sources = workbook.getWorksheet(4);

          async.waterfall([
            function (waterfallCb) {
              logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Writing ${convertedAssets.length} lines to assets`);
              convertedAssets.forEach((row, rowIndex) => {
                row.forEach((cell, cellIndex) => {
                  statement.assets.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
                });
              });
              waterfallCb();
            },
            function (waterfallCb) {
              logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Writing ${convertedReleases.length} lines to releases`);
              convertedReleases.forEach((row, rowIndex) => {
                row.forEach((cell, cellIndex) => {
                  statement.releases.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
                });
              });
              waterfallCb();
            },
            function (waterfallCb) {
              logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Writing ${convertedTerritories.length} lines to territories`);
              convertedTerritories.forEach((row, rowIndex) => {
                row.forEach((cell, cellIndex) => {
                  statement.territories.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
                });
              });
              waterfallCb();
            },
            function (waterfallCb) {
              logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Writing ${convertedSources.length} lines to sources`);
              convertedSources.forEach((row, rowIndex) => {
                row.forEach((cell, cellIndex) => {
                  statement.sources.getRow(2 + rowIndex).getCell(cellIndex + 1).value = cell;
                });
              });
              waterfallCb();
            },
            function (waterfallCb) {
              logger.debug(`Platoon Revenue Report: (${filter.contractId}) - Creating XLSX report`);
              const filePath = `${appRootDir}/tmp/${utils.safeName(statement.name)} Platoon Custom Report.xlsx`;
              workbook.xlsx.writeFile(filePath).then(() => {
                waterfallCb(null, filePath);
              }).catch((err) => {
                logger.error(`Platoon Revenue Report: (${filter.contractId}) - Failed creating XLSX report: ${err}`);
                waterfallCb(err);
              });
            },
          ], (err, filePath) => {
            if (err) { return cb(err); }
            cb(null, filePath);
          });
        })
        .catch((err) => {
          logger.error(`Platoon Revenue Report: (${filter.contractId}) - Failed preparing to write to XLSX report: ${err}`);
          cb(err);
        });
    },
    function (filePath, cb) {
      // Upload report to S3
      logger.debug(`Platoon Revenue Report: Attempting to upload statement to S3 - ${filePath}`);
      fileManager.uploadToS3(`statements/${statement._id.toString()}/${utils.safeName(statement.name)} Revenue Report.xlsx`, filePath, (err, uploadedFile) => {
        if (err) {
          logger.error(`Platoon Revenue Report: Error uploading file to S3 ${err}`);
          return cb(err);
        }

        logger.debug(`Platoon Revenue Report: ${uploadedFile} - Succesfully uploaded to S3`);
        cb(null, uploadedFile);
      });
    },
    function (uploadedFile, cb) {
      // Set S3 link to statement
      logger.debug(`Platoon Revenue Report: (${statement._id}) - Setting filePath to statement document`);
      // Circular Dependency Issue
      const Statement = require('../../../../models/statement');
      // Save S3 link to statement
      Statement.findByIdAndUpdate(statement._id, { $set: { platoonRevenueReport: uploadedFile } })
        .then(() => {
          logger.debug(`Platoon Revenue Report: ${statement._id} - XLSX report set to statement document`);
          cb();
        })
        .catch((err) => {
          logger.error(`Platoon Revenue Report: (${statement._id}) - Failed to set file path to statement document ${err}`);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      logger.error(err);
      return callback(err);
    }

    logger.debug(`${filter.contractId} - Platoon Revenue Report complete`);
    callback();
  });
};

module.exports = createPlatoonRevenueReport;
