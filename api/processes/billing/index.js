/* eslint-disable no-await-in-loop */
// Connect to the database
const BillingProcesses = this;

require('../../models/db');
require('dotenv').config();
const { logger, crossEnvironmentConfig } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');
const Client = require('../../models/client');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const deleteClients = require('../deleteClients');

sgMail.setApiKey(process.env.sendgridKey);

const deleteAfterMonths = 3;
const trialPeriod = 14;
const notifyBeforeDays = 7;
const supportEmail = process.env.supportEmail || 'support@curveroyaltysystems.com';
const logText = 'BillingProcesses';

BillingProcesses.chargeClients = async () => {
  // Clients in trial
  const minimumCreatedAtDate = moment().subtract(14, 'days').format();
  const inTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.lastPaymentDate': { $exists: false } },
      { createdAt: { $lte: minimumCreatedAtDate } },
      { lockedForNonPayment: { $ne: true } },
    ],
  };
  // Client not in trial anymore
  const minimumLastChargeDate = moment().subtract(1, 'months').format();
  const notInTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.lastPaymentDate': { $exists: true } },
      { 'billing.lastPaymentDate': { $lte: minimumLastChargeDate } },
      { lockedForNonPayment: { $ne: true } },
    ],
  };
  const query = { $or: [inTrialQuery, notInTrialQuery] };

  // Log for process monitoring
  logger.info(`${logText}: chargeClients running | Trial minimumCreatedAtDate : ${minimumCreatedAtDate} | minimumLastChargeDate : ${minimumLastChargeDate}`);

  const clients = await Client.find(query).catch(logger.error);

  if (!clients?.length) { return logger.info(`${logText}: No clients to charge.`); }

  for (const client of clients) { await client.chargeClient().catch(logger.error); }
};

BillingProcesses.emailExpiringClients = async () => {
  // Clients in trial
  const createdAtDate = moment().subtract(13, 'days');

  const query = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.stripePaymentMethod': { $exists: false } },
      { cancelledSubscription: { $ne: true } },
      { lockedForNonPayment: { $ne: true } },
      { createdAt: { $gte: createdAtDate.startOf('day').format() } },
      { createdAt: { $lte: createdAtDate.endOf('day').format() } },
    ],
  };

  // Log for process monitoring
  logger.info(`${logText}: emailExpiringClients running | createdAtDate : ${createdAtDate}`);

  const clients = await Client.find(query).catch(logger.error);

  if (!clients?.length) { return logger.info(`${logText}: No clients to email.`); }

  for (const client of clients) {
    logger.info(`${logText}: Emailing client ${client._id}`);
    const users = await User.find({ adminClientIds: client._id.toString() });
    const usersToNotify = users.map((user) => ({ id: user._id.toString(), clientId: client._id.toString() }));
    usersToNotify.forEach((curveUser) => {
      const generateOptions = {
        identifier: 'genericComplete',
        curveUser,
        client,
        subject: 'Your free trial of Curve is ending tomorrow',
        mainText: `
          Your free trial of Curve is ending tomorrow. To continue using the service, you will need to enter in your card details on the billing page here. </br></br>
          If you'd like to discuss your requirements further or billing options, then please get in contact with us at hello@curveroyaltysystems.com
          `,
      };

      Notification.generate(
        'Your free trial of Curve is ending tomorrow',
        `
          Your free trial of Curve is ending tomorrow. To continue using the service, you will need to enter in your card details on the billing page here.
          If you'd like to discuss your requirements further or billing options, then please get in contact with us at hello@curveroyaltysystems.com
          `,
        null,
        curveUser,
        generateOptions,
      );
    });
  }
};

BillingProcesses.notifyAboutSoonToBeDeleted = async () => {
  // Date from which to delete
  const minimumDate = moment().subtract(deleteAfterMonths, 'months').format();
  const upcomingDeleteDate = moment().subtract(deleteAfterMonths, 'months').add(notifyBeforeDays, 'days').format();

  const inTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.lastPaymentDate': { $exists: false } },
      { createdAt: { $gt: moment(minimumDate).subtract(trialPeriod, 'days').format() } },
      { createdAt: { $lte: moment(upcomingDeleteDate).subtract(trialPeriod, 'days').format() } },
      { lockedForNonPayment: true },
      { preventDeletion: false },
    ],
  };
  const notInTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.lastPaymentDate': { $exists: true } },
      { 'billing.lastPaymentDate': { $gt: moment(minimumDate).subtract(1, 'month').format() } },
      { 'billing.lastPaymentDate': { $lte: moment(upcomingDeleteDate).subtract(1, 'month').format() } },
      { lockedForNonPayment: true },
      { preventDeletion: false },
    ],
  };
  const query = { $or: [inTrialQuery, notInTrialQuery] };

  // Log for process monitoring
  logger.info(`${logText}: notifyAboutSoonToBeDeleted running | minimumDate : ${minimumDate} | upcomingDeleteDate : ${upcomingDeleteDate}`);

  // Client not in trial anymore
  const clients = await Client.find(query, 'name createdAt billing').catch(logger.error);

  if (!clients?.length) { return logger.info(`${logText}: No clients to delete in the upcoming ${notifyBeforeDays} days.`); }

  const clientNames = clients.map((client) => `<b>${client.name}</b> is due to be deleted on ${getDeletionDate(client)} `).join('</br>');

  const msg = {
    to: supportEmail,
    from: 'backend@curveroyaltysystems.com',
    subject: 'Clients due to be deleted',
    html: `The following clients are due to be deleted: </br></br> <b>Total: </b>${clients.length} </br></br> ${clientNames}
      </br></br>If any of these shouldn’t be deleted, please configure the deletion prevention on the client within the system.`,
    templateId: 'ca132040-44b6-4421-aa9e-86d56022dea1',
    substitutions: {
      logo: 'https://app.curveroyaltysystems.com/assets/img/curvetypwhite2x.png',
      supportEmail: 'support@curveroyaltysystems.com',
      parentName: 'Curve',
      parentAddress: '150 Tooley Street<br/>London<br/>SE1 2TU',
    },
  };

  sgMail.send(msg);
};

BillingProcesses.deleteBillingClients = async () => {
  // Date from which to delete
  const minimumDate = moment().subtract(deleteAfterMonths, 'months');

  const inTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      {
        $or: [
          { 'billing.lastPaymentDate': { $exists: false } },
          { 'billing.lastPaymentDate': null },
          { 'billing.lastPaymentDate': '' },
        ],
      },
      { createdAt: { $lte: new Date(minimumDate.subtract(trialPeriod, 'days').format()) } },
      { lockedForNonPayment: true },
      { preventDeletion: false },
    ],
  };
  const notInTrialQuery = {
    $and: [
      { 'billing.billingType': 'Card' },
      { 'billing.lastPaymentDate': { $exists: true } },
      { 'billing.lastPaymentDate': { $lte: new Date(minimumDate.subtract(1, 'month').format()) } },
      { lockedForNonPayment: true },
      { preventDeletion: false },
    ],
  };

  // Log for process monitoring
  logger.info(`${logText}: deleteClients running | minimumDate : ${minimumDate}`);

  const { productionUri } = crossEnvironmentConfig;
  const query = { $or: [inTrialQuery, notInTrialQuery] };

  // Delete client data
  await deleteClients(productionUri, query, logText).catch(logger.error);
};

const getDeletionDate = (client) => (
  client.billing?.lastPaymentDate
    ? moment(client.billing.lastPaymentDate).add(deleteAfterMonths + 1, 'months').format('MMM Do hh:mm')
    : moment(client.createdAt).add(deleteAfterMonths, 'months').add(trialPeriod, 'days').format('MMM Do hh:mm')
);

module.exports = BillingProcesses;
