const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../../../models/statement');

const InvoiceNos = {
  setSelfBillingInvoiceNo: (statement, callback) => {
    if (!statement.selfBillingInvoiceNo || statement.selfBillingInvoiceNo === 0) {
      Statement.findOne({ clientId: statement.clientId })
        .sort({ selfBillingInvoiceNo: -1 })
        .then((highestInvoiceNoStatement) => {
          statement.selfBillingInvoiceNo = highestInvoiceNoStatement.selfBillingInvoiceNo ? highestInvoiceNoStatement.selfBillingInvoiceNo + 1 : 1;
          callback();
        })
        .catch((err) => {
          logger.error(err);
          // Project Bongo: Previously it would have been a runtime error,
          // but now we handle it gracefully and return an error through the callback
          callback(new Error('Error setting self billing invoice number'));
        });
    } else {
      callback();
    }
  },
  setFeesInvoiceNo: (statement, callback) => {
    if (!statement.feesInvoiceNo || statement.feesInvoiceNo === 0) {
      Statement.findOne({ clientId: statement.clientId })
        .sort({ feesInvoiceNo: -1 })
        .then((highestInvoiceNoStatement) => {
          statement.feesInvoiceNo = highestInvoiceNoStatement.feesInvoiceNo ? highestInvoiceNoStatement.feesInvoiceNo + 1 : 1;
          callback();
        })
        .catch((err) => {
          logger.error(err);
          // Project Bongo: Previously it would have been a runtime error,
          // but now we handle it gracefully and return an error through the callback
          callback(new Error('Error setting fees invoice number'));
        });
    } else {
      callback();
    }
  },
};

module.exports = InvoiceNos;
