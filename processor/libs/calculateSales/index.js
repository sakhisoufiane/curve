const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const RoyaltyCalculator = require('./royaltyCalculator');

module.exports = function (event) {
  this.event = event;

  // Set defaults
  this.event.mechanicalAmounts = this.event.mechanicalAmounts || {};
  this.event.exchangeRates = this.event.exchangeRates || {};

  // Create General Filter
  this.filter = { catType: event.type, status: 'Complete', salesFileId: { $in: event.salesFileIds } };
  if (event.type === 'Release') {
    this.filter.releaseId = event.releaseIds ? { $in: event.releaseIds } : event.id;
  } else if (event.type === 'Track') {
    this.filter.trackId = event.trackIds ? { $in: event.trackIds } : event.id;
  } else if (event.type === 'Work') {
    this.filter.workId = event.workIds ? { $in: event.workIds } : event.id;
  }

  this.calculate = function (callback) {
    const calculator = this;
    // Loop through each contract
    let originalSalesData;
    async.eachSeries(calculator.event.contracts, (contract, cb) => {
      // eslint-disable-next-line max-len
      const royaltyCalculator = new RoyaltyCalculator(contract, calculator.event.db, calculator.event.bigQuery, calculator.event.salesDatabaseTable, calculator.event.periodId, calculator.event.writeSalesDatabaseTable, calculator.filter, calculator.event.contractQuery, calculator.event.periodEndDate, calculator.event.periodType, calculator.event.clientCurrencies, calculator.event.exchangeRates, calculator.event.mechanicalAmounts, calculator.event.calculationType, calculator.event.participationRates, calculator.event.salesData, calculator.event.type, calculator.event.ppds, calculator.event.specificDealerPrices, calculator.event.totalLines, calculator.event.releaseRestrictions, calculator.event.catalogueData, calculator.event.escalationEquivalents, calculator.event.statRates, calculator.event.limit, calculator.event.offset, calculator.event.taskType);
      royaltyCalculator.byContract((err) => {
        ({ originalSalesData } = royaltyCalculator);
        if (err) {
          logger.debug('byContract Error: ');
          logger.error(err);
          // Return error
          cb(err);
        } else {
          cb();
        }
      });
    }, (err) => {
      callback(err, originalSalesData);
    });
  };
};
