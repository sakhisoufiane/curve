const mongoose = require('@curveroyaltysystems/models/mongoose');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Payment: { name, schema } } = require('@curveroyaltysystems/models');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = schema;

const validateDeletion = async function (next) {
  const Transaction = require('./transaction');

  const payment = this;
  if (payment.status === 'Paid') { return next(Error('Payment has been paid and cannot be deleted')); }
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

paymentSchema.methods.validatePayment = async function ({ payment, next }) {
  const Contract = require('./contract');
  const Payee = require('./payee');
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
    payment.currency = await payee.getPaymentCurrency({ payeeId: payment.payeeId, clientId: payment.clientId, contractId: payment.contractId });
    if (!payment.currency) { return next(Error('Payment must have a valid currency')); }
  }
  // Generate warnings
  await payment.generateWarning({ payee, payment });
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

paymentSchema.pre('save', async function (next) {
  const payment = this;
  await payment.validatePayment({ payment, next });
});
paymentSchema.pre('deleteOne', { document: true }, validateDeletion);

paymentSchema.methods.getUniqueRefCode = async function () {
  const payment = this;
  const refCode = moment().format('x');
  const payments = await Payment.countDocuments({ clientId: payment.clientId, refCode });
  if (!payments) { payment.refCode = refCode; } else { await payment.getUniqueRefCode(); }
};

paymentSchema.methods.getUniqueUuid = async function () {
  const payment = this;
  const uuid = uuidv4();
  const payments = await Payment.countDocuments({ clientId: payment.clientId, uuid });
  if (!payments) { payment.uuid = uuid; } else { await payment.getUniqueUuid(); }
};

paymentSchema.methods.generateWarning = async ({ payment, payee }) => {
  const Client = require('./client');
  const Contract = require('./contract');

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

/**
  * Creates/updates transactions associated with the payment
  *
  * @method
  */
paymentSchema.methods.validateTransactions = async function () {
  // TODO: when transaction are refactored, add a create transaction method to the controller and remove require
  const Transaction = require('./transaction');

  const payment = this;
  if (payment.contractId && !payment.transactionId) {
    // When the payment is associated with a contract and has no transaction => create transaction
    // Create new transaction
    const transaction = new Transaction({
      clientId: payment.clientId,
      contractId: payment.contractId,
      name: `Payment: ${payment.name}`,
      type: 'Payment',
      date: moment().format(),
      amount: -payment.amount,
      userCreated: true,
    });

    await transaction.save();

    payment.transactionId = transaction._id.toString();
  } else if (payment.contractId && payment.transactionId && !payment.exchanged) {
    // When payment is associated with a contract and a transaction => update transaction amount/contractId/name when payment amount/contractId is updated
    // Only update the transaction if it's user created and the amount/contractId/name is different from the payment's amount/contractId
    const transaction = await Transaction.findOne({
      _id: payment.transactionId,
      clientId: payment.clientId,
      userCreated: true,
      $or: [
        { amount: { $ne: payment.amount } },
        { contractId: { $ne: payment.contractId } },
        { name: { $ne: `Payment: ${payment.name}` } },
      ],
    });

    // Return if the values haven't been updated.
    if (!transaction) return;

    // Update the transaction amount, contractId and name to match the payment
    transaction.amount = -payment.amount;
    transaction.contractId = payment.contractId;
    transaction.name = payment.name?.indexOf('Payment: ') === 0 ? payment.name : `Payment: ${payment.name}`;

    await transaction.save();
  } else if (!payment.contractId && payment.transactionId) {
    // When the payment has a transactionId but no contractId => delete the transaction

    const transaction = await Transaction.findById(payment.transactionId);

    // Remove transactionId from the payment
    payment.transactionId = null;

    if (!transaction) return;

    // Remove transaction. If a contractId is added to the payment later on, a new transaction will be created and added to the payment
    await transaction.deleteOne();
  }
};
const Payment = mongoose.model(name, paymentSchema);

module.exports = Payment;
