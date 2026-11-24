const async = require('async');
const moment = require('moment');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { withDefaultCredentials, createDeleteQuery } = require('@curveroyaltysystems/bigquery');
const mapper = require('../mapper');
const { currencies } = require('../salesIngestionUtils');

const currencyCodes = currencies.map((currency) => currency.code);
const dateFormat = 'DD/MM/YYYY HH:mm:ss.SS';

module.exports = {
  line(sale, callback) {
    if (sale !== null && sale !== undefined && Object.getPrototypeOf(sale) === Object.prototype) {
      if (sale && sale.catType && sale.territory && sale.distributionChannel && sale.configuration && sale.source && sale.originalCurrency && sale.exchangeRate && sale.saleDate && sale.transactionDate && (sale.netAmount || sale.netAmount == 0) && ((sale.catType === 'Contract' && sale.contractId) || (sale.catType === 'Release' && (sale.releaseId || sale.contractId)) || (sale.catType === 'Track' && (sale.trackId || sale.contractId)) || (sale.catType === 'Work' && (sale.workId || sale.contractId)))) {
        sale.status = 'Complete';
      } else if (sale.status !== 'Suspense') {
        sale.status = 'Incomplete';
      }
      callback(null, sale);
    } else {
      callback(new Error('An object is required'));
    }
  },
  incompleteSales(filter, bigQuery, templateSource, catalogue, currencies, exchangeRates, catalogueOverwritingData, overwriteFields, callback) {
    logger.info(`${filter.salesFileId} Processing incomplete sales: ${moment().format(dateFormat)}`);
    const validateSales = this;
    // Set status to incomplete to only load the incomplete lines
    filter.status = { $in: ['Incomplete', 'Suspense'] };
    // Setup validation data
    const validationData = {
      distributionChannels: [],
      configurations: [],
      priceCategories: [],
      territories: [],
      sources: [],
      subSources: [],
      currencies: [],
      currencyCodes: [],
      releases: [],
      tracks: [],
      works: [],
      contracts: [],
      saleDate: false,
      transactionDate: false,
    };
    // Get allowed keys for the DB from the Big Query lib
    const allowedKeys = bigQuery.inputSchema.map((item) => {
      if (item.mode !== 'REPEATED') {
        return item.name;
      }
    }).filter(Boolean);
    // Setup array for output
    let outputData = [];
    let errorProcessingQueryStreamLine;
    async.waterfall([
      // Setup BigQuery File
      function (cb) {
        logger.info(`${filter.salesFileId} Setting up BigQuery file: ${moment().format(dateFormat)}`);
        // @TOM: should we send back a user friendly error here instead?
        bigQuery.setupFile(cb);
      },
      // Get data
      function (cb) {
        let queryCount = 0;
        logger.info(`${filter.salesFileId} Getting BigQuery data query: ${moment().format(dateFormat)}`);
        const query = bigQuery.getDataQuery(bigQuery.inputTable, '*', filter, {});
        bigQuery.logQuery(bigQuery.inputTable, query, 'Sales Ingestion');
        logger.info(`${filter.salesFileId} Creating query stream: ${moment().format(dateFormat)}`);
        let streamErrorHandled = false;
        bigQuery.client.createQueryStream(query)
          .on('error', (createQueryStreamErr) => {
            if (streamErrorHandled) return;
            streamErrorHandled = true;
            logger.error(`${filter.salesFileId} Error creating query stream ${moment().format(dateFormat)}`, createQueryStreamErr);
            // Handle Errors
            if (createQueryStreamErr && (createQueryStreamErr.code === 409 || createQueryStreamErr.message.includes('Exceeded rate limits'))) {
              logger.debug('RETRYING EXCEEDED RATE');
              // Wait two seconds
              setTimeout(() => {
                // Retry
                logger.info(`${filter.salesFileId} Trying validateSales.incompleteSales again after 2 seconds: ${moment().format(dateFormat)}`);
                validateSales.incompleteSales(filter, bigQuery, templateSource, catalogue, currencies, exchangeRates, catalogueOverwritingData, overwriteFields, callback);
              }, 2000);
            } else {
              // @TOM: should we send back a user friendly error here instead?
              cb(createQueryStreamErr);
            }
          })
          .on('data', (line) => {
            // Log out every 10k
            queryCount += 1;
            if (queryCount % 10000 === 0) {
              logger.info(`${filter.salesFileId} Processing query stream count: ${queryCount} - ${moment().format(dateFormat)}`);
            }
            // Process Line
            async.waterfall([
              (cb) => {
                // Overwrite any of the standard fields
                mapper.overwriteFields(line, overwriteFields, cb);
              },
              (salesLine, cb) => {
                // Set exchange rates
                // Run Exchange Rates
                mapper.runExchangeRates(salesLine, currencies, exchangeRates, cb);
              },
              (salesLine, cb) => {
                // Run mapping
                mapper.mapAllFields(salesLine, templateSource, catalogue, cb);
              },
              (salesLine, cb) => {
                // Set catalogue
                salesLine = mapper.setCatalogueData(salesLine, catalogueOverwritingData, overwriteFields);
                // Update status
                mapper.setStatus(salesLine, cb);
              },
              (salesLine, cb) => {
                // Add any invalid values to validation data
                if (!salesLine.distributionChannel && salesLine.originalDistributionChannel && !validationData.distributionChannels.includes(salesLine.originalDistributionChannel)) {
                  validationData.distributionChannels.push(salesLine.originalDistributionChannel);
                }
                if (!salesLine.configuration && salesLine.originalConfiguration && !validationData.configurations.includes(salesLine.originalConfiguration)) {
                  validationData.configurations.push(salesLine.originalConfiguration);
                }
                if (!salesLine.priceCategory && salesLine.originalPriceCategory && !validationData.priceCategories.includes(salesLine.originalPriceCategory)) {
                  validationData.priceCategories.push(salesLine.originalPriceCategory);
                }
                if (!salesLine.territory && salesLine.originalTerritory && !validationData.territories.includes(salesLine.originalTerritory)) {
                  validationData.territories.push(salesLine.originalTerritory);
                }
                if (salesLine.source && !validationData.sources.includes(salesLine.source)) {
                  validationData.sources.push(salesLine.source);
                }
                if (salesLine.subSource && !validationData.subSources.includes(salesLine.subSource)) {
                  validationData.subSources.push(salesLine.subSource);
                }
                if (!salesLine.exchangeRate && salesLine.exchangeRate != 0 && !validationData.currencies.includes(salesLine.originalCurrency)) {
                  validationData.currencies.push(salesLine.originalCurrency);
                }
                if (salesLine.originalCurrency && !currencyCodes.includes(salesLine.originalCurrency) && !validationData.currencyCodes.includes(salesLine.originalCurrency)) {
                  validationData.currencyCodes.push(line.originalCurrency);
                }
                if (!salesLine.releaseId && salesLine.catType === 'Release' && !validationData.releases.includes({
                  title: salesLine.originalReleaseTitle, artist: salesLine.originalReleaseArtist, catNo: salesLine.catNo, barcode: salesLine.barcode,
                })) {
                  validationData.releases.push({
                    title: salesLine.originalReleaseTitle, artist: salesLine.originalReleaseArtist, catNo: salesLine.catNo, barcode: salesLine.barcode,
                  });
                }
                if (!salesLine.trackId && salesLine.catType === 'Track' && !validationData.tracks.includes({ title: salesLine.originalTrackTitle, artist: salesLine.originalTrackArtist, isrc: salesLine.isrc })) {
                  validationData.tracks.push({ title: salesLine.originalTrackTitle, artist: salesLine.originalTrackArtist, isrc: salesLine.isrc });
                }
                if (!salesLine.workId && (['Work', 'Contract'].includes(salesLine.catType) && (salesLine.originalWorkTitle || salesLine.originalIdentifier)) && !validationData.works.includes({
                  title: salesLine.originalWorkTitle,
                  identifier: salesLine.originalIdentifier,
                  tunecode: salesLine.tunecode,
                  iswc: salesLine.iswc,
                  songcode: salesLine.songCode,
                  source: salesLine.source,
                  party1: salesLine.party1,
                  party2: salesLine.party2,
                  party3: salesLine.party3,
                  party4: salesLine.party4,
                  party5: salesLine.party5,
                })) {
                  validationData.works.push({
                    title: salesLine.originalWorkTitle,
                    identifier: salesLine.originalIdentifier,
                    tunecode: salesLine.tunecode,
                    iswc: salesLine.iswc,
                    songcode: salesLine.songCode,
                    source: salesLine.source,
                    party1: salesLine.party1,
                    party2: salesLine.party2,
                    party3: salesLine.party3,
                    party4: salesLine.party4,
                    party5: salesLine.party5,
                  });
                }
                if (!salesLine.contractId && salesLine.contractIdentifier && !validationData.contracts.includes(salesLine.contractIdentifier)) {
                  validationData.contracts.push(salesLine.contractIdentifier);
                }
                if (!salesLine.transactionDate) { validationData.transactionDate = true; }
                if (!salesLine.saleDate) { validationData.saleDate = true; }
                // Fix any dates from the loaded data - returns as an object, and should be a string to write to DB
                fixDate(salesLine, 'saleDate');
                fixDate(salesLine, 'transactionDate');
                fixDate(salesLine, 'dateFrom');
                fixDate(salesLine, 'dateTo');

                function fixDate(salesLine, value) {
                  if (salesLine[value] && typeof salesLine[value] !== 'string' && salesLine[value].value) {
                    salesLine[value] = salesLine[value].value;
                  }
                  return salesLine;
                }
                cb(null, salesLine);
              },
            ], async (err, salesLine) => {
              if (err) {
                // @TOM: I have added handling of this error below. Any reason not to?
                errorProcessingQueryStreamLine = err;
              }
              // Set dates to SQL style dates
              if (salesLine.saleDate) { salesLine.saleDate = moment(salesLine.saleDate).format('YYYY-MM-DD'); }
              if (salesLine.transactionDate) { salesLine.transactionDate = moment(salesLine.transactionDate).format('YYYY-MM-DD'); }
              if (salesLine.dateFrom) { salesLine.dateFrom = moment(salesLine.dateFrom).format('YYYY-MM-DD'); }
              if (salesLine.dateTo) { salesLine.dateTo = moment(salesLine.dateTo).format('YYYY-MM-DD'); }
              // Remove any fields that don't exist in the DB
              Object.keys(salesLine).forEach((key) => {
                if (!allowedKeys.includes(key) || key === 'priceCategoryDealerPrices') {
                  delete salesLine[key];
                }
              });
              // Write Line to file
              outputData.push(salesLine);
              // Write data to file when required
              await writeDataToFile(false).catch(logger.error);
            });
          })
          .on('end', async () => {
            if (streamErrorHandled) return;
            streamErrorHandled = true;
            try {
              await writeDataToFile(true);
              logger.info(`${filter.salesFileId} Number of query streams processed: ${queryCount} - ${moment().format(dateFormat)}`);
              cb();
            } catch (err) {
              cb(err);
            }
          });
      },
      function (cb) {
        // Handle any errors encountered during async query steam line processing
        if (errorProcessingQueryStreamLine) {
          // @TOM: Added handling of line processing error here. Any reason not to?
          logger.error(`${filter.salesFileId} Error processing Query Stream line: ${moment().format(dateFormat)}`, errorProcessingQueryStreamLine);
          cb(errorProcessingQueryStreamLine);
        } else {
          // Delete data from DB
          logger.info(`${filter.salesFileId} Delete data from BigQuery DB: ${moment().format(dateFormat)}`);
          const bigQueryClient = withDefaultCredentials({ datasetName: bigQuery.datasetName, inputTable: bigQuery.inputTable, retryBackoffTime: 10000 });
          const deleteQuery = createDeleteQuery(bigQueryClient.datasetName, bigQueryClient.inputTable, filter);
          const maxRetries = 15;
          bigQueryClient.query(deleteQuery, { sales_file_id: filter.salesFileId }, maxRetries)
            .then(() => cb())
            .catch((deleteDataErr) => {
              logger.error(`${filter.salesFileId} Error deleting data from BigQuery DB: ${moment().format(dateFormat)}`, deleteDataErr);
              cb(deleteDataErr);
            });
        }
      },
      function (cb) {
        // Write to DB
        logger.info(`${filter.salesFileId} Write file to BigQuery DB: ${moment().format(dateFormat)}`);
        // @TOM: should we send back a user friendly error here instead?
        bigQuery.writeFileToDb(bigQuery.inputTable, cb);
      },
    ], (waterfallErr) => {
      if (waterfallErr) {
        logger.error(`${filter.salesFileId} Error processing incomplete sales: ${moment().format(dateFormat)}`, waterfallErr);
      }
      callback(waterfallErr, validationData);
    });

    const writeDataToFile = async (forceWrite) => {
      if (forceWrite || outputData.length === 1000) {
        const data = [...outputData];
        outputData = [];
        // Write data to file
        await new Promise((resolve, reject) => {
          bigQuery.writeToFile(data, bigQuery.inputTable, (writeToFileErr) => {
            if (writeToFileErr) { reject(writeToFileErr); } else { resolve(); }
          });
        });
      }
    };
  },
};
