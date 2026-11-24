/* eslint-disable no-unreachable-loop */
/* eslint-disable no-loop-func */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const async = require('async');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ObjectId } = require('mongodb');
const mongoosePaginate = require('mongoose-paginate-v2');
const { UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { logger, fileManager, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Statement: { name, schema } } = require('@curveroyaltysystems/models');
const Task = require('./task');
const Company = require('./company');
const Email = require('../libs/sendEmail');
const modelHistory = require('../libs/modelHistory');
const StatementController = require('../controllers/statement');

const statementSchema = schema;

statementSchema.plugin(modelHistory, { mongoose, name: 'statementPatches' });
statementSchema.plugin(mongoosePaginate);

statementSchema.post('init', (statement) => {
  if (statement.salesCsv) {
    fileManager.publicS3Link(statement.salesCsv, (err, publicLink) => {
      statement.salesCsvPublicLink = publicLink;
    });
  }
  if (statement.costsCsv) {
    fileManager.publicS3Link(statement.costsCsv, (err, publicLink) => {
      statement.costsCsvPublicLink = publicLink;
    });
  }
  if (statement.pdf) {
    fileManager.publicS3Link(statement.pdf, (err, publicLink) => {
      statement.pdfPublicLink = publicLink;
    });
  }
  if (statement.statementOfAccount) {
    fileManager.publicS3Link(statement.statementOfAccount, (err, publicLink) => {
      statement.statementOfAccountPublicLink = publicLink;
    });
  }
  if (statement.selfBillingInvoice) {
    fileManager.publicS3Link(statement.selfBillingInvoice, (err, publicLink) => {
      statement.selfBillingInvoicePublicLink = publicLink;
    });
  }
  if (statement.feesInvoice) {
    fileManager.publicS3Link(statement.feesInvoice, (err, publicLink) => {
      statement.feesInvoicePublicLink = publicLink;
    });
  }
  if (statement.customStatement) {
    fileManager.publicS3Link(statement.customStatement, (err, publicLink) => {
      statement.customStatementPublicLink = publicLink;
    });
  }
  if (statement.allFilesZip) {
    fileManager.publicS3Link(statement.allFilesZip, (err, publicLink) => {
      statement.allFilesZipPublicLink = publicLink;
    });
  }
  if (statement.platoonRevenueReport) {
    fileManager.publicS3Link(statement.platoonRevenueReport, (err, publicLink) => {
      statement.platoonRevenueReportPublicLink = publicLink;
    });
  }
});

statementSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  this.deleteAssociations(next);
});

statementSchema.methods.deleteAssociations = function (callback) {
  const statement = this;
  async.parallel([
    function (cb) {
      statement.deleteTransactions().then(cb).catch(cb);
    },
    (cb) => StatementController.deletePayeeTransactions({ statement }).then(cb).catch(cb),
    (cb) => StatementController.deletePayeeStatements({ statement }).then(cb).catch(cb),
    function (cb) {
      statement.deleteFiles(cb);
    },
  ], callback);
};

statementSchema.methods.deleteTransactions = async function () {
  const statement = this;
  const Transaction = require('./transaction');

  const transactions = await Transaction
    .find({ clientId: statement.clientId, statementId: statement._id.toString() })
    .select({ _id: 1, clientId: 1, payeeId: 1 });

  if (!transactions?.length) return;

  logger.info(`Deleting ${transactions.length} transactions for statement ${statement.name} (${statement._id})`);

  for (const transaction of transactions) {
    await transaction.deleteOne();
  }
};

statementSchema.methods.deleteFiles = function (callback) {
  const statement = this;
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
};

statementSchema.methods.getBalances = function (callback) {
  const Contract = require('./contract');
  const Period = require('./period');
  const statement = this;
  let period; let contract;
  async.series([
    function (cb) {
      Contract.findById(statement.contractId)
        .then((foundContract) => {
          if (!foundContract) {
            cb(new Error('Could not find Contract for Statement'));
          } else {
            contract = foundContract;
            cb();
          }
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      Period.findById(statement.periodId, { startDate: 1, endDate: 1, accountingDate: 1 })
        .then((foundPeriod) => {
          if (!foundPeriod) {
            cb(new Error('Could not find Period for Statement'));
          } else {
            period = foundPeriod;
            cb();
          }
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      callback(err);
    } else {
      async.series([
        function (cb) {
          const options = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeAdvance: true, excludeReserves: true } : {};
          contract.balanceAtDate(period.startDate, options, (err, balance) => {
            statement.openingBalance = balance;
            cb(err);
          });
        },
        function (cb) {
          contract.getAssociatedTransactions(period.endDate, (err) => {
            statement.payments = 0;
            contract.transactions.forEach((transaction) => {
              if (transaction.type === 'Payment') { statement.payments += transaction.amount; }
            });
            cb(err);
          });
        },
        function (cb) {
          const date = new Date(period.endDate);
          date.setDate(date.getDate() + 1);
          const options = contract.type === 'Profit Share' || contract.type === 'Profit Share - Flexible' ? { excludeAdvance: true, excludeReserves: true, excludeStatementPayments: statement._id.toString() } : { excludeStatementPayments: statement._id.toString() };
          contract.balanceAtDate(date, options, (err, balance) => {
            statement.closingBalance = balance;
            cb(err);
          });
        },
      ], callback);
    }
  });
};

// Send Statement
statementSchema.methods.send = function (callback) {
  const Client = require('./client');
  const Contract = require('./contract');
  const Payee = require('./payee');
  const User = require('./user');
  const statement = this;
  let client; let contract; let payees;
  async.waterfall([
    function (cb) {
      Client.findById(statement.clientId)
        .then((foundClient) => {
          client = foundClient;
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      Contract.findById(statement.contractId)
        .then((foundContract) => {
          contract = foundContract;
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      const payeeIds = contract.payees?.map((payee) => payee.payeeId);

      Payee.find({ _id: { $in: payeeIds } })
        .then((foundPayees) => {
          payees = foundPayees;
          cb();
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (cb) {
      if (payees?.length) {
        const payeeIds = payees?.map((payee) => payee._id.toString());

        User.find({ payeeIds: { $in: payeeIds } })
          .then((foundUsers) => {
            cb(null, foundUsers);
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      } else {
        cb(null, []);
      }
    },

    function (users, cb) {
      async.each(users, (user, userCb) => {
        if (!user.password) {
          user.userCreationDate = new Date();
          user.userCreationToken = jwt.sign({ id: user._id, created: user.userCreationDate, invite: true }, process.env.jsonSecretToken, { expiresIn: 604800 });
          user.save()
            .then((savedUser) => {
              Email.statementReadyAndInvite(
                savedUser.email,
                client,
                statement.year,
                statement.accountingPeriod,
                savedUser.userCreationToken,
                (err) => {
                  if (!err) {
                    statement.sendings.push({ date: new Date(), email: savedUser.email });
                  }
                  userCb();
                },
              );
            })
            .catch((err) => {
              logger.error(err);
              // Following on not returning an error
              userCb();
            });
        } else {
          Email.statementReady(user.email, client, statement.year, statement.accountingPeriod, (err) => {
            if (!err) {
              statement.sendings.push({ date: new Date(), email: user.email });
            }
            userCb();
          });
        }
      }, cb);
    },
  ], () => {
    statement.save()
      .then((savedStatement) => {
        callback(null, savedStatement);
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  });
};

statementSchema.methods.exportData = function (callback) {
  const Period = require('./period');
  const Contract = require('./contract');
  const Payee = require('./payee');
  const Client = require('./client');
  const statement = this;
  async.waterfall([
    function (cb) {
      Client.findById(statement.clientId)
        .then((foundClient) => {
          cb(null, foundClient);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (client, cb) {
      Period.findById(statement.periodId, { name: 1, startDate: 1 })
        .then((period) => {
          cb(null, client, period);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (client, period, cb) {
      Contract.findById(statement.contractId)
        .then((contract) => {
          cb(null, client, period, contract);
        })
        .catch((err) => {
          logger.error(err);
          // Changing to return error here as the previous iteration seemed incorrect
          cb(err);
        });
    },
    function (client, period, contract, cb) {
      if (!contract?.payees?.length) return cb(null, client, period, contract, null);

      Payee.find({ clientId: statement.clientId, _id: { $in: contract.payees.map((payee) => payee.payeeId) } })
        .then((payees) => {
          cb(null, client, period, contract, payees);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (client, period, contract, payees, cb) {
      if (!ObjectId.isValid(contract?.companyId)) return cb(null, client, period, contract, payees, null);

      Company.findById(contract.companyId, 'name')
        .then((company) => {
          cb(null, client, period, contract, payees, company);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (client, period, contract, payees, company, cb) {
      if (contract) {
        let closingBalance = contract.openingBalance;
        let otherTransactions = 0;
        let payeeTransfers = 0;
        let transfers = 0;
        let payment = 0;
        let autoPayments = 0;
        let taxes = 0;
        let reservesRemaining = 0;
        const notes = (contract.notes) ? contract.notes : null;
        const options = statement.contractType === 'Profit Share' || statement.contractType === 'Profit Share - Flexible' ? { excludeReserves: true } : {};
        contract.balanceAtDate(period.startDate, options, (err, openingBalance) => {
          // Set date to beginning of next day, to include all transactions
          const endDate = new Date(statement.date);
          endDate.setDate(endDate.getDate() + 1);
          endDate.setUTCHours(0, 0, 0, 0);
          // Get all transactions
          contract.getAssociatedTransactions(new Date(2100, 1, 1), () => {
            if (contract.transactions.length > 0) {
              // Get future reserves
              contract.transactions.map((transaction) => {
                if (transaction.date >= endDate && transaction.isReserveRelease) {
                  reservesRemaining += transaction.amount;
                }
              }).filter(Boolean);
              // Remove any future transactions
              contract.transactions = contract.transactions.map((transaction) => {
                if (transaction.date < endDate && transaction.date >= period.startDate) {
                  return transaction;
                }
              }).filter(Boolean);
              // Get closing balance from last transaction in this time period
              closingBalance = contract.transactions.length > 0 ? contract.transactions[contract.transactions.length - 1].balance : 0;
              // Get any human generated adjustments
              contract.transactions.forEach((transaction) => {
                // Add up payments
                if (transaction.isPayment || transaction.type === 'Payment') {
                  if (transaction.statementId === statement._id.toString()) {
                    autoPayments += transaction.amount;
                  } else {
                    payment += transaction.amount;
                  }
                }
                // Add up auto payments

                // Add up transfers
                if (transaction.type === 'Contract Payment' || transaction.type === 'Transfer To') {
                  transfers += transaction.amount;
                }
                // Add up taxes
                if (transaction.type === 'Tax') {
                  taxes += transaction.amount;
                }
                // Add up any other transactions
                // eslint-disable-next-line max-len
                if (!transaction.isReserveRelease && !transaction.isReserveWithholding && !transaction.isPayment && transaction.type !== 'Payment' && transaction.name !== period.name && transaction.type !== 'Withholding Tax' && transaction.type !== 'Contract Payment' && transaction.type !== 'Transfer To' && transaction.type !== 'Tax' && !transaction.name.includes('Distribution Fee') && !transaction.payeeId && !((transaction.name.includes('Sales') || transaction.name.includes('Costs')) && (client.clientType === 'Distributor' || client.statementDesign === 'Distribution' || contract.toObject().statementDesign === 'Distribution'))) {
                  otherTransactions += transaction.amount;
                }

                if (transaction.payeeId) {
                  payeeTransfers += transaction.amount;
                }
              });
            }

            const payeeNames = payees?.length ? payees.map((payee) => payee.name).join('; ') : null;
            const payeeForeignIds = payees?.length ? payees.map((payee) => payee.foreignId).join('; ') : null;

            let currency;
            if (statement.currency === 'Home Currency') {
              currency = client.homeCurrency;
            } else if (statement.currency) {
              currency = statement.currency;
            }
            const selfBillingInvoiceNo = statement.selfBillingInvoice ? statement.selfBillingInvoiceNo : null;
            const feesInvoiceNo = statement.feesInvoice ? statement.feesInvoiceNo : null;
            // eslint-disable-next-line max-len
            const data = [
              statement._id.toString(),
              statement.name,
              payeeNames,
              payeeForeignIds,
              contract._id.toString(),
              contract.name,
              contract.type,
              contract.foreignId,
              contract.contractCategories.join(', '),
              company?.name,
              notes,
              selfBillingInvoiceNo,
              feesInvoiceNo,
              currency,
              statement.status,
              openingBalance,
              statement.grossAmount,
              statement.netAmount,
              statement.grossCosts,
              statement.netCosts,
              statement.reservesWithheld,
              statement.reservesReleased,
              reservesRemaining,
              statement.withholdingTax,
              taxes,
              payment,
              autoPayments,
              transfers,
              otherTransactions,
              closingBalance,
            ];

            if (client.features.payeeBalances) {
              data.splice(3, 1);
              data.splice(8, 0, contract.payeeBalanceCondition);
              data.splice(29, 0, payeeTransfers);
            }
            cb(null, data);
          });
        });
      } else {
        cb(null, [statement._id.toString(), statement.name, '', 'Contract is missing']);
      }
    },
  ], callback);
};

statementSchema.methods.calculate = function (callback) {
  const Client = require('./client');
  const statement = this;
  Client.findById(statement.clientId, 'name')
    .then(async (client) => {
      const count = await Task.countDocuments({
        name: { $in: ['Process Statement'] },
        clientId: statement.clientId,
        status: { $in: ['Pending', 'In Progress'] },
        'value.statementId': statement._id.toString(),
      });
      if (!count) {
        statement.status = 'Processing';
        statement.save()
          .then(() => {
            TaskHelpers.createTaskAndSendMessage(Task, {
              name: 'Process Statement', clientId: statement.clientId, clientName: client.name, value: { statementId: statement._id.toString() },
            })
              .then(() => {
                callback();
              })
              .catch(callback);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      } else {
        callback(new Error('This task is already running - please wait until it has completed before running again'));
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

statementSchema.statics.payMany = async function (ids, user) {
  const Payee = require('./payee');
  let paidStatements = 0;
  // Get statements
  const statements = await Statement.find({ clientId: user.clientId, _id: { $in: ids } });
  for (const statement of statements) {
    // Check if the user is allowed to update the statement
    const forbidden = await UserAccess.isUserForbidden({ Payee, user, operation: 'write', type: 'periods', document: statement, clientOnly: true });
    // Skip paying the statement if the user is forbidden
    if (forbidden) {
      logger.error(new Error('User isn\'t allowed to update statement'));
      continue;
    }
    // Pay statement
    await statement.pay().then(() => { paidStatements += 1; }).catch(logger.error);
  }
  // Return number of paid statements
  if (paidStatements !== ids.length) {
    const error = new Error(`${paidStatements}/${ids.length} Payments created. Contracts with a negative balance or without a Payee attached cannot have a Payment created`);
    error.showToUser = true;
    throw error;
  }
};

statementSchema.methods.pay = async function () {
  const statement = this;
  const Contract = require('./contract');
  const Period = require('./period');
  const Transaction = require('./transaction');
  const PaymentGroup = require('./paymentGroup');
  const Payment = require('./payment');
  const Client = require('./client');
  // Get contract
  const contract = await Contract.findById(statement.contractId);
  // Return an error if no payee attached to the contract
  if (!contract?.payees[0]?.payeeId) {
    const error = new Error('Payee is required to generate a payment for this statement. Please attach a payee to the contract.');
    error.showToUser = true;
    throw error;
  }
  // Get period
  const period = await Period.findById(statement.periodId);
  // Get contract balance
  const balance = await new Promise((resolve, reject) => { contract.balanceAtDate(moment(period.endDate).add(1, 'day').format(), {}, (err, balance) => { if (err) { reject(err); } else { resolve(balance); } }); });
  // Return an error if balance is negative
  if (balance <= 0) {
    const error = new Error('Failed to create payment. The contract associated with this statement has a negative balance.');
    error.showToUser = true;
    throw error;
  }
  // Create transaction
  const transaction = new Transaction({
    clientId: statement.clientId,
    contractId: statement.contractId,
    statementId: statement._id.toString(),
    name: `Payment: ${period.name}`,
    type: 'Payment',
    date: period.endDate,
    amount: 0 - balance,
    userCreated: true,
    isPayment: true,
  });
  await transaction.save();
  // Get payment group
  let paymentGroup = await PaymentGroup.findOne({ clientId: statement.clientId, periodId: statement.periodId });
  if (!paymentGroup) {
    paymentGroup = new PaymentGroup({ clientId: statement.clientId, periodId: statement.periodId, name: period.name });
    await paymentGroup.save();
  }
  // Set currency
  let { currency } = contract;
  if (currency === 'Home Currency') {
    const client = await Client.findById(statement.clientId, 'homeCurrency');
    currency = client.homeCurrency;
  }
  // Create payment
  const payment = new Payment({
    clientId: statement.clientId,
    statementId: statement._id.toString(),
    contractId: contract._id.toString(),
    // TODO update for new payee balance splits
    payeeId: contract.payees?.[0]?.payeeId,
    paymentGroupId: paymentGroup._id.toString(),
    amount: balance,
    name: `Payment: ${period.name}`,
    transactionId: transaction._id.toString(),
    currency,
    withholdingTaxAmount: statement.withholdingTax || 0,
    withholdingTaxCurrency: currency,
  });
  await payment.save();
};

const Statement = mongoose.model(name, statementSchema);

module.exports = Statement;
