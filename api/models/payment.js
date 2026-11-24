const mongoose = require('@curveroyaltysystems/models/mongoose');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const mongoosePaginate = require('mongoose-paginate-v2');
const { Payment: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const PaymentController = require('../controllers/payment');

const paymentSchema = schema;

paymentSchema.plugin(modelHistory, { mongoose, name: 'paymentPatches' });
paymentSchema.plugin(mongoosePaginate);

paymentSchema.pre('save', async function (next) {
  const payment = this;

  // Skip validation if _skipValidation by processCurvePayWebhook, so that potential webhook updates to Paid payments don't fail validation
  if (!payment._skipValidation) await PaymentController.validatePayment({ payment, next });
});

paymentSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  const payment = this;
  await PaymentController.validateDeletion({ payment, next });
});

/**
  * Adds a unique Tipalti ref code to the payment
  *
  * @method
  */

paymentSchema.methods.getUniqueRefCode = async function () {
  const payment = this;
  const refCode = moment().format('x');
  const payments = await Payment.countDocuments({ clientId: payment.clientId, refCode });
  if (!payments) { payment.refCode = refCode; } else { await payment.getUniqueRefCode(); }
};

/**
  * Adds a unique Wise ID to the payment
  *
  * @method
  */
paymentSchema.methods.getUniqueUuid = async function () {
  const payment = this;
  const uuid = uuidv4();
  const payments = await Payment.countDocuments({ clientId: payment.clientId, uuid });
  if (!payments) { payment.uuid = uuid; } else { await payment.getUniqueUuid(); }
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

    transaction.save();
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
