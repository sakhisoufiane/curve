/**
 * @module mapper
 */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const moment = require('moment');
const uuid = require('uuid');
const Calculation = require('./calculation');
const { fieldToFormat, ApplyMultiplier } = require('./salesIngestionUtils');

/**
 * Removes full stops from *value* if it is a string, otherwise just returns *value*
 *
 * @param {string|number} value - any number or string
 * @returns {string|number} string with full stops removed, if not a string returns *value*
 */
function removeFullStopsForMapping(value) {
  if (typeof value === 'string') {
    return value.replace(/\./g, '');
  }
  return value;
}

module.exports = {
  /**
   * Maps Sales Data to Template
   *
   * * Calls `callback(err, result)` with `result` containing Sales Data mapped to the template fields
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {array[]} array - Sales Data to process
   * @param {object} event - Object with information for sales ingestion
   * @param {number} perUnitRate - Per Unit Rate obtained from pro-rata amount
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {string[]} allowedKeys - Allowed keys for the DB from the Big Query lib
   * @param {object} fieldTypes - Field types from Big Query
   * @param {object} currencies - Currencies from client settings
   * @param {object[]} exchangeRates - Exchange Rates from Sales File applied to client currencies
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {function(string, object[])} callback - A callback that handles the response
   */
  arrayToTemplate(array, event, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, allowedKeys, fieldTypes, currencies, exchangeRates, facebookPerUnitRates, callback) {
    const mapper = this;
    if (array && event.template) {
      const result = [];
      async.each(array, (line, cb) => {
        // Map each line to template
        const index = array.indexOf(line);
        mapper.lineToTemplate(line, index, event.salesFileId, event.templateSource, event.template, event.overwriteFields, event.catalogue, event.calculation, event.catalogueOverwritingData, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, currencies, exchangeRates, facebookPerUnitRates, (err, mappedLines) => {
          if (err) {
            logger.error('Error returned by mapper.lineToTemplate', err);
            cb(err);
          } else {
            async.each(mappedLines, (ml, mlCb) => {
              // Set Partition No of each line
              ml.partitionNo = event.partitionNo;
              // Manage Skipping row
              const { skip } = ml;
              Object.keys(ml).forEach((key) => {
                if (!allowedKeys.includes(key) || key === 'priceCategoryDealerPrices') {
                  // Remove any fields that don't exist in the DB
                  delete ml[key];
                } else if (fieldTypes[key] === 'FLOAT' && isNaN(parseFloat(ml[key]))) {
                  // Remove any non numbers
                  delete ml[key];
                } else if (fieldTypes[key] === 'DATE') {
                  // Remove any dates that are corrupt
                  if (String(ml[key]).length != 10) {
                    delete ml[key];
                  }
                } else if (fieldTypes[key] === 'STRING' && (ml[key] || ml[key] == 0)) {
                  // Force any into strings that require it
                  ml[key] = String(ml[key]);
                }
              });
              if (!skip) { result.push(ml); }
              mlCb();
            }, (err) => {
              cb(err);
            });
          }
        });
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          callback(null, result);
        }
      });
    } else if (!array && !event.template) {
      callback(new Error('Requires an array of lines and template'));
    } else if (!event.template) {
      callback(new Error('Requires a template'));
    } else {
      callback(new Error('Requires an array of lines'));
    }
  },

  /**
   * Splits Returns for mapped Sales Line
   *
   * * Calls `callback(err, lines)` with `lines` containing the processed Sales Lines
   * * Calls `callback(err, result)` with an `err` message if an error occurs
   *
   * @param {object} line - Sales Line mapped to template
   * @param {function(string, object[])} callback - A callback that handles the response
   */
  splitReturns(line, index, callback) {
    try {
      if ((line.returnUnits && line.returnNetAmount) || (line.returnUnits && line.returnGrossAmount)) {
        const lines = [];
        // Add line if units and netAmount or grossAmount exists - eg. it should add multiple lines if positive and negative exist
        if ((line.units && line.returnNetAmount) || (line.units && line.returnGrossAmount)) {
          lines.push(line);
        }

        // Create new line for returns
        const returnLine = { ...line };
        // Reissue ID for return line
        returnLine.id = uuid.v5(moment().format('YYYYMMDDHHmmSSssss') + returnLine.salesFileId + index, uuid.v5.DNS);
        // Make any returns units negative
        if (returnLine.returnUnits > 0) { returnLine.returnUnits *= -1; }
        // Switch returns to units
        returnLine.units = returnLine.returnUnits;

        if (returnLine.returnNetAmount) {
          // Make any net amount negative
          if (returnLine.returnNetAmount > 0) { returnLine.returnNetAmount *= -1; }
          // Switch net amount to returns value
          returnLine.netAmount = returnLine.returnNetAmount;
        }

        if (returnLine.returnGrossAmount) {
          // Make any net amount negative
          if (returnLine.returnGrossAmount > 0) { returnLine.returnGrossAmount *= -1; }
          // Switch gross amount to returns value
          returnLine.grossAmount = returnLine.returnGrossAmount;
        }

        // Push return line onto array
        lines.push(returnLine);
        callback(null, lines);
      } else {
        callback(null, [line]);
      }
    } catch (err) {
      callback(new Error('There was an error in splitting returns'));
    }
  },

  /**
   * Maps Sales Line to Template
   *
   * * Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the Sales Line mapped to the template fields
   * * Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs
   *
   * @param {array} line - Sales Line to map to template
   * @param {number} index - Index of Line in Sales Lines array
   * @param {string} salesFileId - The Sales File id
   * @param {string} templateSource - The Template source
   * @param {object[]} template - The Template fields
   * @param {object} overwriteFields - List of default values for fields, used to overwrite values from Sales Data
   * @param {object} catalogue - Configuration from Client Settings, template mappings as well as reduced catalogue data for client
   * @param {object[]} calculation - Calculation definitions from template
   * @param {object} catalogueOverwritingData - All Catalogue Data for client
   * @param {number} perUnitRate - Per Unit Rate obtained from pro-rata amount
   * @param {object} iTunesExchangeRates - Exchange rates for Apple/iTunes files
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {object} currencies - Currencies from Client Settings
   * @param {object[]} exchangeRates - Exchange Rates from Sales File applied to client currencies
   * @param {object} facebookPerUnitRates - Per Production rates from Facebook Financial File
   * @param {function(string, overwrittenObject)} callback - A callback that handles the response
   */
  lineToTemplate(line, index, salesFileId, templateSource, template, overwriteFields, catalogue, calculation, catalogueOverwritingData, perUnitRate, iTunesExchangeRates, iTunesPerUnitRates, currencies, exchangeRates, facebookPerUnitRates, callback) {
    const mapper = this;
    if (line && template) {
      try {
        const newObject = { salesFileId, id: uuid.v5(moment().format('YYYYMMDDHHmmSSssss') + salesFileId + index, uuid.v5.DNS) };
        async.forEachOf(line, (value, i, cb) => {
          // Ignore any blank or ignore fields
          if (template[i] && template[i].field !== 'blank' && template[i].field !== 'ignore') {
            // Map the value using the fieldToFormat function
            newObject[template[i].field] = fieldToFormat(value, template[i].field, template[i].type);
          }
          cb();
        }, () => {
          const output = [];
          // Split Returns
          mapper.splitReturns(newObject, index, (err, mappedLines) => {
            async.each(mappedLines, (obj, eachCb) => {
              processLine(obj, (processErr, objOut) => {
                if (processErr) {
                  eachCb(processErr);
                } else {
                  output.push(objOut);
                  eachCb();
                }
              });
            }, (eachErr) => {
              if (eachErr) {
                callback(eachErr);
              } else {
                callback(null, output);
              }
            });
          });
        });
      } catch (err) {
        callback(err);
      }
    } else if (!line && !template) {
      callback(new Error('Requires an array of lines and template'));
    } else if (!template) {
      callback(new Error('Requires a template'));
    } else {
      callback(new Error('Requires an array of lines'));
    }

    function processLine(obj, processCb) {
      async.waterfall([
        function (cb) {
          // Overwrite any of the standard fields
          mapper.overwriteFields(obj, overwriteFields, cb);
        },
        function (overwrittenObject, cb) {
          // Check if it has a per unit rate for Facebook type
          // if so, set gross value according to units and rate, using default value for units if no units supplied
          mapper.addFacebookPerUnitRate(facebookPerUnitRates, overwrittenObject, cb);
        },
        function (overwrittenObject, cb) {
          // First Pass of Calculations
          Calculation.startCalculation(line, overwrittenObject, calculation, template, 1, cb);
        },
        function (overwrittenObject, cb) {
          // Map Fields
          mapper.mapAllFields(overwrittenObject, templateSource, catalogue, cb);
        },
        function (overwrittenObject, cb) {
          // Set catalogue data
          overwrittenObject = mapper.setCatalogueData(overwrittenObject, catalogueOverwritingData, overwriteFields, 1);
          cb(null, overwrittenObject);
        },
        function (overwrittenObject, cb) {
          // Set Negative If Required
          mapper.setNegative(overwrittenObject, cb);
        },
        function (overwrittenObject, cb) {
          mapper.setITunesExchangeRates(overwrittenObject, iTunesExchangeRates, cb);
        },
        function (overwrittenObject, cb) {
          // Checking if it has proRataAmount
          mapper.addPerUnitRate(perUnitRate, overwrittenObject, cb);
        },
        function (overwrittenObject, cb) {
          // Checking if it has proRataAmount
          mapper.addiTunesPerUnitRate(iTunesPerUnitRates, overwrittenObject, cb);
        },
        function (overwrittenObject, cb) {
          // Second Pass of Calculations - to allow for any calculations based on unit rates, etc.
          Calculation.startCalculation(line, overwrittenObject, calculation, template, 2, cb);
        },
        function (overwrittenObject, cb) {
          // Second Pass of Mappings - to allow for anything that is set in calculations
          mapper.mapAllFields(overwrittenObject, templateSource, catalogue, cb);
        },
        function (overwrittenObject, cb) {
          // Run Exchange Rates
          mapper.runExchangeRates(overwrittenObject, currencies, exchangeRates, cb);
        },
        function (overwrittenObject, cb) {
          // Run any final multiplier
          mapper.runMultiplier(overwrittenObject, currencies, cb);
        },
        function (overwrittenObject, cb) {
          // Set catalogue data
          overwrittenObject = mapper.setCatalogueData(overwrittenObject, catalogueOverwritingData, overwriteFields, 2);
          cb(null, overwrittenObject);
        },
        function (overwrittenObject, cb) {
          // Clear blank dates
          if (overwrittenObject.saleDate && (overwrittenObject.saleDate == new Date(null) || isNaN(overwrittenObject.saleDate))) { delete overwrittenObject.saleDate; }
          if (overwrittenObject.transactionDate && (overwrittenObject.transactionDate == new Date(null) || isNaN(overwrittenObject.transactionDate))) { delete overwrittenObject.transactionDate; }
          if (overwrittenObject.dateFrom && (overwrittenObject.dateFrom == new Date(null) || isNaN(overwrittenObject.dateFrom))) { delete overwrittenObject.dateFrom; }
          if (overwrittenObject.dateTo && (overwrittenObject.dateTo == new Date(null) || isNaN(overwrittenObject.dateTo))) { delete overwrittenObject.dateTo; }
          // Finish by setting status
          mapper.setStatus(overwrittenObject, cb);
        },
      ], (err, overwrittenObject) => {
        // Set dates to SQL style dates
        if (overwrittenObject.saleDate) { overwrittenObject.saleDate = moment(overwrittenObject.saleDate).format('YYYY-MM-DD'); }
        if (overwrittenObject.transactionDate) { overwrittenObject.transactionDate = moment(overwrittenObject.transactionDate).format('YYYY-MM-DD'); }
        if (overwrittenObject.dateFrom) { overwrittenObject.dateFrom = moment(overwrittenObject.dateFrom).format('YYYY-MM-DD'); }
        if (overwrittenObject.dateTo) { overwrittenObject.dateTo = moment(overwrittenObject.dateTo).format('YYYY-MM-DD'); }
        // Delete blank values
        delete overwrittenObject.undefined;
        delete overwrittenObject.null;
        processCb(err, overwrittenObject);
      });
    }
  },

  /**
   * Calculates and adds grossAmount & netAmount using Per Unit Rate and number of units for overwrittenObject
   *
   * * Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
   * * Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs
   *
   * @param {number} perUnitRate - The Per Unit rate
   * @param {object} overwrittenObject - Sales Line
   * @param {function(string, overwrittenObject)} callback - A callback that handles the response
   */
  addPerUnitRate(perUnitRate, overwrittenObject, callback) {
    try {
      if (!perUnitRate) {
        callback(null, overwrittenObject);
      } else {
        overwrittenObject.grossAmount = perUnitRate * overwrittenObject.units;
        overwrittenObject.netAmount = perUnitRate * overwrittenObject.units;
        callback(null, overwrittenObject);
      }
    } catch (err) {
      logger.error('Error in mapper.addPerUnitRate', err);
      callback(new Error('There was an error in calculating the Per Unit Rate. Check units are mapped correctly and the Per Unit Rate is set.'));
    }
  },

  /**
   * Calculates and adds grossAmount & netAmount using iTunes Per Unit Rates and number of units for overwrittenObject
   *
   * * Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
   * * Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs
   *
   * @param {object} iTunesPerUnitRates - Per Unit Rates for iTunes Match files
   * @param {object} overwrittenObject - Sales Line
   * @param {function(string, overwrittenObject)} callback - A callback that handles the response
   */
  addiTunesPerUnitRate(iTunesPerUnitRates, overwrittenObject, callback) {
    try {
      if (iTunesPerUnitRates && Object.keys(iTunesPerUnitRates).length > 0) {
        overwrittenObject.grossAmount = iTunesPerUnitRates[overwrittenObject.territory] * overwrittenObject.units;
        overwrittenObject.netAmount = iTunesPerUnitRates[overwrittenObject.territory] * overwrittenObject.units;
        callback(null, overwrittenObject);
      } else {
        callback(null, overwrittenObject);
      }
    } catch (err) {
      logger.error('Error in mapper.addiTunesPerUnitRate', err);
      callback(new Error('There was an error in calculating the Per Unit Rate. Check units are mapped correctly and the Per Unit Rate is set.'));
    }
  },

  /**
   * Calculates and adds grossAmount using Facebook Per Unit Rates and number of units for overwrittenObject. Defaults units to 50 if it doesn't exist.
   *
   * * Calls `callback(err, overwrittenObject)` with `overwrittenObject` containing the updated Sales Line
   * * Calls `callback(err, overwrittenObject)` with an `err` message if an error occurs
   *
   * @param {object} facebookPerUnitRates - Per Unit Rates for Facebook files
   * @param {object} overwrittenObject - Sales Line
   * @param {function(string, overwrittenObject)} callback - A callback that handles the response
   */
  addFacebookPerUnitRate(facebookPerUnitRates, overwrittenObject, callback) {
    try {
      if (facebookPerUnitRates && Object.keys(facebookPerUnitRates).length > 0) {
        overwrittenObject.units = overwrittenObject.units || 50; // Default units to 50 if they are missing
        overwrittenObject.grossAmount = facebookPerUnitRates[overwrittenObject.originalTerritory] * overwrittenObject.units;
        callback(null, overwrittenObject);
      } else {
        callback(null, overwrittenObject);
      }
    } catch (err) {
      logger.error('Error in mapper.addFacebookPerUnitRate', err);
      callback(new Error('There was an error in calculating the Per Unit Rate. Check units are mapped correctly and the Per Unit Rate is set.'));
    }
  },

  /**
   * Maps catalogue values to the provided Sales Line object and returns the object
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {string} templateSource - The Template source
   * @param {object} fields - Catalogue data and template mappings
   * @param {function(string, object)} callback - A callback that handles the response
   */
  mapAllFields(object, templateSource, fields, callback) {
    if (object && fields) {
      try {
        // Copy any specified fields before carrying out any mappings
        if (fields.copyFields) {
          fields.copyFields.forEach((copyField) => {
            object[copyField.to] = object[copyField.from];
          });
        }

        // Maps each of the fields - should only run the mapping if it does not have a mapping currently in place
        if (!object.territory) {
          object.territory = this.mapValue(removeFullStopsForMapping(object.originalTerritory), fields.territories);
          if (!object.territory) { object.territory = this.mapValue('', fields.territories); }
        }
        if (!object.distributionChannel) {
          object.distributionChannel = this.mapValue(removeFullStopsForMapping(object.originalDistributionChannel), fields.distributionChannels);
          if (!object.distributionChannel) { object.distributionChannel = this.mapValue('', fields.distributionChannels); }
        }
        if (!object.configuration) {
          object.configuration = this.mapValue(removeFullStopsForMapping(object.originalConfiguration), fields.configurations);
          if (!object.configuration) { object.configuration = this.mapValue('', fields.configurations); }
        }
        if (!object.priceCategory) {
          object.priceCategory = this.mapValue(removeFullStopsForMapping(object.originalPriceCategory), fields.priceCategories);
          if (!object.priceCategory) { object.priceCategory = this.mapValue('', fields.priceCategories); }
        }
        if (!object.positiveNegative) {
          object.positiveNegative = this.mapValue(removeFullStopsForMapping(object.originalPositiveNegative), fields.positiveNegatives);
          if (!object.positiveNegative) { object.positiveNegative = this.mapValue('', fields.positiveNegatives); }
        }
        const previousSource = object.source;
        object.source = this.mapValue(removeFullStopsForMapping(object.source), fields.sources);
        if (!object.source) { object.source = previousSource; }
        const previousSubSource = object.subSource;
        object.subSource = this.mapValue(removeFullStopsForMapping(object.subSource), fields.subSources);
        if (!object.subSource) { object.subSource = previousSubSource; }
        const previousCurrency = object.originalCurrency;
        object.originalCurrency = this.mapValue(removeFullStopsForMapping(object.originalCurrency), fields.currencies);
        if (!object.originalCurrency) { object.originalCurrency = previousCurrency; }

        // @tom: is the below required? Seems to be covered above already
        if (!object.configuration) { object.configuration = this.mapValue('', fields.configurations); }

        object.catType = this.calculateCatType(object);
        // Create work title for mapping
        object.titleMapper = this.createTitleMap(object);
        // releaseId, trackId, workId
        this.mapToCatalogue(object, templateSource, fields, (err, object) => {
          callback(err, object);
        });
      } catch (err) {
        logger.error('Error in mapper.mapAllFields', err);
        callback(new Error('There was an error mapping the values to their mapped values. Please check mappings against file and try again.'));
      }
    } else {
      callback(null, object);
    }
  },

  /**
   * Creates Title from originalWorkTitle with any party available on Sales Line, separated by " - "
   *
   * @param {object} object - Sales Line
   * @returns {string} Combined Title, e.g. "In The Shadows - Jane Doe - John Doe"
   */
  createTitleMap(object) {
    let string = '';
    if (object.originalWorkTitle) { string += object.originalWorkTitle; }
    if (object.party1) { string += ` - ${object.party1}`; }
    if (object.party2) { string += ` - ${object.party2}`; }
    if (object.party3) { string += ` - ${object.party3}`; }
    return string.replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
  },

  /**
   * Applies any mappings to the supplied value if the value is found in *mapping*
   *
   * @param {string|number} originalValue - Value provided which can be of string or number
   * @param {object} mapping - Object containing mappings to use
   * @returns {string} - Mapped value
   */
  mapValue(originalValue, mapping) {
    if ((originalValue || originalValue === '') && mapping) {
      // Following the rule in libs/mappings.js line 95
      // If mapping is N/A, do not clean the string. N/A is a valid mapping, so we need to preserve this
      if (originalValue !== 'N/A') {
        originalValue = String(originalValue).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
      }
      const found = mapping[originalValue];
      if (found) {
        return found;
      }
      return null;
    }
    return null;
  },

  /**
   * Works out the Catalogue Type from any other catalogue related values that relate to certain catTypes, e.g. "tunecode" => "Work", "catNo" => "Release"
   *
   * @param {object} object - Sales Line
   * @returns {string} The catType of either Work | Track | Release | Contract or null if none found
   */
  calculateCatType(object) {
    // Check the cat type hasn't been set already when revalidating sales
    // When it is set and has the relevant item in the ids, do not change
    if (object.catType) {
      return object.catType;
    }
    // When no cat type is set
    if (object && (object.originalIdentifier || object.tunecode || object.iswc || object.songCode || object.originalWorkTitle || object.originalComposers)) {
      return 'Work';
    } if (object && (object.isrc || object.alternativeId)) {
      return 'Track';
    } if (object && (object.catNo || object.barcode)) {
      return 'Release';
    } if (object && object.contractIdentifier) {
      return 'Contract';
    }
    return null;
  },

  /**
   * Overwrites any values with the value from overwriteFields (from Sales File document)
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {object} fields - Overwrite Fields
   * @param {function(string, object)} callback - A callback that handles the response
   */
  overwriteFields(object, fields, callback) {
    if (object && fields) {
      try {
        async.each(Object.keys(fields), (key, cb) => {
          try {
            if ((!object[key] || object[key] === '' || (object[key] instanceof Date && Number.isNaN(Number(object[key])))) && fields[key] && fields[key] !== '' && fields[key] != null) {
              object[key] = fields[key];
            }
            cb();
          } catch (e) {
            cb(e);
          }
        }, (err) => {
          if (err) {
            logger.error('Error in mapper.overwriteFields', err);
            callback(new Error('There was an error matching the fields to the template. Please check the file matches the template, and try again.'));
          } else {
            callback(null, object);
          }
        });
      } catch (err) {
        logger.error('Error caught in mapper.overwriteFields', err);
        callback(new Error('There was an error matching the fields to the template. Please check the file matches the template, and try again.'));
      }
    } else {
      callback(null, object);
    }
  },

  /**
   * Applies Exchange Rates obtained from iTunes Financial File based, dealing with USD territories
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {object} iTunesExchangeRates - Exchange Rates obtained from iTunes Financial File
   * @param {function(string, object)} callback - A callback that handles the response
   */
  setITunesExchangeRates(object, iTunesExchangeRates, callback) {
    if (iTunesExchangeRates && Object.keys(iTunesExchangeRates).length > 0) {
      const LatamCaribbean = ['AI', 'AG', 'AR', 'AW', 'BS', 'BB', 'BZ', 'BO', 'BQ', 'BV', 'BR', 'KY', 'CL', 'CO', 'CR', 'CU', 'CW', 'DM', 'DO', 'EC', 'SV', 'FK', 'GF', 'GD', 'GP', 'GT', 'GY', 'HT', 'HN', 'JM', 'MQ', 'MX', 'MS', 'NI', 'PA', 'PY', 'PE', 'PR', 'BL', 'KN', 'LC', 'MF', 'VC', 'SX', 'GS', 'SR', 'TT', 'TC', 'UY', 'VE', 'VG', 'VI'];
      const usTerritories = ['AI', 'AG', 'AR', 'BB', 'BM', 'BO', 'BS', 'BZ', 'CR', 'DO', 'DM', 'EC', 'GD', 'GY', 'GT', 'HN', 'KN', 'KY', 'NI', 'PA', 'PY', 'SV', 'TT', 'VE', 'VG', 'US'];
      if (object.originalCurrency === 'USD' && iTunesExchangeRates['Latam Caribbean USD'] && LatamCaribbean.includes(object.territory)) {
        object.exchangeRate = iTunesExchangeRates['Latam Caribbean USD'];
      } else if (object.originalCurrency === 'USD' && usTerritories.includes(object.territory)) {
        object.exchangeRate = iTunesExchangeRates['Americas USD'];
      } else if (object.originalCurrency === 'USD' && !usTerritories.includes(object.territory)) {
        object.exchangeRate = iTunesExchangeRates['ROW USD'];
      } else {
        object.exchangeRate = iTunesExchangeRates[object.originalCurrency];
      }
      callback(null, object);
    } else {
      callback(null, object);
    }
  },

  /**
   * Sets status of Sales Line, when all required values are available, the status is set to "Complete", otherwise "Incomplete" (unless status is "Suspense")
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {function(string, object)} callback - A callback that handles the response
   */
  setStatus(object, callback) {
    try {
      // Check if invalid catalogue info is included - checks needed for things mapped directly to contracts on publishing client
      const containsWorkInfo = !!(object.originalIdentifier || object.tunecode || object.iswc || object.songCode || object.originalWorkTitle || object.originalComposers);
      const invalidTrackData = !!(object.isrc && !object.trackId && !containsWorkInfo);
      const invalidReleaseData = !!((object.catNo || object.barcode) && !object.releaseId && !containsWorkInfo);
      const invalidWorksData = !!(containsWorkInfo && !object.workId);
      const includesInvalidCatItem = invalidWorksData || invalidTrackData || invalidReleaseData;

      // Now check the data validity to determine row status. Must contain required fields and one of productID, trackID, workID or contractId
      const basicChecks = !!(object && object.catType && object.territory && object.distributionChannel && object.configuration && object.source && object.originalCurrency && object.exchangeRate && object.saleDate && object.transactionDate);
      const netAmountChecks = !!((object.netAmount || object.netAmount == 0) || (object.returnNetAmount || object.returnNetAmount == 0));
      const catTypeChecks = !!((object.catType === 'Contract' && object.contractId && !includesInvalidCatItem) || (object.catType === 'Release' && (object.releaseId || object.contractId)) || (object.catType === 'Track' && (object.trackId || object.contractId)) || (object.catType === 'Work' && (object.workId || object.contractId)));

      // Set the status according to validity checks
      if (basicChecks && netAmountChecks && catTypeChecks) {
        object.status = 'Complete';
      } else if (object && object.status !== 'Suspense') {
        object.status = 'Incomplete';
      }

      // logger.debug({ invalidTrackData, invalidReleaseData, invalidWorksData, includesInvalidCatItem, basicChecks, netAmountChecks, catTypeChecks, status: object.status });

      callback(null, object);
    } catch (err) {
      logger.error('Error in mapper.setStatus', err);
      callback(new Error("There was an error in setting the sales line's status. Check all expected values are present and try again."));
    }
  },

  /**
   * Changes Gross Amount and Net Amount to negative values if positiveNegative is set to "Negative"
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {function(string, object)} callback - A callback that handles the response
   */
  setNegative(object, callback) {
    try {
      if (object.positiveNegative === 'Negative') {
        if (object.grossAmount) { object.grossAmount = 0 - object.grossAmount; }
        if (object.netAmount) { object.netAmount = 0 - object.netAmount; }
      }
      callback(null, object);
    } catch (err) {
      logger.error('Error in mapper.setNegative', err);
      callback(new Error('There was an error setting the values to negative. Check the negative flag, and amounts are correct and try again.'));
    }
  },

  /**
   * Uses exchange rates and monetary values to work out and set respective Home Currency amounts (e.g. homeCurrencyGrossAmount)
   *
   * * In addition sets the Exchange Rate for the Sales Line
   * * Additionally sets Exchange Rates for any Currencies defined in client settings for the Sales Line
   * * And if applicable works out amounts for each of these additional Currencies as well
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {object} currencies - Currencies from client settings
   * @param {object[]} exchangeRates - Exchange Rates from Sales File applied to client currencies
   * @param {function(string, object)} callback - A callback that handles the response
   */
  runExchangeRates(object, currencies, exchangeRates, callback) {
    try {
      // Apply exchangeRate to monetary values and set as Home Currency amounts
      if (object.exchangeRate && (object.mechanicalAtSource || object.mechanicalAtSource == 0)) { object.homeCurrencyMechanicalAtSource = object.mechanicalAtSource * object.exchangeRate; }
      if (object.exchangeRate && (object.discountAmount || object.discountAmount == 0)) { object.homeCurrencyDiscountAmount = object.discountAmount * object.exchangeRate; }
      if (object.exchangeRate && (object.grossAmount || object.grossAmount == 0)) { object.homeCurrencyGrossAmount = object.grossAmount * object.exchangeRate; }
      if (object.exchangeRate && (object.netAmount || object.netAmount == 0)) { object.homeCurrencyNetAmount = object.netAmount * object.exchangeRate; }
      if (object.exchangeRate && (object.returnGrossAmount || object.returnGrossAmount == 0)) { object.homeCurrencyReturnGrossAmount = object.returnGrossAmount * object.exchangeRate; }
      if (object.exchangeRate && (object.returnNetAmount || object.returnNetAmount == 0)) { object.homeCurrencyReturnNetAmount = object.returnNetAmount * object.exchangeRate; }
      if (object.exchangeRate && (object.perUnitRate || object.perUnitRate == 0)) { object.homeCurrencyPerUnitRate = object.perUnitRate * object.exchangeRate; }
      if (object.exchangeRate && (object.retailPrice || object.retailPrice == 0)) { object.homeCurrencyRetailPrice = object.retailPrice * object.exchangeRate; }
      if (object.exchangeRate && (object.salePrice || object.salePrice == 0)) { object.homeCurrencySalePrice = object.salePrice * object.exchangeRate; }
      if (exchangeRates && exchangeRates.length > 0 && currencies) {
        // Reverse Currencies for mapping
        const currencyMappings = {};
        Object.keys(currencies).forEach((key) => {
          currencyMappings[currencies[key]] = key;
        });
        currencyMappings['Home Currency'] = 'homeCurrency';
        // Loop through each exchange rate
        exchangeRates.forEach((ex) => {
          // Check original currency of line matches the from value
          if (ex && ex.from == object.originalCurrency) {
            // Get prefix for which field to write to
            const prefix = currencyMappings[ex.to];
            // When prefix exists - eg. don't do it when prefix doesn't exist
            if (prefix) {
              // Check for home currency to set specific exchange
              if (prefix === 'homeCurrency') {
                object.exchangeRate = ex.rate;
              } else {
                // Set exchange rate for prefix
                object[`${prefix}ExchangeRate`] = ex.rate;
              }
              // Loop through monetary values
              ['mechanicalAtSource', 'discountAmount', 'grossAmount', 'netAmount', 'returnGrossAmount', 'returnNetAmount', 'perUnitRate', 'retailPrice', 'salePrice'].forEach((term) => {
                // When object has value
                if (object[term] || object[term] == 0) {
                  // Set key to be correct camelcase
                  const key = prefix + (term[0].toUpperCase() + term.slice(1));
                  // Write value to object
                  object[key] = object[term] * ex.rate;
                }
              });
            }
          }
        });
      }

      callback(null, object);
    } catch (err) {
      logger.error('Error in mapper.runExchangeRates', err);
      callback(new Error('There was an error in running the exchange rates. Check that exchange rates are numbers and gross and net amounts are set.'));
    }
  },

  /**
   * Applies multiplier to monetary values
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {function(string, object)} callback - A callback that handles the response
   */
  runMultiplier(object, currencies, callback) {
    try {
      const applyMultiplier = new ApplyMultiplier(object.multiplier);
      object = applyMultiplier.applyToObjectByKeys({
        object,
        keys: ['grossAmount',
          'mechanicalAtSource',
          'discountAmount',
          'netAmount'],
      });
      const homePlusMultiCurrencies = ['homeCurrency', ...Object.keys(currencies || {})];
      for (const prefix of homePlusMultiCurrencies) {
        object = applyMultiplier.applyToObjectByKeys({
          object,
          keys: [
            `${prefix}GrossAmount`,
            `${prefix}MechanicalAtSource`,
            `${prefix}DiscountAmount`,
            `${prefix}NetAmount`,
            `${prefix}ReturnGrossAmount`,
            `${prefix}ReturnNetAmount`],
        });
      }
      callback(null, object);
    } catch (err) {
      logger.error('Error in mapper.runMultiplier', err);
      callback(new Error('There was an error in running the multiplier. Check that multiplier is a number and gross and net amounts are set.'));
    }
  },

  /**
   * Maps missing workId, trackId, releaseId or contractId from catalogue data
   *
   * * Calls `callback(err, object)` with `object` containing the updated Sales Line
   * * Calls `callback(err, object)` with an `err` message if an error occurs
   *
   * @param {object} object - Sales Line
   * @param {string} templateSource - The Template source
   * @param {object} catalogue - Configuration from Client Settings as well as reduced catalogue data for client
   * @param {function(string, object)} callback - A callback that handles the response
   */
  mapToCatalogue(object, templateSource, catalogue, callback) {
    try {
      // catalogue { releases: [{ key: { format: value, format: value } }], tracks: [{ key: value }], works: [{ key: value }] }
      if (!object.ignoreMapper) {
        if (['Work', 'Contract'].includes(object.catType) && !object.workId) {
          object.workId = this.mapWorkCatalogue(object.originalIdentifier, object.tunecode, object.songCode, object.iswc, object.originalWorkTitle, object.titleMapper, templateSource, catalogue.works, catalogue.workExceptions);
        }
        if (['Track', 'Contract'].includes(object.catType) && !object.trackId) {
          object.trackId = this.mapSimpleCatalogue(object.alternativeId, null, catalogue.tracks);
          if (!object.trackId) {
            // @tom: The below calls mapSimpleCatalogue with 6 params, but this function only expects 5 params
            object.trackId = this.mapSimpleCatalogue(object.isrc, object.originalTrackTitle, catalogue.tracks, catalogue.trackExceptions, 'isrc', 'trackId');
          }

          if (!object.trackId && !object.releaseId) {
            const releaseValue = this.mapProductCatalogue(object.isrc, null, object.distributionChannel, object.originalTrackTitle, catalogue.releases, catalogue.releaseExceptions);
            if (releaseValue) {
              object.releaseId = releaseValue;
              object.catType = 'Release';
            } else if (!object.releaseId) {
              // Run release level mapping if track hasn't mapped to release
              object.releaseId = this.mapProductCatalogue(object.catNo, object.barcode, object.distributionChannel, object.originalReleaseTitle, catalogue.releases, catalogue.releaseExceptions);
            }
          }
          // Always attempt to map release for a track when it has mapped to a track
          if (object.trackId && !object.releaseId) {
            object.releaseId = this.mapProductCatalogue(object.catNo, object.barcode, object.distributionChannel, object.originalReleaseTitle, catalogue.releases, catalogue.releaseExceptions);
          }
        } else if (!object.releaseId) {
          // Run release level when track has mapped
          object.releaseId = this.mapProductCatalogue(object.catNo, object.barcode, object.distributionChannel, object.originalReleaseTitle, catalogue.releases, catalogue.releaseExceptions);
        }

        if (['Release', 'Contract'].includes(object.catType) && !object.releaseId) {
          object.releaseId = this.mapProductCatalogue(object.catNo, object.barcode, object.distributionChannel, object.originalReleaseTitle, catalogue.releases, catalogue.releaseExceptions);
        }
        // Always map to contract too
        if (!object.contractId) {
          object.contractId = this.mapSimpleCatalogue(object.contractIdentifier, null, catalogue.contracts);
        }
      }
      // Force any manual changes that were made to stick
      callback(null, object);
    } catch (err) {
      logger.error('Error in mapper.mapToCatalogue', err);
      callback(new Error('There was an error in matching to the catalogue.'));
    }
  },

  /**
   * Check if an exception exists for the identifier and title includes exception.title, then return the exception Map To value
   *
   * @param {string} identifier - Identifier used for mapping
   * @param {string} title - Title of catalogue item, (e.g. "Track")
   * @param {object[]} exceptions - Exceptions set in Client Settings
   * @param {string} exceptionField - Exception field to check by (e.g. "isrc", "catNo")
   * @returns {string} The Map To value set for the exception (exception.output, usually the Curve catalogue id)
   */
  checkForException(identifier, title, exceptions, exceptionField) {
    // Check if exceptions exist
    if (exceptions && Array.isArray(exceptions)) {
      // Setup output value
      let exceptionOutput;
      exceptions.forEach((exception) => {
        if (exception[exceptionField] == identifier && String(title).toLowerCase().trim().includes(String(exception.title).toLowerCase().trim())) {
          exceptionOutput = exception.output;
        }
      });
      return exceptionOutput;
    }
    return null;
  },

  /**
   * Maps Catalogue Items according to mapping or exception (if one exists)
   *
   * @param {string} identifier - Identifier used for mapping
   * @param {string} title - Title of catalogue item, (e.g. "Track")
   * @param {object} mappings - Contains the mappings
   * @param {object[]} exceptions - Exceptions set in Client Settings
   * @param {string} exceptionField - Exception field to check by (e.g. "isrc", "catNo")
   * @returns {string} the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)
   */
  mapSimpleCatalogue(identifier, title, mappings, exceptions, exceptionField) {
    // Remove any unwanted values before attempting to match
    if (identifier) { identifier = String(identifier).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''); }
    const exception = this.checkForException(identifier, title, exceptions, exceptionField);
    if (exception) {
      return exception;
    } if (mappings && identifier && identifier.trim() !== '') {
      return mappings[identifier];
    }
    return null;
  },

  /**
   * Maps Product Catalogue Items (used for Releases currently) according to mapping or exception (if one exists)
   *
   * @param {string} catNo - catNo of Release
   * @param {string} barcode - Barcode of Release
   * @param {string} distributionChannel - Distribution Channel of Catalogue Item
   * @param {string} title - Title of Catalogue Item
   * @param {object} mappings - Contains the mappings
   * @param {object[]} exceptions - Exceptions set in Client Settings
   * @returns {string} the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)
   */
  mapProductCatalogue(catNo, barcode, distributionChannel, title, mappings, exceptions) {
    // Remove any unwanted values before attempting to match
    if (catNo) { catNo = String(catNo).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''); }
    if (barcode) { barcode = String(barcode).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, ''); }
    const exception = this.checkForException(catNo, title, exceptions, 'catNo');
    if (exception) {
      return exception;
    } if (mappings && mappings[catNo] && catNo && catNo.trim() !== '') {
      let value = this.valueOrDistributionChannel(mappings[catNo], distributionChannel);
      if (!value) {
        value = this.valueOrDistributionChannel(mappings[barcode], distributionChannel);
      }
      return value;
    } if (mappings && mappings[barcode] && barcode && barcode.trim() !== '') {
      return this.valueOrDistributionChannel(mappings[barcode], distributionChannel);
    }
    return null;
  },

  /**
   * Maps Work Catalogue Items according to mapping or exception (if one exists)
   *
   * @param {string} identifier - Work identifier
   * @param {string} tunecode - Work tunecode
   * @param {string} songCode - Work songCode
   * @param {string} iswc - Work ISWC
   * @param {string} title - Title of Catalogue Item
   * @param {string} titleMapper - Combined Title with party names, e.g. "In The Shadows - Jane Doe - John Doe"
   * @param {string} source - Template Source
   * @param {object} mappings - Contains the mappings
   * @param {object[]} exceptions - Exceptions set in Client Settings
   * @returns {string} the mapping for {identifier}, or the exception output for {identifier} if this exists (usually the Curve catalogue id)
   */
  mapWorkCatalogue(identifier, tunecode, songCode, iswc, title, titleMapper, source, mappings, exceptions) {
    const exception = this.checkForException(identifier, title, exceptions, 'identifier');
    if (exception) {
      return exception;
    }
    let value;
    if (mappings && identifier && String(identifier).trim() !== '') {
      identifier = String(identifier).replace(/[^0-9a-zA-Z- (),_'"]/gi, '').trim();
      value = this.valueOrDistributionChannel(mappings[identifier], source);
    }
    if (!value && mappings && tunecode && String(tunecode).trim() !== '') {
      tunecode = String(tunecode).replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
      value = this.valueOrDistributionChannel(mappings[tunecode], source);
    }
    if (!value && mappings && iswc && String(iswc).trim() !== '') {
      iswc = String(iswc).replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
      value = this.valueOrDistributionChannel(mappings[iswc], source);
    }
    if (!value && mappings && songCode && String(songCode).trim() !== '') {
      songCode = String(songCode).replace(/[^0-9a-zA-Z- (),_'"]/gi, '');
      value = this.valueOrDistributionChannel(mappings[songCode], source);
    }
    if (!value && mappings && mappings[titleMapper] && titleMapper && titleMapper.trim() !== '') {
      value = this.valueOrDistributionChannel(mappings[titleMapper], source);
    }
    return value;
  },

  /**
   * Returns the value provided unless a Distribution Channel is available for value
   *
   * * if *value[distributionChannel]* exists, return the value of this
   * * also returns value of *value[undefined]*  if this exists
   * * otherwise returns *value*
   *
   * @param {string|object} value - Value to check
   * @param {string} distributionChannel - Distribution Channel
   * @returns {string} the output value as described above (usually Curve catalogue id)
   */
  valueOrDistributionChannel(value, distributionChannel) {
    if (typeof value === 'string') {
      return value;
    } if (value && typeof value === 'object' && value[distributionChannel]) {
      return value[distributionChannel];
    } if (value && typeof value === 'object' && value[undefined]) {
      return value[undefined];
    }
    return null;
  },

  /**
   * Overwrites values from Sales Line with current Catalogue Data
   *
   * @param {object} object - Sales Line
   * @param {object} catalogueOverwritingData - All Catalogue Data for client
   * @param {object} overwriteFields - List of default values for fields, used to overwrite values from Sales Data
   * @param {Number} round - Whether to round the values
   * @returns Modified Sales Line
   */
  setCatalogueData(object, catalogueOverwritingData, overwriteFields, round) {
    if (!catalogueOverwritingData || !object) return object;

    // if round 2 of overwriting catalogue, we don't want to override the object with catalogue data if there's calculations done to mapped catalogue
    if (round === 2 && object.calculateAfterMapping) return object;

    // Set work data
    const work = getCatalogueElement(catalogueOverwritingData.works, catalogueOverwritingData.worksDb, object.workId);
    if (work) {
      // Overwrite with work catalogue values
      object = writeItemValuesToObject(object, work);
    }

    const track = getCatalogueElement(catalogueOverwritingData.tracks, catalogueOverwritingData.tracksDb, object.trackId);
    if (track) {
      // Overwrite with track catalogue values
      object = writeItemValuesToObject(object, track);
      // Check for default release ID
      if (object.defaultReleaseId && !object.releaseId) {
        object.releaseId = object.defaultReleaseId;
      }
      // Set release specific foreign ID
      if (track.releaseSpecificForeignIds && track.releaseSpecificForeignIds[object.releaseId]) {
        object.catalogueTrackForeignId = track.releaseSpecificForeignIds[object.releaseId];
      }
      // Remove default release ID from object
      delete object.defaultReleaseId;
    }

    const release = getCatalogueElement(catalogueOverwritingData.releases, catalogueOverwritingData.releasesDb, object.releaseId);
    if (release && object.catType === 'Release') {
      object = writeItemValuesToObject(object, release);
      if (overwriteFields && overwriteFields.overwriteDistributionChannelWithCatalogue == true) {
        object.distributionChannel = release.distributionChannel;
      }
      if (overwriteFields && overwriteFields.overwriteConfigWithCatalogue == true) {
        object.configuration = release.catalogueFormat;
      }
      if (overwriteFields && overwriteFields.overwritePriceCategoryWithCatalogue == true) {
        object.priceCategory = release.priceCategory;
      }
    }
    if (release && object.catType === 'Track') {
      if (overwriteFields && overwriteFields.overwriteTrackPriceCategoryWithCatalogue == true) {
        object.priceCategory = release.priceCategory;
      }
    }

    return object;

    /**
     * Writes values from *item* to Sales Line (apart from "distributionChannel", "configuration", "priceCategory")
     *
     * @param {object} object - Sales Line
     * @param {object} item -
     * @returns Modified Sales Line
     */
    function writeItemValuesToObject(object, item) {
      if (object && item) {
        Object.keys(item).forEach((key) => {
          if (!['distributionChannel', 'configuration', 'priceCategory'].includes(key)) {
            object[key] = item[key];
          }
        });
        return object;
      }
      return object;
    }
  },
};

/**
 * Fetch an element from the catalogue by the given ID
 * @param {Object.<string, Object>} [map] A map containing
 * @param {Level} [db] A Level DB containing the Catalogue Overwriting Data
 * @param [id] The ID to look up
 * @return {Object | null} The Overwriting Data element for this ID
 */
const getCatalogueElement = (map, db, id) => {
  if (!id) return null;

  if (map) return map[id];

  if (db) return db.get(id);

  return null;
};
