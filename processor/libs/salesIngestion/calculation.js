/**
 * @module calculation
 */
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const salesIngestionUtils = require('./salesIngestionUtils');

module.exports = {
  /**
    * Runs calculation on the Sales Line. Certain calculations only run when the method is called the 2nd time
    *
    * * Calls `callback(err, mappedLine)` with `mappedLine` containing the modified Sales Line
    * * Calls `callback(err, mappedLine)` with an `err` message if an error occurs
    *
    * @param {array} rawLine - Raw unmodified Sales Line, as array
    * @param {object} mappedLine - Sales Line mapped to an object
    * @param {object[]} calculations - Calculation definitions from template
    * @param {number} calculationTime - Indicates if the calculation is run for the 1st(1) or 2nd time(2)
    * @param {function(string, overwrittenObject)} callback - A callback that handles the response
    */
  startCalculation(rawLine, mappedLine, calculations, template, calculationTime, callback) {
    if (calculations) {
      try {
        // On the second calculation, make sure to check if calculateAfterMapping is set
        // at this point we want to ignore the final Overwrite Catlaogue pass
        if (calculationTime === 2) {
          const calculateAfterMapping = calculations.map((calculation) => calculation.calculateAfterMapping);
          // Consolidate calculateAfterMapping to single bool
          const isCalculateAfterMapping = calculateAfterMapping.reduce((acc, val) => acc || val, false);
          mappedLine.calculateAfterMapping = isCalculateAfterMapping;
        }
        async.eachSeries(calculations, (calculation, cb) => {
          // Test if calculation should run
          if (!this.evaluateConditions(rawLine, mappedLine, calculation)) {
            cb();
          } else if (
            // Run 2nd calculation pass only if
            // - calculateAfterMapping is set
            (calculationTime === 2 && calculation.calculation && !calculation.calculateAfterMapping
            // - OR valueType is not 'Field' OR outputField is 'retailPrice', 'perUnitRate'
            && calculation.calculation.valueType === 'Field' && !['retailPrice', 'perUnitRate', 'salePrice'].includes(calculation.outputField)
            // - OR there are no calculations involved, just assignment
            && calculation.calculation.calculations && calculation.calculation.calculations.length > 0)

            // Don't run 1st calculation pass if calculateAfterMapping is set
            || (calculationTime === 1 && calculation.calculateAfterMapping)
          ) {
            cb();
          } else {
            // Perform the base calculation
            let baseValue = this.performCalculation(rawLine, mappedLine, null, calculation.calculation, template);
            // Perform subsequent calculations
            for (let i = 0; i < calculation.calculation.calculations.length; i += 1) {
              baseValue = this.performCalculation(rawLine, mappedLine, baseValue, calculation.calculation.calculations[i], template);
            }
            // Fix any values before saving to database
            if (!baseValue && baseValue !== 0 && baseValue !== false) {
              baseValue = null;
            } else if (typeof baseValue === 'string') {
              baseValue = baseValue.trim();
            }
            // Strip any non-identifier characters
            if (calculation.outputField === 'isrc' && baseValue != undefined) {
              baseValue = baseValue.toString().trim().replace(/[^0-9a-zA-Z(),_'#"]/gi, '');
            }
            if ((calculation.outputField === 'catNo' || calculation.outputField === 'barcode' || calculation.outputField === 'identifier' || calculation.outputField === 'originalIdentifier' || calculation.outputField === 'iswc' || calculation.outputField === 'tunecode' || calculation.outputField === 'contractIdentifier') && baseValue != undefined) {
              baseValue = String(baseValue).trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
            }
            // Force number fields into numbers
            if (calculation.outputField === 'units' || calculation.outputField === 'netAmount' || calculation.outputField === 'grossAmount') {
              baseValue = Number(baseValue);
            }
            let { dateFormat } = calculation;
            if (['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].includes(calculation.outputField)) {
              // Force date fields into dates
              if ((!dateFormat || dateFormat === '') && (String(baseValue).includes('/'))) {
                dateFormat = 'Date: DD/MM/YYYY';
              }
              if (dateFormat) {
                baseValue = salesIngestionUtils.fieldToFormat(baseValue, calculation.outputField, dateFormat);
              } else {
                baseValue = new Date(baseValue);
              }
            }

            // Set value to output
            if (calculation.outputField === 'Skip Row') {
              mappedLine.skip = true;
            } else {
              mappedLine[calculation.outputField] = baseValue;
            }

            // Specific Calculation Scenario where the user wants to clear a mapped id based on a condition.
            // i.e. If mapped contractId is not blank, clear down mapped trackId
            if ((calculation.outputField === 'trackId' && mappedLine.trackId === null) || (calculation.outputField === 'releaseId' && mappedLine.releaseId === null) || (calculation.outputField === 'contractId' && mappedLine.contractId === null) || (calculation.outputField === 'workId' && mappedLine.workId === null)) {
              mappedLine.ignoreMapper = true;
            }
            // depending on template, returnNetAmount is not set when splitReturns is called so we need to execute here
            if (calculation.outputField === 'returnNetAmount') {
              // if return units are below 0 we need to set the net amount to returnNetAmount *= -1. REF: SUP-1068
              if (mappedLine.returnNetAmount && mappedLine.returnUnits < 0) {
                if (mappedLine.returnNetAmount > 0) { mappedLine.returnNetAmount *= -1; }
                // Switch net amount to returns value
                mappedLine.netAmount = mappedLine.returnNetAmount;
              }
            }
            cb();
          }
        }, (err) => {
          callback(err, mappedLine);
        });
      } catch (err) {
        logger.error(err);
        callback(new Error('An error in the calculations. Check your calculations and your template mapping and try again.'));
      }
    } else {
      callback(null, mappedLine);
    }
  },

  /**
    * Evaluations conditions to determine if calculation should run
    *
    * @param {array} rawLine - Raw unmodified Sales Line, as array
    * @param {object} mappedLine - Sales Line mapped to an object
    * @param {object[]} calculation - Calculation definitions from template
    * @returns {boolean} *true* if calculation should be run
    */
  evaluateConditions(rawLine, mappedLine, calculation) {
    const conditionMet = [];

    // Check conditions
    for (let i = calculation.conditions.length - 1; i >= 0; i -= 1) {
      let inputValue;
      if (calculation.conditions[i].inputType === 'Column') {
        inputValue = rawLine[parseInt(calculation.conditions[i].if) - 1];
      } else if (calculation.conditions[i].inputType === 'Field') {
        inputValue = mappedLine[calculation.conditions[i].if];
        // logger.debug(`- ${inputValue}`);
      }

      conditionMet.push(this.checkComparison(inputValue, this.checkForExcelBooleanFormat(calculation.conditions[i].value), calculation.conditions[i].comparison));
    }
    // logger.debug(conditionMet);

    // Check conditionType
    if (calculation.conditionType === 'Any' && conditionMet.indexOf(true) > -1) {
      return true;
    } if (calculation.conditionType === 'All' && conditionMet.indexOf(false) === -1) {
      return true;
    } if (calculation.conditionType === 'Always') {
      return true;
    }
    return false;
  },

  /**
    * Formats Excel boolean value 'TRUE' opr 'FALSE' to js booleans, otherwise returns the value if not a boolean
    *
    * @param {array} value - value to evaluate
    * @returns {boolean} returns the formatted value
    */
  checkForExcelBooleanFormat(value) {
    if (typeof value === 'string' && value.toUpperCase() === 'TRUE') {
      return true;
    }

    if (typeof value === 'string' && value.toUpperCase() === 'FALSE') {
      return false;
    }

    return value;
  },

  /**
    * Translates written comparisons to JS comparisons and returns the result as a boolean
    *
    * @param {string|number} value - Value to compare
    * @param {string|number} compareTo - Comparison value
    * @param {string} comparison - String representation of comparison, e.g. "Greater Than or Equal To"
    * @returns {boolean} Result of comparison
    */
  checkComparison(value, compareTo, comparison) {
    switch (comparison) {
      case 'Equals':
        if (value == compareTo) return true;
        return false;
      case 'Does Not Equal':
        if (value != compareTo) return true;
        return false;
      case 'Greater Than':
        if (value > parseFloat(compareTo)) return true;
        return false;
      case 'Greater Than or Equal To':
        if (value >= parseFloat(compareTo)) return true;
        return false;
      case 'Less Than':
        if (value < parseFloat(compareTo)) return true;
        return false;
      case 'Less Than or Equal To':
        if (value <= parseFloat(compareTo)) return true;
        return false;
      case 'Contains':
        if (value && value.toString().indexOf(compareTo) > -1) return true;
        return false;
      case 'Does Not Contain':
        if (value && value.toString().indexOf(compareTo) === -1) return true;
        return false;
      case 'Is Blank':
        if ((!value && value != 0) || String(value).trim() === '') return true;
        return false;
      case 'Is Not Blank':
        if ((value || value == 0) && String(value).trim() !== '') return true;
        return false;
      default:
        return false;
    }
  },

  /**
    * Performs calculation according to function contained in *calculation*
    *
    * @param {array} rawLine - Raw unmodified Sales Line, as array
    * @param {object} mappedLine - Sales Line mapped to an object
    * @param {number|string} baseValue - Base value to start from
    * @param {object} calculation - One of the calculations passed from template
    * @returns {number|string} Calculation output
    */
  performCalculation(rawLine, mappedLine, baseValue, calculation, template) {
    if (calculation) {
      let calculationValue;
      if (calculation.valueType === 'Column') {
        // When valueType is Column - the value has not been run through fieldToFormat to clean format (highlighted with integers passed with commas)
        const columnIndex = parseInt(calculation.value, 10) - 1;
        const columnTemplate = template[columnIndex];
        calculationValue = rawLine[columnIndex];
        if (columnTemplate) {
          const columnField = (columnTemplate?.field) ? columnTemplate.field : 'name'; // Hack to prevent modifying fieldToFormat
          calculationValue = salesIngestionUtils.fieldToFormat(calculationValue, columnField, columnTemplate.type);
        }
      } else if (calculation.valueType === 'Field') {
        calculationValue = mappedLine[calculation.value];
      } else if (calculation.valueType === 'Value') {
        calculationValue = calculation.value;
      }

      switch (calculation.function) {
        case 'Equals':
          return calculationValue;
        case 'Addition':
          return (calculationValue) ? this.formatCalculationOutput(parseFloat(baseValue) + parseFloat(calculationValue)) : parseFloat(baseValue);
        case 'Minus':
          return (calculationValue) ? this.formatCalculationOutput(parseFloat(baseValue) - parseFloat(calculationValue)) : parseFloat(baseValue);
        case 'Multiply':
          return this.formatCalculationOutput(parseFloat(baseValue) * parseFloat(calculationValue));
        case 'Divide':
          return this.formatCalculationOutput(parseFloat(baseValue) / parseFloat(calculationValue));
        case 'Left':
          return substringLeft(baseValue, calculationValue) ?? baseValue;
        case 'Right':
          return substringRight(baseValue, calculationValue) ?? baseValue;
        case 'Concatenate':
          if (calculationValue) {
            return `${baseValue}${calculationValue}`;
          }
          return baseValue;
        case 'Round':
          return Math.round(baseValue);
        case 'RoundUp':
          return Math.ceil(baseValue);
        case 'RoundDown':
          return Math.floor(baseValue);
        default:
          return baseValue;
      }
    } else {
      return baseValue;
    }
  },
  /**
    * Formats calculation output to remove any decimal recurring errors
    *
    * @param {number} calculation - Raw calculation output (with possible decimal recurring errors)
    * @returns {number} Formatted Calculation output
    */
  formatCalculationOutput(calculation) {
    const roundTo = 1_000_000_000;
    const rounded = Math.round(calculation * roundTo) / roundTo;
    return parseFloat(rounded.toFixed(10));
  },
};

/**
 * Attempts to take a number of characters from the start of a value. May try to coerce the value to a string depending on the type given
 * @param {unknown} value The value to substring
 * @param {number} characters The number of characters to take
 * @return The substring of the value, or null if the value cannot be coerced to a string
 */
const substringLeft = (value, characters) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') value = value.toString();

  if (typeof value === 'string') return value.substring(0, characters);

  return null;
};

/**
 * Attempts to take a number of characters from the end of a value. May try to coerce the value to a string depending on the type given
 * @param {unknown} value The value to substring
 * @param {number} characters The number of characters to take
 * @return The substring of the value, or null if the value cannot be coerced to a string
 */
const substringRight = (value, characters) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') value = value.toString();

  if (typeof value === 'string') return value.substring(value.length - characters, value.length);

  return null;
};
