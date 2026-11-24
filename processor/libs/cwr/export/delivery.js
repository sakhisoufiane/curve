const { DeliveredWorkController } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { keyBy } = require('lodash');

const DeliveredWork = require('../../../models/deliveredWork');
const DeliveryPartner = require('../../../models/deliveryPartner');
const DeliveryLog = require('../../../models/deliveryLog');
const Work = require('../../../models/work');
const Filter = require('./filter');

/**
 * Marks works in a delivery as delivered, creating or updating DeliveredWork records and logging the actions.
 * @param {Object} params
 * @param {string} params.logKey - A unique key for logging purposes.
 * @param {Object} params.delivery - The CwrDelivery object containing delivery details.
 * @returns {Promise<Array>} - Promise that resolves to an array of updated DeliveredWork records.
 */
async function markWorksAsDelivered({ logKey, delivery }) {
  const filter = await Filter.buildWorksFilter({ delivery });

  const [
    works,
    rootDeliveryPartner,
  ] = await Promise.all([
    Work.find(filter).select({ _id: 1 }),
    DeliveryPartner.findById(delivery.deliveryPartnerId),
  ]);

  if (works.length === 0) return;

  // Get Sub-Partner IDs where they exist, otherwise use only this deliveryPartnerId
  const deliveryPartnerIds = rootDeliveryPartner.subPartners?.length
    ? [delivery.deliveryPartnerId].concat(rootDeliveryPartner.subPartners.map((subPartner) => subPartner._id))
    : [delivery.deliveryPartnerId];

  // Get metadata for all Delivery Partners
  const deliveryPartners = await DeliveryPartner.find(
    {
      _id: { $in: deliveryPartnerIds },
      clientId: delivery.clientId,
    },
    { _id: 1, name: 1, receivingParty: 1 },
  );

  // Save filtered Work IDs on the Delivery
  delivery.workIds = works.map((work) => work._id.toString());
  logger.info(logKey, 'Updating Delivery Work IDs:', delivery.workIds);
  await delivery.save();

  // Get all previously Delivered Works for any Work & Delivery Partner combination
  const deliveredWorks = await DeliveredWork.find({
    clientId: delivery.clientId,
    workId: { $in: delivery.workIds },
    deliveryPartnerId: { $in: deliveryPartnerIds },
  });
  logger.info(logKey, 'Found previously Delivered Works:', deliveredWorks.length);

  const deliveredWorksById = keyBy(deliveredWorks, (dw) => `${dw.workId.toString()}:${dw.deliveryPartnerId.toString()}`);
  const updatedDeliveredWorks = [];

  for (const deliveryPartner of deliveryPartners) {
    for (const work of works) {
      let deliveredWork = deliveredWorksById[`${work._id.toString()}:${deliveryPartner._id.toString()}`];
      if (!deliveredWork) {
        // Create a new record if the Work has not been delivered to this Delivery Partner before
        deliveredWork = new DeliveredWork({
          clientId: delivery.clientId,
          workId: work._id,
          deliveryPartnerId: deliveryPartner._id,
          cwrDeliveryId: delivery._id,
          receivingParty: deliveryPartner.receivingParty,
          deliveryDate: new Date(),
        });

        // Only update status for non-accepted deliveries
        if (!DeliveredWorkController.ackDeliveryStatuses.Accepted.includes(deliveredWork.status)) {
          deliveredWork.status = 'Delivered';
        }
      }

      deliveredWork.deliveryDate = new Date();
      updatedDeliveredWorks.push(deliveredWork);
    }
  }

  // Save all Delivered Works
  logger.info(logKey, 'Saving Delivered Works:', updatedDeliveredWorks.length);
  await DeliveredWork.bulkSave(updatedDeliveredWorks);

  // Log Delivered Works
  const deliveredWorkLogs = updatedDeliveredWorks.map((deliveredWork) => ({
    clientId: delivery.clientId,
    deliveryPartnerId: deliveredWork.deliveryPartnerId,
    workId: deliveredWork.workId,
    deliveredWorkId: deliveredWork._id,
    cwrDeliveryId: delivery._id,
    status: deliveredWork.status,
    action: 'Delivery',
    date: new Date().toISOString(),
  }));
  logger.info(logKey, 'Logging Delivered Works:', deliveredWorkLogs.length);
  await logDeliveredWorks({ deliveredWorkLogs });

  const deliveredAt = new Date().toISOString();
  const deliveredToArray = [
    {
      deliveryPartnerId: delivery.deliveryPartnerId,
      deliveredAt,
    },
  ];

  if (rootDeliveryPartner?.subPartners) {
    rootDeliveryPartner.subPartners.forEach((subPartner) => deliveredToArray.push({
      deliveryPartnerId: subPartner.partner._id,
      deliveredAt,
    }));
  }

  const workUpdates = works.map((work) => ({
    updateOne: {
      filter: { _id: work._id },
      update: {
        $push: {
          deliveredTo: { $each: deliveredToArray },
        },
        $pull: {
          forceRedelivery: delivery.deliveryPartnerId,
        },
      },
    },
  }));

  logger.info(logKey, 'Updating Works Delivery fields:', workUpdates.length);
  await Work.bulkWrite(workUpdates);

  return updatedDeliveredWorks;
}

/**
 * Logs delivered works into DeliveryLog collection.
 * @param {Object} params
 * @param {Array} params.deliveredWorkLogs - Array of delivered work log entries.
 * @returns {Promise} - Promise that resolves when the logs are saved.
 */
async function logDeliveredWorks({ deliveredWorkLogs }) {
  if (deliveredWorkLogs.length === 0) return;
  const operations = deliveredWorkLogs.map((entry) => ({
    updateOne: {
      filter: {
        clientId: entry.clientId,
        deliveryPartnerId: entry.deliveryPartnerId,
        workId: entry.workId,
      },
      update: {
        $push: {
          log: {
            deliveredWorkId: entry.deliveredWorkId,
            cwrDeliveryId: entry.cwrDeliveryId,
            acknowledgementId: entry.acknowledgementId,
            status: entry.status,
            action: entry.action,
            date: entry.date,
          },
        },
        $setOnInsert: {
          clientId: entry.clientId,
          deliveryPartnerId: entry.deliveryPartnerId,
          workId: entry.workId,
        },
      },
      upsert: true,
    },
  }));
  return DeliveryLog.bulkWrite(operations);
}

module.exports = {
  markWorksAsDelivered,
};
