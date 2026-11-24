/**
 * @module salesIngestionUtils
 */

const { logger, currencies } = require('@curveroyaltysystems/platform-shared-utils');

const moment = require('moment');

const DATE_FORMAT_PREFIX = 'Date: ';

/**
   * Replace single quotes with escaped single quotes and replace line breaks with a space
   *
   * @param {string} input - Raw string
   * @returns {string} String with any apostrophes/line breaks formatted
   */
const formatString = (input) => {
  const formattedString = input.replace(/(\n|')/g, (match) => {
    const value = match === '\n' ? ' ' : "\\'";
    return value;
  });
  return formattedString;
};

/**
 * Format input *value* according to *fieldName* and/or *format*
 *
 * @param {string|number} value - Value to format
 * @param {string} fieldName - Name assigned to field
 * @param {string} format - Format assigned to field
 * @returns {string|number} Formatted value
 */
const fieldToFormat = (inputValue, fieldName, format) => {
  let value = inputValue;
  try {
    if (fieldName === 'isrc') {
      return value.toString().trim().replace(/[^0-9a-zA-Z(),_'#"]/gi, '');
    } if (fieldName === 'catNo' || fieldName === 'barcode' || fieldName === 'identifier' || fieldName === 'iswc' || fieldName === 'tunecode' || fieldName === 'contractIdentifier') {
      return value.toString().trim().replace(/[^0-9a-zA-Z- (),_'#"]/gi, '');
    } if (fieldName && format === 'String') {
      return value.toString().trim();
    } if (fieldName && format === 'Number') {
      if (typeof value === 'number') {
        return value;
      }
      // Replaces an comma separation, and any non-numerical value that is read from the file as part of the value
      const regexOutput = String(value).replace(/[^\d.Ee-]/g, '');
      // Replaces any output from 1st regex that equals '-' with a 0 to support 0 values in Excel Accounting format when exported to CSV
      const newNumber = parseFloat(regexOutput.replace(/^-$/, '0'));
      if (!Number.isNaN(newNumber)) {
        return newNumber;
      }
      return null;
    } if (fieldName && format === 'Number Comma Decimal') {
      value = value.toString().replace(/\./g, '').replace(',', '.');
      const newNumber = parseFloat(value);
      if (!Number.isNaN(newNumber)) {
        return newNumber;
      }
      return null;
    } if (fieldName && format === 'Number 2 Decimal Places') {
      const newNumber = parseFloat(value);
      if (!Number.isNaN(newNumber)) {
        return newNumber / 100;
      }
      return null;
    } if (fieldName && format === 'Number 5 Decimal Places') {
      const newNumber = parseFloat(value);
      if (!Number.isNaN(newNumber)) {
        return newNumber / 100000;
      }
      return null;
    } if (fieldName && (format === 'Date' || (!format && ['saleDate', 'transactionDate', 'dateFrom', 'dateTo'].includes(fieldName)))) {
      if (typeof value === 'number') {
        return new Date((value - (25567 + 2)) * 86400 * 1000);
      }
      return new Date(value);
    } if (fieldName && format === 'Date: YYYY_H') {
      try {
        value = String(value).substring(0, 6);
        let month = parseInt(value.slice(5, 6));
        month = month === 2 ? 6 : 0;
        const year = value.slice(0, 4);
        if (!Number.isNaN(parseInt(year))) {
          return new Date(Date.UTC(yearFromCharacters(year), month, 1));
        }
        return null;
      } catch (e) {
        logger.debug(`Error formatting date: ${fieldName} with value: "${value}" with format: "${format}"`);
        logger.debug(e);
        return null;
      }
    } else if (fieldName && format === 'Date: YYYYH') {
      try {
        value = String(value).substring(0, 5);
        let month = parseInt(value.slice(4, 5));
        month = month === 2 ? 6 : 0;
        const year = value.slice(0, 4);
        if (!Number.isNaN(parseInt(year))) {
          return new Date(Date.UTC(yearFromCharacters(year), month, 1));
        }
        return null;
      } catch (e) {
        logger.debug(`Error formatting date: ${fieldName} with value: "${value}" with format: "${format}"`);
        logger.debug(e);
        return null;
      }
    } else if (fieldName && format?.substring(0, DATE_FORMAT_PREFIX.length) === DATE_FORMAT_PREFIX) {
      return formatDateObject(value, format);
    } else {
      return String(value);
    }
  } catch (e) {
    logger.debug(`Error formatting field: "${fieldName}" with value: "${value}" with format: "${format}"`);
    logger.debug(e);
    return null;
  }
};

/**
   * Given the value and format objects, uses moment to parse the date to a native JS Date object.
   * It is important to note that this function assumes the input dates are in UTC format and will output JS
   * Date objects in the current locale.
   * It uses a constant fixed prefix and the length of the rest of the format to determine what to format.
   * It even handles edge cases such as MMYYMMYY range as moment will return the last date in a sequence.
   *
   * @param {object} [value] Value of the field to format, could be number or string.
   * @param {string} [format] The full format string to format the value with
   * @returns {Date}
   */
const formatDateObject = (value, format) => {
  format = format.substring(DATE_FORMAT_PREFIX.length);
  value = String(value).substring(0, format.length);

  try {
    const formattedMoment = moment.utc(value, format);

    // An invalid date won't necessarily throw an error so we have to check and return here.
    if (!formattedMoment.isValid()) return null;

    return formattedMoment.toDate();
  } catch (e) {
    logger.error(`Error formatting date: "${value}" with format: "${format}"`);
    logger.error(e);
    return null;
  }
};

/**
 * Ensures date is formatted as 4 characters. If no date available will return the current year
 *
 * @param {string} [year] - Year as string, e.g. "2018", "21"
 * @returns {string} Year as 4 character string, e.g. "2018, "2021"
 */
const yearFromCharacters = (year) => {
  // Set default response
  const today = new Date();
  // Remove anything after white space
  if (year && typeof year === 'string') {
    year = year.split(' ')[0];
  }
  // When year is only two characters
  if (year && year.length === 2) {
    return `20${year}`;
  } if (year) {
    // Return passed year value
    return year;
  }
  // Return this year when year is missing
  return today.getFullYear();
};

const ApplyMultiplier = function (multiplier) {
  this.multiplier = multiplier;
  const applyMultiplier = this;

  this.apply = (value) => {
    if (value && this.multiplier) {
      return value * this.multiplier;
    }
    return value;
  };
  this.applyToObjectByKeys = ({ object, keys }) => {
    const objCopy = { ...object };
    if (Array.isArray(keys)) {
      for (const key of keys) {
        if (objCopy[key]) {
          objCopy[key] = applyMultiplier.apply(objCopy[key]);
        }
      }
    }
    return objCopy;
  };
};

module.exports = {
  formatString,
  fieldToFormat,
  yearFromCharacters,
  formatDateObject,
  currencies,
  ApplyMultiplier,
};
