const Utils = {
  /**
   * Sorts mechanical rates object from oldest to newest date
   *
   * @param {object} ratesObject - Unsorted Mechanical Rates Object
   * @param {object} updatedRatesObject - Sorted Mechanical Rates Object
   */
  sortMechanicalRatesObject(ratesObject) {
    const updatedRatesObject = {};
    const sortedArray = [];

    for (const rate in ratesObject) {
      if (ratesObject[rate]) {
        sortedArray.push([rate, ratesObject[rate]]);
      }
    }

    sortedArray.sort((a, b) => new Date(a[0]) - new Date(b[0]));
    sortedArray.forEach((rate) => {
      updatedRatesObject[rate[0]] = rate[1];
    });

    return updatedRatesObject;
  },
};
module.exports = Utils;
