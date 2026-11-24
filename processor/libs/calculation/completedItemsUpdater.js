/** @module completedItemsUpdater */

const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Period = require('../../models/period');

/**
 * Creates a CompletedItemsUpdater Instance.
 * @constructor
 * @param {object} params - Parameters for initializing CompletedItemsUpdater
 * @param {string} params.periodId - The period id of the period to update
 * @param {string} params.fieldToIncrease - The field to increase
 */

const completedItemsUpdater = function (params) {
  // Initialise
  this.periodId = params.periodId;
  this.fieldToIncrease = params.fieldToIncrease;
  this.count = 0;
  this.interval = 10000; // update every 10 seconds

  this.intervalID = setInterval(() => {
    this.sendUpdate();
  }, this.interval);

  this.increaseCount = function (inc) {
    this.count += inc;
  };

  this.sendUpdate = async function () {
    try {
      const inc = this.count;
      if (inc > 0) {
        this.count -= inc;
        await Period.findByIdAndUpdate(this.periodId, { $inc: { [this.fieldToIncrease]: inc } }, { timestamps: false });
      }
    } catch (catchErr) {
      logger.error('completedItemsUpdater.sendUpdate errored', catchErr);
    }
  };

  this.stop = function () {
    clearInterval(this.intervalID);
    this.sendUpdate();
  };
};

module.exports = completedItemsUpdater;
