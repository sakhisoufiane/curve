require('../../models/db');

const { BigQuery, logger } = require('@curveroyaltysystems/platform-shared-utils');
const { setTimeout } = require('timers/promises');
const moment = require('moment');

const AppSettings = require('../../models/appSettings');

const scriptCheckEvery = 15000;
const logText = 'BigQuery-AutoScaler';

let lastIncrementTime;

const checkSlots = async () => {
  try {
    const { bqAutoScaler } = await AppSettings.findOne({}, 'bqAutoScaler');
    const percentageBeforeAddingSlotsBasedOnOnePeriod = bqAutoScaler?.percentageBeforeAddingSlotsBasedOnOnePeriod || 70;
    const percentageBeforeAddingSlots = bqAutoScaler?.percentageBeforeAddingSlots || 50;
    const percentageBeforeRemovingSlots = bqAutoScaler?.percentageBeforeRemovingSlots || 30;
    const minimumSlotsCapacity = bqAutoScaler?.minimumSlotsCapacity || 100;
    const queueSizeBeforeAddingSlots = bqAutoScaler?.queueSizeBeforeAddingSlots || 40;

    // If no last Incremt Time, default to current time
    if (!lastIncrementTime) lastIncrementTime = moment().format();

    logger.info(`${logText}: Getting usage..`);

    const usage = await new BigQuery({}).getSlotUsageApi().catch(logger.error);
    logger.info(logText, usage);

    const onePeriodUsageCondition = usage.currentSlotUtilizationPercentage > percentageBeforeAddingSlotsBasedOnOnePeriod;
    const twoPeriodsUsageCondition = usage.currentSlotUtilizationPercentage >= percentageBeforeAddingSlots && usage.previousSlotUtilizationPercentage >= percentageBeforeAddingSlots;
    const queuedJobsCondition = usage.queuedJobs >= queueSizeBeforeAddingSlots;
    if (onePeriodUsageCondition || twoPeriodsUsageCondition || queuedJobsCondition) {
      if (queuedJobsCondition) {
        logger.info(`${logText}: Queued jobs above ${queueSizeBeforeAddingSlots}%, adding slots...`);
      } else if (onePeriodUsageCondition) {
        logger.info(`${logText}: Usage has been above ${percentageBeforeAddingSlotsBasedOnOnePeriod}% for the last period, adding slots...`);
      } else {
        logger.info(`${logText}: Usage has been above ${percentageBeforeAddingSlots}% for the last two periods, adding slots...`);
      }
      if (!moment(lastIncrementTime).isSameOrBefore(moment().subtract(30, 'seconds'))) {
        logger.info(`${logText}: Slots have been added less than 30 seconds ago, waiting until the next run to add slots.`);
      } else {
        await new BigQuery({}).addSlotsApi();
        lastIncrementTime = moment().format();
        logger.info(`${logText}: Slots added.`);
      }
    } else if (usage.currentSlotUtilizationPercentage < percentageBeforeRemovingSlots && usage.previousSlotUtilizationPercentage < percentageBeforeRemovingSlots) {
      logger.info(`${logText}: Usage has been below ${percentageBeforeRemovingSlots}% for the last two periods, removing slots...`);
      if (usage.currentCapacity <= minimumSlotsCapacity) {
        logger.info(`${logText}: Slots at minimum capacity, not removing any slots.`);
      } else if (!moment(lastIncrementTime).isSameOrBefore(moment().subtract(1, 'minute'))) {
        logger.info(`${logText}: Slots have been added less than a minute ago, waiting until the next run to remove them.`);
      } else {
        await new BigQuery({}).removeSlotsApi();
        logger.info(`${logText}: Slots removed.`);
      }
    } else {
      logger.info(`${logText}: Not updating slots.`);
    }
  } catch (error) {
    logger.error(logText, error);
  }

  logger.debug('______________________________');
  await setTimeout(scriptCheckEvery);
  checkSlots();
};

checkSlots();
