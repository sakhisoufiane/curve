const { logger, fileManager, createXlsx } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports, WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const appRootDir = require('app-root-dir').get();
const { Transaction: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Notification = require('./notification');
const config = require('../config.json');
const Period = require('./period');
const Client = require('./client');

const transactionSchema = schema;

transactionSchema.plugin(modelHistory, { mongoose, name: 'transactionPatches' });
transactionSchema.plugin(mongoosePaginate);

transactionSchema.pre('validate', function (next) {
  const Contract = require('./contract');
  const transaction = this;
  if (transaction.userCreated && !transaction.payeeId) {
    Contract.findById(transaction.contractId)
      .then((contract) => {
        if (contract) {
          const contractType = contract.contractType === 'Mechanical' ? contract.contractType : 'Standard';
          Period.findOne({ clientId: transaction.clientId, accountingPeriodType: contract.accountingPeriod, locked: true, contractType }, 'endDate', { sort: { endDate: -1 }, limit: 1 })
            .then((period) => {
              if (period && period.endDate > transaction.date) {
                period.endDate.setHours(23, 59, 59, 999);
                next(new Error(`Transaction date is in a closed period. Please set date to after your latest period end date, which is ${moment(period.endDate).format('DD/MM/YYYY')}`));
              } else {
                next();
              }
            })
            .catch((err) => {
              logger.error(err);
              next(err);
            });
        } else {
          next(new Error('Transaction must be associated with a contract'));
        }
      })
      .catch((err) => {
        logger.error(err);
        next(err);
      });
  } else {
    next();
  }
});

transactionSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const Payment = require('./payment');
  const transaction = this;
  // @TODO this will change when create payments direct to payees
  if (transaction.payeeId) { return next(); }

  // Check if there are any 'Paid' payments associated with payee
  Payment.countDocuments({ clientId: transaction.clientId, transactionId: transaction._id.toString(), status: 'Paid' })
    .then((count) => {
      if (count) {
        next(new Error('Payments associated with this transaction have already been paid out.'));
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(`Transaction Deletion Errored on ${transaction._id}`);
      logger.error(err);
      next(err);
    });
});

// Export
transactionSchema.statics.sendExport = function (filter, curveUser, callback) {
  const Client = require('./client');
  async.waterfall([
    function (cb) {
      // Count how many transactions
      Transaction.countDocuments(filter)
        .then((count) => {
          cb(null, count);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (count, cb) {
      if (count > 10000) {
        // Output as CSV
        Transaction.createExportCsv(filter, count, curveUser, cb);
      } else {
        // Output as Excel
        Transaction.createExportXlsx(filter, curveUser, cb);
      }
    },
    function (filePath, cb) {
      fileManager.uploadToS3(`exports/${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
    },
    function (key, cb) {
      fileManager.publicLink24Hours(key, cb);
    },
    function (link, cb) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'exportDownload',
            curveUser,
            client,
            subject: `Your Transactions Export for ${client.name} is Ready to Download`,
            link,
          };
          Notification.generate('Transactions Export Ready', `Your Transactions Export for ${client.name} is Ready to Download`, link, curveUser, generateOptions, (err) => {
            cb(err);
          });
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
  ], (err) => {
    if (err) {
      // Return error via email
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'exportError',
            curveUser,
            client,
            subject: `Your Transaction Export for ${client.name}  Has Errored`,
            error: err.message,
          };
          Notification.generate(`Your Transaction Export for ${client.name}  Has Errored`, err.message, null, curveUser, generateOptions, (err) => {
            if (callback) { callback(err); }
          });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    }
  });
};

transactionSchema.statics.createExportXlsx = function (filter, curveUser, callback) {
  const Client = require('./client');
  async.waterfall([
    function (cb) {
      Transaction.find(filter)
        .sort({ date: 1 })
        .then((transactions) => {
          cb(null, transactions);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (transactions, cb) {
      Client.findById(curveUser.clientId)
        .then((client) => {
          // get date format from client settings
          const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
          Transaction.convertForXlsx(transactions, dateFormat)
            .then((data) => cb(null, data))
            .catch(cb);
        })
        .catch((err) => {
          logger.error(err);
          cb(err);
        });
    },
    function (data, cb) {
      Exports.getTemplate({ Client, templateName: 'transaction', clientId: curveUser.clientId }).then((template) => {
        createXlsx.createInTemplate(data, template, cb);
      });
    },
  ], callback);
};

transactionSchema.statics.createExportCsv = function (filter, count, curveUser, callback) {
  const limit = 10000;
  const standardOutput = `${appRootDir}/tmp/Transaction Export - ${moment().format('X')}.csv`;
  const writer = new WriteCsv({ headers: ['ID', 'Name', 'Amount', 'Invoice No.', 'Type', 'Date', 'Reserve Released', 'Reserve Withheld', 'Payee Name', 'Payee Foreign ID', 'Contract Name', 'Contract Foreign ID', 'Contract Type', 'Contract Notes'], outputLocation: standardOutput });
  const rounds = listFromNumber(Math.floor(count / limit));
  Client.findById(curveUser.clientId)
    .then((client) => {
      // get date format from client settings
      const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
      async.eachSeries(rounds, (round, loopCb) => {
        async.waterfall([
          function (cb) {
            Transaction.find(filter)
              .sort({ date: 1, _id: 1 })
              .limit(limit)
              .skip(round * limit)
              .then((transactions) => {
                cb(null, transactions);
              })
              .catch((err) => {
                logger.error(err);
                cb(err);
              });
          },
          function (transactions, cb) {
            Transaction.convertForXlsx(transactions, dateFormat)
              .then((data) => cb(null, data))
              .catch(cb);
          },
          function (data, cb) {
            writer.addData(data[0], (err) => {
              cb(err, data);
            });
          },
        ], loopCb);
      }, (err) => {
        if (err) {
          callback(err);
        } else {
          writer.write((err) => {
            callback(err, standardOutput);
          });
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });

  function listFromNumber(number) {
    const list = [];
    for (let i = 0; i <= number; i += 1) { list.push(i); }
    return list;
  }
};

transactionSchema.statics.convertForXlsx = async function (transactions, dateFormat) {
  const Payee = require('./payee');
  const Contract = require('./contract');
  const data = [];

  await async.eachLimit(transactions, 10, async (transaction) => {
    const contract = await Contract.findById(transaction.contractId);
    if (!contract) return;

    const payees = contract.payees?.length ? await Payee.find({ clientId: contract.clientId, _id: contract.payees.map((payee) => payee.payeeId) }).catch(logger.error) : [];

    const payeeNames = payees?.map((payee) => payee?.name).filter(Boolean);
    const payeeForeignIds = payees?.map((payee) => payee?.foreignId).filter(Boolean);

    data.push([
      transaction._id.toString(),
      transaction.name,
      transaction.amount,
      transaction.invoiceNo,
      transaction.type,
      moment(transaction.date).format(dateFormat),
      transaction.isReserveRelease,
      transaction.isReserveWithholding,
      payeeNames?.length ? payeeNames.join('; ') : '',
      payeeForeignIds?.length ? payeeForeignIds.join('; ') : '',
      contract.name,
      contract.foreignId,
      contract.contractType === 'Mechanical' ? 'Mechanical' : 'Artist',
      contract.notes,
    ]);
  });

  return [data];
};

// Import
transactionSchema.statics.importFromExcel = function (file, curveUser, callback) {
  const Client = require('./client');
  const ImportXlsx = require('../libs/importXlsx');
  try {
    Client.findById(curveUser.clientId)
      .then((client) => {
        // get date format from client settings
        const dateFormat = client?.dateFormat ? `${client.dateFormat.toUpperCase()}` : '';
        ImportXlsx.getDataByTemplate(file.path, config.importTemplates.transaction, 0, 2, dateFormat, (error, data) => {
          if (error) {
            logger.error(error);
            if (error === 'Template does not match') { error = 'It appears the template does not match'; }
            Client.findById(curveUser.clientId)
              .then((client) => {
                const generateOptions = {
                  identifier: 'importError',
                  curveUser,
                  client,
                  subject: 'Your Transaction Import Has Errored',
                  file: file.originalname,
                  error: [error],
                };
                Notification.generate('Your Transaction Import Has Errored', `${error} in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                  if (callback) { callback(err, result); }
                });
              });
          } else {
            Transaction.importTransactions(data, curveUser.clientId, (errors, count, importedTransactions) => {
              if (errors && errors.length > 0) {
                // Send errors email
                logger.error(errors);
                Client.findById(curveUser.clientId)
                  .then((client) => {
                    const generateOptions = {
                      identifier: 'importError',
                      curveUser,
                      client,
                      subject: 'Your Transaction Import Has Errored',
                      file: file.originalname,
                      error: errors,
                    };
                    Notification.generate('Your Transaction Import Has Errored', `${errors.length} errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
                      if (callback) { callback(err, result); }
                    });
                  });
              } else {
                // Didn't error, save.
                const Contract = require('./contract');
                const partialImportErrors = [];
                const affectedContracts = [];
                async.each(importedTransactions, (importedTransaction, payeeCb) => {
                  importedTransaction.createdBy = curveUser.id;
                  importedTransaction.lastModifiedBy = curveUser.id;
                  importedTransaction.save()
                    .then(() => {
                      affectedContracts.push(importedTransaction.contractId);
                      payeeCb();
                    })
                    .catch((err) => {
                      partialImportErrors.push(`Transaction ${importedTransaction.name} did not save - ${err.message || err}`);
                      payeeCb();
                    });
                }, () => {
                  // If we have successfully saved any transaction - update the related contract to ensure contract is recalculated on a partial period run
                  Contract.updateMany({ _id: { $in: affectedContracts.filter(onlyUnique) } }, { $set: { updatedAt: new Date() } })
                    .then(() => {
                      Client.findById(curveUser.clientId)
                        .then((client) => {
                          if (partialImportErrors.length > 0) {
                            const generateOptions = {
                              identifier: 'partialImportError',
                              curveUser,
                              client,
                              subject: 'Your Transaction Import Was Partially Successful',
                              file: file.originalname,
                              error: partialImportErrors,
                            };

                            Notification.generate(
                              'Your Transaction Import Was Partially Successful',
                              `${partialImportErrors.length} errors in file ${file.originalname}`,
                              null,
                              curveUser,
                              generateOptions,
                              (err, result) => {
                                if (callback) { callback(err, result); }
                              },
                            );
                          } else {
                            // Send success email
                            const generateOptions = {
                              identifier: 'importComplete',
                              curveUser,
                              client,
                              subject: 'Your Transaction Import Has Completed',
                              file: file.originalname,
                              count,
                            };

                            Notification.generate(
                              'Your Transaction Import Has Completed',
                              `${count} Transactions imported in file ${file.originalname}`,
                              null,
                              curveUser,
                              generateOptions,
                              (err, result) => {
                                if (callback) { callback(err, result); }
                              },
                            );
                          }
                        });
                    });
                });
              }
            });
          }
        });
      });
  } catch (e) {
    Client.findById(curveUser.clientId)
      .then((client) => {
        const generateOptions = {
          identifier: 'importError',
          curveUser,
          client,
          subject: 'Your Transaction Import Has Errored',
          file: file.originalname,
          error: [e],
        };
        Notification.generate('Your Transaction Import Has Errored', `Errors in file ${file.originalname}`, null, curveUser, generateOptions, (err, result) => {
          if (callback) { callback(err, result); }
        });
      })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  }
};

transactionSchema.statics.importTransaction = function (data, clientId, callback) {
  if (!data) {
    return callback("Data doesn't match template", null);
  }
  async.waterfall([
    function (waterfallCb) {
      if (ObjectId.isValid(data._id)) {
        Transaction.findOne({ clientId, _id: new ObjectId(data._id) })
          .then((transaction) => {
            waterfallCb(null, transaction);
          })
          .catch((err) => {
            logger.error(err);
            waterfallCb(err);
          });
      } else {
        waterfallCb(null, null);
      }
    },
    function (transaction, waterfallCb) {
      if (!transaction) { transaction = new Transaction({ userCreated: true }); }
      transaction.clientId = clientId;
      transaction.name = data.name;
      transaction.amount = data.amount;
      transaction.invoiceNo = data.invoiceNo;
      transaction.type = data.type;
      if (data.isReserveRelease || data.isReserveRelease === false) { transaction.isReserveRelease = data.isReserveRelease; }
      if (data.isReserveWithholding || data.isReserveWithholding === false) { transaction.isReserveWithholding = data.isReserveWithholding; }
      transaction.date = data.date;
      // Get associated contract
      transaction.mapToContract(data.contractId, clientId, (err) => {
        if (err) {
          waterfallCb(err);
        } else {
          transaction.validate()
            .then(() => {
              waterfallCb(null, transaction);
            })
            .catch((err) => {
              logger.error(err);
              waterfallCb(err);
            });
        }
      });
    },
  ], callback);
};

transactionSchema.methods.mapToContract = function (contractId, clientId, callback) {
  const transaction = this;
  const Contract = require('./contract');
  // Find by ID
  const query = ObjectId.isValid(contractId) ? { clientId, _id: contractId } : { clientId, name: contractId };

  Contract.findOne(query)
    .then((foundContract) => {
      if (foundContract) {
        transaction.contractId = foundContract._id;
        callback();
      } else {
        // Return error if no contract found
        callback('Contract was not found');
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

transactionSchema.statics.importTransactions = function (transactions, clientId, callback) {
  if (Object.prototype.toString.call(transactions) !== '[object Array]') {
    callback('Data must be an Array', null);
  } else if (!clientId) {
    callback('A Client ID must be passed', null);
  } else {
    let count = 0;
    const importedTransactions = [];
    const errors = [];
    async.eachOfSeries(transactions, (transaction, index, cb) => {
      Transaction.importTransaction(transaction, clientId, (err, importedTransaction) => {
        if (err) { errors.push(`Line ${index + 3}: ${err}`); }
        if (importedTransaction) {
          count += 1;
          importedTransactions.push(importedTransaction);
        }
        cb();
      });
    }, (err) => {
      if (err) {
        callback(err, null);
      } else {
        callback(errors, count, importedTransactions);
      }
    });
  }
};

transactionSchema.statics.validateAgainstContract = function (transaction, callback) {
  const Contract = require('./contract');

  if (!transaction.contractId || !transaction.amount || !transaction.type) {
    callback();
  } else {
    Contract.findById(transaction.contractId)
      .then((contract) => {
        if (!contract) {
          callback();
        } else {
          contract.balanceAtDate(new Date(), {}, (err, balance) => {
            if (contract.type === 'Profit Share' && balance && balance < 0 && transaction.amount < 0 && transaction.type !== 'Advance') {
              const errorMessage = 'You are creating a payment to the artist when this account is negative. When a Profit Share is in a negative balance, everything is held at 100%, and you should categorise any payments or deductions from the artist as an Advance to ensure it is deducted from the artist\'s share.';
              callback(errorMessage);
            } else {
              callback();
            }
          });
        }
      })
      .catch((err) => {
        logger.error(err);
        // Weird that we don't call back with an error here
        // but it seems to be the way it was before
        callback();
      });
  }
};

function errorMessages(err, callback) {
  if (err) {
    const splitErrors = err.message.split(',');
    const newMessages = splitErrors.map((message) => {
      if (message.includes('name: Path `name` is required')) {
        return 'A Name is required';
      } if (message.includes('clientId: Path `clientId` is required')) {
        return 'A Client is required';
      } if (message.includes('contractId: Path `contractId` is required')) {
        return 'A Contract is required';
      } if (message.includes('date: Path `date` is required')) {
        return 'A Date is required';
      } if (message.includes('amount: Path `amount` is required')) {
        return 'A Amount is required';
      } if (message.includes('userCreated: Path `userCreated` is required')) {
        return 'User Created is required';
      }
      return message;
    }).join(', ');
    callback(null, newMessages);
  } else {
    callback();
  }
}

transactionSchema.post('save', (err, saved, next) => {
  // Handle error messages
  if (err) {
    errorMessages(err, (err, newError) => {
      next(new Error(newError));
    });
  } else {
    next();
  }
});

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const Transaction = mongoose.model(name, transactionSchema);

module.exports = Transaction;
