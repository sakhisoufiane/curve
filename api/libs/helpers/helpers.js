const { createHash } = require('node:crypto');

/** Hashes an array of strings (e.g., IDs) in a consistent way, regardless of the order of the input
 *
 * This is useful for comparing two sets of strings without worrying about their order
 * It sorts the array, concatenates the values with a separator, and returns a SHA-256 hash
 *
 * @param {string[]} arrayOfStrings - The array of strings to hash
 * @returns {string} - The resulting hash as a hexadecimal string
 */
const hashArrayOfStrings = (arrayOfStrings) => {
  const sortedStrings = [...arrayOfStrings].sort();
  const hash = createHash('sha256');
  for (const item of sortedStrings) {
    hash.update(item, 'utf8');
    hash.update('\0', 'utf8'); // adds null byte as separator
  }
  return hash.digest('hex');
};

/**
 * Converts value to string and removes leading zeros
 * If value is falsy (e.g., null, undefined, empty string), it returns an empty string
 * If value is a string of only zeros, it will return the input as is
 *
 * @param {Object} params - The parameters object
 * @param {string|number} params.value - The value to process
 * @returns {string} - The processed string with leading zeros removed
 */
const removeLeadingZeros = ({ value }) => {
  if (value === 0) return '0';
  if (!value) return '';
  if (typeof value !== 'string' || /^0+$/.test(value)) return String(value);
  return value.replace(/^0+/, '');
};

const helpers = {
  hashArrayOfStrings,
  removeLeadingZeros,
};

module.exports = helpers;
