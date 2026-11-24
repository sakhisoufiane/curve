const { logger, Tipalti } = require('@curveroyaltysystems/platform-shared-utils');
const moment = require('moment');
const { eachLimit } = require('async');

const Client = require('../models/client');
const Payment = require('../models/payment');

const PaymentGroupController = this;

// List of statuses and their description from Tipalti
const tipaltiStatuses = [
  { status: 'Canceled', message: 'Scheduled payment has been canceled by the payer.', errored: true },
  { status: 'Cleared', message: 'Paper check has been cashed by the beneficiary.', errored: false },
  { status: 'Deferred', message: 'Payment has failed before submission to the payment providers.', errored: true },
  { status: 'Deferred (Internal)', message: 'Payment has failed before submission to the payment providers due to an error with the payer account.', errored: true },
  { status: 'Paid', message: 'The payment provider has processed the transaction and sent the funds to the beneficiary.', errored: false },
  { status: 'Pending funds', message: 'Payment has been submitted to Tipalti, but is awaiting sufficient funds in the payer account before the payment can be paid.', errored: false },
  { status: 'PendingPayerFunds', message: 'Payment has been submitted to Tipalti, but is awaiting sufficient funds in the payer account before the payment can be paid.', errored: false },
  { status: 'Rejected', message: 'Payment has been rejected by the payment provider.', errored: true },
  { status: 'Scheduled', message: 'Payment is scheduled for a future date.', errored: false },
  { status: 'Submitted', message: 'The payer has submitted the payment order to Tipalti, after which Tipalti will send it to the provider.', errored: false },
  { status: 'Risk review', message: 'The payment is under risk review.', errored: false },
  { status: 'FraudReview', message: 'The payment is under risk review.', errored: false },
];

PaymentGroupController.getPaymentStatuses = async ({ clientId }) => {
  const { paymentProviders, createdAt } = await Client.findById(clientId, 'paymentProviders createdAt');
  // If the client isn't using Tipalti, return.
  if (paymentProviders?.selectedPaymentProvider !== 'Tipalti' || !paymentProviders?.tipalti) return;

  logger.info(`Getting Tipalti payment statuses for Client ${clientId}`);

  const { payerName, apiKey, lastStatusesCheck } = paymentProviders.tipalti;

  const changedSince = moment(lastStatusesCheck || createdAt).format('X');
  // Get payment statuses from Tipalti
  const response = await Tipalti.getPaymentStatuses({ payerName, apiKey, changedSince }).catch(logger.error);
  if (!response) {
    logger.error(`Client ${clientId} - No refCodes returned from Tipalti`);
    return;
  }
  const payments = response?.['soap:Envelope']?.['soap:Body']?.[0]?.GetExtendedPODetailsListResponse?.[0]?.GetExtendedPODetailsListResult?.[0]?.PaymentOrders?.[0]?.TipaltiExtendedPaymentOrderResponse;
  if (!payments?.length) {
    logger.error(`Client ${clientId} - No payments have been updated singce the last check`);
    return;
  }
  const statuses = payments.map((payment) => ({
    refCode: payment.Properties[0].KeyValuePair.find((element) => (element.Key[0] === 'RefCode'))?.Value?.[0],
    status: payment.Properties[0].KeyValuePair.find((element) => (element.Key[0] === 'Status'))?.Value?.[0],
  }));
  if (!statuses?.length) {
    logger.error(`Client ${clientId} - Payments resturned , but no statuses found.`);
    return;
  }
  // Update Payments
  await eachLimit(statuses, 10, async (singleStatus) => {
    const { status, refCode } = singleStatus;
    const payment = await Payment.findOne({ clientId, refCode });
    if (!payment) {
      logger.error(`Client ${clientId} - Couldn't find a payment for the refCode ${refCode}`);
      return;
    }
    const tipaltiStatus = tipaltiStatuses.find((singleTipaltiStatus) => singleTipaltiStatus.status === status);
    if (!tipaltiStatus) {
      logger.error(`Client ${clientId} Payment ${payment._id.toString()} - refCode ${refCode}: Couldn't match the status ${status} to any of the Tipalti statuses`);
      return;
    }

    // If the payment has errored, update status and generate a new refCode
    if (tipaltiStatus.errored) {
      delete payment.paidAdditionalInfo;
      payment.status = 'Payment Error';
      payment.error = tipaltiStatus.message;
      payment.errorLogs = payment.errorLogs || [];
      await payment.getUniqueRefCode();
      payment.errorLogs.push(`Payment has a new status from Tiapti: ${status}. Clearing old refCode (${refCode}) and generating a new one (${payment.refCode})`);
      logger.info(`Updating payment ${payment._id} - refCode ${refCode}: status: ${status}`);
      await Payment.findOneAndUpdate({ refCode, clientId }, payment.toObject());
    } else {
      // Mark the payument as paid otherwise
      delete payment.error;
      payment.status = 'Paid';
      payment.paidAdditionalInfo = tipaltiStatus.message;
      logger.info(`Updating payment ${payment._id} - refCode ${refCode}: status: ${status}`);
      await Payment.findOneAndUpdate({ refCode, clientId }, payment.toObject());
    }
  });

  // Set the date of last statuses check on the client
  await Client.findByIdAndUpdate(clientId, { $set: { 'paymentProviders.tipalti.lastStatusesCheck': moment().format() } });

  logger.info(`Client ${clientId} - Done updating payment statuses`);
};

PaymentGroupController.getHeadlineData = async ({ paymentGroup }) => {
  // eslint-disable-next-line global-require
  paymentGroup = paymentGroup.toObject();
  const groupFilter = { _id: 1, total: { $sum: '$amount' } };
  // Get total payments
  const totalPaymentsFilter = { clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString() };
  const totalPaymentsAggregate = await Payment.aggregate([{ $match: totalPaymentsFilter }, { $group: groupFilter }]);
  const totalPayments = totalPaymentsAggregate?.[0]?.total ? totalPaymentsAggregate[0].total : 0;
  // Get total paid so far
  const totalPaidFilter = { clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString(), status: 'Paid' };
  const totalPaidAggregate = await Payment.aggregate([{ $match: totalPaidFilter }, { $group: groupFilter }]);
  const totalPaid = totalPaidAggregate?.[0]?.total ? totalPaidAggregate[0].total : 0;
  // Get total payments with warnings
  const totalPaymentsWithWarnings = await Payment.countDocuments({ clientId: paymentGroup.clientId, paymentGroupId: paymentGroup._id.toString(), 'warnings.0': { $exists: true } });
  // Add to the payment
  paymentGroup.totalPayments = totalPayments;
  paymentGroup.totalPaid = totalPaid;
  paymentGroup.totalRemaining = totalPayments - totalPaid;
  paymentGroup.totalPaymentsWithWarnings = totalPaymentsWithWarnings;

  return paymentGroup;
};

module.exports = PaymentGroupController;
