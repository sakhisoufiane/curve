/**
 * @module MechanicalAmounts
 */

const MechanicalAmounts = {
  /**
 * Extracts the mappings from catalogue associated with the client, specifically for catalogue mapping on sales lines
 *
 * @param {object} track - Instance of Track model
 * @param {function(string, object)} callback - A callback that handles the response, returning the mechanical amounts as an object
 */
  track: (track, callback) => {
    if (!track) {
      return callback(new Error('Track is required for MechanicalAmounts.track'));
    }
    const result = { US: 0, CA: 0 };
    if (track.reportMechanicals) {
      if (track.mechanicalLicenses && track.mechanicalLicenses.length > 0) {
        // Has licenses, so multiplies by the license rates
        let multiplierSum = 0;
        let licenseCount = 0;
        // Loop through and get license amounts
        track.mechanicalLicenses.forEach((license) => {
          if (license.rate) {
            licenseCount += 1;
            multiplierSum += parseFloat(license.rate) / 100;
          }
        });
        // Add to result pro-rating the total license amount by how many licenses there are
        if (multiplierSum > 0 && licenseCount > 0) {
          result.US += parseFloat(track.statutoryRate) * (multiplierSum / licenseCount);
          result.CA += parseFloat(track.canadianStatutoryRate) * (multiplierSum / licenseCount);
        } else {
          result.US += parseFloat(track.statutoryRate);
          result.CA += parseFloat(track.canadianStatutoryRate);
        }
      } else {
        // Has no licenses, so use 100% of stat rate
        result.US += track.statutoryRate;
        result.CA += track.canadianStatutoryRate;
      }
      Object.keys(result).forEach((key) => { result[key] = parseFloat(result[key]).toFixed(10); });
      callback(null, result);
    } else {
      callback(null, result);
    }
  },
};

module.exports = MechanicalAmounts;
