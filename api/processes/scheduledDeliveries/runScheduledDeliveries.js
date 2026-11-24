const RunScheduledDeliveries = this;

require('../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit, eachSeries } = require('async');
const moment = require('moment');
const cron = require('node-cron');

const DeliveryPartner = require('../../models/deliveryPartner');
const DeliverySchedule = require('../../models/deliverySchedule');
const CwrDelivery = require('../../models/cwrDelivery');
const Client = require('../../models/client');
const Work = require('../../models/work');
const User = require('../../models/user');

const SendEmail = require('../../libs/sendEmail');

const logText = 'DELIVERIES-RUNNER';
const devMode = (process.env.environmentName.toLowerCase() === 'development');

RunScheduledDeliveries.run = async () => {
  logger.info(`${logText}: Getting deliveries schedules for today`);
  const day = moment().startOf('day');
  const monthlyDay = parseInt(day.format('DD'));
  const weeklyDay = parseInt(day.format('e'));

  const clients = await Client.find().select({ _id: 1, deliveryEmails: 1, name: 1 }).lean();
  await eachLimit(clients, 5, async (client) => {
    logger.info(`${logText}: Processing deliveries for ${client._id.toString()} ${client.name}`);
    const deliverySchedules = await DeliverySchedule
      .find({
        clientId: client._id.toString(),
        active: true,
        $or: [
          { scheduleType: 'Month', scheduleDay: monthlyDay },
          { scheduleType: 'Week', scheduleDay: weeklyDay },
        ],
      })
      .populate('deliveryPartnerId', 'name')
      .select({
        name: 1,
        deliveryPartnerId: 1,
        filterType: 1,
        filter: 1,
        additionalCustomFilters: 1,
      })
      .lean();

    await eachSeries(deliverySchedules, async (deliverySchedule) => {
      await createDelivery({ client, deliverySchedule }).catch((err) => {
        logger.error(`${logText}: (${client._id.toString()} ${client.name}) ${deliverySchedule._id.toString()} ${deliverySchedule.name} errored.`);
        logger.error(err);
      });
    });
  });

  logger.info(`${logText}: Done processing deliveries`);
};

const createDelivery = async ({ client, deliverySchedule }) => {
  logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name} is attempting delivery`);
  const clientId = client._id.toString();
  const { name, deliveryPartnerId } = deliverySchedule;
  const works = await Work.find({ clientId, inFutureDelivery: deliverySchedule._id }).select('_id').lean();
  const workIds = works.map((work) => work._id.toString());

  if (workIds.length) {
    logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name} has ${workIds.length} works matching the filter`);
    const { cwrVersion, outputFormat, receivingParty, territory, type } = await DeliveryPartner.findById(deliveryPartnerId._id.toString()).select('cwrVersion outputFormat receivingParty territory type').lean();

    if (type === 'Export Only') {
      logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name} is Export Only`);
      return;
    }

    // Update the DeliverySchedule with run of date and work count
    // We track this using a lambda to ensure deliveries have been made
    await DeliverySchedule.findByIdAndUpdate(deliverySchedule._id, { $set: { 'lastRun.date': moment.utc().format(), 'lastRun.workCount': workIds.length } }).catch(logger.error);

    const cwrDelivery = new CwrDelivery({
      clientId,
      name: `Scheduled Delivery: ${name}`,
      deliveryPartnerId: deliveryPartnerId._id,
      cwrVersion,
      outputFormat,
      receivingParty,
      territory,
      workIds,
      filterType: deliverySchedule.filterType,
      filter: deliverySchedule.filter,
      additionalCustomFilters: deliverySchedule.additionalCustomFilters,
      fromScheduledDelivery: true,
      deliveryScheduleId: deliverySchedule._id,
    });

    await cwrDelivery.save();
    logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name}: CWR Delivery (${cwrDelivery._id.toString()}) created`);
    const curveUser = { clientId };
    // Make delivery
    let deliveryError;
    await new Promise((resolve, reject) => {
      cwrDelivery.deliver(curveUser, (err) => {
        if (err) {
          deliveryError = err;
        }
        resolve();
      });
    });
    if (deliveryError) {
      logger.error(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name}: CWR Delivery (${cwrDelivery._id.toString()}) errored`, deliveryError);
    } else {
      logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name}: CWR Delivery (${cwrDelivery._id.toString()}) delivered`);
      // Add deliveryPartnerId to the deliveredTo array of the works and remove it from the forceRedelivery array
      const deliveryPartner = await DeliveryPartner.findById(deliveryPartnerId._id);
      const deliveredToArray = [{ deliveryPartnerId: deliveryPartnerId._id, deliveredAt: moment().format(), status: 'Delivered' }];
      if (deliveryPartner?.subPartners) {
        deliveryPartner.subPartners.forEach((subPartner) => deliveredToArray.push({ deliveryPartnerId: subPartner.partner._id, deliveredAt: moment().format(), status: 'Delivered' }));
      }
      await eachLimit(workIds, 5, async (workId) => {
        await Work.findByIdAndUpdate(workId, {
          $push: { deliveredTo: { $each: deliveredToArray } },
          $pull: { forceRedelivery: deliveryPartnerId._id, inFutureDelivery: deliverySchedule._id },
        });
      });

      const subject = 'Your Curve Scheduled Delivery has been sent';
      const body = `
      Hi, </br></br>

      Your Scheduled Delivery to ${deliverySchedule?.deliveryPartnerId?.name} containing ${workIds.length} Works was delivered on ${moment().format('DD/MM/YYYY')} at ${moment().format('hh:mm')}. </br></br>

      `;

      if (client.deliveryEmails?.length) {
        const users = await User.find({ clientIds: client._id.toString(), _id: { $in: client.deliveryEmails } }).select('email').lean();
        users.forEach((user) => {
          SendEmail.genericEmail(user.email, client, subject, body);
        });
      }
    }
  } else {
    logger.info(`${logText}: (${client._id.toString()} ${client.name}) Scheduled Delivery ${deliverySchedule._id.toString()} ${deliverySchedule.name} has no works matching the filter`);
    // Update the DeliverySchedule with run of date and work count
    // We track this using a lambda to ensure deliveries have been made
    await DeliverySchedule.findByIdAndUpdate(deliverySchedule._id, { $set: { 'lastRun.date': moment.utc().format(), 'lastRun.workCount': 0 } });
  }
};

if (devMode) {
  RunScheduledDeliveries.run().then(() => process.exit(0));
} else {
  // Run daily at 1am
  cron.schedule('0 1 * * *', () => RunScheduledDeliveries.run());
}
