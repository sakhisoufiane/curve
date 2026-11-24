const { PayeeTransaction } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const payeeTransaction = PayeeTransaction.schema;

payeeTransaction.plugin(mongoosePaginate);

module.exports = mongoose.model(PayeeTransaction.name, payeeTransaction);
