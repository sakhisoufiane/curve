/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const csvWriter = require('csv-write-stream');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const async = require('async');
const _ = require('lodash');
const Period = require('../../models/period');
const Notification = require('../../models/notification');
const SendEmail = require('../sendEmail');
const { salesHelpers } = require('../helpers/salesHelpers');

const byFilter = ({ bqFilter, filterParams, bigQuery, curveUser, client }) => {
  // CSV Preparation
  // Sales Line ID
  const headers = [
    'Sales Line ID', 'Sales File ID', 'Cat Type', 'Original Cat No', 'Original Barcode', 'Original Release Title',
    'Original Release Artist', 'Mapped Release ID', 'Original ISRC', 'Original Track Title', 'Original Track Artist', 'Mapped Track ID',
    'Work Identifier', 'Tunecode', 'ISWC', 'Original Work Title', 'Original Composers', 'Mapped Work ID', 'Original Contract ID', 'Mapped Contract ID',
    'Original Distribution Channel', 'Mapped Distribution Channel', 'Original Configuration', 'Mapped Configuration', 'Original Price Category',
    'Mapped Price Category', 'Original Territory', 'Mapped Territory', 'Units', 'Retail Price', 'Per Unit Rate', 'Home Currency Net Amount', 'Exchange Rate',
    'Reported Contract IDs', 'Reported Contract Names', 'Reported Period IDs', 'Reported Period Names', 'Included Period IDs', 'Included Period Names'];
  if (client.features?.suspense) {
    headers.push('Group Type', 'Group Name');
  }
  const writer = csvWriter({ headers });
  const date = new Date();
  const fileLocation = `${appRootDir}/tmp/${moment(date).format('YYYYMMDDHHmmssSSS')}.csv`;
  const selection = 'periodId';
  // get clients distinct period ids as reference
  bigQuery.getDistinct(bigQuery.outputTable, selection, {}, (err, result) => {
    if (err) {
      logger.error(err);
      // Return error via email
      SendEmail.exportError(curveUser, client, 'Your Sales Export Has Errored', err.message);
    } else {
      const objectIds = result.map((id) => new ObjectId(id));
      // create dictionary object of client periods
      Period.find({ _id: { $in: objectIds } }, 'name salesFilesIds')
        .then(async (periods) => {
          const writeStream = fs.createWriteStream(fileLocation);
          writer.pipe(writeStream);
          // Setup SQL Query with Join into Output Table
          let query = `SELECT id, Input.barcode, Input.catNo, Input.catType, Input.configuration, Input.contractId, Input.discountAmount, Input.distributionChannel, Input.exchangeRate, homeCurrencyDiscountAmount, homeCurrencyMechanicalAtSource, Input.homeCurrencyNetAmount, isrc, Input.mechanicalAtSource, Input.netAmount, originalConfiguration, Input.originalCurrency, originalDistributionChannel, originalTerritory, originalReleaseArtist, originalReleaseTitle, originalTrackArtist, originalTrackTitle, positiveNegative, originalWorkTitle, originalComposers, Input.workId, originalIdentifier, iswc, tunecode, songcode, Input.priceCategory, Input.releaseId, Input.saleDate, Input.salesFileId, Input.source, status, Input.subSource, Input.territory, titleMapper, Input.trackId, Input.units, Input.retailPrice, Input.perUnitRate, Input.transactionDate, STRING_AGG(Output.contractId) as contractIds, STRING_AGG(Output.contractName) as contractNames, STRING_AGG(Output.periodId) as periodIds, partitionNo, Input.workId
              FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` Input
              LEFT OUTER JOIN \`${bigQuery.datasetName}.${bigQuery.outputTable}\` Output
              ON (Output.salesLineId = Input.id)
              GROUP BY id, Input.barcode, Input.catNo, Input.catType, Input.configuration, Input.contractId, Input.discountAmount, Input.distributionChannel, Input.exchangeRate, homeCurrencyDiscountAmount, homeCurrencyMechanicalAtSource, Input.homeCurrencyNetAmount, isrc, Input.mechanicalAtSource, Input.netAmount, originalConfiguration, Input.originalCurrency, originalDistributionChannel, originalTerritory, originalReleaseArtist, originalReleaseTitle, originalTrackArtist, originalTrackTitle, positiveNegative, originalWorkTitle, originalComposers, Input.workId, originalIdentifier, iswc, tunecode, songcode, Input.priceCategory, Input.releaseId, Input.saleDate, Input.salesFileId, Input.source, status, Input.subSource, Input.territory, titleMapper, Input.trackId, Input.units, Input.retailPrice, Input.perUnitRate, Input.transactionDate, partitionNo, Input.workId`;
          if (bqFilter) {
            query += ` HAVING ${bqFilter}`;
          }

          // Create count to keep track of number of lines
          let lineLcount = 0;
          let sales = [];

          // build a map showing for each salesfileId, which period uses it
          const periodMap = {};
          periods.forEach((p) => {
            p.salesFilesIds.forEach((id) => {
              if (!periodMap[id]) periodMap[id] = [];
              periodMap[id].push(p);
            });
          });

          const labels = {
            job_type: 'sales_export',
            client_id: client._id.toString(),
          };

          // Stream query
          const stream = bigQuery.client.createQueryStream({ query, params: filterParams, labels });
          stream
            .on('error', (err) => {
              logger.error(err);
              // Return error via email
              SendEmail.exportError(curveUser, client, 'Your Sales Export Has Errored', err.message);
            })
            .on('data', async (sale) => {
              lineLcount += 1;

              // Get reported periods by checking directly against sale.periodIds
              const reportedIds = sale.periodIds ? sale.periodIds.split(',') : [];
              const reportedPeriods = periods.filter((p) => reportedIds.includes(p._id.toString()));
              sale.periodIds = reportedIds.join(';');
              sale.periodNames = reportedPeriods.map((p) => p.name).join(';');

              // Get included periods by mapping salesFileId to known periods
              const includedPeriods = periodMap[sale.salesFileId] || [];
              sale.includedPeriodIds = includedPeriods.map((p) => p._id.toString()).join(';');
              sale.includedPeriodName = includedPeriods.map((p) => p.name).join(';');
              sales.push(sale);

              if (sales.length >= 10_000) {
                stream.pause();
                await SalesLineExport.writeSalesToFile({ writer, sales, client });
                sales = [];
                stream.resume();
              }
            })
            .on('end', async () => {
              if (sales.length) {
                await SalesLineExport.writeSalesToFile({ writer, sales, client });
              }
              logger.debug('Lines Count:', lineLcount);
              async.waterfall([
                function (cb) {
                  writer.end();
                  writeStream.on('finish', (err) => {
                    cb(err);
                  });
                },
                function (cb) {
                  fileManager.uploadToS3(`exports/${moment().format('YYYYMMDDHHmmssSSS')}.csv`, fileLocation, cb);
                },
                function (key, cb) {
                  fileManager.publicLink24Hours(key, cb);
                },
                function (link, cb) {
                  const generateOptions = {
                    identifier: 'exportDownload',
                    curveUser,
                    client,
                    subject: `Your Sales Export for ${client.name} is Ready to Download`,
                    link,
                  };
                  Notification.generate('Sales Export Ready', `Your Sales Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
                    cb(err);
                  });
                },
              ], (err) => {
                if (err) {
                  logger.error(err);
                  // Return error via email
                  const generateOptions = {
                    identifier: 'exportError',
                    curveUser,
                    client,
                    subject: 'Your Sales Export Has Errored',
                    error: 'Your sales export has errored. Please try again, or contact support',
                  };
                  Notification.generate('Your Sales Export Has Errored', 'Your sales export has errored. Please try again, or contact support', null, curveUser, generateOptions);
                }
              });
            });
        })
        .catch((err) => {
          logger.error(err);
          // Return error via email
          SendEmail.exportError(curveUser, client, 'Your Sales Export Has Errored', err.message);
        });
    }
  });
};

const writeSalesToFile = async ({ writer, sales, client }) => {
  logger.debug('Writing sales to file:', sales.length);
  if (client.features?.suspense) {
    sales = await salesHelpers.addGroupInfoToSales({ clientId: client._id.toString(), sales });
  }
  for (const line of sales) {
    const data = [
      line.id, line.salesFileId, line.catType, line.catNo, line.barcode, line.originalReleaseTitle,
      line.originalReleaseArtist, line.releaseId, line.isrc, line.originalTrackTitle, line.originalTrackArtist, line.trackId,
      line.originalIdentifier, line.tunecode, line.iswc, line.originalWorkTitle, line.originalComposers, line.workId, line.contractIdentifier,
      line.contractId, line.originalDistributionChannel, line.distributionChannel, line.originalConfiguration, line.configuration,
      line.originalPriceCategory, line.priceCategory, line.originalTerritory, line.territory, line.units, line.retailPrice, line.perUnitRate, line.homeCurrencyNetAmount,
      line.exchangeRate, line.contractIds ? line.contractIds.replaceAll(',', ';') : '', line.contractNames ? line.contractNames.replaceAll(',', ';') : '', line.periodIds, line.periodNames, line.includedPeriodIds, line.includedPeriodName,
    ];
    if (client.features?.suspense) {
      data.push(_.capitalize(line.groupType), line.groupName);
    }
    // stream to csv
    writer.write(data);
  }
};

const SalesLineExport = {
  byFilter,
  writeSalesToFile,
};

module.exports = SalesLineExport;
