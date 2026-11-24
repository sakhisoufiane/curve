/* eslint-disable no-await-in-loop */
const { ObjectId } = require('mongodb');
const _ = require('lodash');
const { logger, BigQuery, databaseUtils, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const readline = require('readline');
const fs = require('fs');
const Stream = require('stream');
const moment = require('moment');
const chunk = require('chunk');
const { waterfall, eachSeries, eachLimit } = require('async');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const Client = require('../../models/client');
const SalesFile = require('../../models/salesFile');
const Contract = require('../../models/contract');
const Payee = require('../../models/payee');
const Track = require('../../models/track');
const Release = require('../../models/release');
const Period = require('../../models/period');

// Use this to set specific contracts to include
const setContractIds = null;
let djMixContractIds = [];
let fileNumberLast = 0;
let summaryNumber = 1;
let fileCount = 0;
let failureFileCount = 0;
let rereportFileCount = 0;
let unreportedFileCount = 0;
let fileDate = '202312';
let processNo = `0${summaryNumber}`;
let localFiles = [];
let failureFiles = [];
let rereportFiles = [];
let unreportedFiles = [];
let dspSummaryFiles = [];
let lineOptions = {};
let unreportedFileLocation = '';
const runPlatoonRereport = false;

module.exports = (period, fullRun, callback) => {
  if (!period) {
    return callback(new Error('Period must be passed'));
  }

  // Return all arrays to empty
  localFiles = [];
  failureFiles = [];
  rereportFiles = [];
  unreportedFiles = [];
  dspSummaryFiles = [];
  lineOptions = {};
  // Reset file count
  fileCount = 0;
  failureFileCount = 0;
  rereportFileCount = 0;
  unreportedFileCount = 0;
  // Update numbers from period
  fileNumberLast = period.platoon.fileNumberLast;
  summaryNumber = period.platoon.summaryNumber;
  processNo = `0${summaryNumber}`;
  fileDate = moment(period.endDate).format('YYYYMM');
  unreportedFileLocation = `${appRootDir}/tmp/Platoon Unreported ${moment().format('YYYYMMDDHHmmSSsss')}.csv`;

  // Set up variables
  let client;
  let salesFileMappings = {};
  let payeeIdMappings = {};
  let contractMappings = {};
  let contractNameMappings = {};
  let trackMappings = {};
  let releaseMappings = {};
  let contractCurrencyMappings = {};
  let contractRoyaltyMappings = {};
  let payeeMappings = {};
  let whtMappings = {};
  let inactiveContracts = {};

  // Add a global timeout to prevent the entire process from hanging
  const globalTimeout = setTimeout(() => {
    logger.error('Platoon: Global process timed out after 6 hours');
    return callback(new Error('Platoon: Global process timed out after 6 hours'));
  }, 6 * 60 * 60 * 1000); // 6 hours timeout

  try {
    waterfall([
      (cb) => {
        // Get Client
        Client.findById(period.clientId)
          .then((clientLocal) => {
            if (!clientLocal) {
              logger.error('Platoon: Client not found', { clientId: period.clientId });
              return cb(new Error(`Client not found with ID: ${period.clientId}`));
            }
            client = clientLocal;
            cb();
          })
          .catch((err) => {
            logger.error('Platoon: Error finding client', { clientId: period.clientId, error: err.message });
            cb(err);
          });
      },
      (cb) => {
        // Get Sales Files
        getSalesFileMappings(client, (err, salesFileMappingsLocal) => {
          if (err) {
            logger.error('Platoon: Error getting sales file mappings', { error: err.message });
            return cb(err);
          }
          salesFileMappings = salesFileMappingsLocal;
          cb();
        });
      },
      (cb) => {
        getPayeeMappings(client, (err, payeeIdMappingsLocal) => {
          if (err) {
            logger.error('Platoon: Error getting payee mappings', { error: err.message });
            return cb(err);
          }
          payeeIdMappings = payeeIdMappingsLocal;
          cb();
        });
      },
      (cb) => {
        getContractMappings(client, payeeIdMappings, (err, output) => {
          if (err) {
            logger.error('Platoon: Error getting contract mappings', { error: err.message });
            return cb(err);
          }
          ({ contractMappings, contractCurrencyMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings } = output);
          cb();
        });
      },
      (cb) => {
        getTrackMappings(client, (err, trackMappingsLocal) => {
          if (err) {
            logger.error('Platoon: Error getting track mappings', { error: err.message });
            return cb(err);
          }
          trackMappings = trackMappingsLocal;
          cb();
        });
      },
      (cb) => {
        getReleaseMappings(client, (err, releaseMappingsLocal) => {
          if (err) {
            logger.error('Platoon: Error getting release mappings', { error: err.message });
            return cb(err);
          }
          releaseMappings = releaseMappingsLocal;
          cb();
        });
      },
      (cb) => {
        getInactiveMappings(client, payeeIdMappings, (err, output) => {
          if (err) {
            logger.error('Platoon: Error getting inactive mappings', { error: err.message });
            return cb(err);
          }
          inactiveContracts = output;
          cb();
        });
      },
      (cb) => {
        getWHTMappings(client, (err, outputWHTMappings) => {
          if (err) {
            logger.error('Platoon: Error getting WHT mappings', { error: err.message });
            return cb(err);
          }
          whtMappings = outputWHTMappings;
          cb();
        });
      },
      (cb) => {
        getDjMixContractIds(client, (err, outputDjMixContractIds) => {
          if (err) {
            logger.error('Platoon: Error getting DJ mix contract IDs', { error: err.message });
            return cb(err);
          }
          djMixContractIds = outputDjMixContractIds;
          cb();
        });
      },
    ], (err) => {
      if (err) {
        clearTimeout(globalTimeout);
        logger.error('Platoon: Error in initial setup waterfall', { error: err.message, stack: err.stack });
        return callback(err);
      }

      try {
        const contractFindFilter = { clientId: period.clientId, active: true };
        if (setContractIds) {
          contractFindFilter._id = { $in: setContractIds.map((id) => new ObjectId(id)) };
        }
        Contract.find(contractFindFilter)
          .then((contracts) => {
            if (!contracts || contracts.length === 0) {
              clearTimeout(globalTimeout);
              logger.error('Platoon: No active contracts found for client', { clientId: period.clientId });
              return callback(new Error(`No active contracts found for client: ${period.clientId}`));
            }

            // Separate normal contracts from dj mix contracts
            const mainContracts = contracts.filter((contract) => !djMixContractIds.includes(contract._id.toString()));
            const contractIds = mainContracts.map((contract) => contract._id.toString());
            const contractBatches = chunk(contractIds, 100);
            contractBatches.push(djMixContractIds);

            try {
              const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
              const reportedSources = [];
              const summary = { lines: 0, transaction: {}, received: {}, royalty: {} };
              const perDspSummary = {};
              lineOptions = {
                client,
                whtMappings,
                payeeMappings,
                contractMappings,
                inactiveContracts,
                salesFileMappings,
                summary: { lines: 0, transaction: {}, received: {}, royalty: {} },
                perDspSummary: {},
                reportedSources: [],
                output: [],
                unreported: [],
                failures: [],
                originalUnreportedLines: [],
              };

              waterfall([
                (cb) => {
                  // Main contract items
                  eachLimit(contractBatches, 3, (contractBatch, contractBatchCb) => {
                    logger.info(`Platoon: Processing contract batch - ${contractBatches.indexOf(contractBatch)}`);
                    const bigQueryFilter = { periodId: period._id.toString(), contractId: { $in: contractBatch } };
                    const query = bigQuery.getAggregateQuery(
                      client.bigQueryPeriodSales,
                      'salesLineId, salesFileId, catType, catalogueBarcode, catalogueCatNo, catalogueIsrc, catalogueReleaseTitle, catalogueTrackTitle, catalogueTrackArtist, catalogueReleaseArtist, originalCurrency, exchangeRate, objectPercentage, royaltyRate, territory, configuration, distributionChannel, source, subSource, contractId, saleDate, transactionDate, description, contractName, perUnitRate',
                      [{ column: 'netAmount', displayAs: 'netAmount' }, { column: 'homeCurrencyNetAmount', displayAs: 'homeCurrencyNetAmount' }, { column: 'units', displayAs: 'units' }, { column: 'contractCurrencyCalculationOutput', displayAs: 'contractCurrencyCalculationOutput' }],
                      'count',
                      bigQueryFilter,
                      {},
                    );
                    exportQueryToFile(bigQuery, query, activeSalesLineProcess, false, contractBatchCb);
                  }, (err) => {
                    if (err) {
                      logger.error('Platoon: Error processing contract batches', { error: err.message });
                      return cb(err);
                    }
                    logger.info(`Platoon: Reported Sources - ${reportedSources}`);
                    cb();
                  });
                },
                (cb) => {
                  // Unreported
                  logger.info('Platoon: Running Unreported');
                  // Reset output for unreported only
                  lineOptions.output = [];
                  const options = databaseUtils.getBigQueryOpts(client);
                  let salesFileIds = '';
                  period.salesFilesIds.forEach((salesFileId, index) => {
                    salesFileIds += '"';
                    salesFileIds += salesFileId;
                    salesFileIds += '"';
                    if (index !== period.salesFilesIds.length - 1) {
                      salesFileIds += ', ';
                    }
                  });
                  const unreportedQuery = `SELECT STRING_AGG(Output.contractId, ', ') as contractIds,
                  Input.id, Input.salesFileId, Input.catalogueContractIds, Input.catType, Input.source, Input.status, Input.subSource, Input.territory, Input.releaseId, Input.catalogueBarcode, Input.catalogueCatNo, Input.catalogueReleaseTitle, Input.catalogueReleaseArtist, Input.ppd, Input.barcode, Input.catNo, Input.catalogueIsrc, Input.catalogueTrackTitle, Input.catalogueTrackVersion, Input.catalogueTrackArtist, Input.trackId, Input.isrc, Input.distributionChannel, Input.configuration, Input.priceCategory, Input.units, Input.grossAmount, Input.netAmount, Input.originalCurrency, Input.exchangeRate, Input.homeCurrencyGrossAmount, Input.homeCurrencyNetAmount, Input.contractId, Input.description, Input.saleDate, Input.transactionDate, Input.perUnitRate, Output.salesLineId
                  FROM \`${options.datasetName}.${options.inputTable}\` Input
                  LEFT OUTER JOIN \`${options.datasetName}.${options.outputTable}\` Output
                  ON (Output.salesLineId = Input.id)
                  GROUP BY Input.id, Input.salesFileId, Input.catalogueContractIds, Input.catType, Input.source, Input.status, Input.subSource, Input.territory, Input.releaseId, Input.catalogueBarcode, Input.catalogueCatNo, Input.catalogueReleaseTitle, Input.catalogueReleaseArtist, Input.ppd, Input.barcode, Input.catNo, Input.catalogueIsrc, Input.catalogueTrackTitle, Input.catalogueTrackVersion, Input.catalogueTrackArtist, Input.trackId, Input.isrc, Input.distributionChannel, Input.configuration, Input.priceCategory, Input.units, Input.grossAmount, Input.netAmount, Input.originalCurrency, Input.exchangeRate, Input.homeCurrencyGrossAmount, Input.homeCurrencyNetAmount, Input.contractId, Input.description, Input.saleDate, Input.transactionDate, Input.perUnitRate, Output.salesLineId
                  HAVING (Output.salesLineId IS NULL AND salesFileId IN (${salesFileIds}))`;

                  exportQueryToFile(bigQuery, unreportedQuery, unreportedSalesLineProcess, true, cb);
                },
                (cb) => {
                  if (runPlatoonRereport) {
                    logger.info('Platoon: Running Previous Unreport Sales Process');
                    // Previous Unreport Sales Process
                    previousUnreportSalesProcess(period, trackMappings, releaseMappings, contractMappings, payeeIdMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings, lineOptions, cb);
                  } else {
                    cb();
                  }
                },
              ], (err) => {
                if (err) {
                  clearTimeout(globalTimeout);
                  logger.error('Platoon: Error in main processing waterfall', { error: err.message, stack: err.stack });
                  return callback(err);
                }

                logger.info('Platoon: Writing final files');
                waterfall([
                  (cb) => {
                    writeFile(lineOptions.output, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Writing original unreported');
                    writeOriginalUnreported(lineOptions.originalUnreportedLines, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Writing failure files');
                    writeFailure(lineOptions.failures, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Writing unreported files');
                    writeUnreported(lineOptions.unreported, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Storing new unreported lines for later processing');
                    // Store reference to new unreported files for later processing in the rereport process
                    if (unreportedFiles && unreportedFiles.length > 0) {
                      lineOptions.newUnreportedFiles = unreportedFiles;
                      logger.info(`Platoon: Stored ${unreportedFiles.length} new unreported files for later processing`);
                    }
                    cb();
                  },
                  (cb) => {
                    logger.info('Platoon: Creating summary');
                    generateSummary(lineOptions.summary, 'Standard', (err) => {
                      if (err) {
                        logger.error('Platoon: Error generating summary', { error: err.message });
                        return cb(err);
                      }
                      cb();
                    });
                  },
                  (cb) => {
                    logger.info('Platoon: Creating DSP summary');
                    generateDspSummary(lineOptions.perDspSummary, (err, summaryFile) => {
                      if (err) {
                        logger.error('Platoon: Error generating DSP summary', { error: err.message });
                        return cb(err);
                      }
                      dspSummaryFiles = [summaryFile];
                      cb();
                    });
                  },
                  // Merge files to only leave one output file for failures and unreported
                  (cb) => {
                    logger.info('Platoon: Combining Failure CSVs');
                    combineCSVs(failureFiles, 'All Failures', (err, singleFailureFile) => {
                      if (err) {
                        logger.error('Platoon: Error combining failure CSVs', { error: err.message });
                        return cb(err);
                      }
                      failureFiles = [singleFailureFile];
                      cb();
                    });
                  },
                  (cb) => {
                    if (runPlatoonRereport) {
                      logger.info('Platoon: Combining Rereport CSVs');
                      combineCSVs(rereportFiles, 'All Rereport', (err, singleRereportFile) => {
                        if (err) {
                          logger.error('Platoon: Error combining rereport CSVs', { error: err.message });
                          return cb(err);
                        }
                        failureFiles.push(singleRereportFile);
                        cb();
                      });
                    } else {
                      cb();
                    }
                  },
                  (cb) => {
                    logger.info('Platoon: Combining Unreported CSVs');
                    combineCSVs(unreportedFiles, 'All Unreported', (err, singleUnreportedFile) => {
                      if (err) {
                        logger.error('Platoon: Error combining unreported CSVs', { error: err.message });
                        return cb(err);
                      }
                      unreportedFiles = [singleUnreportedFile];
                      cb();
                    });
                  },
                  (cb) => {
                    if (runPlatoonRereport) {
                      generateSummary(lineOptions.rereportSummary, 'unreported', (err, summaryFile) => {
                        if (err) {
                          logger.error('Platoon: Error generating unreported summary', { error: err.message });
                          return cb(err);
                        }
                        unreportedFiles.push(summaryFile);
                        cb();
                      });
                    } else {
                      cb();
                    }
                  },
                ], (err) => {
                  if (err) {
                    clearTimeout(globalTimeout);
                    logger.error('Platoon: Error in final file writing waterfall', { error: err.message, stack: err.stack });
                    return callback(err);
                  }

                  logger.info('Platoon: Generation Complete');
                  if (fullRun) {
                    // Only increment numbers when it's a full exportable run
                    period.platoon.fileNumberLast = fileNumberLast;
                    period.platoon.summaryNumber = summaryNumber + 1;
                  }
                  period.save()
                    .then(() => {
                      clearTimeout(globalTimeout);
                      lineOptions = {};
                      callback(null, localFiles, failureFiles, unreportedFiles, dspSummaryFiles);
                    })
                    .catch((err) => {
                      logger.error('Platoon: Error saving period', { error: err.message });
                      return callback(err);
                    });
                });
              });
            } catch (err) {
              clearTimeout(globalTimeout);
              logger.error('Platoon: Unexpected error in main processing', { error: err.message, stack: err.stack });
              return callback(err);
            }
          })
          .catch((err) => {
            clearTimeout(globalTimeout);
            logger.error('Platoon: Error finding contracts', { error: err.message });
            return callback(err);
          });
      } catch (err) {
        clearTimeout(globalTimeout);
        logger.error('Platoon: Unexpected error in contract processing', { error: err.message, stack: err.stack });
        return callback(err);
      }
    });
  } catch (err) {
    clearTimeout(globalTimeout);
    logger.error('Platoon: Unexpected error in main function', { error: err.message, stack: err.stack });
    return callback(err);
  }
};

const activeSalesLineProcess = (item, output, failures, unreported) => {
  const { client, whtMappings, payeeMappings, contractMappings, inactiveContracts, salesFileMappings } = lineOptions;
  // Temp fix for Sync wording in outputs
  if (item.configuration === 'Sync') {
    item.configuration = 'Sync Direct';
  }
  const originalSource = mapSource(item.source, item.originalCurrency, item.territory);
  let hasOriginalAmount = !!item.description;
  let originalCurrency = getOriginalCurrency(item.description, item.originalCurrency);
  let originalAmount = getOriginalAmount(item.description, item.netAmount);
  if (!originalCurrency || originalCurrency === '' || ['Apple', 'iTunes'].includes(originalSource)) {
    hasOriginalAmount = false;
    originalCurrency = item.originalCurrency;
  }
  // Map original currency of CNY to RMB
  if (originalCurrency === 'CNY') {
    originalCurrency = 'RMB';
  }
  const source = mapSource(item.source, originalCurrency, item.territory);
  if (!originalAmount || originalAmount === item.description) {
    originalAmount = item.netAmount;
  }
  let royalty = originalAmount * (parseFloat(item.objectPercentage) / 100) * (parseFloat(item.royaltyRate) / 100);
  if (['VAT', 'Sync Fee'].includes(item.configuration)) {
    royalty = item.contractCurrencyCalculationOutput;
  }
  const outputRoyalty = parseFloat(formatFloat(royalty));
  const transactionDate = item.transactionDate ? item.transactionDate : item.saleDate;
  // Set Sales Type and Withholding Appending
  let salesType = mapSalesType(item.configuration, source);
  salesType = setWHTValue(item, salesType, whtMappings);
  // Set currencies
  const transactionCurrency = originalCurrency;
  const transactionCurrencyAmount = formatFloat(originalAmount * (parseFloat(item.objectPercentage) / 100));
  const receivedCurrency = hasOriginalAmount ? item.originalCurrency : client.homeCurrency;
  const receivedAmount = hasOriginalAmount ? formatFloat(item.netAmount * (parseFloat(item.objectPercentage) / 100)) : formatFloat(item.homeCurrencyNetAmount * (parseFloat(item.objectPercentage) / 100));
  let royaltyAmount = formatFloat(royalty);
  // Set IDs
  let artistId = payeeMappings[item.contractId];
  let contractId = contractMappings[item.contractId];
  let { contractName } = item;

  // For Sync Fee lines, ensure artist ID is blank
  if (item.configuration === 'Sync Fee') {
    artistId = null;
  }
  // Set to UNREPORTED if it is negative, or artistId is missing or is not 10 characters
  // Skip this validation for Sync Fee lines as they don't require artistId
  if (!['VAT', 'Sync Fee'].includes(item.configuration) && (transactionCurrencyAmount < 0 || !artistId || String(artistId).length !== 10 || inactiveContracts[item.contractId])) {
    artistId = null;
    contractId = 'UNREPORTED';
    if (transactionCurrencyAmount < 0 || inactiveContracts[item.contractId]) {
      contractName = null;
    }
    royaltyAmount = 0;
  }
  let exchangeRate = receivedAmount / transactionCurrencyAmount;
  if (Number.isNaN(exchangeRate) || !Number.isFinite(exchangeRate)) {
    exchangeRate = 0;
  }
  let perUnitRate = 0;
  if (transactionCurrencyAmount && item.units) {
    perUnitRate = transactionCurrencyAmount / item.units;
  }
  // Mark as unreported if the royalty is 0 but received amount is not 0
  // Skip this validation for Sync Fee lines as they should have royalty 0 and empty contractId
  if (!['VAT', 'Sync Fee'].includes(item.configuration) && royaltyAmount === 0 && receivedAmount !== 0) {
    artistId = null;
    contractId = 'UNREPORTED';
  }
  const lineItem = [
    fixLength(`${item.salesLineId}-${item.contractId}-${summaryNumber}`, 100),
    fixLength(item.catalogueIsrc ? item.catalogueIsrc : item.catalogueBarcode, 100),
    fixLength(transactionCurrency, 3), // 2
    formatFloat(transactionCurrencyAmount),
    fixLength(receivedCurrency, 3), // 4
    formatFloat(receivedAmount),
    // item.homeCurrencyNetAmount * (parseFloat(item.objectPercentage) / 100),
    formatFloat(exchangeRate), // 6
    // item.exchangeRate,
    // item.objectPercentage,
    formatFloat(!['VAT', 'Sync Fee'].includes(item.configuration) ? (royalty || royalty === 0 ? item.royaltyRate : 0) : 0),
    fixLength(originalCurrency, 3), // 8
    // contractCurrencyMappings[item.contractId] === 'Home Currency' ? 'GBP' : contractCurrencyMappings[item.contractId],
    !['VAT', 'Sync Fee'].includes(item.configuration) ? royaltyAmount : formatFloat(0),
    fixLength(`${moment(transactionDate).format('YYYYMM')}-${source}`, 100), // 10
    fixLength(item.territory, 2), // 11
    fixLength(salesType, 100),
    fixLength(source, 100), // 13
    fixLength(artistId, 100), // 14
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? contractId : '', 100), // 15
    fixLength(salesFileMappings[item.salesFileId]?.invoiceNo, 10),
    moment(item.saleDate).format('YYYY-MM-DD'),
    moment(transactionDate).format('YYYY-MM-DD'),
    // Other fields
    fixLength(contractName, 100),
    fixLength(item.catType, 100),
    fixLength(item.subSource, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueBarcode : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueCatNo : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueReleaseTitle : null, 250),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueReleaseArtist : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueTrackTitle : null, 250),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueTrackArtist : null, 100),
    fixLength(item.distributionChannel, 100),
    formatFloat(item.units),
    formatFloat(perUnitRate),
  ];
  if (isNaN(parseFloat(lineItem[3])) || isNaN(parseFloat(lineItem[5])) || isNaN(parseFloat(lineItem[9]))) {
    logger.info(`Platoon: NaN values detected in line - SalesLineId: ${lineItem[0]}, Transaction: ${lineItem[3]}, Received: ${lineItem[5]}, Royalty: ${lineItem[9]}`);
  }
  if ((outputRoyalty !== 0 || lineItem[15] === 'UNREPORTED' || lineItem[12] === 'Sync Fee')
    && (royaltyAmount !== 0 || lineItem[15] === 'UNREPORTED' || lineItem[12] === 'Sync Fee')
    && String(transactionCurrency).trim().length === 3
    && String(receivedCurrency).trim().length === 3
    && String(originalCurrency).trim().length === 3
    && String(transactionCurrency).indexOf('.') === -1
    && String(receivedCurrency).indexOf('.') === -1
    && String(originalCurrency).indexOf('.') === -1
    && validateLine(lineItem)
    && ((!djMixContractIds.includes(item.contractId) && lineItem[13] !== 'AppleDJ') || (djMixContractIds.includes(item.contractId) && lineItem[13] === 'AppleDJ'))) {
    // Add values to the summary
    lineOptions.summary.lines += 1;
    lineOptions.summary.transaction[transactionCurrency] = lineOptions.summary.transaction[transactionCurrency] || 0;
    lineOptions.summary.transaction[transactionCurrency] += parseFloat(transactionCurrencyAmount);
    lineOptions.summary.received[receivedCurrency] = lineOptions.summary.received[receivedCurrency] || 0;
    lineOptions.summary.received[receivedCurrency] += parseFloat(receivedAmount);
    // Only add to royalty summary if it's not a Sync Fee (sync fees are deductions, not royalties)
    if (item.configuration !== 'Sync Fee') {
      lineOptions.summary.royalty[transactionCurrency] = lineOptions.summary.royalty[transactionCurrency] || 0;
      lineOptions.summary.royalty[transactionCurrency] += parseFloat(royaltyAmount);
    }
    // Update DSP Summary
    updateDspSummary(lineOptions.perDspSummary, lineItem);
    // Add source to array
    if (!lineOptions.reportedSources.includes(lineItem[13])) {
      lineOptions.reportedSources.push(lineItem[13]);
    }
    // Write line to output
    output.push(lineItem.join('|'));
    // Add unreported lines to the unreported file
    if (lineItem[15] === 'UNREPORTED') {
      unreported.push(lineItem.join('|'));
    }
  } else {
    // Update DSP Summary
    updateDspSummary(lineOptions.perDspSummary, lineItem);
    // Add to failures output
    failures.push(lineItem.join('|'));
  }
};

const unreportedSalesLineProcess = (item, output, failures, unreported) => {
  const { client, whtMappings, salesFileMappings } = lineOptions;
  if (item.configuration === 'Sync') {
    item.configuration = 'Sync Direct';
  }
  const originalSource = mapSource(item.source, item.originalCurrency, item.territory);
  let hasOriginalAmount = !!item.description;
  let originalCurrency = getOriginalCurrency(item.description, item.originalCurrency);
  let originalAmount = getOriginalAmount(item.description, item.netAmount);
  if (!originalCurrency || originalCurrency === '' || ['Apple', 'iTunes'].includes(originalSource)) {
    hasOriginalAmount = false;
    originalCurrency = item.originalCurrency;
  }
  // Map original currency of CNY to RMB
  if (originalCurrency === 'CNY') {
    originalCurrency = 'RMB';
  }
  if (!originalAmount || originalAmount === item.description) {
    originalAmount = item.netAmount;
  }
  let royalty = originalAmount * (parseFloat(item.objectPercentage) / 100) * (parseFloat(item.royaltyRate) / 100);
  if (['VAT', 'Sync Fee'].includes(item.configuration)) {
    royalty = item.contractCurrencyCalculationOutput;
  }
  const outputRoyalty = parseFloat(formatFloat(royalty));
  const transactionDate = item.transactionDate ? item.transactionDate : item.saleDate;
  // Set currencies
  const transactionCurrency = originalCurrency;
  const transactionCurrencyAmount = formatFloat(parseFloat(originalAmount));
  const receivedCurrency = hasOriginalAmount ? item.originalCurrency : client.homeCurrency;
  const receivedAmount = hasOriginalAmount ? formatFloat(item.netAmount) : formatFloat(item.homeCurrencyNetAmount);
  const royaltyAmount = formatFloat(royalty);
  const source = mapSource(item.source, originalCurrency, item.territory);
  // Set Sales Type and Withholding Appending
  let salesType = mapSalesType(item.configuration, source);
  salesType = setWHTValue(item, salesType, whtMappings);
  // Rescue exchange rate
  let exchangeRate = transactionCurrencyAmount ? item.netAmount / transactionCurrencyAmount : 1;
  if (Number.isNaN(exchangeRate) || !Number.isFinite(exchangeRate)) {
    exchangeRate = 0;
  }
  let perUnitRate = 0;
  if (transactionCurrencyAmount && item.units) {
    perUnitRate = transactionCurrencyAmount / item.units;
  }
  const lineItem = [
    fixLength(`${item.id}-${summaryNumber}`, 100),
    fixLength(item.catalogueIsrc ? item.catalogueIsrc : item.catalogueBarcode, 100),
    fixLength(originalCurrency, 3), // 2
    formatFloat(transactionCurrencyAmount),
    fixLength(receivedCurrency, 3), // 4
    formatFloat(receivedAmount),
    // item.homeCurrencyNetAmount * (parseFloat(item.objectPercentage) / 100),
    formatFloat(exchangeRate), // 6
    // item.exchangeRate,
    // item.objectPercentage,
    formatFloat(0),
    fixLength(originalCurrency, 3), // 8
    // contractCurrencyMappings[item.contractId] === 'Home Currency' ? 'GBP' : contractCurrencyMappings[item.contractId],
    formatFloat(0),
    fixLength(`${moment(transactionDate).format('YYYYMM')}-${source}`, 100), // 10
    // fixLength(`202303-${source}`, 100),
    fixLength(item.territory, 2), // 11
    fixLength(salesType, 100),
    fixLength(source, 100), // 13
    null, // 14
    'UNREPORTED', // 15
    fixLength(salesFileMappings[item.salesFileId]?.invoiceNo, 10),
    moment(item.saleDate).format('YYYY-MM-DD'),
    moment(transactionDate).format('YYYY-MM-DD'),
    // Other fields
    fixLength(item.contractName, 100), // 19
    fixLength(item.catType, 100),
    fixLength(item.subSource, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueBarcode : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueCatNo : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueReleaseTitle : null, 250),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueReleaseArtist : null, 100),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueTrackTitle : null, 250),
    fixLength(!['VAT', 'Sync Fee'].includes(item.configuration) ? item.catalogueTrackArtist : null, 100),
    fixLength(item.distributionChannel, 100),
    formatFloat(item.units),
    formatFloat(perUnitRate),
  ];
  if (isNaN(parseFloat(lineItem[3])) || isNaN(parseFloat(lineItem[5])) || isNaN(parseFloat(lineItem[9]))) {
    logger.info(`Platoon: NaN values detected in line - SalesLineId: ${lineItem[0]}, Transaction: ${lineItem[3]}, Received: ${lineItem[5]}, Royalty: ${lineItem[9]}`);
  }
  if ((outputRoyalty !== 0 || royaltyAmount !== 0)
    && String(transactionCurrency).trim().length === 3
    && String(receivedCurrency).trim().length === 3
    && String(originalCurrency).trim().length === 3
    && String(transactionCurrency).indexOf('.') === -1
    && String(receivedCurrency).indexOf('.') === -1
    && String(originalCurrency).indexOf('.') === -1
    && validateLine(lineItem)) {
    // Add values to the summary
    lineOptions.summary.lines += 1;
    lineOptions.summary.transaction[transactionCurrency] = lineOptions.summary.transaction[transactionCurrency] || 0;
    lineOptions.summary.transaction[transactionCurrency] += parseFloat(transactionCurrencyAmount);
    lineOptions.summary.received[receivedCurrency] = lineOptions.summary.received[receivedCurrency] || 0;
    lineOptions.summary.received[receivedCurrency] += parseFloat(receivedAmount);
    updateDspSummary(lineOptions.perDspSummary, lineItem);
    // Write line to output
    output.push(lineItem.join('|'));
    // Add unreported lines to the unreported file
    unreported.push(lineItem.join('|'));
  } else {
    // Update DSP Summary
    updateDspSummary(lineOptions.perDspSummary, lineItem);
    // Add to failures output
    failures.push(lineItem.join('|'));
  }
};

const writeFile = (output, cb) => {
  const chunks = chunk(output, 300000);
  eachSeries(chunks, (chunk, chunkCb) => {
    chunk = chunk.map((value) => value.replace(/[^a-zA-Z0-9 .,!$%^&*()_|-]/g, ''));
    // Increment file count
    fileCount += 1;
    // Increment fileNumberLast
    fileNumberLast += 1;
    // Add header to start of file
    chunk.unshift(['Sales Line ID', 'ISRC/UPC', 'Transaction Currency', 'Amount in Currency', 'Received Currency', 'Amount in Received Currency', 'Exchange Rate to Reported Currency', 'Royalty Rate', 'Royalty Currency', 'Royalty', 'Transaction ID', 'Territory', 'Sale Type', 'Source', 'Artist ID', 'Contract ID', 'Payment Reference', 'Sale Date', 'Transaction Date', 'Contract Name', 'Cat Type', 'Subsource', 'Barcode', 'Cat No', 'Release Title', 'Release Artist', 'Track Title', 'Track Artist', 'Distribution Channel', 'Units', 'Per Unit Rate'].join('|'));
    const localFileName = `${appRootDir}/tmp/Platoon_Royalty_${fileDate}_${processNo}_${fileNumberLast}_PLAYDATA_${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    logger.info(`Platoon: Writing File ${localFileName}`);
    fs.writeFileSync(localFileName, chunk.join('\n'));
    localFiles.push(localFileName);
    chunkCb();
  }, cb);
};

const writeFailure = (output, cb) => {
  const chunks = chunk(output, 300000);
  eachSeries(chunks, (chunk, chunkCb) => {
    chunk = chunk.map((value) => value.replace(/[^a-zA-Z0-9 .,!$%^&*()_|-]/g, ''));
    // Increment file count
    failureFileCount += 1;
    // Add header to start of file
    if (failureFileCount === 1) {
      chunk.unshift(['Sales Line ID', 'ISRC/UPC', 'Transaction Currency', 'Amount in Currency', 'Received Currency', 'Amount in Received Currency', 'Exchange Rate to Reported Currency', 'Royalty Rate', 'Royalty Currency', 'Royalty', 'Transaction ID', 'Territory', 'Sale Type', 'Source', 'Artist ID', 'Contract ID', 'Payment Reference', 'Sale Date', 'Transaction Date', 'Contract Name', 'Cat Type', 'Subsource', 'Barcode', 'Cat No', 'Release Title', 'Release Artist', 'Track Title', 'Track Artist', 'Distribution Channel', 'Units', 'Per Unit Rate'].join('|'));
    }
    const localFileName = `${appRootDir}/tmp/Failures_${failureFileCount}_${moment().format('YYYYMMDDhmmssSSS')}.csv`;
    let outputData = chunk.join('\n');
    // Add line break to last line
    if (outputData[outputData.length - 1] !== '\n') {
      outputData += '\n';
    }
    fs.writeFileSync(localFileName, outputData);
    failureFiles.push(localFileName);
    chunkCb();
  }, cb);
};

const writeOriginalUnreported = (output, cb) => {
  const chunks = chunk(output, 300000);
  eachSeries(chunks, (chunk, chunkCb) => {
    chunk = chunk.map((value) => value.replace(/[^a-zA-Z0-9 .,!$%^&*()_|-]/g, ''));
    // Increment file count
    rereportFileCount += 1;
    // Add header to start of file
    if (rereportFileCount === 1) {
      chunk.unshift(['Sales Line ID', 'ISRC/UPC', 'Transaction Currency', 'Amount in Currency', 'Received Currency', 'Amount in Received Currency', 'Exchange Rate to Reported Currency', 'Royalty Rate', 'Royalty Currency', 'Royalty', 'Transaction ID', 'Territory', 'Sale Type', 'Source', 'Artist ID', 'Contract ID', 'Payment Reference', 'Sale Date', 'Transaction Date', 'Contract Name', 'Cat Type', 'Subsource', 'Barcode', 'Cat No', 'Release Title', 'Release Artist', 'Track Title', 'Track Artist', 'Distribution Channel', 'Units', 'Per Unit Rate'].join('|'));
    }
    const localFileName = `${appRootDir}/tmp/Rereport_${rereportFileCount}_${moment().format('YYYYMMDDhmmssSSS')}.csv`;
    let outputData = chunk.join('\n');
    // Add line break to last line
    if (outputData[outputData.length - 1] !== '\n') {
      outputData += '\n';
    }
    fs.writeFileSync(localFileName, outputData);
    rereportFiles.push(localFileName);
    chunkCb();
  }, cb);
};

const writeUnreported = (output, cb) => {
  const chunks = chunk(output, 300000);
  eachSeries(chunks, (chunk, chunkCb) => {
    chunk = chunk.map((value) => value.replace(/[^a-zA-Z0-9 .,!$%^&*()_|-]/g, ''));
    // Increment file count
    unreportedFileCount += 1;
    // Add header to start of file
    if (unreportedFileCount === 1) {
      chunk.unshift(['Sales Line ID', 'ISRC/UPC', 'Transaction Currency', 'Amount in Currency', 'Received Currency', 'Amount in Received Currency', 'Exchange Rate to Reported Currency', 'Royalty Rate', 'Royalty Currency', 'Royalty', 'Transaction ID', 'Territory', 'Sale Type', 'Source', 'Artist ID', 'Contract ID', 'Payment Reference', 'Sale Date', 'Transaction Date', 'Contract Name', 'Cat Type', 'Subsource', 'Barcode', 'Cat No', 'Release Title', 'Release Artist', 'Track Title', 'Track Artist', 'Distribution Channel', 'Units', 'Per Unit Rate'].join('|'));
    }
    const localFileName = `${appRootDir}/tmp/Unreported_${unreportedFileCount}_${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
    let outputData = chunk.join('\n');
    // Add line break to last line
    if (outputData[outputData.length - 1] !== '\n') {
      outputData += '\n';
    }
    fs.writeFileSync(localFileName, outputData);
    unreportedFiles.push(localFileName);
    chunkCb();
  }, cb);
};

const generateSummary = (summary, type, callback) => {
  let data = 'Total Lines|Currency|Transaction Amount|Received Amount|Royalty Amount\n';
  const uniqueCurrencies = getUniqueCurrencies(summary);
  uniqueCurrencies.forEach((currency) => {
    data += `${summary.lines}|${currency}|${summary.transaction[currency] ? formatFloat(summary.transaction[currency]) : 0}|${summary.received[currency] ? formatFloat(summary.received[currency]) : 0}|${summary.royalty[currency] ? formatFloat(summary.royalty[currency]) : 0}\n`;
  });
  let localFileName = `${appRootDir}/tmp/Platoon_Royalty_${fileDate}_0${summaryNumber || 1}_SUMMARY_${fileCount}_${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
  if (type === 'unreported') {
    localFileName = `${appRootDir}/tmp/Platoon_Royalty_${fileDate}_0${summaryNumber || 1}_REREPORT_SUMMARY_${fileCount}_${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
  }
  fs.writeFileSync(localFileName, data);
  if (type !== 'unreported') {
    localFiles.push(localFileName);
  }
  callback(null, localFileName);
};

const generateDspSummary = (summary, callback) => {
  const localFileName = `${appRootDir}/tmp/DSP Summary ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
  // Add Subsource to the header
  let data = 'Contract Name|Contract ID|Artist ID|DSP|Subsource|Currency|Transaction Currency|Royalty\n';
  Object.values(summary).forEach((line) => {
    // Add subsource to the output line
    data += `${line.contractName}|${line.contractId}|${line.artistId}|${line.source}|${line.subsource}|${line.currency}|${formatFloat(line.proRata)}|${formatFloat(line.cogs)}\n`;
  });
  fs.writeFileSync(localFileName, data);
  callback(null, localFileName);
};

const combineCSVs = (filePaths, fileName, callback) => {
  // Combines CSVs, leaving the header in for the first file
  const fileLocation = `${appRootDir}/tmp/${fileName} ${moment().format('YYYYMMDDHHmmssSSS')}.csv`;
  // const writeStream = fs.createWriteStream(fileLocation);
  filePaths.forEach((filePath, index) => {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      fs.appendFileSync(fileLocation, data.toString());
    }
  });
  callback(null, fileLocation);
};

const updateDspSummary = (dspSummary, line) => {
  // Add subsource to the combined name key (line[21] contains subsource)
  const combinedName = `${line[19]}|${line[15]}|${line[14]}|${line[13]}|${line[12]}|${line[2]}|${line[21]}`;
  dspSummary[combinedName] = dspSummary[combinedName] || {
    contractName: line[19],
    contractId: line[15],
    artistId: line[14],
    source: line[13],
    subsource: line[21], // Add subsource to stored data
    currency: line[2],
    proRata: 0,
    cogs: 0,
  };
  if (line[3]) {
    dspSummary[combinedName].proRata += parseFloat(line[3]);
  }
  if (line[9]) {
    dspSummary[combinedName].cogs += parseFloat(line[9]);
  }
};

const getUniqueCurrencies = (summary) => {
  const transactionCurrencies = Object.keys(summary.transaction);
  const receivedCurrencies = Object.keys(summary.received);
  const royaltyCurrencies = Object.keys(summary.royalty);
  const combinedCurrencies = transactionCurrencies.concat(receivedCurrencies, royaltyCurrencies);
  return _.uniq(combinedCurrencies).sort();
};

const formatFloat = (number) => {
  // Handle null, undefined, empty string
  if (number === null || number === undefined || number === '') {
    return 0;
  }

  // Handle string inputs
  if (typeof number === 'string') {
    // Check if it's a valid number string
    const parsed = Number(number);
    if (Number.isNaN(parsed)) {
      return 0;
    }
    // Convert to number and process
    number = parsed;
  }

  // Handle number inputs
  if (typeof number === 'number') {
    // Check if it's finite
    if (!Number.isFinite(number)) {
      return 0;
    }
    let output = parseFloat(number.toFixed(8));
    if (output.toString().includes('e')) {
      output = output.toFixed(8);
    }
    return output;
  }

  // Fallback for any other type
  return 0;
};

const mapSource = (value, originalCurrency, territory) => {
  // const spotifyUsTerritories = ['CW', 'NI', 'GY', 'GT', 'BS', 'CO', 'UY', 'LC', 'VE', 'US', 'HT', 'SV', 'JM', 'PY', 'GD', 'BB', 'PE', 'BO', 'HN', 'PA', 'DO', 'SR', 'CR', 'KN', 'AR', 'TT', 'MX', 'AG', 'CA', 'BZ', 'BR', 'EC', 'DM', 'VC', 'CL'];
  // Reduced to only US now, as requested on 22nd April 2024
  const spotifyUsTerritories = ['US'];
  // A defined list with values being stripped out should they not meet the list
  const mappings = {
    'YouTube Red': 'YouTube',
    YouTube: 'YouTube',
    Beats: 'Apple',
    'Apple Music': 'Apple',
    'iTunes Match': 'Apple',
    iTunes: 'Apple',
    'Apple Music DJ Mixes': 'Apple',
    'DJ Mix': 'AppleDJ',
    Apple: 'Apple',
    Spotify: 'Spotify',
    Partnerize: 'Partnerize',
    PPL: 'PPL',
    'Sound Exchange': 'Sound Exchange',
    AppleDJ: 'AppleDJ',
    FUGA: 'FUGA',
    Vevo: 'Vevo',
    Naxos: 'Naxos',
    Amazon: 'Amazon',
    NAXOS: 'NAXOS',
  };
  let output = mappings[value] ? mappings[value] : null;
  if (output === 'Spotify') {
    if (originalCurrency === 'USD' && spotifyUsTerritories.includes(territory)) {
      output = `${output} US`;
    } else {
      output = `${output} AB`;
    }
  }
  return output;
};

const mapSalesType = (value, source) => {
  const mappings = {
    Streaming: 'Premium Stream',
    'Sync Direct': 'Premium Stream',
    Synchronisation: 'Premium Stream',
    'General Stream': 'Premium Stream',
    'Video (Streaming)': 'Video Premium Stream',
    'Download (Track)': 'Download',
    'Download (Album)': 'Download',
    'Video (Download)': 'Download',
    Partnerize: 'Affiliates',
    'Ad-Funded Stream': 'Ad-Funded Stream',
    Affiliates: 'Affiliates',
    'DJ Mix': 'DJ Mix',
    Download: 'Download',
    'Neighbouring Rights': 'Neighbouring Rights',
    'Premium Stream': 'Premium Stream',
    'Sync 3rd Party': 'Sync 3rd Party',
    'Sync Fee': 'Sync Fee',
    'Video Premium Stream': 'Video Premium Stream',
    'Tethered Download': 'Download',
    Physical: 'Physical',
  };
  let output = mappings[value] ? mappings[value] : value;
  if (source === 'DJ Mix' || source === 'AppleDJ') {
    output = 'DJ Mix';
  }
  return output;
};

const setWHTValue = (item, salesType, whtMappings) => {
  // Only allowed on some sales types
  const includedValues = ['Ad-Funded Stream', 'Download', 'Neighbouring Rights', 'Physical', 'Premium Stream', 'Sync 3rd Party', 'Sync Direct', 'Video Ad-Funded Stream', 'Video Premium Stream'];
  // Check it is one of the allowed sales types
  if (includedValues.includes(salesType)) {
    // Check if the ISRC or the barcode has a mapping
    if (item.catType === 'Track' && whtMappings[item.catalogueIsrc]) {
      salesType = `${salesType}-${whtMappings[item.catalogueIsrc]}`;
    }
    if (item.catType === 'Release' && whtMappings[item.catalogueBarcode]) {
      salesType = `${salesType}-${whtMappings[item.catalogueBarcode]}`;
    }
  }
  return salesType;
};

const fixLength = (value, length) => {
  if (value) {
    // Fixes the length of the string, and removes any pipe characters
    return (value.toString()).replace(/\|/g, '').replace(/[^\x00-\x7F]/g, '').substring(0, length);
  }
};

const validateLine = (line) => {
  // Add validation for NaN values in critical amount fields
  if (
    isNaN(parseFloat(line[3])) // transactionCurrencyAmount
    || isNaN(parseFloat(line[5])) // receivedAmount
    || isNaN(parseFloat(line[9])) // royaltyAmount
  ) {
    return false;
  }

  if (
    line[0] // Sales Line ID
    && line[2] // transactionCurrency
    && line[4] // receivedCurrency
    && (line[8] || line[15] === 'UNREPORTED') // royaltyCurrency
    && line[11] // territory
    && (line[15] || line[12] === 'Sync Fee') // contractId (or allow empty for Sync Fee lines)
    && (line[15] === 'UNREPORTED' || (line[14] && line[14].length === 10) || line[12] === 'Sync Fee' || line[15] === '')// artistId exists and is 10 digits, or contract is UNREPORTED, or it's a Sync Fee line, or contractId is empty
    && sourceCurrencyValid(line[13], line[4]) // source to currency mapping
    && saleTypeValid(line[12]) // sale type is value
  ) {
    return true;
  }
  return false;
};

const sourceCurrencyValid = (source, currency) => {
  // If source is null or undefined, allow it through (for Sync Fee lines that might not have mapped sources)
  if (!source) {
    return true;
  }

  const mappings = {
    FUGA: ['EUR'],
    PPL: ['GBP'],
    Partnerize: ['GBP', 'USD'],
    'Sound Exchange': ['USD', 'GBP'],
    'Spotify AB': ['GBP', 'EUR', 'USD'],
    'Spotify US': ['EUR', 'USD'],
    Vevo: ['USD'],
    'Wooly Music': ['USD'],
    YouTube: ['USD', 'GBP'],
    Apple: ['GBP'],
    AppleDJ: ['GBP', 'USD'],
    Naxos: ['USD', 'GBP', 'EUR'],
    NAXOS: ['USD', 'GBP', 'EUR'],
    Amazon: ['USD', 'GBP', 'EUR'],
  };
  const map = mappings[source];
  if (map && map.includes(currency)) {
    return true;
  }

  // If source is not in mappings, allow it through (for Sync Fee lines with unmapped sources)
  return true;
};

const saleTypeValid = (saleType) => {
  const mappings = [
    'Ad-Funded Stream',
    'Ad-Funded Stream-DTT',
    'Ad-Funded Stream-XMT',
    'Affiliates',
    'DJ Mix',
    'Download',
    'Download-DTT',
    'Download-XMT',
    'Neighbouring Rights',
    'Neighbouring Rights-XMT',
    'Neighbouring Rights-DTT',
    'Physical',
    'Physical-DTT',
    'Physical-XMT',
    'Premium Stream',
    'Premium Stream-DTT',
    'Premium Stream-XMT',
    'Sync 3rd Party',
    'Sync 3rd Party-DTT',
    'Sync 3rd Party-XMT',
    'Sync Direct',
    'Sync Direct-DTT',
    'Sync Direct-XMT',
    'Sync Fee',
    'Video Ad-Funded Stream',
    'Video Ad-Funded Stream-DTT',
    'Video Ad-Funded Stream-XMT',
    'Video Premium Stream',
    'Video Premium Stream-DTT',
    'Video Premium Stream-XMT',
  ];
  if (mappings.includes(saleType)) {
    return true;
  }
};

const getSalesFileMappings = (client, callback) => {
  SalesFile.find({ clientId: client._id.toString() })
    .then((salesFiles) => {
      const salesFileMappings = {};
      salesFiles.forEach((salesFile) => {
        salesFileMappings[salesFile._id.toString()] = salesFile;
      });
      callback(null, salesFileMappings);
    })
    .catch(callback);
};

const getPayeeMappings = (client, callback) => {
  Payee.find({ clientId: client._id.toString() })
    .then((payees) => {
      const payeeIdMappings = {};
      payees.forEach((payee) => {
        payeeIdMappings[payee._id.toString()] = payee.foreignId;
      });
      callback(null, payeeIdMappings);
    })
    .catch(callback);
};

const getContractMappings = (client, payeeIdMappings, callback) => {
  Contract.find({ clientId: client._id.toString() })
    .then((contracts) => {
      const contractMappings = {};
      const contractNameMappings = {};
      const contractRoyaltyMappings = {};
      const contractCurrencyMappings = {};
      const payeeMappings = {};
      contracts.forEach((contract) => {
        contractMappings[contract._id.toString()] = contract.foreignId;
        contractNameMappings[contract._id.toString()] = contract.name;
        contractRoyaltyMappings[contract._id.toString()] = contract.salesTerms;
        contractCurrencyMappings[contract._id.toString()] = contract.currency;
        payeeMappings[contract._id.toString()] = payeeIdMappings[contract.payees?.[0]?.payeeId];
      });
      callback(null, { contractMappings, contractCurrencyMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings });
    })
    .catch(callback);
};

const getTrackMappings = (client, callback) => {
  Track.find({ clientId: client._id.toString() }, { isrc: 1, salesReturnsRights: 1 })
    .then((tracks) => {
      const trackMappings = {};
      tracks.forEach((track) => {
        const contractId = track.salesReturnsRights?.[0]?.contractId;
        trackMappings[track.isrc] = contractId;
      });
      callback(null, trackMappings);
    })
    .catch(callback);
};

const getReleaseMappings = (client, callback) => {
  Release.find({ clientId: client._id.toString() }, { isrc: 1, salesReturnsRights: 1 })
    .then((releases) => {
      const releaseMappings = {};
      releases.forEach((release) => {
        const contractId = release.salesReturnsRights?.[0]?.contractId;
        releaseMappings[release.barcode] = contractId;
      });
      callback(null, releaseMappings);
    })
    .catch(callback);
};

const getInactiveMappings = (client, payeeIdMappings, callback) => {
  Contract.find({ clientId: client._id.toString(), active: false })
    .then((contracts) => {
      const contractMappings = {};
      contracts.forEach((contract) => {
        contractMappings[contract._id.toString()] = contract._id.toString();
      });
      callback(null, contractMappings);
    })
    .catch(callback);
};

const getWHTMappings = (client, callback) => {
  // Get Withholding mappings from tracks and releases - any item that has the coding added to it
  const whtMappings = {};
  waterfall([
    (cb) => {
      Track.find({ clientId: client._id.toString(), foreignId: { $in: ['DTT', 'XMT'] } }, '_id isrc foreignId')
        .then((tracks) => {
          tracks.forEach((track) => {
            whtMappings[track.isrc] = track.foreignId;
          });
          cb();
        })
        .catch((err) => {
          logger.error('Platoon: Error finding tracks', { error: err.message });
          callback();
        });
    },
    (cb) => {
      Release.find({ clientId: client._id.toString(), foreignId: { $in: ['DTT', 'XMT'] } }, '_id release foreignId')
        .then((releases) => {
          releases.forEach((release) => {
            whtMappings[release.barcode] = release.foreignId;
          });
          cb();
        })
        .catch((err) => {
          logger.error('Platoon: Error finding releases', { error: err.message });
          callback();
        });
    },
  ], (err) => {
    callback(err, whtMappings);
  });
};

const getDjMixContractIds = (client, callback) => {
  let output = [];
  Contract.find({ clientId: client._id.toString(), projectId: 'DJ Mix' }, '_id')
    .then((contracts) => {
      if (contracts) {
        output = contracts.map((contract) => contract._id.toString());
      }
      callback(null, output);
    })
    .catch((err) => {
      logger.error('Platoon: Error finding contracts', { error: err.message });
      callback(err);
    });
};

const getOriginalCurrency = (description, itemOriginalCurrency) => {
  let output = itemOriginalCurrency;
  if (description) {
    const split = description.split('-');
    // Manage any negative numbers
    if (split[0] === '') {
      split[1] = `-${split[1]}`;
      split.shift();
    }
    // Always just grab the last element
    output = split[split.length - 1];
  }
  return output;
};

const getOriginalAmount = (description, itemNetAmount) => {
  let output = itemNetAmount;
  if (description) {
    const split = description.split('-');
    // Manage any negative numbers
    if (split[0] === '') {
      split[1] = `-${split[1]}`;
      split.shift();
    }
    // Manage for any scentific notation
    if (split[0].includes('e')) {
      split[0] = parseFloat(`${split[0]}-${split[1]}`);
    }
    output = split[0];
    // Rescue for missing values
    if (output === 'null') {
      output = 0;
    }
  }
  return output;
};

const exportQueryToFile = (bigQuery, query, processDataRow, isUnreported, callback) => {
  const bucketName = process.env.GCS_OUTPUT_SALES_EXPORT ?? 'output-sales-exports';
  // Add a random component to ensure uniqueness even when triggered at the same time
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const filename = `platoon-${moment().format('x')}-${randomSuffix}-export-`;
  const gsPath = `gs://${bucketName}/${filename}*.json`;
  const exportQuery = `EXPORT DATA OPTIONS( uri='${gsPath}', overwrite=true, format='JSON') AS ${query}`;

  const MAX_RETRIES = 3;
  const INITIAL_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  let retryCount = 0;

  const executeQuery = () => {
    // Increase timeout to 2 hours to handle larger datasets
    const timeout = setTimeout(() => {
      logger.error('Platoon: exportQueryToFile timed out', {
        retryCount,
        maxRetries: MAX_RETRIES,
        timeout: INITIAL_TIMEOUT * (2 ** retryCount),
      });

      if (retryCount < MAX_RETRIES) {
        retryCount += 1;
        const backoffTime = INITIAL_TIMEOUT * (2 ** retryCount);
        logger.info('Platoon: Retrying exportQueryToFile', {
          retryCount,
          backoffTime: `${backoffTime / 1000 / 60} minutes`,
        });
        setTimeout(executeQuery, backoffTime);
      } else {
        callback(new Error(`exportQueryToFile timed out after ${MAX_RETRIES} retries`));
      }
    }, INITIAL_TIMEOUT * (2 ** retryCount)); // Exponential backoff

    logger.info('Platoon: Starting BigQuery export', {
      isUnreported,
      queryLength: query.length,
      retryCount,
      timeout: `${INITIAL_TIMEOUT * (2 ** retryCount) / 1000 / 60} minutes`,
    });

    // Add progress tracking
    let lastProgressUpdate = Date.now();
    const progressInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - lastProgressUpdate) / 60000);
      if (elapsedMinutes >= 5) { // Log every 5 minutes
        logger.info(`Platoon: exportQueryToFile still running ${query.length}`, {
          elapsedMinutes: Math.floor((now - lastProgressUpdate) / 60000),
          isUnreported,
          retryCount,
        });
        lastProgressUpdate = now;
      }
    }, 60000); // Check every minute

    const labels = {
      job_type: 'platoon',
    };

    bigQuery.queryJobPromise({ query: exportQuery, labels })
      .then(async () => {
        clearInterval(progressInterval);
        clearTimeout(timeout);

        try {
          logger.info('Platoon: BigQuery export completed successfully', { retryCount });

          // Process files
          const authOptions = { credentials: { client_email: process.env.BQ_client_email, private_key: (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '' } };
          const storage = new Storage(authOptions);

          // List all files on the bucket - files get deleted after 24h so shouldn't be an issue.
          logger.info('Platoon: Retrieving files from storage bucket');
          const [files] = await storage.bucket(bucketName).getFiles();
          // Get files all wildcard files for this query
          const filesToProcess = files.filter((file) => file.name.includes(filename));
          logger.info(`Platoon: ${filesToProcess.length} files to process for export`);

          if (filesToProcess.length === 0) {
            clearTimeout(timeout);
            logger.error('Platoon: No files found to process after BigQuery export');
            return callback(new Error('No files found to process after BigQuery export'));
          }

          // Set up tracking arrays - note these are set as general on the query for use on unreported
          let unreportedOutput = [];
          let unreportedFailures = [];
          let unreportedUnreported = [];
          // Set up tracking arrays - note these are set as general on the query for use on unreported
          let output = [];
          let failures = [];
          let unreported = [];
          let completedFiles = 0;
          let processedRows = 0;
          let errorRows = 0;
          // Set limit no, doing unreported in series to be able to after the line count exceeds 300k, rather than every file
          const limitNo = isUnreported ? 1 : 5;

          // Reset progress tracking for file processing
          const batchPrefix = filesToProcess.length > 0 ? filesToProcess[0].name.split('-export-')[0] : 'unknown';
          lastProgressUpdate = Date.now();
          const fileProgressInterval = setInterval(() => {
            const now = Date.now();
            const elapsedMinutes = Math.floor((now - lastProgressUpdate) / 60000);
            if (elapsedMinutes >= 5) { // Log every 5 minutes
              logger.info('Platoon: Still processing files', {
                batchPrefix,
                elapsedMinutes: Math.floor((now - lastProgressUpdate) / 60000),
                completedFiles,
                totalFiles: filesToProcess.length,
                processedRows,
                errorRows,
              });
              lastProgressUpdate = now;
            }
          }, 60000); // Check every minute

          // Loop through each file and add lines to the CSV
          eachLimit(filesToProcess, limitNo, (file, fileCb) => {
            logger.info(`Platoon: Processing file: ${file.name}`);
            const destination = `${appRootDir}/tmp/${file.name}`;
            const options = { destination };

            let hasCalledCallback = false;
            const safeCallback = (err) => {
              if (!hasCalledCallback) {
                hasCalledCallback = true;
                fileCb(err);
              }
            };

            const MAX_FILE_RETRIES = 5;
            let fileRetryCount = 0;

            const fileStartTime = Date.now();

            const processFile = () => {
              let readStream = null;
              let settled = false;

              const onDownloadError = (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(downloadTimeout);
                if (readStream) readStream.destroy();
                logger.error('Platoon: Error downloading file from storage', {
                  file: file.name,
                  error: err.message,
                  retryCount: fileRetryCount,
                });
                if (fileRetryCount < MAX_FILE_RETRIES) {
                  fileRetryCount += 1;
                  const backoffTime = 5000 * (2 ** fileRetryCount); // 5s, 10s, 20s
                  logger.info('Platoon: Retrying file download', {
                    file: file.name,
                    retryCount: fileRetryCount,
                    backoffTime: `${backoffTime / 1000} seconds`,
                  });
                  setTimeout(processFile, backoffTime);
                  return;
                }
                safeCallback(err);
              };

              const downloadTimeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                const timeoutErr = new Error('File download timed out after 15 minutes');
                logger.error('Platoon: File download timed out', { file: file.name, retryCount: fileRetryCount });
                if (readStream) readStream.destroy();
                if (fileRetryCount < MAX_FILE_RETRIES) {
                  fileRetryCount += 1;
                  const backoffTime = 5000 * (2 ** fileRetryCount);
                  logger.info('Platoon: Retrying file download', { file: file.name, retryCount: fileRetryCount, backoffTime: `${backoffTime / 1000} seconds` });
                  setTimeout(processFile, backoffTime);
                } else {
                  safeCallback(timeoutErr);
                }
              }, 15 * 60 * 1000);

              const writeStream = fs.createWriteStream(destination);
              readStream = storage.bucket(bucketName).file(`${file.name}`).createReadStream();
              readStream.on('error', onDownloadError);
              writeStream.on('error', onDownloadError);
              writeStream.on('finish', () => {
                if (settled) return;
                settled = true;
                clearTimeout(downloadTimeout);

                try {
                  // Synchronous file reading
                  const fileContent = fs.readFileSync(destination, 'utf8');
                  const lines = fileContent.split('\n');

                  let fileProcessedRows = 0;
                  let fileErrorRows = 0;
                  let hasError = false;

                  // Process each line synchronously
                  for (let i = 0; i < lines.length; i += 1) {
                    const row = lines[i];

                    // Skip eslint no-continue
                    /* eslint-disable no-continue */
                    if (!row.trim()) continue; // Skip empty lines

                    if (hasError) break; // Stop processing if we've already encountered an error

                    let line;
                    try {
                      line = JSON.parse(row);
                      fileProcessedRows += 1;
                      processedRows += 1;
                    } catch (e) {
                      logger.error('Platoon: Row failed to convert to JSON', {
                        error: e.message,
                        row: `${row.substring(0, 100)}...`,
                        retryCount: fileRetryCount,
                      });
                      fileErrorRows += 1;
                      errorRows += 1;
                      hasError = true;
                      break;
                    }

                    try {
                      // Modification to the arrays that are being sent into the function
                      // BigQuery returns a lot of files back from the unreported query
                      // Expectation is there never would be many unreported lines, as Platoon always clear these out
                      if (isUnreported && line) {
                        processDataRow(line, unreportedOutput, unreportedFailures, unreportedUnreported);
                      } else if (line) {
                        processDataRow(line, output, failures, unreported);
                      }
                    } catch (processErr) {
                      logger.error('Platoon: Error processing row', {
                        error: processErr.message,
                        row: `${JSON.stringify(line).substring(0, 100)}...`,
                        retryCount: fileRetryCount,
                      });
                      fileErrorRows += 1;
                      errorRows += 1;
                      hasError = true;
                      break;
                    }
                  }

                  completedFiles += 1;

                  // Clean up the file regardless of success or failure
                  try {
                    if (fs.existsSync(destination)) {
                      fs.unlinkSync(destination);
                    }
                  } catch (unlinkErr) {
                    logger.error('Platoon: Error removing temporary file', {
                      file: destination,
                      error: unlinkErr.message,
                      retryCount: fileRetryCount,
                    });
                  }

                  // Trigger file writing for each standard file, or when output is 300k, or is the last file in the group
                  if ((!isUnreported && output.length > 295000) || (!isUnreported && completedFiles === filesToProcess.length)) {
                    // Write files to output
                    waterfall([
                      (cb) => {
                        const outputToWrite = [...output];
                        output = [];
                        writeFile(outputToWrite, cb);
                      },
                      (cb) => {
                        const failureToWrite = [...failures];
                        failures = [];
                        writeFailure(failureToWrite, cb);
                      },
                      (cb) => {
                        const unreportedToWrite = [...unreported];
                        unreported = [];
                        writeUnreported(unreportedToWrite, cb);
                      },
                    ], (err) => {
                      if (err) {
                        logger.error('Platoon: Error writing output files', {
                          error: err.message,
                          retryCount: fileRetryCount,
                        });
                        return safeCallback(err);
                      }
                      safeCallback();
                    });
                  } else if (unreportedOutput.length >= 295000) {
                    // Write files to output
                    waterfall([
                      (cb) => {
                        writeFile(unreportedOutput, cb);
                      },
                      (cb) => {
                        writeFailure(unreportedFailures, cb);
                      },
                      (cb) => {
                        writeUnreported(unreportedUnreported, cb);
                      },
                    ], (err) => {
                      if (err) {
                        logger.error('Platoon: Error writing unreported output files', {
                          error: err.message,
                          retryCount: fileRetryCount,
                        });
                        return safeCallback(err);
                      }
                      // Reset batch
                      unreportedOutput = [];
                      unreportedFailures = [];
                      unreportedUnreported = [];
                      safeCallback();
                    });
                  } else {
                    safeCallback();
                  }
                } catch (readErr) {
                  logger.error('Platoon: Error reading file synchronously', {
                    file: file.name,
                    error: readErr.message,
                    retryCount: fileRetryCount,
                  });

                  if (fileRetryCount < MAX_FILE_RETRIES) {
                    fileRetryCount += 1;
                    const backoffTime = 5000 * (2 ** fileRetryCount); // 5s, 10s, 20s
                    logger.info('Platoon: Retrying file read', {
                      file: file.name,
                      retryCount: fileRetryCount,
                      backoffTime: `${backoffTime / 1000} seconds`,
                    });
                    setTimeout(processFile, backoffTime);
                    return;
                  }
                  safeCallback(readErr);
                }
              });

              readStream.pipe(writeStream);
            };

            processFile();
          }, (err) => {
            clearInterval(fileProgressInterval);

            if (err) {
              clearTimeout(timeout);
              logger.error('Platoon: Error processing files', { error: err.message });
              return callback(err);
            }

            logger.info('Platoon: All files processed successfully', {
              processedRows,
              errorRows,
              outputLength: isUnreported ? unreportedOutput.length : output.length,
              failuresLength: isUnreported ? unreportedFailures.length : failures.length,
              unreportedLength: isUnreported ? unreportedUnreported.length : unreported.length,
            });

            // Only write files when it's unreported
            if (isUnreported) {
              // Write files to output
              waterfall([
                (cb) => {
                  writeFile(unreportedOutput, cb);
                },
                (cb) => {
                  writeFailure(unreportedFailures, cb);
                },
                (cb) => {
                  writeUnreported(unreportedUnreported, cb);
                },
              ], (err) => {
                clearTimeout(timeout);
                if (err) {
                  logger.error('Platoon: Error writing final unreported files', { error: err.message });
                  return callback(err);
                }
                // Reset batch
                unreportedOutput = [];
                unreportedFailures = [];
                unreportedUnreported = [];
                callback();
              });
            } else {
              // For non-unreported files, we need to write any remaining data
              if (output.length > 0 || failures.length > 0 || unreported.length > 0) {
                logger.info('Platoon: Writing additional files with additional data');
                waterfall([
                  (cb) => {
                    logger.info('Platoon: Write File');
                    writeFile(output, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Write Failure');
                    writeFailure(failures, cb);
                  },
                  (cb) => {
                    logger.info('Platoon: Write Unreported');
                    writeUnreported(unreported, cb);
                  },
                ], (err) => {
                  logger.info('Platoon: Completed writing additional files');
                  clearTimeout(timeout);
                  if (err) {
                    logger.error('Platoon: Error writing final files', { error: err.message });
                    return callback(err);
                  }
                  logger.info('Platoon: Completed batch successfully writing additional files');
                  callback();
                });
              } else {
                logger.info('Platoon: Completed batch successfully');
                clearTimeout(timeout);
                callback();
              }
            }
          });
        } catch (err) {
          clearTimeout(timeout);
          logger.error('Platoon: Unexpected error in exportQueryToFile', { error: err.message, stack: err.stack });
          callback(err);
        }
      })
      .catch((err) => {
        clearInterval(progressInterval);
        clearTimeout(timeout);
        logger.error('Platoon: BigQuery export error', {
          error: err.message,
          stack: err.stack,
          retryCount,
        });

        if (retryCount < MAX_RETRIES) {
          retryCount += 1;
          const backoffTime = INITIAL_TIMEOUT * (2 ** retryCount);
          logger.info('Platoon: Retrying exportQueryToFile after error', {
            retryCount,
            backoffTime: `${backoffTime / 1000 / 60} minutes`,
            error: err.message,
          });
          setTimeout(executeQuery, backoffTime);
        } else {
          return callback(err);
        }
      });
  };

  executeQuery();
};

const processUnreportedFile = async (filePath, lineCount, newUnreportedFile, contractNameReverseMappings, trackMappings, releaseMappings, contractMappings, payeeIdMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings, lineOptions, fileCb) => {
  let pause = false;
  const instream = fs.createReadStream(filePath);
  const outstream = new Stream();
  const rl = readline.createInterface(instream, outstream);

  const updateUnreportedData = async (originalLine) => {
    if (pause) {
      // Wait for 2 seconds and recall same function
      logger.info('Platoon: Process is paused whilst writing');
      return setTimeout(async () => {
        await updateUnreportedData(originalLine);
      }, 2000);
    }
    // Add original line to new unreported file
    newUnreportedFile.push(originalLine.join('|'));
    if (newUnreportedFile.length > 300000) {
      // pause the stream
      pause = true;
      rl.pause();
      await writeUnreportedFile(newUnreportedFile);
      newUnreportedFile = [];
      // restart the stream
      pause = false;
      rl.resume();
    }
  };

  rl.on('line', async (row) => {
    lineCount += 1;
    // Log out if line is divisible by 1000
    if (lineCount % 1000 === 0) {
      logger.info(`Platoon: Processing Unreported Line ${lineCount}`);
    }
    const line = row.split('|');
    const originalLine = [...line];
    if (line[15] === 'UNREPORTED') {
      // Validate data structure first
      if (!line[1] || !line[19] || !line[20]) {
        logger.error('Platoon: Invalid line structure for unreported line', {
          lineId: line[0],
          isrc: line[1],
          contractName: line[19],
          type: line[20],
          linePreview: line.slice(0, 5),
        });
        await updateUnreportedData(originalLine);
        return;
      }

      // Get contractId with enhanced logging
      const contractId = unreportedMapContract(line, trackMappings, releaseMappings, contractNameReverseMappings);

      if (!contractId) {
        logger.error('Platoon: No contract mapping found for unreported line', {
          lineId: line[0],
          isrc: line[1],
          contractName: line[19],
          type: line[20],
          trackMapping: trackMappings[line[1]] ? 'found' : 'missing',
          releaseMapping: releaseMappings[line[1]] ? 'found' : 'missing',
          contractMapping: contractNameReverseMappings[line[19]] ? 'found' : 'missing',
          linePreview: line.slice(0, 5),
        });
        await updateUnreportedData(originalLine);
        return;
      }

      const payeeId = payeeMappings[contractId];
      const contractName = contractNameMappings[contractId];
      const contractRoyalty = contractRoyaltyMappings[contractId]?.[0]?.rate;
      const contractForeignId = contractMappings[contractId];

      // Validate that we have all required data
      if (!payeeId || !contractName || !contractRoyalty || !contractForeignId) {
        logger.error('Platoon: Incomplete contract data for mapped contract', {
          lineId: line[0],
          contractId,
          payeeId: payeeId || 'missing',
          contractName: contractName || 'missing',
          contractRoyalty: contractRoyalty || 'missing',
          contractForeignId: contractForeignId || 'missing',
        });
        await updateUnreportedData(originalLine);
        return;
      }

      const calculatedRoyalty = parseFloat(line[3]) * (parseFloat(contractRoyalty) / 100);

      // Validate calculated royalty
      if (Number.isNaN(calculatedRoyalty) || !Number.isFinite(calculatedRoyalty)) {
        logger.error('Platoon: Invalid calculated royalty', {
          lineId: line[0],
          contractId,
          originalAmount: line[3],
          contractRoyalty,
          calculatedRoyalty,
        });
        await updateUnreportedData(originalLine);
        return;
      }

      // Change values on line
      line[0] = `${line[0]}-REREPORT`;
      line[15] = contractForeignId;
      line[14] = payeeId;
      line[19] = contractName;

      // Preserve existing royalty rate if it exists (including 0)
      if (!line[7] || line[7] === '') {
        line[7] = contractRoyalty;
      }

      // Calculate royalty amount using the existing royalty rate from the data
      const existingRoyaltyRate = line[7] ? parseFloat(line[7]) : parseFloat(contractRoyalty);
      const recalculatedRoyalty = parseFloat(line[3]) * (existingRoyaltyRate / 100);
      line[9] = formatFloat(recalculatedRoyalty);

      line[3] = 0;
      line[5] = 0;

      // Enhanced validation with detailed logging
      const isValidLine = validateLine(line);
      const hasValidRoyalty = recalculatedRoyalty > 0;

      if (!isValidLine) {
        logger.error('Platoon: Line validation failed for unreported line', {
          lineId: line[0],
          contractId,
          calculatedRoyalty,
          linePreview: line.slice(0, 5),
          validationDetails: {
            salesLineId: !!line[0],
            transactionCurrency: !!line[2],
            receivedCurrency: !!line[4],
            royaltyCurrency: !!line[8],
            territory: !!line[11],
            contractId: !!line[15],
            artistId: line[14] ? `${line[14].length} chars` : 'missing',
          },
        });
        await updateUnreportedData(originalLine);
        return;
      }

      if (!hasValidRoyalty) {
        logger.error('Platoon: Invalid royalty amount for unreported line', {
          lineId: line[0],
          contractId,
          recalculatedRoyalty,
          originalAmount: originalLine[3],
        });
        await updateUnreportedData(originalLine);
        return;
      }

      if (isValidLine && hasValidRoyalty) {
        // Add line to output
        lineOptions.output.push(line.join('|'));
        // Copy reported line
        const copyReportedLine = [...line];
        // Set values to original line values
        copyReportedLine[3] = originalLine[3];
        copyReportedLine[5] = originalLine[5];
        lineOptions.originalUnreportedLines.push(copyReportedLine.join('|'));
        // Add values to the summary
        lineOptions.summary.lines += 1;
        lineOptions.summary.transaction[line[2]] = lineOptions.summary.transaction[line[2]] || 0;
        lineOptions.summary.transaction[line[2]] += parseFloat(line[3]);
        lineOptions.summary.received[line[4]] = lineOptions.summary.received[line[4]] || 0;
        lineOptions.summary.received[line[4]] += parseFloat(line[5]);
        lineOptions.summary.royalty[line[8]] = lineOptions.summary.royalty[line[8]] || 0;
        lineOptions.summary.royalty[line[8]] += parseFloat(calculatedRoyalty);
        // Add values to the rereport summary
        lineOptions.rereportSummary.lines += 1;
        lineOptions.rereportSummary.transaction[line[2]] = lineOptions.rereportSummary.transaction[line[2]] || 0;
        lineOptions.rereportSummary.transaction[line[2]] += parseFloat(line[3]);
        lineOptions.rereportSummary.received[line[4]] = lineOptions.rereportSummary.received[line[4]] || 0;
        lineOptions.rereportSummary.received[line[4]] += parseFloat(line[5]);
        lineOptions.rereportSummary.royalty[line[8]] = lineOptions.rereportSummary.royalty[line[8]] || 0;
        lineOptions.rereportSummary.royalty[line[8]] += parseFloat(calculatedRoyalty);
        // Update DSP Summary
        updateDspSummary(lineOptions.perDspSummary, line);
        // Add source to array
        if (!lineOptions.reportedSources.includes(line[13])) {
          lineOptions.reportedSources.push(line[13]);
        }
      } else {
        await updateUnreportedData(originalLine);
      }
    } else {
      // Add original line to new unreported file
      await updateUnreportedData(originalLine);
    }
  });

  rl.on('error', (err) => {
    logger.error(err);
  });

  rl.on('close', () => {
    fileCb();
  });
};

const previousUnreportSalesProcess = async (period, trackMappings, releaseMappings, contractMappings, payeeIdMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings, lineOptions, callback) => {
  logger.info('Platoon: Starting Unreported Sales Process');
  lineOptions.rereportSummary = { lines: 0, transaction: {}, received: {}, royalty: {} };
  // Get the unreported files - is likely to only be one now, but allowing for multiple files if we need to pull together
  const files = await getUnreportedFiles(period);
  const newUnreportedFile = [];
  const unreportedData = [];
  const contractNameReverseMappings = _.invert(contractNameMappings);

  // Note: New unreported files from current run will be processed after all previous files
  // Loop through each file and add lines to the array
  eachLimit(files, 1, (file, fileCb) => {
    // Determine if this is a local file or S3 file
    const isLocalFile = file.startsWith('/') || file.includes('tmp/');
    const lineCount = 0;

    if (isLocalFile) {
      logger.info(`Platoon: Processing local unreported file ${file}`);
      processUnreportedFile(file, lineCount, newUnreportedFile, contractNameReverseMappings, trackMappings, releaseMappings, contractMappings, payeeIdMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings, lineOptions, fileCb);
    } else {
      logger.info(`Platoon: Downloading previous unreported file ${file}`);
      fileManager.downloadFromS3(file, process.env.S3_bucket, async (err, localFile) => {
        if (err) {
          logger.error('Platoon: Error downloading file from S3', { file, error: err.message });
          return fileCb(err);
        }
        processUnreportedFile(localFile, lineCount, newUnreportedFile, contractNameReverseMappings, trackMappings, releaseMappings, contractMappings, payeeIdMappings, payeeMappings, contractNameMappings, contractRoyaltyMappings, lineOptions, fileCb);
      });
    }
  }, async () => {
    // Process CSV lines
    // Write new unreported file
    logger.info('Platoon: Processing Summary:', {
      totalLinesProcessed: lineOptions.rereportSummary.lines,
      linesReported: lineOptions.rereportSummary.lines,
      linesRemainingUnreported: newUnreportedFile.length,
      summary: {
        transactionCurrencies: Object.keys(lineOptions.rereportSummary.transaction),
        receivedCurrencies: Object.keys(lineOptions.rereportSummary.received),
        royaltyCurrencies: Object.keys(lineOptions.rereportSummary.royalty),
      },
    });

    logger.info('Platoon: Completed running through unreported file');

    // Add new unreported lines from current run to the final unreported file (without processing them)
    if (lineOptions.newUnreportedFiles && lineOptions.newUnreportedFiles.length > 0) {
      logger.info(`Platoon: Adding ${lineOptions.newUnreportedFiles.length} new unreported files to final unreported file`);

      // Simply append the content of new unreported files to the final unreported file
      for (const file of lineOptions.newUnreportedFiles) {
        try {
          const fileContent = fs.readFileSync(file, 'utf8');
          const lines = fileContent.split('\n').filter((line) => line.trim()); // Remove empty lines
          newUnreportedFile.push(...lines);
          logger.info(`Platoon: Added ${lines.length} lines from ${file}`);
        } catch (err) {
          logger.error('Platoon: Error reading new unreported file', { file, error: err.message });
        }
      }
    }

    await writeAndUploadNewUnreported(newUnreportedFile, period);
    callback();
  });
};

const unreportedMapContract = (line, trackMappings, releaseMappings, contractNameReverseMappings) => {
  let output = null;
  const isrc = line[1];
  const contractName = line[19];
  const type = line[20];

  // First priority: If we have a contract name, try to use it (preserves original contract assignment)
  if (contractName) {
    if (contractNameReverseMappings[contractName]) {
      output = contractNameReverseMappings[contractName];
      logger.info('Platoon: Using existing contract name mapping', {
        type,
        isrc,
        contractName,
        contractId: output,
        mappingMethod: 'contractName',
      });
    } else {
      logger.info('Platoon: Contract name exists but not found in mappings - staying unreported', {
        type,
        isrc,
        contractName,
        mappingMethod: 'contractNameNotFound',
      });
      // Don't use ISRC-based mapping when we have a contract name, even if it's not found
      return null;
    }
  }
  // Second priority: Primary mapping based on type (only if no contract name found)
  else if (type === 'Track') {
    output = trackMappings[isrc];
    if (output) {
      logger.info('Platoon: Using Track ISRC mapping (no contract name)', {
        type,
        isrc,
        contractName,
        contractId: output,
        mappingMethod: 'trackISRC',
      });
    }
  } else if (type === 'Release') {
    output = releaseMappings[isrc];
    if (output) {
      logger.info('Platoon: Using Release ISRC mapping (no contract name)', {
        type,
        isrc,
        contractName,
        contractId: output,
        mappingMethod: 'releaseISRC',
      });
    }
  } else if (type === 'Contract') {
    output = contractNameReverseMappings[contractName];
  }

  // Fallback logic: try all methods if primary method fails
  if (!output) {
    logger.info('Platoon: Primary mapping failed, trying fallback methods', {
      type,
      isrc,
      contractName,
      trackMapping: trackMappings[isrc] ? 'available' : 'missing',
      releaseMapping: releaseMappings[isrc] ? 'available' : 'missing',
      contractMapping: contractNameReverseMappings[contractName] ? 'available' : 'missing',
    });

    // If we have a contract name, only try contract name mapping in fallback
    // Otherwise, try all mapping methods
    if (contractName) {
      output = contractNameReverseMappings[contractName];
      if (output) {
        logger.info('Platoon: Fallback contract name mapping successful', {
          type,
          isrc,
          contractName,
          foundVia: 'contractName',
        });
      }
    } else {
      // Try all mapping methods as fallback only if no contract name exists
      output = trackMappings[isrc] || releaseMappings[isrc] || contractNameReverseMappings[contractName];

      if (output) {
        let foundVia = 'contract';
        if (trackMappings[isrc]) {
          foundVia = 'track';
        } else if (releaseMappings[isrc]) {
          foundVia = 'release';
        }
        logger.info('Platoon: Fallback mapping successful', {
          type,
          isrc,
          contractName,
          foundVia,
        });
      }
    }
  }

  return output;
};

const getUnreportedFiles = async (period) => {
  // Check if period has a file already (for when rereporting, and using the same file each time)
  if (!period.platoon.unreportedFileUsed) {
    // Get the last unreported file output on a prior period
    const periods = await Period.find({ clientId: period.clientId, _id: { $ne: period._id } }).sort({ 'platoon.unreportedFileCreated': -1 }).limit(1);
    if (periods[0]) {
      logger.info(`Platoon: Setting previous unreported file ${periods[0].platoon.unreportedFileOutput}`);
      period.platoon.unreportedFileUsed = periods[0].platoon.unreportedFileOutput;
    }
  }
  return [period.platoon.unreportedFileUsed].filter(Boolean);
};

const writeAndUploadNewUnreported = async (unreportedData, period) => new Promise((resolve, reject) => {
  if (unreportedData && unreportedData.length !== 0) {
    // Write new unreported file
    fs.appendFileSync(unreportedFileLocation, unreportedData.join('\n'));
    // Upload to S3
    logger.info(`Platoon: Uploading new unreported file ${unreportedFileLocation}`);
    fileManager.uploadToS3(`Platoon/Unreported/${path.basename(unreportedFileLocation)}`, unreportedFileLocation, (err, key) => {
      if (key) {
        period.platoon.unreportedFileCreated = new Date();
        period.platoon.unreportedFileOutput = key;
        resolve(key);
      } else {
        reject(err);
      }
    });
  }
});

const writeUnreportedFile = (unreportedData) => new Promise((resolve, reject) => {
  if (unreportedData && unreportedData.length !== 0) {
    logger.info(`Platoon: Writing Unreported File ${unreportedFileLocation}`);
    fs.appendFile(unreportedFileLocation, unreportedData.join('\n'), () => {
      resolve();
    });
  } else {
    resolve();
  }
});
