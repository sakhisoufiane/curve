module.exports = (statRates, date) => {
  if (statRates && Array.isArray(statRates)) {
    let latestStatRates = {};
    statRates.forEach((ratesRow) => {
      if ((!latestStatRates.startDate || latestStatRates.startDate < ratesRow.startDate) && ratesRow.startDate < date) {
        latestStatRates = ratesRow;
      }
    });
    if (Object.keys(latestStatRates).length > 0) {
      return (latestStatRates.minAmount || 0);
    }
    return 0;
  }
  return 0;
};
