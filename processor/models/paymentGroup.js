/* eslint-disable no-await-in-loop */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { PaymentGroup: { name, schema } } = require('@curveroyaltysystems/models');

const paymentGroupSchema = schema;

const PaymentGroup = mongoose.model(name, paymentGroupSchema);

module.exports = PaymentGroup;
