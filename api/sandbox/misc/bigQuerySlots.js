const { BigQuery, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { setTimeout } = require('timers/promises');
const moment = require('moment');

const percentageBeforeAddingSlotsBasedOnOnePeriod = 90;
const percentageBeforeAddingSlots = 70;
const percentageBeforeRemovingSlots = 50;
const minimumSlotsCapacity = 200;
const scriptCheckEvery = 15000;
let lastIncrementTime;
const checkSlots = async () => {
  // If no last Incremt Time, default to current time
  if (!lastIncrementTime) lastIncrementTime = moment().format();

  logger.info('Getting BigQuery usage...');
  
  try {
    const usage = await new BigQuery({}).getSlotUsage().catch(logger.error);
    logger.info(usage);
    const onePeriodUsageCondition  = usage.currentSlotUtilizationPercentage > percentageBeforeAddingSlotsBasedOnOnePeriod;
    const twoPeriodsUsageCondition  = usage.currentSlotUtilizationPercentage >= percentageBeforeAddingSlots && usage.previousSlotUtilizationPercentage >= percentageBeforeAddingSlots;
    if (onePeriodUsageCondition || twoPeriodsUsageCondition) {
      if (onePeriodUsageCondition) {
        logger.info(`Usage has been above ${percentageBeforeAddingSlotsBasedOnOnePeriod}% for the last period, adding slots...`);
      } else {
        logger.info(`Usage has been above ${percentageBeforeAddingSlots}% for the last two periods, adding slots...`);
      }
      if (usage.running === 0) {
        logger.info('No queries currently in the queue, waiting until the next run to add slots');
      } else if (!moment(lastIncrementTime).isSameOrBefore(moment().subtract(30, 'seconds'))) {
        logger.info('Slots have been added less than 30 seconds ago, waiting until the next run to add slots.');
      } else {
        await new BigQuery({}).addSlots();
        lastIncrementTime = moment().format();
        logger.info('Slots added.');
      }
    } else if (usage.currentSlotUtilizationPercentage < percentageBeforeRemovingSlots && usage.previousSlotUtilizationPercentage < percentageBeforeRemovingSlots) {
      logger.info(`Usage has been below ${percentageBeforeRemovingSlots}% for the last two periods, removing slots...`);
      if (usage.currentCapacity <= minimumSlotsCapacity) {
        logger.info('Slots at minimum capacity, not removing any slots.');
      } else if (!moment(lastIncrementTime).isSameOrBefore(moment().subtract(1, 'minute'))) {
        logger.info('Slots have been added less than a minute ago, waiting until the next run to remove them.');
      } else {
        await new BigQuery({}).removeSlots();
        logger.info('Slots removed.');
      }
    } else {
      logger.info(`Not updating slots.`);
    }
  } catch(error) {
    logger.error(error)
  }

  logger.info('______________________________');
  await setTimeout(scriptCheckEvery);
  checkSlots();
};

checkSlots();
