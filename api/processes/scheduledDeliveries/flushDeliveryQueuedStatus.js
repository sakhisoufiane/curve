const FlushDeliveryQueuedStatus = this;

require('../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { CwrUtils } = require('@curveroyaltysystems/curve-shared-logic');

const { eachLimit, eachSeries } = require('async');

const DeliverySchedule = require('../../models/deliverySchedule');
const Work = require('../../models/work');
const Client = require('../../models/client');
const CwrDelivery = require('../../models/cwrDelivery');
const DeliveryPartner = require('../../models/deliveryPartner');
const TerritoryGroup = require('../../models/territoryGroup');

const interval = 2 * 60 * 60 * 1000; // Run every 2 hours
const logText = 'FLUSH-DELIVERY-STATUS';
const devMode = (process.env.environmentName.toLowerCase() === 'development');

FlushDeliveryQueuedStatus.run = async () => {
  logger.info(`${logText}: Flushing delivery queued status..`);
  const clients = await Client.find().select({ name: 1 });
  await eachLimit(clients, 5, async (client) => {
    // do we only want to flush to active schedules?
    const deliverySchedules = await DeliverySchedule.find({ clientId: client._id.toString(), active: true }).select({ name: 1, clientId: 1, deliveryPartnerId: 1, filterType: 1, filter: 1 });

    await eachSeries(deliverySchedules, async (delivery) => {
      const { name, deliveryPartnerId, filterType, filter } = delivery;
      // Clear all queued works for this delivery schedule
      const worksToUpdate = await Work.find({ clientId: client._id.toString(), inFutureDelivery: delivery._id }).select('_id');
      await eachLimit(worksToUpdate, 50, async (work) => {
        await Work.findByIdAndUpdate(work._id, { $pull: { inFutureDelivery: delivery._id } }, { timestamps: false, createPatch: false });
      });
      // Get Works based on delivery filter type
      const works = await CwrUtils.getWorksMatchingFilter({
        Work,
        DeliverySchedule,
        CwrDelivery,
        DeliveryPartner,
        TerritoryGroup,
        clientId: client._id.toString(),
        deliveryPartnerId,
        filterType,
        deliveryFilter: filter });
      const today = new Date();
      if (works?.length) {
        const aggregation = [
          {
            $match: {
              deliveryPartnerId,
              active: true,
            },
          },
          {
            $addFields: {
              daysToDelivery: {
                $cond: [
                  {
                    $eq: ['$scheduleType', 'Month'],
                  },
                  {
                    $subtract: ['$scheduleDay', today.getDate()],
                  },
                  {
                    $add: [
                      {
                        $subtract: ['$scheduleDay', today.getDay()],
                      },
                      {
                        $cond: [
                          {
                            $gt: [today.getDay(), '$scheduleDay'],
                          },
                          7,
                          0,
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              daysToDelivery: {
                $cond: [
                  {
                    $lt: ['$daysToDelivery', 0],
                  },
                  {
                    $add: ['$daysToDelivery', 30],
                  },
                  '$daysToDelivery',
                ],
              },
            },
          },
          {
            $sort: {
              daysToDelivery: 1,
            },
          },
        ];

        logger.debug(aggregation);

        // get an ordered list of what schedules have been setup for this partnerId and order by date from today.
        const orderedDeliverySchedules = (await DeliverySchedule.aggregate(aggregation)).map((deliverySchedule) => deliverySchedule._id);

        logger.info(`${logText}: ${client.name}: ${works.length} work(s) queued for delivery: ${name} (${delivery._id.toString()})`);
        // Add schedule delivery Id to match works' inFutureDelivery array
        await eachLimit(works, 10, async (work) => {
          const workToUpdate = await Work.findById(work._id);

          // get the index of the first occuring delivery schedule for partnerId that already appears in the works inFutureDelivery array -1 if not found
          const minInFutureDeliveryIndex = orderedDeliverySchedules.findIndex((id) => workToUpdate?.inFutureDelivery?.includes(id));
          // get the index of the currently flushed delivery schedule from the ordered list of deliveries to that partnerId
          const minDeliveryIdIndex = orderedDeliverySchedules.findIndex((id) => id.equals(delivery._id));

          // if the work is not scheduled for this delivery, or this delivery is due before the next scheduled delivery, add to inFutureDelivery
          if (minInFutureDeliveryIndex === -1 || minDeliveryIdIndex < minInFutureDeliveryIndex) {
            // if a scheduled delivery appeared in the inFutureDelivery that was later that this delivery, remove it
            if (minInFutureDeliveryIndex !== -1) {
              // get the index of inFutureDelivery where the existing deliverySchedule appears. This is the schedule that needs remove as is after this one.
              const indexToRemove = workToUpdate?.inFutureDelivery?.findIndex((id) => id.equals(orderedDeliverySchedules[minInFutureDeliveryIndex]));
              workToUpdate?.inFutureDelivery?.splice(indexToRemove, 1);
            }
            // queue up this delivery
            workToUpdate?.inFutureDelivery?.push(delivery._id);
            await Work.findByIdAndUpdate(workToUpdate._id, { $set: { inFutureDelivery: workToUpdate.inFutureDelivery } }, { timestamps: false, createPatch: false });
          }
        });
      }
    });
  });

  logger.info(`${logText}: Done flushing queued for delivery status`);

  // if (runAsCron) {
  //   setTimeout(() => { FlushDeliveryQueuedStatus.run(); }, interval);
  // }
};

if (devMode) {
  FlushDeliveryQueuedStatus.run().then(() => process.exit(0));
} else {
  setInterval(FlushDeliveryQueuedStatus.run, interval);
}
