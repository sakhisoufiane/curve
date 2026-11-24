const PreDeliveryNotification = this;

require('../../models/db');

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachLimit } = require('async');
const moment = require('moment');
const cron = require('node-cron');

const DeliverySchedule = require('../../models/deliverySchedule');
const DeliveryPartner = require('../../models/deliveryPartner');
const Client = require('../../models/client');
const Work = require('../../models/work');
const User = require('../../models/user');

const SendEmail = require('../../libs/sendEmail');

const hoursBeforeNotifying = 48;
const logText = 'PRE-DELIVERY-NOTIFICATION';
const devMode = (process.env.environmentName.toLowerCase() === 'development');

PreDeliveryNotification.notify = async () => {
  logger.info(`${logText}: notifiying clients about upcoming deliveries..`);
  const day = moment().startOf('day').add(hoursBeforeNotifying, 'hours');
  const monthlyDay = parseInt(day.format('DD'));
  const weeklyDay = parseInt(day.format('e'));

  const clients = await Client.find().select({ deliveryEmails: 1 });
  await eachLimit(clients, 5, async (client) => {
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
      .select({ name: 1, deliveryPartnerId: 1 });

    await eachLimit(deliverySchedules, 10, async (deliverySchedule) => {
      const worksCount = await Work.countDocuments({ clientId: client._id.toString(), inFutureDelivery: deliverySchedule._id });

      let subject; let body;
      if (worksCount) {
        subject = `Curve will deliver ${worksCount} Work${worksCount > 1 ? 's' : ''} to ${deliverySchedule?.deliveryPartnerId?.name} in 48 Hours`;
        body = `
        Hi, </br></br>

        Your Scheduled Delivery to ${deliverySchedule?.deliveryPartnerId?.name} containing ${worksCount} Work${worksCount > 1 ? 's' : ''} will be delivered on ${moment().startOf('day').add(hoursBeforeNotifying, 'hours').format('dddd Do')} at 4 AM GMT. </br></br>

        You don’t need to do anything, unless you want to edit or deactivate this Scheduled Delivery. </br></br>

        To make any changes or deactivate it, click the link below to go to this Delivery Schedule in Curve. </br></br> 

        https://app.curveroyaltysystems.com/#/deliverySchedules/${deliverySchedule._id.toString()}/edit. </br></br> 
        `;
      } else {
        subject = 'Curve Scheduled Delivery';
        body = `
        Hi, </br></br>
        
        Your Scheduled Delivery to ${deliverySchedule?.deliveryPartnerId?.name} contains no Works, so this delivery will not be made. </br></br>

        `;
      }
      if (client.deliveryEmails?.length) {
        const users = await User.find({ clientIds: client._id.toString(), _id: { $in: client.deliveryEmails } });

        users.forEach((user) => {
          SendEmail.genericEmail(user.email, client, subject, body);
        });
      }
    });
  });

  logger.info(`${logText}: Done notifiying clients`);
};

PreDeliveryNotification.notifyStaff = async () => {
  logger.info('DELIVERY-INTERNAL-NOTIFICATION: Checking for deliveries to be made tomorrow');
  const day = moment().startOf('day').add(24, 'hours');
  const monthlyDay = parseInt(day.format('DD'));
  const weeklyDay = parseInt(day.format('e'));

  const clients = await Client.find().select({ name: 1 });
  await eachLimit(clients, 5, async (client) => {
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
      .select({ name: 1, deliveryPartnerId: 1 });

    await eachLimit(deliverySchedules, 10, async (deliverySchedule) => {
      logger.info(`DELIVERY-INTERNAL-NOTIFICATION: ${client.name} - ${deliverySchedule.name} - Delivery to be made tomorrow`);
    });
  });

  logger.info('DELIVERY-INTERNAL-NOTIFICATION: Completed check for deliveries tomorrow');
};

if (devMode) {
  Promise.all([
    PreDeliveryNotification.notify(),
    PreDeliveryNotification.notifyStaff(),
  ]).then(() => process.exit(0)).catch((err) => {
    logger.error(`${logText}: ${err}`);
    process.exit(1);
  });
} else {
  // Run daily at 3:15am
  cron.schedule('15 3 * * *', () => PreDeliveryNotification.notify());
  cron.schedule('15 3 * * *', () => PreDeliveryNotification.notifyStaff());
}
