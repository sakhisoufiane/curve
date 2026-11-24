/**
 * Extracts the client currencies and provides a mapping between the currency symbox and the currency field
 *
 * @param {object} client - Instance of Client model
 * @returns {object.<object>} - Returns an of object of currenies to currency numbers
 */
module.exports = (client) => {
  // Setup output object
  const output = {};
  // Setup for each currency if set
  if (client.homeCurrency) { output[client.homeCurrency] = 'homeCurrency'; }
  if (client.currency2) { output[client.currency2] = 'currency2'; }
  if (client.currency3) { output[client.currency3] = 'currency3'; }
  if (client.currency4) { output[client.currency4] = 'currency4'; }
  // Return object
  return output;
};
