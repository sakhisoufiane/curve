const mongoose = require('@curveroyaltysystems/models/mongoose');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { Transaction: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const Payment = require('./payment');

const transactionSchema = schema;

transactionSchema.plugin(mongoosePaginate);

transactionSchema.pre('deleteOne', { document: true }, function (next) {
  const transaction = this;
  // Check if there are any 'Paid' payments associated with payee
  Payment.countDocuments({ clientId: transaction.clientId, transactionId: transaction._id.toString(), status: 'Paid' })
    .then((paidPayments) => {
      if (paidPayments) {
        next(new Error('Payments associated with this transaction have already been paid out.'));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(err);
      // Project Bongo: We should properly next the error here but this is how it was before
      // so leaving it as is for now, but it should probably be changed in the future
      next();
    });
});

const Transaction = mongoose.model(name, transactionSchema);

module.exports = Transaction;
