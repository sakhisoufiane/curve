const { logger, fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');

const Payee = require('../../../models/payee');
const Period = require('../../../models/period');
const Payment = require('../../../models/payment');
const Contract = require('../../../models/contract');
const Transaction = require('../../../models/transaction');
const PaymentGroup = require('../../../models/paymentGroup');
const PayeeTransaction = require('../../../models/payeeTransaction');

const DeleteAssociations = {
  deleteAssociations: (statement, callback) => {
    async.parallel([
      function (cb) {
        DeleteAssociations.deleteTransactions(statement, cb);
      },
      (cb) => DeleteAssociations.deletePayeeTransactions(statement).then(cb).catch(cb),
      (cb) => DeleteAssociations.deletePayeeStatements(statement).then(cb).catch(cb),
      function (cb) {
        DeleteAssociations.deleteFiles(statement, cb);
      },
    ], () => {
      callback();
    });
  },
  deleteTransactions: (statement, callback) => {
    let transactionDeletionErrored = false;
    Transaction.find({ clientId: statement.clientId, statementId: statement._id })
      .then((transactions) => {
        async.each(transactions, (transaction, cb) => {
          transaction.deleteOne()
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              transactionDeletionErrored = true;
              cb();
            });
        }, () => {
          if (transactionDeletionErrored) {
            callback(new Error('Payments associated with this statement have already been paid out.'));
          } else {
            callback();
          }
        });
      })
      .catch((err) => {
        // Project Bongo: Previously it would have been a runtime error,
        // but now we handle it gracefully and return an error through the callback
        logger.error(err);
        callback(err);
      });
  },
  deletePayeeTransactions: async (statement) => {
    const contract = await Contract.findById(statement.contractId).catch(logger.error);
    if (!contract) throw new Error(`Contract not found for statement ${statement._id.toString()}`);

    if (!contract.payees?.length) return;

    const payeeIds = contract.payees.map((payee) => payee.payeeId);

    // Only Grab Contract Transfers associated with this statement
    // When reprocessing a single contract we will only produce a transfer for that contract
    const periodTransfers = await PayeeTransaction
      .find({
        clientId: statement.clientId,
        periodId: statement.periodId,
        contractId: statement.contractId,
        payeeId: { $in: payeeIds },
      })
      .catch(logger.error);
    // Whatever a statement gets run, we will re-create all generated transactions apart from contract transfers
    const periodGeneratedTransactions = await PayeeTransaction
      .find({
        clientId: statement.clientId,
        periodId: statement.periodId,
        contractId: { $exists: false },
        userCreated: false,
        payeeId: { $in: payeeIds },
      })
      .catch(logger.error);

    const payeeTransactions = (periodTransfers || []).concat((periodGeneratedTransactions || []));
    if (!payeeTransactions.length) return;

    await async.eachLimit(payeeTransactions, 5, async (payeeTransaction) => { await payeeTransaction.deleteOne(); });
  },
  deletePayeeStatements: async (statement) => {
    const contract = await Contract
      .findById(statement.contractId)
      .select('payees')
      .catch(logger.error);

    if (!contract?.payees?.length) return;

    const payeeIds = contract.payees.map((payee) => payee.payeeId);

    const statementField = `statements.${statement.periodId}`;

    const query = {
      _id: { $in: payeeIds },
      clientId: statement.clientId,
      [statementField]: { $exists: true },
    };

    const payees = await Payee
      .find(query)
      .select('_id statements')
      .catch(logger.error);

    if (!payees.length) return;

    await async.eachLimit(payees, 5, async (payee) => {
      const { s3Key } = payee.statements[statement.periodId];

      await new Promise((resolve, _) => {
        fileManager.deleteFromS3(s3Key, (err) => {
          if (err) {
            logger.error(`Error deleting file from S3: ${s3Key}`);
          } else {
            resolve();
          }
        });
      });

      await Payee.findByIdAndUpdate(payee._id, { $unset: { [statementField]: 1 } });
    });
  },
  deletePayments: (statement, callback) => {
    Period.findById(statement.periodId)
      .then((period) => {
        PaymentGroup.findOne({ clientId: statement.clientId, periodId: period._id.toString() })
          .then((paymentGroup) => {
            if (!paymentGroup) {
              callback();
            } else {
              Payment.find({ clientId: statement.clientId, paymentGroupId: paymentGroup._id.toString(), statementId: statement._id.toString() })
                .then((payments) => {
                  async.eachLimit(payments, 5, (payment, cb) => {
                    payment.deleteOne()
                      .then(() => {
                        cb();
                      })
                      .catch((err) => {
                        logger.error(`Payment Deletion Errored on ${payment._id.toString()} Statement ID: ${statement._id.toString()}`);
                        logger.error(err);
                        cb();
                      });
                  }, () => {
                    // Delete group if no other payments in it
                    Payment.countDocuments({ clientId: statement.clientId, paymentGroupId: paymentGroup._id.toString() })
                      .then((payments) => {
                        if (payments) {
                          callback();
                        } else {
                          paymentGroup.deleteOne()
                            .then(() => {
                              callback();
                            })
                            .catch((err) => {
                              logger.error(`Payment Group Deletion Errored on ${paymentGroup._id.toString()} Statement ID: ${statement._id.toString()}`);
                              logger.error(err);
                              callback();
                            });
                        }
                      })
                      .catch((err) => {
                        // Project Bongo: If this errors, then we would have deleted the paymentGroup anyway.
                        // This is quite clearly a bug in the code, but we let's not callback an error here just in case
                        logger.error(err);
                        callback();
                      });
                  });
                })
                .catch((err) => {
                  logger.error(err);
                  callback();
                });
            }
          })
          .catch((err) => {
            logger.error(err);
            callback();
          });
      })
      .catch((err) => {
        logger.error(err);
        // Project Bongo: Previously it would have been a runtime error,
        // it seems we avoid passing errors back to the callback so let's do the same for consistency
        callback();
      });
  },
  clearTransactionsForRerunningPeriod: (statement, callback) => {
    // Delete Tranferring Transactions
    Transaction.find({ clientId: statement.clientId, $or: [{ statementId: statement._id, type: { $nin: ['Transfer From', 'Contract Payment'] } }, { transferringStatementId: statement._id.toString() }, { name: statement.name, type: 'Contract Payment' }] })
      .then((transactions) => {
        async.eachLimit(transactions, 5, (transaction, cb) => {
          transaction.deleteOne()
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb();
            });
        }, callback);
      })
      .catch((err) => {
        logger.error(err);
        // Project Bongo: Let's avoid passing errors back to the callback for consistency
        callback();
      });
  },
  deleteFiles: (statement, callback) => {
    async.each(['allFilesZip', 'salesCsv', 'costsCsv', 'pdf', 'statementOfAccount', 'selfBillingInvoice', 'feesInvoice', 'customStatement'], (file, cb) => {
      if (statement[file]) {
        fileManager.deleteFromS3(statement[file], cb);
      } else {
        cb();
      }
    }, (err) => {
      if (err) { logger.error(err); }
      callback(err);
    });
  },
};

module.exports = DeleteAssociations;
