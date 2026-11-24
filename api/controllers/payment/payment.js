/* eslint-disable global-require */
const { logger, Wise } = require('@curveroyaltysystems/platform-shared-utils');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { eachLimit } = require('async');
const { createHmac } = require('node:crypto');
const { curvePayWebhookTypes, clientNotificationType, getNotificationDetails } = require('./paymentWebhookHelper');
const PayeeController = require('../payee');
const Notification = require('../../models/notification');
const Client = require('../../models/client');
const Payee = require('../../models/payee');

const PaymentController = this;

PaymentController.validatePayment = async function ({ payment, next }) {
  // eslint-disable-next-line global-require
  const Contract = require('../../models/contract');
  // eslint-disable-next-line global-require
  const Payee = require('../../models/payee');
  // Add refCode (ms timestamp) if the payment doesn't have one
  if (!payment.refCode) { await payment.getUniqueRefCode(); }
  if (!payment.uuid) { await payment.getUniqueUuid(); }
  // Validate Payment hasn't been paid already
  if (payment.status === 'Paid') { return next(Error('Payment has been paid and cannot be updated')); }
  // Validate paymentGroupId
  if (!payment.paymentGroupId || payment.paymentGroupId === '') { return next(Error('Payment must be associated with a payment group')); }
  // Validate name
  if (!payment.name || payment.name === '') { return next(Error('Payment must have a name')); }
  // Validate amount
  if (!payment.amount || payment.amount === '' || payment.amount.toString().indexOf('e') !== -1 || payment.amount.toString().indexOf('E') !== -1) { return next(Error('Payment must have a valid amount')); }
  // Validate amount is positive
  if (payment.amount < 0) { return next(Error('Payment must have a positive amount')); }
  // Convert amount to decimal places
  payment.amount = parseFloat(Math.round(payment.amount * 100) / 100);
  // Validate Payee
  if (!payment.payeeId || payment.payeeId === '') { return next(Error('Payment must be associated with a payee')); }
  const payee = await Payee.findById(payment.payeeId);
  if (!payee) { return next(Error('Payment must be associated with a payee')); }
  // Validate contract exists
  if (payment.contractId) {
    const contract = await Contract.findById(payment.contractId);
    if (!contract) { return next(Error('Payment must be associated with a valid contract')); }
  }
  // Validate currency
  if (!payment.currency || payment.currency === '') {
    payment.currency = await PayeeController.getPaymentCurrency({ payeeId: payment.payeeId, clientId: payment.clientId, contractId: payment.contractId });
    if (!payment.currency) { return next(Error('Payment must have a valid currency')); }

    if (!payment.withholdingTaxCurrency) payment.withholdingTaxCurrency = payment.currency;
  }
  // Generate warnings
  await PaymentController.generateWarning({ payee, payment });
  // Handle transactions associated with the payment
  await payment.validateTransactions();
  // Update the payment status
  if (payment.error) {
    payment.status = 'Payment Error';
  } else if (payment.paymentDetails) {
    payment.status = 'Paid';
  } else {
    // Get payee's payable status
    const { payable, reason } = await payee.isPayeePayable(payment.amount);
    payment.status = payable ? 'Pending' : 'Missing Info';
    payment.missingInfoReason = reason;
  }

  payment.markModified('status');

  next();
};

PaymentController.validateDeletion = async function ({ payment, next }) {
  // eslint-disable-next-line global-require
  const Transaction = require('../../models/transaction');
  // Prevent deletion if payment is paid already
  if (payment.status === 'Paid') return next(Error('Payment has been paid and cannot be deleted'));

  // If payment.deleteTransactions = true => delete the payment transaction
  if (payment.deleteTransactions && payment.transactionId) {
    const transaction = await Transaction.findById(payment.transactionId);
    if (transaction) {
      await transaction.deleteOne().catch((err) => {
        logger.error(err);
        return next(Error('Couldn\'t delete the transaction associated to this payment'));
      });
    }
  }
};

PaymentController.generateWarning = async ({ payment, payee }) => {
  // eslint-disable-next-line global-require
  const Payment = require('../../models/payment');
  // eslint-disable-next-line global-require
  const Client = require('../../models/client');
  // eslint-disable-next-line global-require
  const Contract = require('../../models/contract');

  const { clientId, payeeId, currency } = payment;
  // Do not edit the warning array if the status is Paid
  if (payment.status === 'Paid') return payment.warnings;
  // Clear the warnings array
  payment.warnings = [];

  const { homeCurrency, paymentProviders } = await Client.findById(clientId).select('homeCurrency paymentProviders');

  // Check that the payee is linked to contract
  const hasAContract = await Contract.countDocuments({ clientId, 'payees.payeeId': payeeId });
  if (!hasAContract) { payment.warnings.push('The Payee is not linked to any Contract'); }
  // Check that the Contract currency and Payment currency match
  if (hasAContract) {
    const contracts = await Contract.find({ clientId, 'payees.payeeId': payeeId });
    const currencies = contracts.map((contract) => (contract.currency === 'Home Currency' ? homeCurrency : contract.currency)).filter((value, index, self) => self.indexOf(value) === index);
    if (currencies.length > 1) {
      // When payee is linked to multiple contracts, check that their currencies match
      payment.warnings.push(`The Payee is linked to Contracts with different currencies: ${contracts.map((contract) => contract.name).join(', ')}`);
    } else if (currencies.length === 1 && currency !== currencies[0]) {
      payment.warnings.push('The Payment currency and Contract currency don\'t match');
    }
  }

  if (paymentProviders.selectedPaymentProvider === 'Tipalti') {
    // Check that the Tipalti Payee ID and Curve ID match
    if (payee.paymentProviders?.tipalti?.payeeId !== payeeId) {
      payment.warnings.push('The Payee ID and Tipalti Payee ID don\'t match');
    }
  } else if (paymentProviders.selectedPaymentProvider === 'Wise') {
    // Check that a wise payee is selected
    if (!payee.paymentProviders?.wise?.recipientId) {
      payment.warnings.push('The Payee is not linked to a Wise recipient');
    }
  }

  // If we have two payments for the same payee within a payment group, show a warning
  const paymentWithSameGroupAndPayee = await Payment.countDocuments({ _id: { $ne: payment._id }, payeeId: payment.payeeId, paymentGroupId: payment.paymentGroupId });
  if (paymentWithSameGroupAndPayee) {
    const warningMessage = 'Payee should not be paid twice under the same Payment Group';
    payment.warnings.push(warningMessage);
  }

  return payment.warnings;
};

PaymentController.createWiseWebhookSubscriptions = async ({ clientId }) => {
  // eslint-disable-next-line global-require
  const Client = require('../../models/client');
  logger.info(`Client ${clientId}: Creating Wise subscriptions`);
  const client = await Client.findById(clientId).select('paymentProviders');
  if (!client) throw Error(`No client matching the ID ${clientId}`);

  const { apiKey, profileId } = client.paymentProviders.wise;
  if (!apiKey || !profileId) throw Error('A Wise api key and profile ID are required to create a subscription');

  // Subscriptions to create
  const statuses = [
    { label: 'Transfers State Change', value: 'transfers#state-change' },
    { label: 'Payout Failures', value: 'transfers#payout-failure' },
  ];

  // Get current subscriptions on the client's account
  const existingSubscriptions = await Wise.listSubscriptions({ apiKey, profileId });
  logger.info(`Client ${clientId}: ${existingSubscriptions?.length} Existing subscriptions`);
  for (const status of statuses) {
    const name = `Curve Webhook: ${status.label}`;
    const callbackUrl = process.env.CUSTOM_WISE_CALLBACK ? `${process.env.CUSTOM_WISE_CALLBACK}/${clientId}` : `https://api.curveroyaltysystems.com/clients/wise_webhook/${clientId}`;

    const subscriptionAlreadyCreated = existingSubscriptions.filter((subscription) => (subscription.name === name && subscription.delivery.url === callbackUrl)).length;

    if (!subscriptionAlreadyCreated) {
      logger.info(`Client ${clientId}: Creating subscription ${name}: ${callbackUrl}`);
      const subscription = {
        name,
        trigger_on: status.value,
        delivery: {
          version: '2.0.0',
          url: callbackUrl,
        },
      };

      // eslint-disable-next-line no-await-in-loop
      await Wise.createSubscription({ apiKey, profileId, subscription });
      logger.info(`Client ${clientId}: Created subscription ${name}: ${callbackUrl}`);
    }
  }
};

PaymentController.processWiseWebhookRequest = async ({ clientId, request }) => {
  const Payment = require('../../models/payment');

  const transferId = request?.data?.resource?.id;
  const state = request?.data?.current_state;
  const eventType = request.event_type;

  const transferEvents = {
    'transfers#state-change': {
      incoming_payment_waiting: { description: 'On its way to Wise', status: 'Paid' },
      incoming_payment_initiated: { description: 'On its way to Wise', status: 'Paid' },
      processing: { description: 'Processing', status: 'Paid' },
      funds_converted: { description: 'Processing', status: 'Paid' },
      outgoing_payment_sent: { description: 'Sent', status: 'Paid' },
      cancelled: { description: 'Cancelled', status: 'Errored' },
      cancelled_refund_processing: { description: 'Refund in progress', status: 'Errored' },
      funds_refunded: { description: 'Refunded', status: 'Errored' },
      bounced_back: { description: 'Bounced back', status: 'Errored' },
    },
    'transfers#payout-failure': {
      ACCOUNT_CLOSED: { description: 'The recipient details are correct, but beneficiary account is closed', status: 'Errored' },
      ACCOUNT_FROZEN: { description: 'The recipient details are correct, but beneficiary account is frozen', status: 'Errored' },
      ACCOUNT_BLOCKED: { description: 'The recipient details are correct, but beneficiary account is blocked', status: 'Errored' },
      ACCOUNT_LIMIT_REACHED: { description: 'The recipient details are correct, but beneficiary account has a limit that can be unblocked by the recipient', status: 'Errored' },
      WRONG_ACCOUNT_NUMBER: { description: 'Invalid account number', status: 'Errored' },
      WRONG_CARD_NUMBER: { description: 'Invalid card number', status: 'Errored' },
      WRONG_ACCOUNT_DETAILS: { description: 'Invalid account number AND/OR invalid bank code', status: 'Errored' },
      WRONG_ACCOUNT_TYPE: { description: 'Incorrect account type', status: 'Errored' },
      WRONG_BANK_CODE: { description: 'Invalid sort/BIC/routing/etc number', status: 'Errored' },
      WRONG_BRANCH_CODE: { description: 'Invalid branch code', status: 'Errored' },
      WRONG_NAME: { description: 'Account number matches, but the name is not 100% correct', status: 'Errored' },
      WRONG_PHONE_NUMBER: { description: 'Recipient phone number is incorrect', status: 'Errored' },
      WRONG_ID_NUMBER: { description: 'Invalid recipient\'s ID document number', status: 'Errored' },
      WRONG_RUT_NUMBER: { description: 'Invalid recipient\'s RUT (Rol Único Tributario) number', status: 'Errored' },
      TAX_ID_NOT_MATCHING: { description: 'Tax ID doesn\'t match recipient\'s name', status: 'Errored' },
      TAX_ID_SUSPENDED: { description: 'Tax ID is suspended', status: 'Errored' },
      WRONG_REFERENCE: { description: 'Invalid payment reference', status: 'Errored' },
      WRONG_PAYMENT_PURPOSE: { description: 'Invalid or not accepted payment purpose', status: 'Errored' },
      ACCOUNT_DOES_NOT_EXIST: { description: 'Format is correct but this account does not exist in recipient bank', status: 'Errored' },
      WRONG_CURRENCY: { description: 'Recipient account is in different currency', status: 'Errored' },
      WRONG_CARD_TYPE: { description: 'Recipient account doesn\'t support payments to this card type', status: 'Errored' },
      CANNOT_ACCEPT_FROM_3RD_PARTY: { description: 'Recipient bank can\'t accept the payments from 3rd party', status: 'Errored' },
      CREDITING_ACCOUNT_FORBIDDEN: { description: 'Terms and Conditions of Account do not permit crediting of these funds', status: 'Errored' },
      DUPLICATE_ENTRY: { description: 'Recipient bank informs that there has been another payment in the same amount', status: 'Errored' },
      FUNDS_NOT_EXPECTED_RETURNED: { description: 'Beneficiary not expecting funds/instructed return', status: 'Errored' },
      MANDATE_NOT_FILLED_IN: { description: 'Recipient didn\'t fill out the mandate form on time or the email address is incorrect', status: 'Errored' },
      BUSINESS_PAYMENTS_FORBIDDEN: { description: 'Payment to business accounts are not allowed', status: 'Errored' },
      REASON_NOT_SPECIFIED: { description: 'Reason not specified', status: 'Errored' },

    },
  };
  logger.info('Received Wise webhook request');
  logger.info({ clientId, transferId, state, eventType });
  const event = transferEvents[eventType]?.[state];

  if (!event) throw Error('Couldn\'t match event.');

  const payment = await Payment.findOne({ clientId, 'paymentDetails.wiseTransferId': transferId });
  if (!payment) throw Error('Payment not found');

  const { uuid } = payment;
  if (event.status === 'Paid') {
    delete payment.error;
    payment.status = 'Paid';
    payment.paidAdditionalInfo = event.description;
  } else if (event.status === 'Errored') {
    delete payment.paidAdditionalInfo;
    payment.status = 'Payment Error';
    payment.error = event.description;
    payment.errorLogs = payment.errorLogs || [];
    await payment.getUniqueUuid();
    payment.errorLogs.push(`Payment has a new status from Wise: ${state}. Clearing old UUID (${uuid}) and generating a new one (${payment.uuid})`);
  }
  logger.info(`Updating payment ${payment._id} - UUID ${uuid}: status: ${state}`);
  await Payment.findOneAndUpdate({ uuid, clientId }, payment.toObject());
};

PaymentController.flushPaymentsStatus = async ({ curveUser, paymentGroupId }) => {
  // eslint-disable-next-line global-require
  const Payment = require('../../models/payment');
  const PaymentGroup = require('../../models/paymentGroup');

  const payments = await Payment.find({ clientId: curveUser.clientId, paymentGroupId });
  const paymentGroup = await PaymentGroup.findOne({ clientId: curveUser.clientId, _id: paymentGroupId });

  let savedCount = 0;
  const errors = []; // Use an array to store errors for payments that failed validation

  await eachLimit(payments, 100, async (payment) => {
    const forbidden = await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: payment, clientOnly: true, adminOnly: true });
    if (!forbidden) {
      try {
        await payment.save();
        savedCount += 1;
      } catch (err) {
        errors.push({
          paymentId: payment._id,
          error: err.message,
        });
      }
    }
  });

  await paymentGroup.updateStatus();
  const client = await Client.findById(curveUser.clientId);
  let errorMessages;
  if (errors.length) {
    errorMessages = errors.map((error) => `Payment ID: ${error.paymentId}: ${error.error}`);
  }

  const generateOptions = {
    identifier: 'flushPaymentValidation',
    curveUser,
    client,
    subject: 'Payment Status Flush Summary',
    error: errorMessages || [],
  };
  Notification.generate('Payment Flush Completed', `${payments.length} Payment${payments.length !== 1 ? 's' : ''} processed. ${savedCount} successfully flushed. ${errors.length} encountered errors.`, null, curveUser, generateOptions);
};

PaymentController.validCurvePayHmac = ({ req }) => {
  const paymentsHmacKey = process.env.PAYMENTS_HMAC || '';

  const calculatedPayloadHmac = createHmac('sha256', paymentsHmacKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const paymentsHmac = req.header('x-hmac-digest-sha-256');
  return calculatedPayloadHmac === paymentsHmac;
};

PaymentController.processCurvePayWebhook = async ({ paymentEvent }) => {
  const Payee = require('../../models/payee');
  const User = require('../../models/user');
  const Payment = require('../../models/payment');

  const updatePayment = {
    [curvePayWebhookTypes.success]: markAsPaid,
    [curvePayWebhookTypes.completed]: markAsPaid,
    [curvePayWebhookTypes.oldFailed]: handlePaymentError,
    [curvePayWebhookTypes.failed]: handlePaymentError,
    [curvePayWebhookTypes.validationFailed]: handlePaymentError,
    [curvePayWebhookTypes.submissionFailed]: handlePaymentError,
    [curvePayWebhookTypes.submitted]: (detail, payment) => ({
      paymentDetails: {
        ...payment.paymentDetails,
        destinationAmount: detail.destination_amount,
        destinationCurrency: detail.destination_currency,
        conversionRate: detail.exchange_rate,
        clientExchangeRate: detail.client_exchange_rate,
        paymentMethod: detail.payment_method,
        fees: detail.fee_amount,
      },
    }),
    [curvePayWebhookTypes.payeeCreated]: sendNotifications,
    [curvePayWebhookTypes.payeeUpdated]: sendNotifications,
    [curvePayWebhookTypes.kycDecision]: enablePayments,
    [curvePayWebhookTypes.transactionCompleted]: sendNotifications,
  };

  function formatTitleCase(text) {
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async function handlePaymentError(detail, payment) {
    const { type } = paymentEvent;

    if (type === curvePayWebhookTypes.failed || type === curvePayWebhookTypes.validationFailed || type === curvePayWebhookTypes.submissionFailed) {
      await sendNotifications(detail);
    }

    return {
      status: 'Payment Error',
      error: detail.failure_reason || formatTitleCase(detail.failure?.code || 'Unknown Error'),
    };
  }

  function markAsPaid() {
    return {
      status: 'Paid',
      error: '',
    };
  }

  async function sendNotifications(detail = {}) {
    let payeeId = detail.referrer_payee_id;
    if (!payeeId) {
      const payment = await Payment.findOne({ clientId: detail.referrer_client_id, uuid: detail.unique_request_id });
      payeeId = payment?.payeeId;
    }

    const payee = await Payee.findById(payeeId, 'name');
    const userPayee = await User.findOne({ payeeIds: payeeId }, 'email');
    const client = await Client.findById(detail.referrer_client_id, 'name eventTriggeredNotifications');
    const { type } = paymentEvent;

    if ((!payee && type !== curvePayWebhookTypes.transactionCompleted) || !client) {
      logger.info(`CurvePay webhook event: Notifications Failed because of missing Payee or Client - Type ${type} Client ${detail.referrer_client_id} Payee ${detail.referrer_payee_id}`);
      return;
    }

    if (!userPayee) {
      logger.info(`CurvePay webhook event: No Payee Notification because Payee User not found - Type ${type} Payee ${detail.referrer_payee_id}}`);
    }

    // Payee Notifications - only if the payee user is found
    if ((type === curvePayWebhookTypes.payeeCreated || type === curvePayWebhookTypes.payeeUpdated || type === curvePayWebhookTypes.failed) && userPayee) {
      const curveUser = { id: userPayee._id.toString(), clientId: detail.referrer_client_id, email: userPayee.email };
      let additionalInfo = {};

      if (type === curvePayWebhookTypes.failed) {
        const payment = await Payment.findOne({ clientId: detail.referrer_client_id, uuid: detail.unique_request_id });
        additionalInfo = {
          paymentGroupId: payment.paymentGroupId,
          originCurrency: payment.currency,
          originAmount: payment.amount,
          paymentReason: payment.name,
          message: detail.failure?.message || 'No error message provided',
        };
      }

      const { generateOptions, link, eventName } = getNotificationDetails({ type, email: userPayee.email, curveUser, client, payee, additionalInfo });
      Notification.generate(eventName, generateOptions.subject, link, curveUser, generateOptions);
      logger.info(`CurvePay webhook event: Payee Notification Sent - Type ${type} Payee ${detail.referrer_payee_id} User ${userPayee._id.toString()}`);
    }

    // Client Admin Notifications
    const clientNotificationTypeList = [
      curvePayWebhookTypes.payeeCreated, curvePayWebhookTypes.payeeUpdated, curvePayWebhookTypes.failed, curvePayWebhookTypes.validationFailed, curvePayWebhookTypes.submissionFailed, curvePayWebhookTypes.transactionCompleted,
    ];
    if (clientNotificationTypeList.includes(type)) {
      let clientAdmins;
      if (client.eventTriggeredNotifications?.[clientNotificationType[type]]?.length > 0) {
        clientAdmins = await User.find({ email: { $in: client.eventTriggeredNotifications?.[clientNotificationType[type]] } }, 'email');
      }

      if (!clientAdmins || clientAdmins?.length === 0) {
        const payeeLog = detail?.referrer_payee_id ? `Payee ${detail.referrer_payee_id}` : '';
        logger.info(`CurvePay webhook event: No Client Notifications Sent - Type ${type} Client ${detail.referrer_client_id} ${payeeLog}`);
        return;
      }

      let additionalInfo = {};
      if (type === curvePayWebhookTypes.failed || type === curvePayWebhookTypes.validationFailed || type === curvePayWebhookTypes.submissionFailed || type === curvePayWebhookTypes.transactionCompleted) {
        const payment = await Payment.findOne({ clientId: detail.referrer_client_id, uuid: detail.unique_request_id });
        additionalInfo = {
          paymentId: payment?._id,
          paymentGroupId: payment?.paymentGroupId,
          originCurrency: payment?.currency,
          originAmount: payment?.amount,
          paymentReason: payment?.name,
          message: detail.failure?.message || 'No error message provided',
          currency: detail.currency,
          amount: detail.amount,
          balanceAmount: detail.balance_amount,
        };
      }

      clientAdmins.forEach((admin) => {
        const curveUser = { id: admin._id.toString(), clientId: detail.referrer_client_id, email: admin.email };
        const { generateOptions, link, eventName } = getNotificationDetails({ type, email: admin.email, curveUser, client, payee, clientNotification: true, additionalInfo });
        Notification.generate(eventName, generateOptions.subject, link, curveUser, generateOptions);
        logger.info(`CurvePay webhook event: Client Notification Sent - Type ${type} Client ${detail.referrer_client_id} User ${admin._id.toString()}`);
      });
    }
  }

  async function enablePayments(detail = {}) {
    if (!detail.approved) return;

    const client = await Client.findById(detail.referrer_client_id);
    if (!client) return;

    client.features.payments = true;
    client.features.paymentDetails = true;
    await client.save();
  }

  try {
    const PaymentGroup = require('../../models/paymentGroup');

    const { type, source, detail } = paymentEvent;

    // Enable payments for the client if KYC is approved and log the event
    if (type === curvePayWebhookTypes.kycDecision) {
      logger.info(`CurvePay webhook event: Source ${source} - Type ${type} Client ${detail.referrer_client_id} Approved ${detail.approved}`);
      await updatePayment[type](detail);
      return;
    }

    // Notifications only, no payment update
    if (type === curvePayWebhookTypes.payeeCreated || type === curvePayWebhookTypes.payeeUpdated || type === curvePayWebhookTypes.transactionCompleted) {
      const payeeLog = detail?.referrer_payee_id ? `Payee ${detail.referrer_payee_id}` : '';
      const clientLog = detail?.referrer_client_id ? `Client ${detail.referrer_client_id}` : '';
      logger.info(`CurvePay webhook event: Source ${source} - Type ${type} ${clientLog} ${payeeLog}`);
      await updatePayment[type](detail);
      return;
    }

    const failureReason = detail?.error?.code ? `- Reason ${detail.error.code}` : '';

    logger.info(`CurvePay webhook event: UUID ${detail.unique_request_id} - Source ${source} - Type ${type} ${failureReason}`);

    const payment = await Payment.findOne({ clientId: detail.referrer_client_id, uuid: detail.unique_request_id });

    if (!payment) throw Error(`Payment not found: UUID ${detail.unique_request_id}`);

    if (updatePayment[type]) {
      const updateData = await updatePayment[type](detail, payment);
      const existingPayment = await Payment.findOne({ clientId: detail.referrer_client_id, uuid: detail.unique_request_id });

      if (!existingPayment) {
        throw new Error(`Payment record not found: Client: ${detail.referrer_client_id}, UUID ${detail.unique_request_id}`);
      }

      // Skip pre-save validation for this update as it may update a Paid payment, which would fail validation (but we need the history/patches)
      existingPayment._skipValidation = true;
      Object.assign(existingPayment, updateData);
      await existingPayment.save();
    } else {
      throw new Error(`Unhandled payment type: ${type}`);
    }

    const paymentGroup = await PaymentGroup.findById(payment.paymentGroupId);
    await paymentGroup.updateStatus();
  } catch (error) {
    logger.error(`Error processing CurvePay webhook: ${error.message}`, { error });
    throw error;
  }
};

module.exports = PaymentController;
