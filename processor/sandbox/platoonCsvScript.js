const { BigQuery, fileManager, createXlsx, logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const moment = require('moment');
const async = require('async');
const config = require('../config.json');

const clientObj = {
    bigQueryDataset: "PlatoonNewStaging",
    bigQuerySalesTable: "PlatoonNewStagingSales",
    bigQueryPeriodSales: "PlatoonNewStagingPeriodSales",
    bigQueryAccountingPeriodSales: "PlatoonNewStagingAccountingSales",
    bigQueryPeriodCosts: "PlatoonNewStagingCosts",
}

const bigQuery = new BigQuery({
    datasetName: clientObj.bigQueryDataset,
    inputTable: clientObj.bigQuerySalesTable,
    outputTable: clientObj.bigQueryPeriodSales,
    costsTable: clientObj.bigQueryPeriodCosts,
});

const createPlatoonStatement = () => {
    logger.info('Creating custom Platoon Statement for - {}')

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
        // We need to add currency field from other ticket in sprint.
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
        // We need to add currency field from other ticket in sprint.
        { column: 'proRataAmount', displayAs: 'netReciept' },
        { column: 'contractCurrencyCalculationOutput', displayAs: 'reportedRoyalty' },
    ];
    
    const filter = {
        periodId: '623db498e0cd4d009c7cb5c0',
        contractId: '5fb3c225cc019e001729ddec',
    }

    const convertedAssets = [];
    const convertedReleases = [];
    const convertedTerritories = []; 
    const convertedSources = [];
    async.waterfall([
        function (cb) {
            logger.info(`Collecting Data from Big Query ${filter.periodId} - ${filter.contractId}`)
            bigQuery.getAggregate(bigQuery.outputTable, selectColumns, sumCols, 'lines', filter, {}, (err, sales) => {
                if (err) {
                    logger.error(`Error querying data to Big Query: ${err}`)
                    return cb(err); 
                }

                if (sales) {
                    logger.info(`Converting ${sales.length} sales for contract ${filter.contractId}`)
                    cb(null, sales)
                }
            });
        },
        function (sales, cb) {
            //  Group sales via ISRC
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
                    currency: 'Currency Placeholder',
                    netReciept: 0,
                    reportedRoyalty: 0
                }
                acc[curr.catalogueIsrc].reportedRoyalty += curr.reportedRoyalty
                acc[curr.catalogueIsrc].netReciept += curr.netReciept
                return acc
            }, {})
            const assets = Object.keys(assetsDictionary).map((key) => assetsDictionary[key]);
            assets.forEach((asset) => {
                convertedAssets.push([asset.catalogueTrackTitle, asset.catalogueTrackArtist, asset.catalogueIsrc, asset.catalogueReleaseTitle, asset.catalogueReleaseArtist, asset.catalogueBarcode, asset.catalogueCatNo, asset.catalogueLabel, asset.currency, asset.netReciept.toFixed(2), asset.reportedRoyalty.toFixed(2)])
            })
            logger.info(`Reduced ${filter.contractId} sales to ${assets.length} Assets`)
            cb(null, sales)
        },
        function (sales, cb) {
            //  Group sales via barcode
            const releasesDictionary = sales.reduce((acc, curr) => {
                acc[curr.catalogueBarcode] = {
                    catalogueReleaseTitle: curr.catalogueReleaseTitle,
                    catalogueReleaseArtist: curr.catalogueReleaseArtist,
                    catalogueBarcode: curr.catalogueBarcode,
                    catalogueCatNo: curr.catalogueCatNo,
                    catalogueLabel: curr.catalogueLabel,
                    currency: 'Currency Placeholder',
                    netReciept: 0,
                    reportedRoyalty: 0
                }
                acc[curr.catalogueBarcode].reportedRoyalty += curr.reportedRoyalty
                acc[curr.catalogueBarcode].netReciept += curr.netReciept
                return acc
            }, {})
            const releases = Object.keys(releasesDictionary).map((key) => releasesDictionary[key]);
            releases.forEach((release) => {
                convertedReleases.push([release.catalogueReleaseTitle, release.catalogueReleaseArtist, release.catalogueBarcode, release.catalogueCatNo, release.catalogueLabel, release.currency, release.netReciept.toFixed(2), release.reportedRoyalty.toFixed(2)])
            })
            logger.info(`Reduced ${filter.contractId} sales to ${releases.length} Releases`)
            cb(null, sales);
        },
        function (sales, cb) {
            // Group sales via territory
            const territoryDictionary = sales.reduce((acc, curr) => {
                acc[curr.territory] = { territory: curr.territory, netReciept: 0, reportedRoyalty: 0 }
                acc[curr.territory].reportedRoyalty += curr.reportedRoyalty
                acc[curr.territory].netReciept += curr.netReciept
                return acc
            }, {})
            const territories = Object.keys(territoryDictionary).map((key) => territoryDictionary[key]);
            territories.forEach((territory) => {
                convertedTerritories.push([territory.territory, territory.netReciept.toFixed(2), territory.reportedRoyalty.toFixed(2)])
            })
            logger.info(`Reduced ${filter.contractId} sales to ${territories.length} Territories`)
            cb(null, sales);
        },
        function (sales, cb) {
            // Group sales via sources
            const sourceDictionary = sales.reduce((acc, curr) => {
                acc[curr.source] = { source: curr.source, netReciept: 0, reportedRoyalty: 0 }
                acc[curr.source].reportedRoyalty += curr.reportedRoyalty
                acc[curr.source].netReciept += curr.netReciept
                return acc
            }, {})
            const sources = Object.keys(sourceDictionary).map((key) => sourceDictionary[key]);
            sources.forEach((source) => {
                convertedSources.push([source.source, source.netReciept.toFixed(2), source.reportedRoyalty.toFixed(2)])
            })
            logger.info(`Reduced ${filter.contractId} sales to ${sources.length} Sources`)
            cb();
        },
        function (cb) {
            logger.info(`Writing ${filter.contractId} statement data to CSV...`)
            const dataForXlsx = [convertedAssets, convertedReleases, convertedTerritories, convertedSources]
            createXlsx.createInTemplate(dataForXlsx, appRootDir + config.exportExcelTemplates.platoonRevenueReport, (err, filePath) => {
                if (err) {
                    logger.error(`Error writing data Platoon CSV ${err}`)
                    return cb(err);
                }
                logger.info(`exports/platoonRevenueReport-${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`)
                cb(null, filePath);
            });
        },
        function (filePath, cb) {
            logger.info(`Attempting to upload statement to S3 - ${filePath}`)
            fileManager.uploadToS3(`exports/platoonRevenueReport-${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, (err, uploadedFile) => {
                if (s3Err) {
                    logger.error(s3Err)
                    return cb(s3Err)
                }
        
                logger.info(`${uploadedFile} - Succesfully uploaded to S3`);
                cb(null, uploadedFile);
            });
        },
        function (uploadedFile, cb) {
            // Save S3 link to statement
            Statement.findByIdAndUpdate(statement._id, { $set: { platoonRevenueReport: uploadedFile } }).exec((err) => {
                if (err) {
                    logger.error(err)
                    return cb(err);
                }
                cb();
            });
        }
    ], (err) => {
        if (err) {
            logger.error(err)
        }
        logger.info(`${filter.contractId} - Platoon custom statement complete`)
    })
}

createPlatoonStatement();