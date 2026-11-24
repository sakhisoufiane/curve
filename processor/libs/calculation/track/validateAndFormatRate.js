/**
 * Validates that a rate exists, defaulting to 100 when it is specifically null or undefined
 *
 * @param {number} rate - Number or string of a rate
 * @returns {number} - Returns a number value from the validation of the rate
 */
module.exports = (rate) => {
  // check if rate is blank
  if (!rate && rate !== 0) { rate = 100; }

  // validate string to numeric value
  if (typeof rate === 'string') {
    if (Number.isNaN(parseFloat(rate))) {
      rate = 100;
    }
    rate = parseFloat(rate);
  }
  return rate;
};
