require('dotenv').config();
require('../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Client = require('../models/client');

// eslint-disable-next-line max-len
const selectStatement = 'id, salesFileId, status, catType, releaseId, trackId, workId, contractId, distributionChannel, configuration, priceCategory, territory, originalDistributionChannel, originalConfiguration, originalPriceCategory, originalReleaseTitle, originalReleaseArtist, originalTrackTitle, originalTrackArtist, catNo, barcode, isrc, originalWorkTitle, originalComposers, originalIdentifier, iswc, tunecode, songCode, contractIdentifier, titleMapper, originalTerritory, saleDate, transactionDate, source, subSource, description, multiplier, units, sharePercentage, returnUnits, salePrice, originalCurrency, positiveNegative, exchangeRate, grossAmount, netAmount, discountAmount, mechanicalAtSource, returnGrossAmount, returnNetAmount, perUnitRate, retailPrice, homeCurrencyGrossAmount, homeCurrencyNetAmount, homeCurrencyDiscountAmount, homeCurrencyMechanicalAtSource, homeCurrencyReturnGrossAmount, homeCurrencyReturnNetAmount, homeCurrencyPerUnitRate, homeCurrencyRetailPrice, currency2ExchangeRate, currency2GrossAmount, currency2NetAmount, currency2DiscountAmount, currency2MechanicalAtSource, currency2ReturnGrossAmount, currency2ReturnNetAmount, currency2PerUnitRate, currency2RetailPrice, currency3ExchangeRate, currency3GrossAmount, currency3NetAmount, currency3DiscountAmount, currency3MechanicalAtSource, currency3ReturnGrossAmount, currency3ReturnNetAmount, currency3PerUnitRate, currency3RetailPrice, currency4ExchangeRate, currency4GrossAmount, currency4NetAmount, currency4DiscountAmount, currency4MechanicalAtSource, currency4ReturnGrossAmount, currency4ReturnNetAmount, currency4PerUnitRate, currency4RetailPrice, originalPositiveNegative, duration, temp1, temp2, temp3, temp4, temp5, production, episode, dateFrom, dateTo, party1, party2, party3, party4, party5, catalogueReleaseTitle, catalogueReleaseVersion, catalogueReleaseArtist, catalogueReleaseLabel, catalogueCatNo, catalogueReleaseForeignId, catalogueBarcode, ppd, proRataAmount, priceCategoryDealerPrices, catalogueFormat, mechanicalBasisPercentage, totalMechanicalAmount, catalogueTrackTitle, catalogueTrackVersion, catalogueTrackArtist, catalogueTrackLabel, catalogueIsrc, catalogueTrackForeignId, mechanicalRate, catalogueWorkTitle, catalogueWorkComposer, catalogueIdentifier, catalogueWorkForeignId, catalogueIswc, catalogueTunecode, catalogueContractIds';

// eslint-disable-next-line max-len
const periodSelectStatement = 'periodId, contractId, contractName, salesFileId, salesLineId, catType, releaseId, trackId, workId, distributionChannel, configuration, priceCategory, territory, saleDate, transactionDate, source, subSource, description, units, sharePercentage, share, returnUnits, salePrice, originalCurrency, exchangeRate, grossAmount, netAmount, discountAmount, mechanicalAtSource, homeCurrencyGrossAmount, homeCurrencyNetAmount, perUnitRate, homeCurrencyPerUnitRate, retailPrice, homeCurrencyRetailPrice, duration, production, episode, dateFrom, dateTo, barcode, catNo, catalogueReleaseTitle, catalogueReleaseVersion, catalogueReleaseArtist, catalogueLabel, catalogueReleaseLabel, catalogueCatNo, catalogueReleaseForeignId, catalogueBarcode, ppd, proRataAmount, priceCategoryDealerPrices, catalogueFormat, mechanicalBasisPercentage, totalMechanicalAmount, catalogueTrackTitle, catalogueTrackVersion, catalogueTrackArtist, catalogueTrackLabel, catalogueIsrc, catalogueTrackForeignId, mechanicalRate, catalogueWorkTitle, catalogueWorkComposer, catalogueIdentifier, catalogueWorkForeignId, catalogueIswc, catalogueTunecode, licenseNo, catalogueContractIds, objectPercentage, proRataTrackAmount, multiplier, royaltyRate, unitRate, reductionRate, calculationInput, calculationType, deduction, deductionUnitRate, deductionRate, deductionCalculationType, deductionType, withholdingTax, withholdingTaxUnitRate, withholdingTaxRate, withholdingTaxCalculationType, withholdingTaxType, mechanicalAmount, mechanicalDeduction, mechanicalPercentage, mechanicalType, mechanicalDeductionType, mechanicalCurrency, calculationOutput, reserveRate, reserve, contractCurrencyProRataAmount, contractCurrencyExchangeRate, contractCurrencyGrossAmount, contractCurrencyNetAmount, contractCurrencyDiscountAmount, contractCurrencyMechanicalAtSource, contractCurrencyReturnGrossAmount, contractCurrencyReturnNetAmount, contractCurrencyPpd, contractCurrencyPerUnitRate, contractCurrencyRetailPrice, contractCurrencyUnitRate, contractCurrencyCalculationInput, contractCurrencyDeduction, contractCurrencyDeductionUnitRate, contractCurrencyWithholdingTax, contractCurrencyWithholdingTaxUnitRate, contractCurrencyMechanicalAmount, contractCurrencyMechanicalDeduction, contractCurrencyCalculationOutput, contractCurrencyReserve';

Client.find({ bigQueryOldSalesTable: { $exists: false } })
  .then((clients) => {
    async.eachSeries(clients, (client, cb) => {
      const bigQuery = new BigQuery({
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      });
      console.time(client.name);
      const newSalesTable = `${client.bigQuerySalesTable}2`;
      const newPeriodSalesTable = `${client.bigQueryPeriodSales}2`;
      async.waterfall([
        function (waterfallCb) {
          // Create new sales table
          bigQuery.createTable(newSalesTable, bigQuery.inputSchema, 'partitionNo', (err, result) => {
            if (err) {
              logger.error(err);
              waterfallCb();
            } else {
              logger.debug('Created Table:', newSalesTable);
              waterfallCb();
            }
          });
        },
        function (waterfallCb) {
          // Create new period sales table
          bigQuery.createTable(newPeriodSalesTable, bigQuery.outputSchema, 'contractPartitionNo', (err, result) => {
            if (err) {
              logger.error(err);
              waterfallCb();
            } else {
              logger.debug('Created Table:', newPeriodSalesTable);
              waterfallCb();
            }
          });
        },
        function (waterfallCb) {
          // Copy sales data across
          const query = `INSERT INTO \`${bigQuery.datasetName}.${newSalesTable}\` (${selectStatement}) SELECT ${selectStatement} FROM \`${bigQuery.datasetName}.${client.bigQuerySalesTable}\``;
          bigQuery.queryJob(query, (err) => {
            if (err) {
              waterfallCb(err);
            } else {
              logger.debug('Updated Table:', newSalesTable);
              waterfallCb();
            }
          });
        },
        function (waterfallCb) {
          // Copy period sales data across
          const query = `INSERT INTO \`${bigQuery.datasetName}.${newPeriodSalesTable}\` (${periodSelectStatement}) SELECT ${periodSelectStatement} FROM \`${bigQuery.datasetName}.${client.bigQueryPeriodSales}\``;
          bigQuery.queryJob(query, (err) => {
            if (err) {
              waterfallCb(err);
            } else {
              logger.debug('Updated Table:', newPeriodSalesTable);
              waterfallCb();
            }
          });
        },
      ], (err) => {
        if (err) {
          logger.error(err);
          cb(err);
        } else {
          client.bigQueryOldSalesTable = client.bigQuerySalesTable;
          client.bigQueryOldPeriodSales = client.bigQueryPeriodSalesTable;
          client.bigQuerySalesTable = newSalesTable;
          client.bigQueryPeriodSales = newPeriodSalesTable;
          client.save()
            .then(() => {
              console.timeEnd(client.name);
              cb();
            })
            .catch((saveErr) => {
              // Might as well keep this the same as the other error handling
              logger.error(saveErr);
              console.timeEnd(client.name);
              cb();
            });
        }
      });
    });
  })
  .catch((err) => {
    logger.error(err);
  });
