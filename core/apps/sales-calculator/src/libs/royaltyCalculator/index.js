/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-inner-declarations, no-mixed-operators */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * @typedef {Object} RoyaltyCalculator
 * @property {Object} bigQuery - BigQuery instance
 * @property {Object} contract - Contract object
 * @property {Object} filter - Filter object
 * @property {string} periodId - Period ID
 * @property {string} periodEndDate - Period end date
 * @property {string} periodType - Period type
 * @property {Object} clientCurrencies - Client currencies object
 * @property {Object} escalationContract - Escalation contract object
 * @property {Array} exchangeRates - Exchange rates array
 * @property {Array} escalationEquivalents - Escalation equivalents array
 * @property {Object} statRates - Statutory rates object
 * @property {boolean} singleSalesTerm - Single sales term flag
 * @property {string} batchTaskId - Batch task ID
 * @property {Array} outputLines - Output lines array
 * @property {Array} allowedFields - Allowed fields array
 * @property {Object} fieldTypes - Field types object
 * @property {string} homeCurrency - Home currency
 * @property {number} contractExchangeRate - Contract exchange rate
 * @property {Function} calculate - Calculate function
 * @property {Function} setupEscalations - Setup escalations function
 * @property {Function} createFilterAndCalculations - Create filter and calculations function
 * @property {Function} salesTermsToObject - Sales terms to object function
 * @property {Function} processSalesData - Process sales data function
 * @property {Function} calculateRoyalties - Calculate royalties function
 * @property {Function} processSalesLine - Process sales line function
 */

const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { ObjectId } = require('mongodb');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const fs = require('fs');
const _ = require('lodash');
const readline = require('readline');
const GoogleStorage = require('../googleStorage');
const Escalation = require('../../models/escalation');
const Period = require('../../models/period');

/**
 * Royalty Calculator function
 * @param {Object} params - Parameters object
 * @param {Object} params.contract - The contract object
 * @param {Object} params.client - The client object
 * @param {Object} params.period - The period object
 * @param {Object} params.clientCurrencies - Client currencies object
 * @param {Object} params.batchTask - Batch task object
 * @param {string} params.salesDataFile - Sales data file name
 * @param {string} params.salesDataBucket - Sales data bucket name
 * @param {Object} params.escalationContract - Escalation contract object
 * @param {boolean} [params.fromLambda=false] - Whether running from Lambda
 * @returns {RoyaltyCalculator} RoyaltyCalculator instance
 * @type {function(Object): RoyaltyCalculator}
 */
module.exports = function ({ contract, client, period, clientCurrencies, batchTask, salesDataFile, salesDataBucket, escalationContract, fromLambda = false }) {
  const RoyaltyCalculator = this;

  RoyaltyCalculator.bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  RoyaltyCalculator.contract = contract;
  RoyaltyCalculator.filter = { status: 'Complete' };
  RoyaltyCalculator.periodId = period._id.toString();
  RoyaltyCalculator.periodEndDate = period.endDate;
  RoyaltyCalculator.periodType = contract.contractType;
  RoyaltyCalculator.clientCurrencies = clientCurrencies;
  RoyaltyCalculator.escalationContract = escalationContract;
  RoyaltyCalculator.exchangeRates = period.currencyExchangeRates;
  RoyaltyCalculator.escalationEquivalents = contract.escalationEquivalents || [];
  RoyaltyCalculator.statRates = { usStatRates: client.usStatRates, caStatRates: client.caStatRates };
  RoyaltyCalculator.singleSalesTerm = false;
  RoyaltyCalculator.batchTaskId = batchTask._id.toString();
  RoyaltyCalculator.outputLines = [];
  let linesWrittenToFile = 0;
  // Set allowed keys for DB
  RoyaltyCalculator.allowedFields = RoyaltyCalculator.bigQuery.outputSchema.map((item) => {
    if (item.mode !== 'REPEATED') {
      return item.name;
    }
  }).filter(Boolean);
  // Set Data Types
  const fieldTypes = {};
  RoyaltyCalculator.bigQuery.outputSchema.forEach((field) => { fieldTypes[field.name] = field.type; });
  RoyaltyCalculator.fieldTypes = fieldTypes;

  Object.keys(clientCurrencies).forEach((key) => {
    if (clientCurrencies[key] === 'homeCurrency') {
      RoyaltyCalculator.homeCurrency = key;
    }
  });

  // Get Exchange Rate
  RoyaltyCalculator.contractExchangeRate = RoyaltyCalculator.contract.terms.contractCurrency === 'Home Currency' ? 1 : 0;
  RoyaltyCalculator.exchangeRates.forEach((ex) => {
    if (ex && (ex.from === 'Home Currency' || ex.from === RoyaltyCalculator.homeCurrency) && ex.to === RoyaltyCalculator.contract.terms.contractCurrency) {
      RoyaltyCalculator.contractExchangeRate = ex.rate;
    }
  });

  RoyaltyCalculator.calculate = async function (callback) {
    const { periodId } = this;

    // Get calculation sales data from Google Storage
    RoyaltyCalculator.salesData = [];
    // Get sales data from Google Storage
    // Run the calculation
    async.waterfall([
      function (cb) {
        // Setup BigQuery file manually as Lambda doesn't allow writing to local tmp directory
        const filename = fromLambda ? `/tmp/${moment().format('X')}.json` : `${appRootDir}/tmp/${moment().format('X')}.json`;
        fs.writeFileSync(filename, '');
        RoyaltyCalculator.bigQuery.fileLocation = filename;
        cb();
      },
      function (cb) {
        // Setup Escalation Contract
        RoyaltyCalculator.setupEscalations(cb);
      },
      function (cb) {
        // Create objects for filtering and calculating royalties - should order in most specific to least specific
        RoyaltyCalculator.createFilterAndCalculations((err, specificFilters) => {
          if (err) {
            logger.error(`${periodId} createFilterAndCalculations Errored:`, err);
            callback(err);
          } else {
            // Setup sales filter object
            const salesTermsObject = RoyaltyCalculator.salesTermsToObject(specificFilters.sales);
            if (specificFilters.sales.length === 1) {
              RoyaltyCalculator.singleSalesTerm = specificFilters.sales[0];
            }

            // Loop through sales data
            console.time(`${RoyaltyCalculator.contract.name} Sales Batch`);
            // The royalty calculator is not making any async calls, so we can use eachSeries as it will be similar in performance to eachLimit.
            // We also can't change it to eachLimit because we need to make sure we account for escalations. Running sales in parallel will mess with the tracking.
            // Instead of holding all the sales data in memory, we'll download it from GCS and process it line by line
            const localFilePath = fromLambda ? `/tmp/${batchTask._id.toString()}-${moment().format('x')}-sales_data.json` : `${appRootDir}/tmp/${batchTask._id.toString()}-${moment().format('x')}-sales_data.json`;
            const googleStorage = new GoogleStorage(salesDataBucket);
            googleStorage.downloadFile({ file: salesDataFile, destination: localFilePath })
              .then(() => {
                const file = fs.createReadStream(localFilePath);
                const rl = readline.createInterface({ input: file, crlfDelay: Infinity });
                rl.on('line', async (line) => { 
                  const salesLine = JSON.parse(line);
                  // When streaming data from BQ, null fields are returned as null, in JS null * number = 0
                  // When the data is exported to a file, null fields are not returned so they are undefined and undefined * number = NaN
                  // As a workaround, we need to convert undefined float fields to null to ensure calculations are correct
                  RoyaltyCalculator.bigQuery.inputSchema.forEach((field) => {
                    if (field.type === 'FLOAT' && salesLine[field.name] === undefined) {
                      salesLine[field.name] = null;
                    }
                  });

                  await new Promise((resolve, reject) => {
                    RoyaltyCalculator.runSalesLine(salesLine, salesTermsObject, specificFilters.deductions, specificFilters.withholdingTaxes, specificFilters.mechanicals, (err) => {
                      if (err) {
                        logger.error(`${periodId} - Batch ${RoyaltyCalculator.batchTaskId} - ${RoyaltyCalculator.contract.name} - Error processing sales line: ${err}`);
                        reject(err);
                      } else {
                        resolve();
                      }
                    });
                  });
                });
                rl.on('close', () => { 
                  logger.info(`${periodId} - Batch ${RoyaltyCalculator.batchTaskId} - ${RoyaltyCalculator.contract.name} - ${RoyaltyCalculator.salesData.length} sales data lines loaded from file`);
                  console.timeEnd(`${RoyaltyCalculator.contract.name} Sales Batch`);
                  fs.unlinkSync(localFilePath);
                  cb();
                });
              })
              .catch((err) => {
                cb(err);
              });
          }
        });
      },
      function (cb) {
        // Write file
        if (RoyaltyCalculator.outputLines.length > 0) {
          console.time(`${RoyaltyCalculator.contract.name} Writing to File`);
          RoyaltyCalculator.bigQuery.writeToFile(RoyaltyCalculator.outputLines, RoyaltyCalculator.bigQuery.outputTable, (err) => {
            logger.info(`${periodId} Completed Writing ${RoyaltyCalculator.contract.name} - Total Lines: ${RoyaltyCalculator.outputLines.length + linesWrittenToFile}`);
            console.timeEnd(`${RoyaltyCalculator.contract.name} Writing to File`);
            cb(err);
          });
        } else {
          cb();
        }
      },
      function (cb) {
        // Write any changes to the escalations back to the DB
        RoyaltyCalculator.writeEscalations(cb);
      },
      function (cb) {
        RoyaltyCalculator.bigQuery.writeFileToDb(RoyaltyCalculator.bigQuery.outputTable, cb);
      },
    ], async (err) => {
      if (err) {
        logger.error(`${periodId} Refactored Sales BatchCalculation Errored:`, err);
        // Update the batch task status
        const result = {status: 'Errored', error: err.message};
        callback(err, result);
      } else {
        logger.info(`${periodId} Refactored Sales Batch Calculation Completed`);
        // Update the batch task status
        const result = { 
          status: 'Complete',
          inputLines: RoyaltyCalculator.salesData.length,
          outputLines: RoyaltyCalculator.outputLines.length + linesWrittenToFile,
          escalationContract: RoyaltyCalculator.escalationContract,
        };
        callback(err, result);
      }
    });
  };

  RoyaltyCalculator.salesTermsToObject = function (terms) {
    // Takes tne sales terms as an array and turns it into an object that is easily navigated by distribution channel and config
    // Setup object
    const output = { default: {} };
    if (terms && Array.isArray(terms)) {
      terms.forEach((term, index) => {
        // Add index to terms for knowing the order later on
        term.index = index;
        const { filter } = term;
        // Check for channel in filter, else use default
        let channel = filter.distributionChannel ? filter.distributionChannel : 'default';
        // Check if object with $in - which states it's a term group
        channel = channel.$in ? channel.$in : channel;
        // Check for config in filter, else use default
        let config = filter.configuration ? filter.configuration : 'default';
        // Check if object with $in - which states it's a term group
        config = config.$in ? config.$in : config;
        // Check if cat groups are present, and store down all IDs for matching
        let catIds = [];
        if (filter.$or) {
          catIds = RoyaltyCalculator.getIdsFromCatGroups(filter.$or);
        }
        // Check if channel is an array - term groups are passed as arrays
        if (Array.isArray(channel)) {
          channel.forEach((channelItem) => {
            // Check channel exists or set as a blank object
            output[channelItem] = output[channelItem] || { default: { default: [] } };
            if (Array.isArray(config)) {
              config.forEach((configItem) => {
                // Check config exists or set as blank array
                output[channelItem][configItem] = output[channelItem][configItem] || { default: [] };
                // Check catIds exist
                if (catIds && catIds.length > 0) {
                  catIds.forEach((catId) => {
                    // Add each catId to the object
                    output[channelItem][configItem][catId] = output[channelItem][configItem][catId] || [];
                    output[channelItem][configItem][catId].push(term);
                  });
                } else {
                  // Add term to default cat item array
                  output[channelItem][configItem].default.push(term);
                }
              });
            } else {
              // Check config exists or set as blank array
              output[channelItem][config] = output[channelItem][config] || { default: [] };
              // Check catIds exist
              if (catIds && catIds.length > 0) {
                catIds.forEach((catId) => {
                  // Add each catId to the object
                  output[channelItem][config][catId] = output[channelItem][config][catId] || [];
                  output[channelItem][config][catId].push(term);
                });
              } else {
                // Add term to default cat item array
                output[channelItem][config].default.push(term);
              }
            }
          });
        } else {
          // Check channel exists or set as a blank object
          output[channel] = output[channel] || { default: { default: [] } };
          if (Array.isArray(config)) {
            config.forEach((configItem) => {
              // Check config exists or set as blank array
              output[channel][configItem] = output[channel][configItem] || { default: [] };
              // Check catIds exist
              if (catIds && catIds.length > 0) {
                catIds.forEach((catId) => {
                  // Add each catId to the object
                  output[channel][configItem][catId] = output[channel][configItem][catId] || [];
                  output[channel][configItem][catId].push(term);
                });
              } else {
                // Add term to default cat item array
                output[channel][configItem].default.push(term);
              }
            });
          } else {
            // Check config exists or set as blank array
            output[channel][config] = output[channel][config] || { default: [] };
            // Check catIds exist
            if (catIds && catIds.length > 0) {
              catIds.forEach((catId) => {
                // Add each catId to the object
                output[channel][config][catId] = output[channel][config][catId] || [];
                output[channel][config][catId].push(term);
              });
            } else {
              // Add term to default cat item array
              output[channel][config].default.push(term);
            }
          }
        }
      });
    }
    // Return object
    return output;
  };

  RoyaltyCalculator.getIdsFromCatGroups = function (catGroups) {
    // Expected input [{ catType: 'Release', releaseIds: [1, 2, 3] }, { catType: 'Track', trackIds: [1, 2, 3] }]
    let output = [];
    // Loops through the $or array, details
    if (Array.isArray(catGroups)) {
      catGroups.forEach((catGroup) => {
        if (catGroup?.releaseId) {
          output = output.concat(catGroup.releaseId.$in, []);
        }
        if (catGroup?.trackId) {
          output = output.concat(catGroup.trackId.$in, []);
        }
        if (catGroup?.workId) {
          output = output.concat(catGroup.workId.$in, []);
        }
      });
    }
    return output;
  };

  RoyaltyCalculator.createFilterAndCalculations = function (callback) {
    // Returns an object, sales and deductions, each with an array of terms, most specific first
    const RoyaltyCalculator = this;
    if (RoyaltyCalculator.contract && RoyaltyCalculator.contract.terms && RoyaltyCalculator.periodId && RoyaltyCalculator.filter) {
      // Organise terms ready for filtering
      const contract = RoyaltyCalculator.organiseTerms(RoyaltyCalculator.contract);
      const output = {};
      // Loop through sales
      async.parallel([
        function (cb) {
          RoyaltyCalculator.createSalesFilterAndCalculations(contract.terms.sales, contract.share, contract.releaseId, RoyaltyCalculator.periodId, RoyaltyCalculator.filter, false, (err, array) => {
            output.sales = array;
            cb();
          });
        },
        function (cb) {
          RoyaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.deductions, RoyaltyCalculator.periodId, RoyaltyCalculator.filter, (err, array) => {
            output.deductions = array;
            cb();
          });
        },
        function (cb) {
          RoyaltyCalculator.createDeductionsFilterAndCalculations(contract.terms.withholdingTaxes, RoyaltyCalculator.periodId, RoyaltyCalculator.filter, (err, array) => {
            output.withholdingTaxes = array;
            cb();
          });
        },
        function (cb) {
          RoyaltyCalculator.createSalesFilterAndCalculations(contract.terms.mechanicalContracts, contract.share, contract.releaseId, RoyaltyCalculator.periodId, RoyaltyCalculator.filter, true, (err, array) => {
            output.mechanicals = array;
            cb();
          });
        },
      ], () => {
        // logger.debug(util.inspect(output, false, null));
        callback(null, output);
      });
    } else {
      callback('Requires a contract with terms, a periodId and a filter');
    }
  };

  RoyaltyCalculator.createSalesFilterAndCalculations = function (sales, share, releaseId, periodId, filter, mechanicalContract, callback) {
    if (sales && periodId && filter) {
      // Creates an object for each passed sales term
      // Returns an array of the objects
      const RoyaltyCalculator = this;
      const output = [];
      async.eachSeries(sales, (sale, cb) => {
        const obj = RoyaltyCalculator.createSaleFilterAndCalculation(sale, share, releaseId, periodId, filter, mechanicalContract);
        output.push(obj);
        cb();
      }, () => {
        callback(null, output);
      });
    } else {
      callback('Requires sales, an objectPercentage, a periodId and a filter');
    }
  };

  RoyaltyCalculator.createSaleFilterAndCalculation = function (sale, share, releaseId, periodId, filter, mechanicalContract) {
    // Returns an object with a filter and calculation element - { filter: { salesFileId: $in: ["123", "234"], territory: "GB" }, calculation: { type: "Net Receipts", rate: 12, reserve: 50, unitRate: 12.45 } }
    return {
      filter: this.createFilter(sale, releaseId, periodId, filter, mechanicalContract),
      calculation: this.createSaleCalculation(sale, share),
      escalationTrackers: sale.escalationTrackers,
    };
  };

  RoyaltyCalculator.createFilter = function (object, releaseId, periodId, filter, mechanicalContract) {
    // logger.debug("Filter:", filter);
    const RoyaltyCalculator = this;
    if (filter) {
      // Set output object, blank if mechanical on a normal contract
      const output = mechanicalContract && RoyaltyCalculator.periodType !== 'Mechanical' ? {} : JSON.parse(JSON.stringify(filter));

      // Cat Type
      if (object.catType) { output.catType = object.catType; }
      // Catalogue Groups
      if ((object.catType === 'Release' || !object.catType) && object.releaseIds && object.releaseIds.length > 0) {
        output.$or = output.$or || [];
        output.$or.push({ catType: 'Release', releaseId: { $in: object.releaseIds } });
      }
      if ((object.catType === 'Track' || !object.catType) && object.trackIds && object.trackIds.length > 0) {
        output.$or = output.$or || [];
        output.$or.push({ catType: 'Track', trackId: { $in: object.trackIds } });
      }
      if ((object.catType === 'Work' || !object.catType) && object.workIds && object.workIds.length > 0) {
        output.$or = output.$or || [];
        output.$or.push({ catType: 'Work', workId: { $in: object.workIds } });
      }
      // Release Specific for a Track
      if (!mechanicalContract && RoyaltyCalculator.periodType !== 'Mechanical' && releaseId) { output.releaseId = releaseId; }
      // Cotnract Specific
      if (RoyaltyCalculator.type === 'Contract') {
        output.contractId = RoyaltyCalculator.contract.contractId;
      }
      // Territories
      if (Array.isArray(object.territory)) {
        output.territory = { $in: object.territory };
      } else if (object.territory && object.territory !== 'WW') {
        output.territory = { $in: this.continentToTerritories(object.territory) };
      }
      // Distribution Channels
      if (Array.isArray(object.distributionChannel)) {
        output.distributionChannel = { $in: object.distributionChannel };
      } else if (object.distributionChannel) {
        output.distributionChannel = object.distributionChannel;
      } else if (Array.isArray(object.channel)) {
        output.distributionChannel = { $in: object.channel };
      } else if (object.channel) {
        output.distributionChannel = object.channel;
      }
      // Configs
      if (Array.isArray(object.configuration)) {
        output.configuration = { $in: object.configuration };
      } else if (object.configuration) {
        output.configuration = object.configuration;
      }
      // Price Cats
      if (Array.isArray(object.priceCategory)) {
        output.priceCategory = { $in: object.priceCategory };
      } else if (object.priceCategory) {
        output.priceCategory = object.priceCategory;
      }
      // Sources
      if (Array.isArray(object.source)) {
        output.source = { $in: object.source };
      } else if (object.source) {
        output.source = object.source;
      }
      return output;
    }
    logger.debug('NO FILTER');
    logger.debug(object);
    return null;
  };

  RoyaltyCalculator.continentToTerritories = function (territory) {
    if (territory === 'Africa') {
      return ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ', 'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'];
    } if (territory === 'Americas') {
      return ['AW', 'CW', 'AI', 'AG', 'AR', 'BS', 'BB', 'BZ', 'BM', 'BO', 'BQ', 'BR', 'VG', 'CA', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GL', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'AN', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'PM', 'VC', 'SR', 'TT', 'TC', 'US', 'UY', 'VE', 'VI', 'SX'];
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

  RoyaltyCalculator.createSaleCalculation = function (sale, share) {
    const output = {};
    if (sale.unitRate) { output.unitRate = sale.unitRate; }
    if (sale.multiplier || sale.multiplier === 0) { output.multiplier = sale.multiplier; }
    if (sale.rate !== null && sale.rate !== undefined) { output.rate = sale.rate; }
    if (sale.rateBasis) { output.rateBasis = sale.rateBasis; }
    if (share || share === 0) { output.share = share; }
    if (sale.reductionRate || sale.reductionRate === 0) { output.reductionRate = sale.reductionRate; }
    if (sale.reserve) { output.reserve = sale.reserve; }
    if (sale.type) { output.type = sale.type; }
    if (sale.reserveBasis) { output.reserveBasis = sale.reserveBasis; }
    if (sale.escalations) { output.escalations = sale.escalations; }
    if (sale.deductionType) { output.deductionType = sale.deductionType; }
    if (sale.deductionBasis) { output.deductionBasis = sale.deductionBasis; }
    if (sale.currency) { output.currency = sale.currency; }
    return output;
  };

  RoyaltyCalculator.createDeductionsFilterAndCalculations = function (deductions, periodId, filter, callback) {
    if (deductions && filter) {
      // Creates an object for each passed sales term
      // Returns an array of the objects
      const RoyaltyCalculator = this;
      const output = [];
      async.eachSeries(deductions, (deduction, cb) => {
        const obj = RoyaltyCalculator.createDeductionFilterAndCalculation(deduction, periodId, filter);
        output.push(obj);
        cb();
      }, () => {
        callback(null, output);
      });
    } else {
      callback('Requires sales, an objectPercentage and a filter');
    }
  };

  RoyaltyCalculator.createDeductionFilterAndCalculation = function (deduction, periodId, filter) {
    // Returns an object with a filter and calculation element - { filter: { salesFileId: $in: ["123", "234"], territory: "GB" }, calculation: { type: "Net Receipts", rate: 12, reserve: 50, unitRate: 12.45 } }
    return {
      filter: this.createFilter(deduction, null, periodId, filter),
      calculation: this.createDeductionCalculation(deduction),
    };
  };

  RoyaltyCalculator.createDeductionCalculation = function (deduction) {
    const output = {};
    if (deduction.unitRate) { output.unitRate = deduction.unitRate; }
    if (deduction.rate) { output.rate = deduction.rate; }
    if (deduction.rateBasis) { output.rateBasis = deduction.rateBasis; }
    if (deduction.reductionRate) { output.reductionRate = deduction.reductionRate; }
    if (deduction.type) { output.type = deduction.type; }
    if (deduction.deductionBasis) { output.deductionBasis = deduction.deductionBasis; }
    if (deduction.currency) { output.currency = deduction.currency; }
    return output;
  };

  RoyaltyCalculator.organiseTerms = function (contract) {
    if (contract && contract.terms) {
      // Remove 'All' or blank fields
      contract.terms.sales = contract.terms.sales.map(this.removeAllOrBlankTerms);
      contract.terms.deductions = contract.terms.deductions ? contract.terms.deductions.map(this.removeAllOrBlankTerms) : [];
      contract.terms.withholdingTaxes = contract.terms.withholdingTaxes ? contract.terms.withholdingTaxes.map(this.removeAllOrBlankTerms) : [];
      contract.terms.mechanicalContracts = contract.terms.mechanicalContracts ? contract.terms.mechanicalContracts.map(this.removeAllOrBlankTerms) : [];
      // Remove any spcific terms that aren't required
      contract.terms.deductions = contract.terms.deductions ? contract.terms.deductions : [];
      contract.terms.withholdingTaxes = contract.terms.withholdingTaxes ? contract.terms.withholdingTaxes : [];
      contract.terms.mechanicalContracts = contract.terms.mechanicalContracts ? contract.terms.mechanicalContracts : [];
      // Sort terms into specificity order
      contract.terms.sales = contract.terms.sales.sort(this.sortByDecendingOrder);
      contract.terms.deductions = contract.terms.deductions ? contract.terms.deductions.sort(this.sortByDecendingOrder) : [];
      contract.terms.withholdingTaxes = contract.terms.withholdingTaxes ? contract.terms.withholdingTaxes.sort(this.sortByDecendingOrder) : [];
      contract.terms.mechanicalContracts = contract.terms.mechanicalContracts ? contract.terms.mechanicalContracts.sort(this.sortByDecendingOrder) : [];
      return contract;
    }
  };

  RoyaltyCalculator.removeAllOrBlankTerms = function (object) {
    Object.keys(object).forEach((property) => {
      if (
        property === 'contractName'
        || object[property] === 'All'
        || object[property] === 'World'
        || object[property] === 'WW'
        || object[property] === ''
        || object[property] === null
      ) {
        delete object[property];
      }
    });
    return object;
  };

  RoyaltyCalculator.sortByDecendingOrder = function (object, comparison) {
    const objectScore = scoreObject(object);
    const comparisonScore = scoreObject(comparison);

    if (objectScore > comparisonScore) {
      return -1;
    } if (objectScore < comparisonScore) {
      return 1;
    }
    return 0;

    function scoreObject(object) {
      let score = Object.keys(object).length;
      if (object.catalogueGroup) { score += 100000000; }
      if (object.catType) { score += 10000000; }
      if ((object.releaseIds && object.releaseIds.length > 0) || (object.trackIds && object.trackIds.length > 0) || (object.workIds && object.workIds.length > 0)) { score += 1000000; }
      if (object.territory && ['Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].indexOf(object.territory) === -1) { score += 100000; }
      if (object.territory && ['Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].indexOf(object.territory) === -1 && object.territory.length > 1) { score += 80000; }
      if (object.territory && ['Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].indexOf(object.territory) !== -1) { score += 50000; }
      if (object.channel && !Array.isArray(object.channel)) { score += 10000; }
      if (object.channel && Array.isArray(object.channel)) { score += 5000; }
      if (object.configuration && !Array.isArray(object.configuration)) { score += 1000; }
      if (object.configuration && Array.isArray(object.configuration)) { score += 500; }
      if (object.priceCategory && !Array.isArray(object.priceCategory)) { score += 100; }
      if (object.priceCategory && Array.isArray(object.priceCategory)) { score += 50; }
      if (object.source) { score += 10; }
      // Unit Rate and Fixed Unit Rate have one more field than the other terms and cause the score to have 1 more.
      if (object.unitRate) { score -= 1; }
      return score;
    }
  };

  RoyaltyCalculator.runSalesLine = function (salesLine, salesTermsObject, deductionFilters, withholdingTaxFilters, mechanicalFilters, callback) {
    // inputs is an object with two keys - filter and calculation = { filter: {}, calculation: {} }
    const RoyaltyCalculator = this;
    if (RoyaltyCalculator.periodId) {
      // Check if it's a release specific rates calculation, if so we need to make sure we're only running sales line when the release ID matches
      // This means when it's a releaseSpecificRate => only run lines where the releaseId matches the includeReleaseId field
      // When it's a regular rate, make sure the releaseId isn't included in the excludeReleaseIds array
      if (salesLine.catType === 'Track' && RoyaltyCalculator.contract.specificRatesCalculation) {
        // Reset the participation rate
        salesLine.shipped_rights_percentage = null;
        let calculateLine = false;
        if (RoyaltyCalculator.contract.specificParticipationRates[salesLine.trackId]) {
          for (const specificParticipationRate of RoyaltyCalculator.contract.specificParticipationRates[salesLine.trackId]) {
            if (specificParticipationRate.releaseId && specificParticipationRate.releaseId === salesLine.releaseId) {
              salesLine.shipped_rights_percentage = specificParticipationRate.rate;
              calculateLine = true;
            }

            if (specificParticipationRate.excludeReleaseIds?.length && !specificParticipationRate.excludeReleaseIds.includes(salesLine.releaseId)) {
              salesLine.shipped_rights_percentage = specificParticipationRate.rate;
              calculateLine = true;
            }
          }
        }

        // Skip this line if it's a specific rate calculation and the releaseId condition isn't met
        if (!calculateLine) {
          return callback();
        }
      }

      // Set batch
      RoyaltyCalculator.batches = RoyaltyCalculator.batches || [];
      RoyaltyCalculator.batches[0] = RoyaltyCalculator.batches[0] || [];
      // Get original index of sales line
      const originalSalesDataIndex = RoyaltyCalculator.salesData.indexOf(salesLine);
      // Get sales term if exists
      RoyaltyCalculator.getSalesTermFromSalesLine(salesLine, salesTermsObject, (err, salesTerm) => {
        // Check a sales term was found
        if (salesTerm) {
          RoyaltyCalculator.runCalculation(salesLine, salesTerm.filter, deductionFilters, withholdingTaxFilters, mechanicalFilters, salesTerm.calculation, salesTerm.escalationTrackers, (err, updatedSalesLine, outputLine, previouslyReported) => {
            // Update Original Sales Data with line
            RoyaltyCalculator.salesData[originalSalesDataIndex] = updatedSalesLine;
            if (err) {
              callback(err);
            } else if (outputLine) {
              // Add original line back to set only for mechanicals
              if (RoyaltyCalculator.periodType === 'Mechanical') {
                RoyaltyCalculator.batches[0].push(updatedSalesLine);
              }
              // Set catalogue data
              outputLine = RoyaltyCalculator.setCatalogueData(outputLine);
              // Loop through object keys
              Object.keys(outputLine).forEach((key) => {
                // Check if key is on the list
                if (!RoyaltyCalculator.allowedFields.includes(key)) {
                  // Remove any fields that don't exist in the DB
                  delete outputLine[key];
                } else if (RoyaltyCalculator.fieldTypes[key] === 'FLOAT' && Number.isNaN(parseFloat(outputLine[key]))) {
                  // Remove any non numbers
                  delete outputLine[key];
                } else if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].includes(key) && outputLine[key] && outputLine[key].value) {
                  // Set any date values
                  outputLine[key] = outputLine[key].value;
                } else if (RoyaltyCalculator.fieldTypes[key] === 'DATE') {
                  // Remove any dates that are corrupt
                  if (String(outputLine[key]).length !== 10) {
                    delete outputLine[key];
                  }
                } else if (RoyaltyCalculator.fieldTypes[key] === 'STRING' && (outputLine[key] || outputLine[key] === 0)) {
                  // Force any into strings that require it
                  outputLine[key] = String(outputLine[key]);
                }
              });
              delete outputLine.id;
              // Add output of calculation to array
              RoyaltyCalculator.outputLines.push(outputLine);
              // Check outputLines size and write if over 100k
              if (RoyaltyCalculator.outputLines.length === 100000) {
                // Copy output lines
                const outputLines = RoyaltyCalculator.outputLines.slice();
                // Reset output lines array
                linesWrittenToFile += outputLines.length;
                RoyaltyCalculator.outputLines = [];
                logger.info(`${RoyaltyCalculator.periodId} Over 100k, writing to file ${RoyaltyCalculator.contract.name} - ${linesWrittenToFile} lines written so far`);
                RoyaltyCalculator.bigQuery.writeToFile(outputLines, RoyaltyCalculator.bigQuery.outputTable, (err) => {
                  logger.info(`${RoyaltyCalculator.periodId} Completed writing Over 100k to file ${RoyaltyCalculator.contract.name}`);
                  // Callback with any errors
                  callback(err);
                });
              } else {
                callback();
              }
            } else if (!previouslyReported || RoyaltyCalculator.periodType === 'Mechanical') {
              // If not previously reported, or is a mechanical run - which needs lines to looped through multiple times
              RoyaltyCalculator.batches[0].push(updatedSalesLine);
              callback();
            } else {
              callback();
            }
          });
        } else {
          callback();
        }
      });
    } else {
      callback('Requires inputs, inputCollection, outputCollection and periodId');
    }
  };

  RoyaltyCalculator.runCalculation = function (originalSalesLine, inputFilter, deductionFilters, withholdingTaxFilters, mechanicalFilters, calculation, escalationTrackers, callback) {
    // calculation = { objectPercentage: 50, unitRate: 1.23, rate: 12.5, reserve: 50 }
    const RoyaltyCalculator = this;

    if (originalSalesLine && calculation && RoyaltyCalculator.periodId && RoyaltyCalculator.contract.contractId) {
      // Create new object
      const salesLine = { ...originalSalesLine };
      // Add contractIds to sales line if it doesn't exist
      if (!originalSalesLine.contractIds) {
        originalSalesLine.contractIds = '';
      }

      // Add releaseIds to sales line if it doesn't exist
      if (!originalSalesLine.releaseIds) {
        originalSalesLine.releaseIds = '';
      }

      // Add trackIsrcs to sales line if it doesn't exist
      if (!originalSalesLine.trackIsrcs) {
        originalSalesLine.trackIsrcs = '';
      }

      // Check sales line matches filter
      RoyaltyCalculator.filterMatches(salesLine, inputFilter, (match) => {
        // Check match on filter and line hasn't already been reported
        let hasntBeenReportedOnContract = originalSalesLine.contractIds.indexOf(RoyaltyCalculator.contract.contractId) === -1;

        if (RoyaltyCalculator.periodType === 'Mechanical' && salesLine.catType === 'Release') {
          hasntBeenReportedOnContract = !originalSalesLine.contractIds.includes(RoyaltyCalculator.contract.contractId)
          || (originalSalesLine.contractIds.includes(RoyaltyCalculator.contract.contractId)
          && originalSalesLine.releaseIds.includes(RoyaltyCalculator.filter.releaseId)
          && !originalSalesLine.trackIsrcs.includes(RoyaltyCalculator.contract.track.isrc));
        }
        if (match && hasntBeenReportedOnContract) {
          // Add contractId to original sales line when not a mechanical release - these need to allow to be reported for each match
          if (originalSalesLine.catType !== 'Release' && RoyaltyCalculator.periodType !== 'Mechanical') {
            originalSalesLine.contractIds += RoyaltyCalculator.contract.contractId;
          }
          // Setup multicurrency fields
          let contractCurrencyField = 'homeCurrency';
          if (RoyaltyCalculator.clientCurrencies && RoyaltyCalculator.contract.terms.contractCurrency) {
            contractCurrencyField = RoyaltyCalculator.clientCurrencies[RoyaltyCalculator.contract.terms.contractCurrency];
          }
          const homeCurrencyFields = {
            type: 'homeCurrency',
            input: {
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              salePrice: 'homeCurrencySalePrice',
            },
            salesFields: {
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              discountAmount: 'homeCurrencyDiscountAmount',
              mechanicalAtSource: 'homeCurrencyMechanicalAtSource',
              returnGrossAmount: 'homeCurrencyReturnGrossAmount',
              returnNetAmount: 'homeCurrencyReturnNetAmount',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              salePrice: 'homeCurrencySalePrice',
            },
            output: {
              proRataAmount: 'proRataAmount',
              grossAmount: 'homeCurrencyGrossAmount',
              netAmount: 'homeCurrencyNetAmount',
              discountAmount: 'homeCurrencyDiscountAmount',
              mechanicalAtSource: 'homeCurrencyMechanicalAtSource',
              returnGrossAmount: 'homeCurrencyReturnGrossAmount',
              returnNetAmount: 'homeCurrencyReturnNetAmount',
              ppd: 'ppd',
              perUnitRate: 'homeCurrencyPerUnitRate',
              retailPrice: 'homeCurrencyRetailPrice',
              salePrice: 'homeCurrencySalePrice',
              unitRate: 'unitRate',
              calculationInput: 'calculationInput',
              deduction: 'deduction',
              deductionUnitRate: 'deductionUnitRate',
              withholdingTax: 'withholdingTax',
              withholdingTaxUnitRate: 'withholdingTaxUnitRate',
              mechanicalAmount: 'mechanicalAmount',
              mechanicalDeduction: 'mechanicalDeduction',
              calculationOutput: 'calculationOutput',
              reserve: 'reserve',
            },
          };
          const contractCurrencyFields = {
            type: 'contractCurrency',
            input: {
              grossAmount: `${contractCurrencyField}GrossAmount`,
              netAmount: `${contractCurrencyField}NetAmount`,
              perUnitRate: `${contractCurrencyField}PerUnitRate`,
              retailPrice: `${contractCurrencyField}RetailPrice`,
              salePrice: `${contractCurrencyField}SalePrice`,
            },
            salesFields: {
              exchangeRate: `${contractCurrencyField}ExchangeRate`,
              grossAmount: `${contractCurrencyField}GrossAmount`,
              netAmount: `${contractCurrencyField}NetAmount`,
              discountAmount: `${contractCurrencyField}DiscountAmount`,
              mechanicalAtSource: `${contractCurrencyField}MechanicalAtSource`,
              returnGrossAmount: `${contractCurrencyField}ReturnGrossAmount`,
              returnNetAmount: `${contractCurrencyField}ReturnNetAmount`,
              perUnitRate: `${contractCurrencyField}PerUnitRate`,
              retailPrice: `${contractCurrencyField}RetailPrice`,
              salePrice: `${contractCurrencyField}SalePrice`,
            },
            output: {
              proRataAmount: 'contractCurrencyProRataAmount',
              grossAmount: 'contractCurrencyGrossAmount',
              netAmount: 'contractCurrencyNetAmount',
              discountAmount: 'contractCurrencyDiscountAmount',
              mechanicalAtSource: 'contractCurrencyMechanicalAtSource',
              returnGrossAmount: 'contractCurrencyReturnGrossAmount',
              returnNetAmount: 'contractCurrencyReturnNetAmount',
              ppd: 'contractCurrencyPpd',
              perUnitRate: 'contractCurrencyPerUnitRate',
              retailPrice: 'contractCurrencyRetailPrice',
              salePrice: 'contractCurrencySalePrice',
              unitRate: 'contractCurrencyUnitRate',
              calculationInput: 'contractCurrencyCalculationInput',
              deduction: 'contractCurrencyDeduction',
              deductionUnitRate: 'contractCurrencyDeductionUnitRate',
              withholdingTax: 'contractCurrencyWithholdingTax',
              withholdingTaxUnitRate: 'contractCurrencyWithholdingTaxUnitRate',
              mechanicalAmount: 'contractCurrencyMechanicalAmount',
              mechanicalDeduction: 'contractCurrencyMechanicalDeduction',
              calculationOutput: 'contractCurrencyCalculationOutput',
              reserve: 'contractCurrencyReserve',
            },
          };

          async.waterfall([
            function (cb) {
              // Convert sales data if it doesn't exist
              Object.keys(homeCurrencyFields.salesFields).forEach((key) => {
                if (
                  !salesLine[contractCurrencyFields.salesFields[key]]
                  && salesLine[contractCurrencyFields.salesFields[key]] !== 0
                  && (salesLine[homeCurrencyFields.salesFields[key]] || salesLine[homeCurrencyFields.salesFields[key]] === 0)) {
                  salesLine[contractCurrencyFields.salesFields[key]] = salesLine[homeCurrencyFields.salesFields[key]] * RoyaltyCalculator.contractExchangeRate;
                }
              });
              cb();
            },
            function (cb) {
              // Set Gross, Net and Exchange Rates
              const lineSpecificExRate = RoyaltyCalculator.contract.terms.contractCurrency === salesLine.originalCurrency ? 1 : RoyaltyCalculator.contractExchangeRate;
              
              salesLine.contractCurrencyGrossAmount = 
                salesLine[contractCurrencyFields.salesFields.grossAmount] 
                && salesLine[contractCurrencyFields.salesFields.grossAmount] !== 0 ? salesLine[contractCurrencyFields.salesFields.grossAmount] : salesLine[homeCurrencyFields.salesFields.grossAmount] * lineSpecificExRate;
              
              salesLine.contractCurrencyNetAmount = 
                salesLine[contractCurrencyFields.salesFields.netAmount] 
                && salesLine[contractCurrencyFields.salesFields.netAmount] !== 0 ? salesLine[contractCurrencyFields.salesFields.netAmount] : salesLine[homeCurrencyFields.salesFields.netAmount] * lineSpecificExRate;
              
              salesLine.contractCurrencyPerUnitRate = 
                salesLine[contractCurrencyFields.salesFields.perUnitRate] 
                && salesLine[contractCurrencyFields.salesFields.perUnitRate] !== 0 ? salesLine[contractCurrencyFields.salesFields.perUnitRate] : salesLine[homeCurrencyFields.salesFields.perUnitRate] * lineSpecificExRate;
              
              salesLine.contractCurrencyRetailPrice = 
                salesLine[contractCurrencyFields.salesFields.retailPrice] 
                && salesLine[contractCurrencyFields.salesFields.retailPrice] !== 0 ? salesLine[contractCurrencyFields.salesFields.retailPrice] : salesLine[homeCurrencyFields.salesFields.retailPrice] * lineSpecificExRate;
              
              salesLine.contractCurrencySalePrice = 
                salesLine[contractCurrencyFields.salesFields.salePrice] 
                && salesLine[contractCurrencyFields.salesFields.salePrice] !== 0 ? salesLine[contractCurrencyFields.salesFields.salePrice] : salesLine[homeCurrencyFields.salesFields.salePrice] * lineSpecificExRate;
              
                salesLine.contractCurrencyExchangeRate = salesLine[contractCurrencyFields.salesFields.netAmount] / salesLine.netAmount;
              cb();
            },
            function (cb) {
              // Calculate in home currency
              RoyaltyCalculator.calculateInCurrency(homeCurrencyFields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, cb);
            },
            function (cb) {
              // Calculate in contract currency
              RoyaltyCalculator.calculateInCurrency(contractCurrencyFields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, cb);
            },
          ], (err) => {
            // Skip if PPD or Unit Rate without input
            if (
              (calculation.type === 'Unit Price' && !salesLine.homeCurrencyPerUnitRate && salesLine.homeCurrencyPerUnitRate !== 0)
          || (calculation.type === 'Retail Price' && !salesLine.homeCurrencyRetailPrice && salesLine.homeCurrencyRetailPrice !== 0)
          || (calculation.type === 'Sale Price' && !salesLine.homeCurrencySalePrice && salesLine.homeCurrencySalePrice !== 0)
          || (calculation.type === 'Gross Receipts' && !salesLine.homeCurrencyGrossAmount && salesLine.homeCurrencyGrossAmount !== 0)
          || (calculation.type === 'PPD' && !salesLine.shipped_catalogue_dealerPrice && salesLine.shipped_catalogue_dealerPrice !== 0 && !JSON.parse(salesLine.shipped_catalogue_priceCategoryDealerPrices || '[]')?.length)
            ) {
              callback(err, originalSalesLine);
            } else {
              // Return calculated sales line
              callback(err, originalSalesLine, salesLine);
            }
          });
        } else if (match && !hasntBeenReportedOnContract && RoyaltyCalculator.periodType === 'Mechanical') {
          callback(null, originalSalesLine);
        } else if (match) {
          callback(null, null, null, true);
        } else {
          callback(null, originalSalesLine);
        }
      });
    } else if (!originalSalesLine) {
      callback();
    } else {
      logger.debug('OriginalSalesLine:', originalSalesLine);
      logger.debug('ContractId:', RoyaltyCalculator.contract.contractId);
      logger.debug('periodId:', RoyaltyCalculator.periodId);
      logger.debug('calculation:', calculation);
      callback('Requires a salesLine, calculation, periodId and contractId');
    }
  };

  RoyaltyCalculator.setDeduction = function (salesLine, deductionFilters, callback) {
    const RoyaltyCalculator = this;

    if (!salesLine || !deductionFilters) {
      callback('A sales line and deduction filters are required');
    } else {
      // Loop through filters
      async.eachSeries(deductionFilters, (deductionFilter, cb) => {
        // Check if deduction set
        // Check if matches filter - add deduction
        RoyaltyCalculator.filterMatches(salesLine, deductionFilter.filter, (matches) => {
          if (!salesLine.deductionCalculationType && matches) {
            if (deductionFilter.calculation.deductionBasis === 'Unit Rate' || deductionFilter.calculation.deductionBasis === 'Fixed Unit Rate') {
              salesLine.contractCurrencyDeductionUnitRate = deductionFilter.calculation.unitRate;
              salesLine.deductionUnitRate = deductionFilter.calculation.unitRate / RoyaltyCalculator.contractExchangeRate;
            }

            salesLine.deductionRate = deductionFilter.calculation.rate ? deductionFilter.calculation.rate : 0;
            salesLine.deductionCalculationType = deductionFilter.calculation.deductionBasis;
            salesLine.deductionType = deductionFilter.calculation.type;
          }
          cb();
        });
      }, (err) => {
        callback();
      });
    }
  };

  RoyaltyCalculator.setWithholdingTax = function (salesLine, deductionFilters, callback) {
    const RoyaltyCalculator = this;
    if (!salesLine || !deductionFilters) {
      callback('A sales line and deduction filters are required');
    } else {
      // Loop through filters
      async.eachSeries(deductionFilters, (deductionFilter, cb) => {
        // Check if deduction set
        // Check if matches filter - add deduction
        RoyaltyCalculator.filterMatches(salesLine, deductionFilter.filter, (matches) => {
          if (!salesLine.withholdingTaxCalculationType && matches) {
            if (deductionFilter.calculation.deductionBasis === 'Unit Rate') {
              salesLine.contractCurrencyWithholdingTaxUnitRate = deductionFilter.calculation.unitRate;
              salesLine.withholdingTaxUnitRate = deductionFilter.calculation.unitRate / RoyaltyCalculator.contractExchangeRate;
              salesLine.withholdingTaxRate = deductionFilter.calculation.rate ? deductionFilter.calculation.rate : 0;
              salesLine.withholdingTaxCalculationType = 'Unit Rate';
              salesLine.withholdingTaxType = deductionFilter.calculation.type;
            } else {
              salesLine.withholdingTaxRate = deductionFilter.calculation.rate ? deductionFilter.calculation.rate : 0;
              salesLine.withholdingTaxCalculationType = 'Percentage';
              salesLine.withholdingTaxType = deductionFilter.calculation.type;
            }
          }
          cb();
        });
      }, (err) => {
        callback();
      });
    }
  };

  RoyaltyCalculator.setMechanical = function (salesLine, mechanicalFilters, callback) {
    const RoyaltyCalculator = this;
    if (!salesLine || !mechanicalFilters) {
      callback('A sales line and mechanical filters are required');
    } else {
      // Loop through filters
      async.eachSeries(mechanicalFilters, (mechanicalFilter, cb) => {
        // Check if mechanical set
        // Check if matches filter - add mechanical
        RoyaltyCalculator.filterMatches(salesLine, mechanicalFilter.filter, (matches) => {
          if (!salesLine.mechanicalDeductionType && matches) {
            salesLine.mechanicalPercentage = mechanicalFilter.calculation.rate;
            salesLine.mechanicalType = mechanicalFilter.calculation.type;
            salesLine.mechanicalDeductionType = mechanicalFilter.calculation.deductionType;
            salesLine.mechanicalCurrency = mechanicalFilter.calculation.currency;
            let mechanicalAmount = null;
            if (salesLine.catType === 'Release' && salesLine.shipped_catalogue_releaseMechanicalAmount) {
              mechanicalAmount = JSON.parse(salesLine.shipped_catalogue_releaseMechanicalAmount);
            } else if (salesLine.catType === 'Track' && salesLine.shipped_catalogue_trackMechanicalAmount) {
              mechanicalAmount = JSON.parse(salesLine.shipped_catalogue_trackMechanicalAmount);
            } 
            
            if (mechanicalFilter.calculation.type === 'Statutory Rate') {
              if (salesLine.catType === 'Release') {
                if (mechanicalAmount) {
                  const minAmountField = mechanicalFilter.calculation.rateBasis === 'US' ? 'usMinAmount' : 'caMinAmount';
                  const perMinuteRateField = mechanicalFilter.calculation.rateBasis === 'US' ? 'usPerMinuteRate' : 'caPerMinuteRate';
                  let dateToUse;
                  for (const startDate in mechanicalAmount) {
                    if (startDate) {
                      if (!dateToUse) { dateToUse = new Date(startDate); }

                      if (mechanicalAmount[startDate]) {
                        const date = new Date(startDate);
                        const saleDate = salesLine?.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
                        if (saleDate >= date && (mechanicalAmount[startDate][minAmountField] || mechanicalAmount[startDate][perMinuteRateField])) {
                          dateToUse = date;
                        }
                      }
                    }
                  }
                  salesLine.mechanicalAmount = dateToUse ? mechanicalAmount[moment(dateToUse).format('YYYY-MM-DD')][mechanicalFilter.calculation.rateBasis] : 0;
                } else {
                  salesLine.mechanicalAmount = RoyaltyCalculator.contract.terms.mechanicalAmount[mechanicalFilter.calculation.rateBasis];
                }
              } else if (salesLine.catType === 'Track') {
                const mechanicalAmount = salesLine.shipped_catalogue_trackMechanicalAmount ? JSON.parse(salesLine.shipped_catalogue_trackMechanicalAmount) : null;
                const multiplierSum = parseFloat(mechanicalAmount?.multiplierSum || 1).toFixed(10);
                const licenseCount = parseFloat(mechanicalAmount?.licenseCount || 1).toFixed(10);

                if (mechanicalAmount?.mechanicalCalculationBasis === 'Sale Date') {
                  mechanicalAmount.duration = mechanicalAmount.duration || 1;
                  const field = mechanicalAmount?.duration < 301 ? 'minAmount' : 'perMinuteRate';
                  let minutes = 0;
                  // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
                  minutes = mechanicalAmount?.duration < 301 ? 1 : RoyaltyCalculator.getStatRateMinutes(mechanicalAmount?.duration);
                  const statRatesForCountry = mechanicalFilter.calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
                  const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
                  salesLine.mechanicalAmount = minutes * RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, field);
                } else {
                  salesLine.mechanicalAmount = mechanicalAmount && mechanicalAmount[mechanicalFilter.calculation.rateBasis]
                    ? mechanicalAmount[mechanicalFilter.calculation.rateBasis] : RoyaltyCalculator.contract.terms.mechanicalAmount[mechanicalFilter.calculation.rateBasis];
                }
                // Pro-rata based on licenses count
                salesLine.mechanicalAmount *= (multiplierSum / licenseCount);
              }
            } else if (mechanicalFilter.calculation.type === 'Min Statutory Rate') {
              if (salesLine.catType === 'Track') {
                const multiplierSum = parseFloat(mechanicalAmount?.multiplierSum || 1).toFixed(10);
                const licenseCount = parseFloat(mechanicalAmount?.licenseCount || 1).toFixed(10);

                const statRatesForCountry = mechanicalFilter.calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
                const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
                salesLine.mechanicalAmount = RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, 'minAmount') * (multiplierSum / licenseCount);
              } else if (salesLine.catType === 'Release' && mechanicalAmount) {
                const minAmountField = mechanicalFilter.calculation.rateBasis === 'US' ? 'usMinAmount' : 'caMinAmount';
                const perMinuteRateField = mechanicalFilter.calculation.rateBasis === 'US' ? 'usPerMinuteRate' : 'caPerMinuteRate';
                let dateToUse;
                for (const startDate in mechanicalAmount) {
                  if (startDate) {
                    // Incase the salesLine sales date does not pass condition we can default to the earliest mechanical rate date
                    if (!dateToUse) { dateToUse = new Date(startDate); }

                    if (mechanicalAmount[startDate]) {
                      const date = new Date(startDate);
                      const saleDate = new Date(salesLine.saleDate) || RoyaltyCalculator.periodEndDate;
                      if (saleDate >= date && (mechanicalAmount[startDate][minAmountField] || mechanicalAmount[startDate][perMinuteRateField])) {
                        dateToUse = date;
                      }
                    }
                  }
                }

                salesLine.mechanicalAmount = mechanicalFilter.calculation.rateBasis === 'US' ? mechanicalAmount[moment(dateToUse).format('YYYY-MM-DD')].minUS : mechanicalAmount[moment(dateToUse).format('YYYY-MM-DD')].minCA;
              } else {
                salesLine.mechanicalAmount = 0;
              }
            } else if (mechanicalFilter.calculation.type === 'Unit Rate') {
              salesLine.contractCurrencyMechanicalAmount = mechanicalFilter.calculation.unitRate;
              salesLine.mechanicalAmount = mechanicalFilter.calculation.unitRate / RoyaltyCalculator.contractExchangeRate;
            }
          }
          cb();
        });
      }, (err) => {
        callback();
      });
    }
  };

  RoyaltyCalculator.getSalesTermFromSalesLine = function (salesLine, salesTermsObject, callback) {
    if (salesLine && salesTermsObject) {
      // Optimisation, checking only the single sales term rather than looking at all the different possibilities
      if (RoyaltyCalculator.singleSalesTerm) {
        RoyaltyCalculator.filterMatches(salesLine, RoyaltyCalculator.singleSalesTerm.filter, (match) => {
          if (match) {
            // Add to array if matched
            callback(null, RoyaltyCalculator.singleSalesTerm);
          } else {
            callback();
          }
        });
      } else {
        // Loop through different connotations of possibilities to find matching items
        async.parallel([
          function (cb) {
            RoyaltyCalculator.getMatchingTermFromArray(salesTermsObject, salesLine.distributionChannel, salesLine.configuration, salesLine, cb);
          },
          function (cb) {
            RoyaltyCalculator.getMatchingTermFromArray(salesTermsObject, salesLine.distributionChannel, 'default', salesLine, cb);
          },
          function (cb) {
            RoyaltyCalculator.getMatchingTermFromArray(salesTermsObject, 'default', salesLine.configuration, salesLine, cb);
          },
          function (cb) {
            RoyaltyCalculator.getMatchingTermFromArray(salesTermsObject, 'default', 'default', salesLine, cb);
          },
        ], (err, allTerms) => {
          // Flatten terms
          
          // eslint-disable-next-line prefer-spread
          allTerms = [].concat.apply([], allTerms).filter(Boolean);
          // Sort matching terms
          allTerms.sort((a, b) => a.index - b.index);
          // Return first term
          callback(null, allTerms[0]);
        });
      }
    } else {
      callback();
    }
  };

  RoyaltyCalculator.getMatchingTermFromArray = function (salesTermsObject, channel, config, salesLine, callback) {
    const matchingTerms = [];
    if (!salesTermsObject || !salesLine) {
      callback(null, matchingTerms);
    } else {
      // Get catalogue item ID
      const catId = RoyaltyCalculator.getCatIdFromSalesLine(salesLine);
      async.parallel([
        (paraCb) => {
          // Check catId specific
          if (salesTermsObject[channel] && salesTermsObject[channel][config] && salesTermsObject[channel][config][catId]) {
            // Loop through possible terms
            async.each(salesTermsObject[channel][config][catId], (term, cb) => {
              // Check line matches filter
              RoyaltyCalculator.filterMatches(salesLine, term.filter, (match) => {
                // Add to array if matched
                if (match) { matchingTerms.push(term); }
                cb();
              });
            }, paraCb);
          } else {
            paraCb();
          }
        },
        (paraCb) => {
          // Check default terms - non cat item specific
          if (salesTermsObject[channel] && salesTermsObject[channel][config] && salesTermsObject[channel][config].default) {
            // Loop through possible terms
            async.each(salesTermsObject[channel][config].default, (term, cb) => {
              // Check line matches filter
              RoyaltyCalculator.filterMatches(salesLine, term.filter, (match) => {
                // Add to array if matched
                if (match) { matchingTerms.push(term); }
                cb();
              });
            }, paraCb);
          } else {
            paraCb();
          }
        },
      ], (err) => {
        // Return all matching terms
        callback(null, matchingTerms);
      });
    }
  };

  RoyaltyCalculator.getCatIdFromSalesLine = function (salesLine) {
    // Checks for the cat type and returns the corresponding ID
    let result;
    if (salesLine?.catType === 'Release') {
      result = salesLine.releaseId;
    } else if (salesLine?.catType === 'Track') {
      result = salesLine.trackId;
    } else if (salesLine?.catType === 'Work') {
      result = salesLine.workId;
    } else if (salesLine?.catType === 'Contract') {
      result = salesLine.contractId;
    }
    return result;
  };

  RoyaltyCalculator.setupEscalations = function (callback) {
    if (ObjectId.isValid(RoyaltyCalculator.contract.contractId)) {
      Period.findOne({ _id: new ObjectId(RoyaltyCalculator.periodId) }, { clientId: 1, startDate: 1, endDate: 1, escalationStartingFigures: 1 })
        .then((period) => {
          const contractEscalations = period.escalationStartingFigures.find((escalations) => escalations.contractId === RoyaltyCalculator.contract.contractId);
          RoyaltyCalculator.escalationContract = {
            _id: new ObjectId(RoyaltyCalculator.contract.contractId),
            clientId: period.clientId,
            escalationTracking: contractEscalations.escalationTracking,
            // If it's not the first byContract run (example: calculating releases, then tracks, then works..), we should use the starting escalations from the previous byContract run
            startingEscalationTracking: JSON.parse(JSON.stringify(contractEscalations.startingEscalationTracking || contractEscalations.escalationTracking)),
            startDate: period.startDate,
            endDate: period.endDate,
          };
          callback();
        })
        .catch((err) => {
          logger.error(err);
          callback();
        });
    } else {
      callback();
    }
  };


  RoyaltyCalculator.writeEscalations = async function (callback) {
    if (ObjectId.isValid(RoyaltyCalculator.contract.contractId) && RoyaltyCalculator.escalationContract?.escalationTracking) {
      // Set the escalations against the escalation document
      let escalation = await Escalation.findOne({ clientId: RoyaltyCalculator.escalationContract.clientId, periodId: RoyaltyCalculator.periodId, contractId: RoyaltyCalculator.contract.contractId });
      if (!escalation) {
        escalation = new Escalation({
          clientId: RoyaltyCalculator.escalationContract.clientId,
          periodId: RoyaltyCalculator.periodId,
          contractId: RoyaltyCalculator.contract.contractId,
          startDate: RoyaltyCalculator.escalationContract.startDate,
          endDate: RoyaltyCalculator.escalationContract.endDate,
        });

        await escalation.save();
      }

      // RoyaltyCalculator.escalationContract.escalationTracking holds the total escalation to date, we should only save the escalation added by this period to the escalation document
      escalation.trackers = escalation.trackers || {};
      Object.keys(RoyaltyCalculator.escalationContract.escalationTracking).forEach((tracker) => {
        escalation.trackers[tracker] = escalation.trackers[tracker] || { units: 0, gross: 0, net: 0 };
        // Calculate the escalations added by this period
        escalation.trackers[tracker].units = RoyaltyCalculator.escalationContract.escalationTracking[tracker].units - RoyaltyCalculator.escalationContract.startingEscalationTracking[tracker].units;
        escalation.trackers[tracker].gross = RoyaltyCalculator.escalationContract.escalationTracking[tracker].gross - RoyaltyCalculator.escalationContract.startingEscalationTracking[tracker].gross;
        escalation.trackers[tracker].net = RoyaltyCalculator.escalationContract.escalationTracking[tracker].net - RoyaltyCalculator.escalationContract.startingEscalationTracking[tracker].net;
        // Deduct the costs escalations
        escalation.trackers[tracker].gross -= RoyaltyCalculator.escalationContract.startingEscalationTracking[tracker].grossCosts || 0;
        escalation.trackers[tracker].net -= RoyaltyCalculator.escalationContract.startingEscalationTracking[tracker].netCosts || 0;
      });

      await Escalation.findByIdAndUpdate(escalation._id, escalation);

      // Update period starting escalations for subsequent byContract calculation runs
      const period = await Period.findById(RoyaltyCalculator.periodId);
      let escalationsIndex = null;
      period.escalationStartingFigures.forEach((startingFigure, index) => {
        if (startingFigure.contractId === RoyaltyCalculator.contract.contractId) {
          escalationsIndex = index;
          startingFigure.escalationTracking = RoyaltyCalculator.escalationContract.escalationTracking;
          startingFigure.startingEscalationTracking = RoyaltyCalculator.escalationContract.startingEscalationTracking;
        }
      });
      if (escalationsIndex || escalationsIndex === 0) {
        await Period.findByIdAndUpdate(period._id, { $set: { [`escalationStartingFigures.${escalationsIndex}`]: period.escalationStartingFigures[escalationsIndex] } });
      }
      callback();
    } else {
      callback();
    }
  };

  RoyaltyCalculator.checkEscalations = function (calculation, saleDate, reportingDate, callback) {
    if (calculation.escalations?.length > 0) {
      let output;
      async.eachSeries(calculation.escalations, (escalation, escalationCb) => {
        RoyaltyCalculator.testEscalationConditions(escalation, saleDate, reportingDate, (err, runEscalation) => {
          if (runEscalation) {
            output = escalation;
            if (output.rate) { output.rate = Number(output.rate); }
            if (output.reductionRate) { output.reductionRate = Number(output.reductionRate); }
            if (output.reserve) { output.reserve = Number(output.reserve); }
            // Get the mechanical share from the original calculation object as the escalation doesn't have it.
            if (calculation.share) { output.share = Number(calculation.share); }
            escalationCb();
          } else {
            escalationCb();
          }
        });
      }, (err) => {
        if (output) {
          // Return output
          callback(err, output);
        } else {
          // Else return original calculation
          callback(err, calculation);
        }
      });
    } else {
      callback(null, calculation);
    }
  };

  RoyaltyCalculator.testEscalationConditions = function (escalation, saleDate, reportingDate, callback) {
    let runEscalation = true;
    if (!escalation) {
      runEscalation = false;
      callback(null, runEscalation);
    } else {
      async.eachSeries(escalation.conditions, (condition, conditionCb) => {
        // Test if escalation met
        if ((condition.escalationTracker && condition.thresholdType && condition.when && (condition.threshold || condition.threshold === 0)) || (condition.escalationTracker && condition.escalationTracker === 'Sale Date' && saleDate) || (condition.escalationTracker && condition.escalationTracker === 'Reporting Date' && reportingDate)) {
          // Get value from escalation
          let currentValue;
          if (condition.escalationTracker === 'Sale Date' && saleDate) {
            currentValue = new Date(saleDate);
          } else if (condition.escalationTracker === 'Reporting Date') {
            currentValue = new Date(reportingDate);
          } else if (condition.escalationTracker && condition.thresholdType && RoyaltyCalculator.escalationContract && RoyaltyCalculator.escalationContract.escalationTracking && !_.isEmpty(RoyaltyCalculator.escalationContract.escalationTracking)) {
            currentValue = RoyaltyCalculator.escalationContract.escalationTracking[condition.escalationTracker][condition.thresholdType.toLowerCase()];
          }
          // Create threshold date to force threshold into date format
          let thresholdDate;
          try {
            thresholdDate = new Date(condition.threshold);
          } catch (e) {
            logger.debug('Erroed in setting threshold as date');
          }
          // Test against model
          // logger.debug(currentValue, thresholdDate);
          if ((currentValue && condition.when === 'Greater Than' && currentValue > condition.threshold) || (currentValue && condition.when === 'Less Than' && currentValue < condition.threshold)) {
            // console.log("Meets threshold");
          } else if ((condition.escalationTracker === 'Sale Date' && currentValue > thresholdDate) || (condition.escalationTracker === 'Reporting Date' && currentValue > thresholdDate)) {
            // console.log("Is after date");
          } else {
            runEscalation = false;
          }
          conditionCb();
        } else {
          runEscalation = false;
          conditionCb();
        }
      }, (err) => {
        callback(err, runEscalation);
      });
    }
  };

  RoyaltyCalculator.filterMatches = function (salesLine, filter, callback) {
    if (!salesLine || !filter) {
      callback(false);
    } else {
      if (salesLine.releaseId && salesLine.trackId && filter.releaseId?.fromReleaseSpecific && filter.releaseId?.$nin?.includes(salesLine.releaseId) && filter.trackId?.$in?.includes(salesLine.trackId)) {
        delete filter.releaseId;
      }
      const keys = Object.keys(filter);
      const results = { true: 0, false: 0 };
      keys.forEach((key) => {
        // Remove when not the same cat type
        if (salesLine[key] === filter[key]
      || (Object.getPrototypeOf(filter[key]) === Object.prototype && filter[key] && filter[key].$in && filter[key].$in.includes(salesLine[key]))
      || (Object.getPrototypeOf(filter[key]) === Object.prototype && filter[key] && filter[key].$nin && !filter[key].$nin.includes(salesLine[key]))
        ) {
          results.true += 1;
        } else if (key === '$or') {
          let orResult = false;
          filter[key].forEach((orItem) => {
            if (
              (orItem && orItem.catType === 'Contract' && orItem.contractId && orItem.contractId === salesLine.contractId && salesLine.catType === 'Contract')
          || (orItem && orItem.catType === 'Contract' && orItem.contractId && orItem.contractId.$in && orItem.contractId.$in.includes(salesLine.contractId) && salesLine.catType === 'Contract')
          || (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId === salesLine.releaseId && salesLine.catType === 'Release')
          || (orItem && orItem.catType === 'Release' && orItem.releaseId && orItem.releaseId.$in && orItem.releaseId.$in.includes(salesLine.releaseId) && salesLine.catType === 'Release')
          || (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId === salesLine.trackId && salesLine.catType === 'Track')
          || (orItem && orItem.catType === 'Track' && orItem.trackId && orItem.trackId.$in && orItem.trackId.$in.includes(salesLine.trackId) && salesLine.catType === 'Track')
          || (orItem && orItem.catType === 'Work' && orItem.workId && orItem.workId === salesLine.workId && salesLine.catType === 'Work')
          || (orItem && orItem.catType === 'Work' && orItem.workId && orItem.workId.$in && orItem.workId.$in.includes(salesLine.workId) && salesLine.catType === 'Work')
            ) {
              orResult = true;
            }
          });
          if (!orResult) {
            results.false += 1;
            return false;
          }
        } else if (key !== '$or3') {
          results.false += 1;
          return false;
        }
      });

      if (results.false > 0) {
        callback(false);
      } else {
        callback(true);
      }
    }
  };

  RoyaltyCalculator.setCatalogueData = function (salesLine) {
    // Check if salesLine exists
    if (salesLine) {
      // Replace with the catalogue overwriting data
      // When shipping catalogue data, we use the overwrite_data_ prefix to indicate the data is from the the catalogue that should overwrite the data in the salesLine
      Object.keys(salesLine).forEach((key) => {
        if (key.startsWith('overwrite_data_')) {
          if (salesLine.trackId && key === 'overwrite_data_releaseSpecificForeignIds' && salesLine.releaseId) {
            const releaseSpecificForeignIds = JSON.parse(salesLine[key] || '{}');
            if (releaseSpecificForeignIds[salesLine.releaseId]) {
              salesLine.catalogueTrackForeignId = releaseSpecificForeignIds[salesLine.releaseId];
            }
          } else if (salesLine.trackId && key === 'overwrite_data_defaultReleaseId' && !salesLine.releaseId) {
            salesLine.releaseId = salesLine[key];
          } else {
            salesLine[key.replace('overwrite_data_', '')] = salesLine[key];
          }
        }
      });

      return salesLine;
    }
    // Return original value
    return salesLine;
  };

  RoyaltyCalculator.getStatRateForDate = function (statRates, date, field) {
    if (statRates) {
      let latestStatRates = {};
      statRates.forEach((ratesRow) => {
        if ((!latestStatRates.startDate || new Date(latestStatRates.startDate) < new Date(ratesRow.startDate)) && new Date(ratesRow.startDate) <= date) {
          latestStatRates = ratesRow;
        }
      });
      if (Object.keys(latestStatRates).length > 0) {
        return (latestStatRates[field] || 0);
      }
      return 0;
    }
    return 0;
  };

  RoyaltyCalculator.getStatRateMinutes = function (duration) {
    if (Number.isNaN(duration)) return 0;
    return Math.ceil(duration / 60);
  };

  RoyaltyCalculator.calculateInCurrency = function (fields, salesLine, originalSalesLine, calculation, deductionFilters, withholdingTaxFilters, mechanicalFilters, escalationTrackers, callback) {
    async.waterfall([
      function (cb) {
        // Set Deductions
        if (deductionFilters && deductionFilters.length > 0) {
          RoyaltyCalculator.setDeduction(salesLine, deductionFilters, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Set Withholding
        if (withholdingTaxFilters && withholdingTaxFilters.length > 0) {
          RoyaltyCalculator.setWithholdingTax(salesLine, withholdingTaxFilters, cb);
        } else {
          cb();
        }
      },
      function (cb) {
        // Set Mechanicals

        // Check if the track has been set to not report mechanicals, do not calculate mechanicals return out of iteration
        const mechanicalAmount = salesLine.shipped_catalogue_trackMechanicalAmount ? JSON.parse(salesLine.shipped_catalogue_trackMechanicalAmount) : null;
        if (salesLine.catType === 'Track' && !mechanicalAmount?.reportMechanicals) return cb();
        // When no mechanical deductions exist against contract, no need to apply mechanicals
        if (!mechanicalFilters?.length) return cb();

        RoyaltyCalculator.setMechanical(salesLine, mechanicalFilters, cb);
      },
      function (cb) {
        // Escalations
        RoyaltyCalculator.checkEscalations(calculation, salesLine.saleDate, RoyaltyCalculator.periodEndDate, cb);
      },
      function (calculation, cb) {
        // Update object - set old ID to salesLineId and delete ID
        salesLine.salesLineId = salesLine.id;
        salesLine.periodId = RoyaltyCalculator.periodId;
        salesLine.contractId = RoyaltyCalculator.contract.contractId;
        salesLine.contractName = RoyaltyCalculator.contract.name;
        salesLine.contractPartitionNo = RoyaltyCalculator.contract.partitionNo;
        // Set original catalogue data
        salesLine.catalogueOriginalReleaseTitle = originalSalesLine.originalReleaseTitle;
        salesLine.catalogueOriginalReleaseArtist = originalSalesLine.originalReleaseArtist;
        salesLine.catalogueOriginalBarcode = originalSalesLine.barcode;
        salesLine.catalogueOriginalCatNo = originalSalesLine.catNo;
        salesLine.catalogueOriginalTrackTitle = originalSalesLine.originalTrackTitle;
        salesLine.catalogueOriginalTrackArtist = originalSalesLine.originalTrackArtist;
        salesLine.catalogueOriginalIsrc = originalSalesLine.isrc;
        // Set License No
        salesLine.licenseNo = RoyaltyCalculator.contract.licenseNo;
        // Set Composer/Publisher When Mechanical Period
        if (RoyaltyCalculator.periodType === 'Mechanical') {
          if (salesLine.catType === 'Release' && RoyaltyCalculator.catalogueData.releases && RoyaltyCalculator.contract && RoyaltyCalculator.contract.track) {
            Object.keys(RoyaltyCalculator.catalogueData.releases).forEach((releaseId) => {
              if (RoyaltyCalculator.catalogueData.releases[releaseId] && RoyaltyCalculator.catalogueData.releases[releaseId].composersPublishersMapping && releaseId === salesLine.releaseId) {
                Object.keys(RoyaltyCalculator.catalogueData.releases[releaseId].composersPublishersMapping).forEach((trackId) => {
                  if (RoyaltyCalculator.catalogueData.releases[releaseId].composersPublishersMapping[trackId] && trackId === RoyaltyCalculator.contract.track._id.toString()) {
                    salesLine.catalogueComposer = RoyaltyCalculator.catalogueData.releases[releaseId].composersPublishersMapping[trackId].composer || '';
                    salesLine.cataloguePublisher = RoyaltyCalculator.catalogueData.releases[releaseId].composersPublishersMapping[trackId].publisher || '';
                  }
                });
              }
            });
          } else if (salesLine.catType === 'Track' && RoyaltyCalculator.catalogueData.tracks) {
            Object.keys(RoyaltyCalculator.catalogueData.tracks).forEach((trackId) => {
              if (RoyaltyCalculator.catalogueData.tracks[trackId] && trackId === salesLine.trackId) {
                salesLine.catalogueComposer = RoyaltyCalculator.catalogueData.tracks[trackId].composer || '';
                salesLine.cataloguePublisher = RoyaltyCalculator.catalogueData.tracks[trackId].publisher || '';
              }
            });
          }
        }

        delete salesLine._id;
        // Get Object Percentage
        // Pull rate if participation rate is an object
        const participationRate = salesLine.shipped_rights_percentage;

        calculation.objectPercentage = participationRate || participationRate === 0 ? participationRate : 100;
        // Prepare any mechanical requirements
        if (RoyaltyCalculator.contract && RoyaltyCalculator.contract.contractType === 'Mechanical' && salesLine.catType === 'Release' && RoyaltyCalculator.contract.track) {
          salesLine.trackId = RoyaltyCalculator.contract.track._id.toString();
          salesLine.catalogueTrackTitle = RoyaltyCalculator.contract.track.title;
          salesLine.catalogueTrackVersion = RoyaltyCalculator.contract.track.version;
          salesLine.catalogueTrackArtist = RoyaltyCalculator.contract.track.artist;
          salesLine.catalogueIsrc = RoyaltyCalculator.contract.track.isrc;
          // Release level mechanicals
          // Logic here to define what value is used in the output. Heirarchy is -
          // Controlled composition
          // Min Stat Rate
          // Sales Date
          // Custom
          if (RoyaltyCalculator.contract?.track?.controlledCompositionClause) {
            // Release IS a Controlled composition
            const minAmountField = calculation.rateBasis === 'US' ? 'usMinAmount' : 'caMinAmount';
            const perMinuteRateField = calculation.rateBasis === 'US' ? 'usPerMinuteRate' : 'caPerMinuteRate';
            let dateToUse;
            for (const startDate in RoyaltyCalculator.contract.track.statutoryRate) {
              if (startDate) {
                if (!dateToUse) { dateToUse = new Date(startDate); }

                if (RoyaltyCalculator.contract.track.statutoryRate[startDate] && startDate !== 'splitIntoDates') {
                  const date = new Date(startDate);
                  const saleDate = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
                  if (saleDate >= date && (RoyaltyCalculator.contract.track.statutoryRate[startDate][minAmountField] || RoyaltyCalculator.contract.track.statutoryRate[startDate][perMinuteRateField])) {
                    dateToUse = date;
                  }
                }
              }
            }
            const dateToUseInFormat = moment(dateToUse).format('YYYY-MM-DD');
            // Standard custom output format
            salesLine.mechanicalRate = RoyaltyCalculator.contract.track.statutoryRate[calculation.rateBasis];
            // Or Date Specific - this will be the case moving forward
            if (RoyaltyCalculator.contract.track?.statutoryRate[dateToUseInFormat]) {
              salesLine.mechanicalRate = RoyaltyCalculator.contract.track.statutoryRate[dateToUseInFormat][calculation.rateBasis];
            }
            // Specifically Min Stat Rate on a controlled composition?
            if (calculation.type === 'Min Statutory Rate') {
              const statRatesForCountry = calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
              const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
              const minStatRate = RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, 'minAmount');
              if (salesLine.mechanicalRate > minStatRate) {
                salesLine.mechanicalRate = minStatRate;
              }
            }
          } else if (calculation.type === 'Min Statutory Rate') {
            // Min Stat Rate
            const statRatesForCountry = calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
            const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
            salesLine.mechanicalRate = RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, 'minAmount');
          } else if (RoyaltyCalculator.contract.track.mechanicalCalculationBasis === 'Sale Date') {
            // Specifically the sale date set on the track, when calculation is 'Stat Rate'
            RoyaltyCalculator.contract.track.duration = RoyaltyCalculator.contract.track.duration || 1;
            // Use min amount when track duration is less than 5 minutes.
            const field = RoyaltyCalculator.contract.track.duration < 301 ? 'minAmount' : 'perMinuteRate';
            let minutes = 0;
            // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
            minutes = RoyaltyCalculator.contract.track.duration < 301 ? 1 : RoyaltyCalculator.getStatRateMinutes(RoyaltyCalculator.contract.track.duration);
            const statRatesForCountry = calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
            const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
            salesLine.mechanicalRate = minutes * RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, field);
          } else {
            // Custom set on the track
            salesLine.mechanicalRate = RoyaltyCalculator.contract.track.statutoryRate[calculation.rateBasis];
          }
          // Set participation rate here
          calculation.objectPercentage = RoyaltyCalculator.contract.objectPercentage || RoyaltyCalculator.contract.objectPercentage === 0 ? RoyaltyCalculator.contract.objectPercentage : 100;
        }
        // Track Level Mechanicals
        if (RoyaltyCalculator.contract && RoyaltyCalculator.contract.contractType === 'Mechanical' && salesLine.catType === 'Track') {
          if (calculation.type === 'Min Statutory Rate') {
            // get correct rate based on track stat type
            const statRatesForCountry = calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
            const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
            salesLine.mechanicalRate = RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, 'minAmount');
          } else if (RoyaltyCalculator.contract.terms.mechanicalCalculationBasis === 'Sale Date') {
            // When calculation.type === "Statutory Rate"
            RoyaltyCalculator.contract.terms.duration = RoyaltyCalculator.contract.terms.duration || 1;
            // Use min amount when track duration is less than 5 minutes.
            const field = RoyaltyCalculator.contract.terms.duration < 301 ? 'minAmount' : 'perMinuteRate';
            let minutes = 0;
            // If less than 5 minutes, multiply minAmount by 1, otherwise multiply perMuniteRate by the num,ber of minutes
            minutes = RoyaltyCalculator.contract.terms.duration < 301 ? 1 : RoyaltyCalculator.getStatRateMinutes(RoyaltyCalculator.contract.terms.duration);
            const statRatesForCountry = calculation.rateBasis === 'US' ? RoyaltyCalculator.statRates.usStatRates : RoyaltyCalculator.statRates.caStatRates;
            const date = salesLine.saleDate ? new Date(salesLine.saleDate) : RoyaltyCalculator.periodEndDate;
            salesLine.mechanicalRate = minutes * RoyaltyCalculator.getStatRateForDate(statRatesForCountry, date, field);
          } else {
            salesLine.mechanicalRate = RoyaltyCalculator.contract.terms.mechanicalAmount[calculation.rateBasis];
          }
          calculation.objectPercentage = RoyaltyCalculator.contract.objectPercentage || RoyaltyCalculator.contract.objectPercentage === 0 ? RoyaltyCalculator.contract.objectPercentage : 100;
        }

        // Get PPD
        let dealerPrice = 0;
        if (salesLine.shipped_catalogue_dealerPrice || JSON.parse(salesLine.shipped_catalogue_priceCategoryDealerPrices || '[]')?.length) {
          // Set any specific PPD first
          if (JSON.parse(salesLine.shipped_catalogue_priceCategoryDealerPrices || '[]')?.length) {
            // Search for price category in list and extract dealer price, looking for first instance
            dealerPrice = JSON.parse(salesLine.shipped_catalogue_priceCategoryDealerPrices || '[]').map((dp) => {
              let dealerPriceInCurrency = dp.dealerPrice;
              // If a currency is set for dealer price
              if (dp.currency) {
                // set the currency to convert to based on type
                const toCurrency = (fields.type === 'contractCurrency') ? RoyaltyCalculator.contract.terms.contractCurrency : 'Home Currency';
                // get the exchange rate to convert from the currency set for dealer price
                const exchangeRate = RoyaltyCalculator.exchangeRates.map((exRate) => {
                  if ((exRate.from === dp.currency) && (exRate.to === toCurrency)) {
                    return exRate.rate;
                  }
                }).filter(Boolean)[0];
                // apply the exchange rate
                dealerPriceInCurrency = dp.dealerPrice * (exchangeRate || 0);
              } else if (fields.type === 'contractCurrency') {
                // Multiply by exchange rate if not home currency
                dealerPriceInCurrency *= RoyaltyCalculator.contractExchangeRate;
              }
              if (dp.priceCategory === salesLine.priceCategory && (!dp.territory || dp.territory === 'WW')) {
                // Price Category no territory
                return dealerPriceInCurrency;
              } if (dp.territory === salesLine.territory && !dp.priceCategory) {
                // Territory, no price category
                return dealerPriceInCurrency;
              } if (dp.priceCategory === salesLine.priceCategory && dp.territory === salesLine.territory) {
                // Both
                return dealerPriceInCurrency;
              }
            }).filter(Boolean)[0];
            // If price category is found within specific price categories
            if (dealerPrice) {
              salesLine[fields.output.ppd] = dealerPrice;
            }
          }
        }

        // Default to standard PPD if doesn't exist in above otherwise to 0 when no ppds available
        if (salesLine.shipped_catalogue_dealerPrice) {
          salesLine[fields.output.ppd] = fields.type === 'contractCurrency' ? salesLine.shipped_catalogue_dealerPrice * RoyaltyCalculator.contractExchangeRate : salesLine.shipped_catalogue_dealerPrice;
        } else if (!salesLine[fields.output.ppd]) {
          salesLine[fields.output.ppd] = 0;
        }

        // Write calculations to sales line
        // Set Input
        if (calculation.type === 'Gross Receipts' && calculation.rate !== null && calculation.rate !== undefined) {
          salesLine[fields.output.calculationInput] = salesLine[fields.input.grossAmount];
        } else if (calculation.type === 'PPD' && calculation.rate !== null && calculation.rate !== undefined && (salesLine.shipped_catalogue_dealerPrice || JSON.parse(salesLine.shipped_catalogue_priceCategoryDealerPrices || '[]')?.length)) {
          if (dealerPrice) {
            salesLine[fields.output.calculationInput] = dealerPrice * salesLine.units;
          } else {
            salesLine[fields.output.calculationInput] = salesLine[fields.output.ppd] * salesLine.units;
          }
        } else if ((calculation.type === 'Net Receipts' || !calculation.type) && calculation.rate !== null && calculation.rate !== undefined) {
          salesLine[fields.output.calculationInput] = salesLine[fields.input.netAmount];
        } else if (calculation.type === 'Unit Price' && calculation.rate !== null && calculation.rate !== undefined && salesLine.homeCurrencyPerUnitRate) {
          salesLine[fields.output.calculationInput] = salesLine[fields.input.perUnitRate] * salesLine.units;
        } else if (calculation.type === 'Retail Price' && calculation.rate !== null && calculation.rate !== undefined && salesLine.homeCurrencyRetailPrice) {
          salesLine[fields.output.calculationInput] = salesLine[fields.input.retailPrice] * salesLine.units;
        } else if (calculation.type === 'Sale Price' && calculation.rate !== null && calculation.rate !== undefined && salesLine.homeCurrencySalePrice) {
          salesLine[fields.output.calculationInput] = salesLine[fields.input.salePrice] * salesLine.units;
        } else if (calculation.type === 'Unit Rate') {
          salesLine[fields.output.unitRate] = calculation.unitRate;
          salesLine[fields.output.calculationInput] = salesLine.units * calculation.unitRate;
          // Update Mechanical Rate if contract is a mechanical one
          if (RoyaltyCalculator.contract.contractType === 'Mechanical') {
            salesLine.mechanicalRate = calculation.unitRate;
          }
        } else if (calculation.type === 'Fixed Unit Rate') {
          salesLine[fields.output.unitRate] = calculation.unitRate;
          salesLine[fields.output.calculationInput] = salesLine.units * calculation.unitRate;
          if (RoyaltyCalculator.contract.contractType === 'Mechanical') {
            salesLine.mechanicalRate = calculation.unitRate;
          }
          calculation.objectPercentage = 100;
        } else if ((calculation.type === 'Statutory Rate' || calculation.type === 'Min Statutory Rate') && salesLine.mechanicalRate) {
          salesLine[fields.output.calculationInput] = salesLine.units * salesLine.mechanicalRate;
        } else {
          salesLine[fields.output.calculationInput] = 0;
        }
        // Set Pro Rata Amount
        salesLine[fields.output.proRataAmount] = salesLine[fields.output.calculationInput] * calculation.objectPercentage / 100;
        // Mechanical Deduction
        salesLine.mechanicalPercentage = salesLine.mechanicalPercentage || salesLine.mechanicalPercentage === 0 || salesLine.mechanicalPercentage === '0' ? salesLine.mechanicalPercentage : 100;
        if (salesLine.mechanicalType === 'PPD') {
          salesLine[fields.output.mechanicalAmount] = salesLine[fields.output.ppd];
        } else if (salesLine.mechanicalType === 'Net Receipts') {
          salesLine[fields.output.mechanicalAmount] = salesLine[fields.output.netAmount] / salesLine.units * salesLine.contractCurrencyExchangeRate;
        }
        if (salesLine.mechanicalAmount && !Number.isNaN(salesLine.mechanicalAmount) && salesLine.mechanicalPercentage) {
          // Convert mechanical to currency
          let mechanicalExchangeRate = RoyaltyCalculator.contract.terms.contractCurrency === salesLine.mechanicalCurrency || salesLine.mechanicalCurrency === 'Home Currency' || !salesLine.mechanicalCurrency || salesLine.mechanicalCurrency === '' ? 1 : 0;
          RoyaltyCalculator.exchangeRates.forEach((ex) => {
            if (ex
            && ex.from === salesLine.mechanicalCurrency
            && (
            // Contract Currency
              ex.to === RoyaltyCalculator.contract.terms.contractCurrency || (ex.to === 'homeCurrency' && RoyaltyCalculator.contract.terms.contractCurrency === 'Home Currency')
              // Home Currency
              || (ex.to === 'Home Currency' && fields.type === 'homeCurrency')
            )
            ) {
              mechanicalExchangeRate = ex.rate;
            }
          });
          salesLine[fields.output.mechanicalDeduction] = salesLine.units * salesLine.mechanicalAmount * calculation.objectPercentage / 100 * salesLine.mechanicalPercentage / 100 * mechanicalExchangeRate;
        } else {
          salesLine[fields.output.mechanicalDeduction] = 0;
        }
        // Deduction if Pre-Calculation
        salesLine.deductionRate = salesLine.deductionRate || 0;

        if (salesLine.deductionType !== 'Post-Calculation') {
          if (salesLine.deductionCalculationType === 'Sales Input') {
            salesLine[fields.output.deduction] = salesLine[fields.output.calculationInput];
          } else if (salesLine.deductionCalculationType === 'Gross Receipts') {
            salesLine[fields.output.deduction] = salesLine[fields.output.grossAmount];
          } else if (salesLine.deductionCalculationType === 'Net Receipts') {
            salesLine[fields.output.deduction] = salesLine[fields.output.netAmount];
          } else if (salesLine.deductionCalculationType === 'PPD') {
            salesLine[fields.output.deduction] = salesLine[fields.output.ppd] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Unit Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.perUnitRate] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Retail Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.retailPrice] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Sale Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.salePrice] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Unit Rate') {
            salesLine[fields.output.deduction] = salesLine[fields.output.deductionUnitRate] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Fixed Unit Rate') {
            salesLine[fields.output.deduction] = salesLine[fields.output.deductionUnitRate] * salesLine.units;
          } else {
            salesLine[fields.output.deduction] = 0;
          }

          if (salesLine[fields.output.deduction]) {
            // Apply deduction rate if available
            if (salesLine.deductionRate || salesLine.deductionRate === 0) { salesLine[fields.output.deduction] = salesLine[fields.output.deduction] * salesLine.deductionRate / 100; }
            // Apply deduction reduction rate if available
            if (salesLine.deductionReductionRate) { salesLine[fields.output.deduction] = salesLine[fields.output.deduction] * salesLine.deductionReductionRate / 100; }
            // Multiply deduction by object percentage to pro-rata
            if (salesLine.deductionCalculationType !== 'Fixed Unit Rate') {
              salesLine[fields.output.deduction] = salesLine[fields.output.deduction] * calculation.objectPercentage / 100;
            }
          }
        } else {
          salesLine[fields.output.deduction] = 0;
        }

        // Withholding Deduction if Pre-Calculation
        if (salesLine.withholdingTaxType !== 'Post-Calculation' && salesLine.withholdingTaxCalculationType === 'Unit Rate') {
          salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTaxUnitRate] * salesLine.units;
          if (salesLine.withholdingTaxRate) { salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * salesLine.withholdingTaxRate / 100; }
          if (salesLine.withholdingTaxReductionRate) { salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * salesLine.withholdingTaxReductionRate / 100; }
        } else if (salesLine.withholdingTaxType !== 'Post-Calculation' && salesLine.withholdingTaxCalculationType === 'Percentage') {
          salesLine[fields.output.withholdingTax] = salesLine[fields.output.calculationInput] * salesLine.withholdingTaxRate / 100;
          if (salesLine.withholdingTaxReductionRate) { salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * salesLine.withholdingTaxReductionRate / 100; }
        } else {
          salesLine[fields.output.withholdingTax] = 0;
        }
        // Multiply withholding tax by object percentage to pro-rata
        salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * calculation.objectPercentage / 100;
        // Check if to use Gross, Net, Unit Price or PPD
        if (calculation.type) {
          salesLine.calculationType = calculation.type;
        } else if (calculation.unitRate) {
          salesLine.calculationType = 'Unit Rate';
        } else {
          salesLine.calculationType = 'Net Receipts';
        }
        salesLine.objectPercentage = calculation.objectPercentage || calculation.objectPercentage === 0 ? calculation.objectPercentage : 100;
        salesLine.share = calculation.share || calculation.share === 0 ? calculation.share : 100;
        // Set share to 100% for fixed unit rate mechanicals
        if (RoyaltyCalculator.contract.contractType === 'Mechanical' && calculation.type === 'Fixed Unit Rate') {
          salesLine.share = 100;
        }
        // Set mechanical basis
        if (salesLine.catType === 'Release' && !RoyaltyCalculator.contract?.track?.controlledCompositionClause && RoyaltyCalculator.contract.contractType === 'Mechanical' && (salesLine.calculationType === 'Statutory Rate' || salesLine.calculationType === 'Min Statutory Rate')) {
          salesLine.mechanicalBasisPercentage = RoyaltyCalculator.contract.terms.mechanicalBasisPercentage ? RoyaltyCalculator.contract.terms.mechanicalBasisPercentage : 100;
        } else {
          salesLine.mechanicalBasisPercentage = 100;
        }
        // Set pro-rata amount for tracks against the release
        if (salesLine.catType === 'Release' && RoyaltyCalculator.contract.contractType === 'Mechanical' && RoyaltyCalculator.contract && RoyaltyCalculator.contract.terms && RoyaltyCalculator.contract.terms.totalTracks && RoyaltyCalculator.contract.terms.totalTracks > 0 && ['Net Receipts', 'Gross Receipts', 'PPD'].includes(salesLine.calculationType)) {
          salesLine.proRataTrackAmount = 1 / RoyaltyCalculator.contract.terms.totalTracks;
        } else {
          salesLine.proRataTrackAmount = 1;
        }
        if (salesLine.catType === 'Release' && RoyaltyCalculator.contract.contractType === 'Mechanical' && RoyaltyCalculator.contract && RoyaltyCalculator.contract.terms && salesLine.proRataTrackAmount && ['PPD'].includes(salesLine.calculationType)) {
          salesLine[fields.output.calculationInput] = salesLine.ppd * salesLine.units;
          logger.debug(`${salesLine.catalogueCatNo} ${salesLine[fields.output.calculationInput]} = ${salesLine.ppd} * ${salesLine.units}`);
        }
        salesLine.multiplier = calculation.multiplier || calculation.multiplier === 0 || calculation.multiplier === '0' ? calculation.multiplier : 1;
        salesLine.royaltyRate = calculation.rate || calculation.rate === 0 || calculation.rate === '0' ? calculation.rate : 100;
        salesLine.reductionRate = (calculation.reductionRate || calculation.reductionRate === 0) ? calculation.reductionRate : null;
        // Mechanical Type
        if (salesLine.mechanicalDeductionType === 'Post-Calculation') {
          salesLine[fields.output.calculationOutput] = 
            (
              (salesLine[fields.output.calculationInput] * salesLine.proRataTrackAmount - salesLine[fields.output.deduction])
              * calculation.objectPercentage / 100 * salesLine.share / 100 * salesLine.mechanicalBasisPercentage / 100 * salesLine.multiplier * salesLine.royaltyRate / 100
            )
              - salesLine[fields.output.mechanicalDeduction];
        } else {
          // Deduction and Mechanical already has been put through the share %
          salesLine[fields.output.calculationOutput] = salesLine[fields.output.calculationInput] * salesLine.proRataTrackAmount * calculation.objectPercentage / 100;
          salesLine[fields.output.calculationOutput] = 
          (salesLine[fields.output.calculationOutput] - salesLine[fields.output.deduction] - salesLine[fields.output.mechanicalDeduction])
          * salesLine.share / 100 * salesLine.mechanicalBasisPercentage / 100 * salesLine.multiplier * salesLine.royaltyRate / 100;
        }
        // Run any reductions if present
        if (calculation.reductionRate || calculation.reductionRate === 0) { salesLine[fields.output.calculationOutput] = salesLine[fields.output.calculationOutput] * salesLine.reductionRate / 100; }

        // Deduction if Post-Calculation
        if (salesLine.deductionType === 'Post-Calculation') {
          if (salesLine.deductionCalculationType === 'Sales Input') {
            salesLine[fields.output.deduction] = salesLine[fields.output.calculationOutput];
          } else if (salesLine.deductionCalculationType === 'Gross Receipts') {
            salesLine[fields.output.deduction] = salesLine[fields.output.grossAmount];
          } else if (salesLine.deductionCalculationType === 'Net Receipts') {
            salesLine[fields.output.deduction] = salesLine[fields.output.netAmount];
          } else if (salesLine.deductionCalculationType === 'PPD') {
            salesLine[fields.output.deduction] = salesLine[fields.output.ppd] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Unit Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.perUnitRate] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Retail Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.retailPrice] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Sale Price') {
            salesLine[fields.output.deduction] = salesLine[fields.output.salePrice] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Unit Rate') {
            salesLine[fields.output.deduction] = salesLine[fields.output.deductionUnitRate] * salesLine.units;
          } else if (salesLine.deductionCalculationType === 'Fixed Unit Rate') {
            salesLine[fields.output.deduction] = salesLine[fields.output.deductionUnitRate] * salesLine.units;
          }
          // Substract deduction from calculation output
          if (salesLine[fields.output.deduction]) {
            if (salesLine.deductionRate || salesLine.deductionRate === 0) { salesLine[fields.output.deduction] = salesLine[fields.output.deduction] * salesLine.deductionRate / 100; }
            if (salesLine.deductionReductionRate) { salesLine.deduction = salesLine.deduction * salesLine.deductionReductionRate / 100; }
            // Multiply deduction by object percentage to pro-rata
            if (!['Fixed Unit Rate', 'Sales Input'].includes(salesLine.deductionCalculationType)) {
              salesLine[fields.output.deduction] = salesLine[fields.output.deduction] * calculation.objectPercentage / 100;
            }
            // Deduct from output
            salesLine[fields.output.calculationOutput] -= salesLine[fields.output.deduction];
          }
        }

        // Withholding Tax if Post-Calculation - Witholding isn't deducted from net amount, is dealt with later in the process
        if (salesLine.withholdingTaxType === 'Post-Calculation' && salesLine.withholdingTaxCalculationType === 'Unit Rate') {
          salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTaxUnitRate] * salesLine.units * salesLine.withholdingTaxRate / 100;
          if (salesLine.withholdingTaxReductionRate) { salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * salesLine.withholdingTaxReductionRate / 100; }
          // Multiply withholding tax by object percentage to pro-rata
          salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * calculation.objectPercentage / 100;
        } else if (salesLine.withholdingTaxType === 'Post-Calculation' && salesLine.withholdingTaxCalculationType === 'Percentage') {
          salesLine[fields.output.withholdingTax] = salesLine[fields.output.calculationOutput] * salesLine.withholdingTaxRate / 100;
          if (salesLine.withholdingTaxReductionRate) { salesLine[fields.output.withholdingTax] = salesLine[fields.output.withholdingTax] * salesLine.withholdingTaxReductionRate / 100; }
        }
        // Set Reserve
        if (calculation.reserve) {
          salesLine.reserveRate = calculation.reserve;
          // Reserve can be taken on input or output, defaulting to output
          const reserveInput = calculation.reserveBasis === 'Pre-Calculation' ? salesLine[fields.output.calculationInput] : salesLine[fields.output.calculationOutput];
          if (reserveInput > 0) {
            salesLine[fields.output.reserve] = reserveInput * calculation.reserve / 100;
          } else {
            salesLine.reserveRate = 0;
            salesLine[fields.output.reserve] = 0;
          }
        } else {
          salesLine.reserveRate = 0;
          salesLine[fields.output.reserve] = 0;
        }
        cb();
      },
      function (cb) {
        // Update Escalations
        if (escalationTrackers) {
          escalationTrackers.forEach((escalationTrackingName) => {
            // Only do when in contract currency
            if (RoyaltyCalculator.escalationContract.escalationTracking && RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName] && fields.type === 'contractCurrency') {
              // Manage units
              let multiplier = 1;
              if (RoyaltyCalculator.escalationEquivalents && RoyaltyCalculator.escalationEquivalents.length > 0) {
                RoyaltyCalculator.escalationEquivalents.forEach((equivalent) => {
                  if (equivalent.configuration && equivalent.configuration === salesLine.configuration) {
                    multiplier = 1 / Number(equivalent.amount);
                  }
                });
              }
              // Manage montary amounts
              if (calculation.type === 'Gross Receipts' && (salesLine[fields.input.grossAmount] || salesLine[fields.input.grossAmount] === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine[fields.input.grossAmount];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'PPD' && (salesLine.ppd || salesLine.ppd === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine.ppd;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Net Receipts' && (salesLine[fields.input.netAmount] || salesLine[fields.input.netAmount] === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine[fields.input.netAmount];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Unit Price' && (salesLine[fields.input.perUnitRate] || salesLine[fields.input.perUnitRate] === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine[fields.input.perUnitRate] * salesLine.units;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Retail Price' && (salesLine[fields.input.retailPrice] || salesLine[fields.input.retailPrice] === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine[fields.input.retailPrice] * salesLine.units;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Sale Price' && (salesLine[fields.input.salePrice] || salesLine[fields.input.salePrice] === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine[fields.input.salePrice] * salesLine.units;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Unit Rate' && (calculation.unitRate || calculation.unitRate === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine.units * calculation.unitRate;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if (calculation.type === 'Fixed Unit Rate' && (calculation.unitRate || calculation.unitRate === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine.units * calculation.unitRate;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              } else if ((calculation.type === 'Statutory Rate' || calculation.type === 'Min Statutory Rate') && (salesLine.mechanicalRate || salesLine.mechanicalRate === 0)) {
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].gross += salesLine.units * salesLine.mechanicalRate;
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].net += salesLine[fields.output.calculationOutput];
                RoyaltyCalculator.escalationContract.escalationTracking[escalationTrackingName].units += salesLine.units * multiplier;
              }
            }
          });
        }
        cb();
      },
      function (cb) {
        // Add statement currency to salesLine
        let salesLineCurrency;
        // Find statement currency through clientCurrencies variable
        if (RoyaltyCalculator?.contract?.terms?.contractCurrency === 'Home Currency') {
          for (const key in clientCurrencies) {
            if (clientCurrencies[key] === 'homeCurrency') {
              salesLineCurrency = key;
            }
          }
        } else {
          salesLineCurrency = RoyaltyCalculator?.contract?.terms?.contractCurrency;
        }
        // Set statement currency on salesLine
        salesLine.contractCurrency = salesLineCurrency;
        cb();
      },
    ], callback);
  };
};
