const Billing = this;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const _ = require('lodash');
const moment = require('moment');
const Stripe = require('stripe')(process.env.STRIPE_KEY || 'sk_test_51BksxMGEdIguBfryuwjrcC0WkHEXTnzkeLQpGD2fMNZk0yvXNE80jc2nWMiLvtMTcIOOqb2FuKh6HbqS2OhwFBmK00gXlzwECD');
const util = require('util');
const Contract = require('../../models/contract');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Work = require('../../models/work');
const Invoice = require('../../models/invoice');
const InvoiceGenerator = require('./invoice');
const config = require('../../config.json');
const Notification = require('../../models/notification');

Billing.getCustomerId = async (client) => {
  // A function to create a customer on Stripe and save its ID against the client
  if (!client) { throw Error('A client is required'); }
  // If the client has stripe ID already, return it
  if (client.billing?.stripeCustomerId) { return client.billing.stripeCustomerId; }
  // If no client.billing.stripeCustomerId, create Stripe customer
  const customer = { name: client.billing?.companyName || '', address: { line1: client.billing?.address1 || '', line2: client.billing?.address2 || '', city: client.billing?.city || '', country: client.billing?.country || '', postal_code: client.billing?.postcode || '' } };
  // Create Customer on Stripe
  const createdCustomer = await Stripe.customers.create(customer);
  // Save stripe customer id  against the client
  _.set(client, 'billing.stripeCustomerId', createdCustomer.id);
  // Save the client
  await client.save();
  return client;
};

Billing.getSetupIntents = async (client) => {
  // A function to create a setup intent for the Stripe card form
  await Billing.getCustomerId(client);
  if (!client?.billing?.stripeCustomerId) { throw Error('Client has no Stripe customer ID'); }
  const intent = await Stripe.setupIntents.create({ customer: client.billing.stripeCustomerId });
  return intent;
};

Billing.updatePaymentMethod = async (client, intent) => {
  // A function to update the payment method saved against the client
  if (!intent?.setupIntent?.payment_method) { throw Error('A payment intent is required to update the client\'s payment method'); }
  // Save the new payment method against the client
  _.set(client, 'billing.stripePaymentMethod', intent.setupIntent.payment_method);
  // Save the client
  await client.save();
};

Billing.retrievePaymentMethod = async (client, options) => {
  // A function to retrive the details of the card used by the client
  if (!options?.skipGettingCustomerId) {
    await Billing.getCustomerId(client);
  }
  if (!client.billing?.stripePaymentMethod) { throw Error('Client has no payment method on file'); }
  const paymentMethod = await Stripe.paymentMethods.retrieve(client.billing.stripePaymentMethod);
  const card = { brand: paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1), exp_month: paymentMethod.card.exp_month, exp_year: paymentMethod.card.exp_year, last4: paymentMethod.card.last4 };
  return { card };
};

// Charge a client
Billing.chargeClient = async (client, curveUser, ignoreLastPaymentFailure) => {
  let amount = 0;
  let userUsage = {};
  // Check to see if we should charge the client
  const chargeClient = !client.lockedForNonPayment || (client.lockedForNonPayment && ignoreLastPaymentFailure);
  if (!chargeClient) { throw Error('Client account already locked'); }
  // Check that client has Card as billing method
  const isBillingTypeCard = client.billing?.billingType === 'Card';
  if (!isBillingTypeCard) { throw Error('Billing type is not Card'); }
  // Check that the payment is due
  // Get charge dates
  const minimumLastChargeDate = moment().subtract(1, 'months').format();
  const minimumCreatedDate = moment().subtract(client.trialDays || 14, 'days').format();
  // Construct conditions
  const chargeBasedOnLastPaymentDate = client.billing?.lastPaymentDate && moment(client.billing.lastPaymentDate).isSameOrBefore(minimumLastChargeDate);
  const chargeBasedOnCreatedDate = !client.billing?.lastPaymentDate && moment(client.createdAt).isSameOrBefore(minimumCreatedDate);
  if (!chargeBasedOnLastPaymentDate && !chargeBasedOnCreatedDate) { throw Error('Payment not due'); }
  // Check the subscription hasn't been cancelled
  if (client.cancelledSubscription) {
    client.lockedForNonPayment = true;
    await client.save();
    throw Error('Subscription cancelled');
  }
  // Get billing amount
  logger.info(`Billing ${client._id.toString()}: Getting client's usage.`);
  if (client.billing?.amount) {
    userUsage = { amount: client.billing.amount, vat: client.billing?.country === 'GB' ? client.billing.amount * 0.2 : 0 };
    amount = userUsage.amount + userUsage.vat;
  } else {
    const usage = await Billing.getClientUsage(client);
    amount = usage.amount + usage.vat;
    userUsage = usage;
  }
  logger.info(userUsage);

  const currency = client.billing?.currency || 'GBP';

  // Make sure the client has a payment method on file
  const customer = client.billing?.stripeCustomerId;
  const paymentMethod = client.billing?.stripePaymentMethod;
  if (!customer || !paymentMethod) {
    const error = Error(!customer ? 'No Customer ID saved against the client.' : 'No Payment Method saved against the client.');
    return clientFailedToCharge(client, curveUser, amount, currency, error);
  }

  // Charge Card
  const paymentIntent = { amount: amount * 100, currency, customer, payment_method: paymentMethod, off_session: true, confirm: true };
  // Create Stripe Payment Intent
  logger.info(`Billing ${client._id.toString()}: Charging the client..`);
  try {
    await Stripe.paymentIntents.create(paymentIntent);
  } catch (error) {
    await clientFailedToCharge(client, curveUser, amount, currency, error);
  }
  // The charge itself has succeeded by this point - anything below must not be able to make it look like it failed.
  await clientChargedSuccessfully(client, curveUser, amount, currency, userUsage);
};

Billing.getClientUsage = async (client, currency) => {
  await Billing.getCustomerId(client);
  // Get Contracts count
  const contracts = await Contract.countDocuments({ clientId: client._id.toString() });
  // Get Releases count
  const releases = await Release.countDocuments({ clientId: client._id.toString() });
  // Get Tracks count
  const tracks = await Track.countDocuments({ clientId: client._id.toString() });
  // Get Works count
  const works = await Work.countDocuments({ clientId: client._id.toString() });
  // Sum counts of catalogue items
  const catalogue = (client.clientType === 'Publisher' && client.paymentTier === 'Lite') ? works : (releases + tracks + works); // Keep the label count the same as before works + tracks + releases, we only want to change the count for publisher clients ONLY.
  // Get billing amount
  const currencyToCharge = currency || client.billing?.currency || 'GBP';
  const billingAmount = getBillingAmountFromUsage(client.clientType, client.paymentTier, contracts, catalogue, currencyToCharge);
  // Add any additional charge the client
  if (client.billing?.additionalCharge && !Number.isNaN(parseFloat(client.billing.additionalCharge))) {
    billingAmount.amount += client.billing.additionalCharge;
    billingAmount.amount = parseFloat(billingAmount.amount.toFixed(2));

    billingAmount.nextTier.nextAmount += client.billing.additionalCharge;
    billingAmount.nextTier.nextAmount = parseFloat(billingAmount.nextTier.nextAmount.toFixed(2));
  }
  const nextBillingDate = client.billing?.lastPaymentDate
    ? moment(client.billing.lastPaymentDate).add(1, 'months').format()
    : moment(client.createdAt).add(client.trialDays || 14, 'days').format();
  const vat = client.billing?.country === 'GB' ? billingAmount.amount * 0.2 : 0;
  const nextTierVat = client.billing?.country === 'GB' ? billingAmount.nextTier.nextAmount * 0.2 : 0;
  billingAmount.nextTier.nextTierVat = nextTierVat;
  const usage = { amount: billingAmount.amount, vat, contracts, catalogue, nextBillingDate, currencyToCharge, nextTier: billingAmount.nextTier };
  return usage;
};

const getBillingAmountFromUsage = (clientType, paymentTier, contracts, catalogue, currency) => {
  const plan = paymentTier === 'Lite' ? config.billingTiers.lite[clientType] : config.billingTiers.pro;
  let amount = plan.prices.base[currency];

  const extraContracts = contracts - plan.contracts;
  const extraCatalogue = catalogue - plan.catalogue;

  const contractsIncrement = extraContracts > 0 ? Math.ceil(extraContracts / plan.prices.increments.contracts) : 0;
  const catalogueIncrement = extraCatalogue > 0 ? Math.ceil(extraCatalogue / plan.prices.increments.catalogue) : 0;
  const incrementToApply = contractsIncrement > catalogueIncrement ? contractsIncrement : catalogueIncrement;
  amount += plan.prices.extra[currency] * incrementToApply;

  const nextTier = {
    contracts: plan.contracts + incrementToApply * plan.prices.increments.contracts,
    catalogue: plan.catalogue + incrementToApply * plan.prices.increments.catalogue,
    nextAmount: amount + plan.prices.extra[currency],
  };

  return { nextTier, amount };
};

const clientChargedSuccessfully = async (client, curveUser, amount, currency, userUsage) => {
  logger.info(`Billing ${client._id.toString()}: Successfully charged`);
  const chargeFailed = false;
  client.billing.lastPaymentFailure = null;
  client.billing.lastPaymentDate = moment().format();
  client.lockedForNonPayment = false;
  await client.save();

  try {
    logger.info(`Billing ${client._id.toString()}: Creating Invoice..`);
    await createInvoice(client, userUsage);
    logger.info(`Billing ${client._id.toString()}: Invoice created`);
  } catch (error) {
    logger.error(`Billing ${client._id.toString()}: Successfully charged but failed to create the invoice`, error);
  }

  try {
    logger.info(`Billing ${client._id.toString()}: Notifying the client..`);
    await notifiyClientAfterChargeAttempt(client, curveUser, amount, currency, chargeFailed);
    logger.info(`Billing ${client._id.toString()}: Client notified.`);
  } catch (error) {
    logger.error(`Billing ${client._id.toString()}: Successfully charged but failed to notify the client`, error);
  }
};

const clientFailedToCharge = async (client, curveUser, amount, currency, error) => {
  logger.info(`Billing ${client._id.toString()}: Failed to charge`);
  logger.error(error);
  const chargeFailed = true;
  client.billing.lastPaymentFailure = error?.raw?.message || error?.message;
  client.lockedForNonPayment = true;
  await client.save();
  logger.info(`Billing ${client._id.toString()}: Notifying the client.`);
  await notifiyClientAfterChargeAttempt(client, curveUser, amount, currency, chargeFailed);
  logger.info(`Billing ${client._id.toString()}: Client notified.`);
  throw error;
};

const notifiyClientAfterChargeAttempt = async (client, curveUser, amount, currency, chargeFailed) => {
  const User = require('../../models/user');
  const usersToNotify = [];
  if (curveUser) {
    usersToNotify.push(curveUser);
  } else {
    // If the process of charging the client was not triggered from the browser, find all admin users and email them instead.
    const users = await User.find({ adminClientIds: client._id.toString() });
    users.forEach((user) => { usersToNotify.push({ id: user._id.toString(), clientId: client._id.toString() }); });
  }
  const currencyMapping = { GBP: '£', USD: '$', EUR: '€' };
  if (chargeFailed) {
    const paymentMethod = client.billing?.stripePaymentMethod;
    if (!paymentMethod) {
      usersToNotify.forEach((curveUser) => {
        const url = 'https://app.curveroyaltysystems.com/#/billing';
        const deleteAfterMonths = 3;
        const trialPeriod = 14;
        const upcomingDeletionDate = client.billing?.lastPaymentDate
          ? moment(client.billing.lastPaymentDate).add(deleteAfterMonths + 1, 'months').format('Do MMMM YYYY')
          : moment(client.createdAt).add(deleteAfterMonths, 'months').add(trialPeriod, 'days').format('Do MMMM YYYY');
        const generateOptions = {
          identifier: 'genericError',
          curveUser,
          client,
          subject: 'Your Curve Lite Subscription Has Ended',
          mainText: `Your Curve Lite trial has now ended. If you wish to continue using Curve please add card details on your Billing page. If you do not restart your subscription, your data will be deleted on ${upcomingDeletionDate}.<br><br><br>
          <center>
          <a href="${url}" 
            style="display:inline-block;color:#ffffff;text-decoration:none;border-radius:20px;background-color:#4aa3df;border-top:10px solid #4aa3df;border-right:18px solid #4aa3df;border-bottom:10px solid #4aa3df;border-left:18px solid #4aa3df">
              Restart Your Subscription
          </a>
          </center>`,
          closingText: '',
        };
        Notification.generate(
          'Payment Failed',
          'Your Curve Lite trial has now ended. If you wish to continue using Curve please add card details on your Settings > Billing page.',
          null,
          curveUser,
          generateOptions,
        );
      });
    } else {
      usersToNotify.forEach((curveUser) => {
        const generateOptions = {
          identifier: 'genericError',
          curveUser,
          client,
          subject: 'Payment Failed',
          mainText: `Unfortunately we have failed to charge your card for the amount ${currencyMapping[currency]}${amount}. Please check your card details in your account under Settings > Billing, and try again.`,
          closingText: '',
        };
        Notification.generate(
          'Payment Failed',
          `Unfortunately we have failed to charge your card for the amount ${currencyMapping[currency]}${amount}. Please check your card details in your account under Settings > Billing, and try again.`,
          null,
          curveUser,
          generateOptions,
        );
      });
    }
  } else {
    usersToNotify.forEach((curveUser) => {
      const generateOptions = {
        identifier: 'genericComplete',
        curveUser,
        client,
        subject: 'Successful Payment',
        mainText: `You have successfully been charged ${currencyMapping[currency]}${amount} to your card on file. You can find you invoices and billing information in your account under Settings > Billing. As ever, thank you for your business!`,
      };

      Notification.generate(
        'Successful Payment',
        `You have successfully been charged ${currencyMapping[currency]}${amount} to your card on file. You can find you invoices and billing information in your account under Settings > Billing. As ever, thank you for your business!`,
        null,
        curveUser,
        generateOptions,
      );
    });
  }
};

const createInvoice = async (client, usage) => {
  const params = {
    s3WriteKey: `invoice/${client._id.toString()}/Invoice ${moment().format('MMM YYYY')}.pdf`,
    name: `Invoice ${moment().format('MM/YYYY')}`,
    billingInfo: client.billing,
    usage,
  };

  const file = await util.promisify(InvoiceGenerator)(params);

  const invoice = new Invoice({
    clientId: client._id.toString(),
    name: `Invoice ${moment().format('MM/YYYY')}`,
    billingInfo: client.billing,
    date: moment().format(),
    usage,
    file,
  });

  await invoice.save();
};

module.exports = Billing;
