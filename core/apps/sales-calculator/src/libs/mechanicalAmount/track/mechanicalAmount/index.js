const MechanicalAmount = {
    /**
   * Gets mechanical amounts for a track
   *
   * @param {object} track - An instance of the Track model
   * @param {function(string, object)} callback - A callback that handles the response
   */
    get: (track, callback) => {
      const result = { US: 0, CA: 0, duration: track.duration || 0, mechanicalCalculationBasis: track.mechanicalCalculationBasis };
      if (track.reportMechanicals) {
        // We need to flag the reporting of mechanicals, this flag is used in the royalty calculator to determine whether to deduct mechanical amounts
        result.reportMechanicals = track.reportMechanicals;
  
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
          result.multiplierSum = multiplierSum;
          result.licenseCount = licenseCount;
        }
        result.US = track.statutoryRate;
        result.CA = track.canadianStatutoryRate;
        callback(null, result);
      } else {
        callback(null, result);
      }
    },
  };
  
  module.exports = MechanicalAmount;
  