/**
 * @module utils
 */
const sanitize = require('sanitize-filename');

module.exports = {
  /**
   * Convert US/UK Decimal Value to EU Format
   *
   * @param {number} number - Non EU formatted Number
   * @returns {string} - EU formatted Number
   */
  convertToEUFormat: (number) => number.toLocaleString('es-ES', { maximumFractionDigits: 20 }),
  /**
   * Sanitizes, replaces `/` with `-` and truncates to 130 characters
   *
   * @param {string} fileName - The string to process
   * @returns {string} - The safe name truncated to 130 characters
   */
  safeName(fileName) {
    if (fileName && typeof fileName === 'string') {
      let safeName = fileName.replace(/\//g, '-'); // replace all forward slash with a minus sign
      safeName = sanitize(safeName); // sanitize removes any unsafe characters and truncates to 255 characters
      return (safeName.length > 130) ? safeName.substring(0, 130) : safeName; // truncate to 130 chars if longer than 130 chars
    }
    return fileName;
  },

  /**
   * Sanitizes using `safeName` method, then adds a random string to the end of the sanitized string
   *
   * @param {string} fileName - The string to process
   * * @returns {string} - The safe name plus a random string added at the end
   */
  safeNameWithRandomString(fileName) {
    const utils = this;
    // Setup random string
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // Add to the end of safeName
    return `${utils.safeName(fileName)} ${randomString}`;
  },

  /**
   * Clears blank strings that could cause .populate to error
   *
   * * For properties of type array this processes contractId, composerId, publisherId on any object in the array
   * * For properties of type string this processes the property itself
   *
   * @param {object} document - the document object containing properties to be cleaned up
   * @param {string[]} properties - list of properties to check and fix if blank strings are found
   */
  clearBlankStrings(document, properties) {
    if (Array.isArray(properties)) {
      properties.forEach((property) => {
        let item = document?.[property];
        if (Array.isArray(item)) {
          item = item.map((right) => {
            if (right?.contractId === '') {
              right.contractId = null;
            }
            if (right?.composerId === '') {
              right.composerId = null;
            }
            if (right?.publisherId === '') {
              right.publisherId = null;
            }
            return right;
          });
        }
        if (typeof item === 'string' && item === '') {
          document[property] = null;
        }
      });
    }
  },
};
