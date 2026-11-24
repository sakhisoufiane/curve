const mongoose = require('@curveroyaltysystems/models/mongoose');
const { PayeeTransaction: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const payeeTransaction = schema;

payeeTransaction.plugin(mongoosePaginate);

const PayeeTransaction = mongoose.model(name, payeeTransaction);

module.exports = PayeeTransaction;
