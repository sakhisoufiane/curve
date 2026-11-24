const { logger, BigQuery, fileManager, databaseUtils, createXlsx, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Exports } = require('@curveroyaltysystems/curve-shared-logic');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const async = require('async');
const moment = require('moment');
const sanitize = require('sanitize-filename');
const { Period: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const Client = require('./client');
const SalesFile = require('./salesFile');
const Task = require('./task');
const PaymentGroup = require('./paymentGroup');
const Payment = require('./payment');
const Notification = require('./notification');
const PeriodController = require('../controllers/period');

const periodSchema = schema;

periodSchema.plugin(modelHistory, { mongoose, name: 'periodPatches' });
periodSchema.plugin(mongoosePaginate);

periodSchema.post('init', (period) => {
  if (period.allCalculatedSalesCsv) {
    fileManager.publicS3Link(period.allCalculatedSalesCsv, (err, publicLink) => {
      period.allCalculatedSalesCsvPublicLink = publicLink;
    });
  }
  if (period.allCalculatedCostsCsv) {
    fileManager.publicS3Link(period.allCalculatedCostsCsv, (err, publicLink) => {
      period.allCalculatedCostsCsvPublicLink = publicLink;
    });
  }
  if (period.unreportedSalesCsv) {
    fileManager.publicS3Link(period.unreportedSalesCsv, (err, publicLink) => {
      period.unreportedSalesCsvPublicLink = publicLink;
    });
  }
  if (period.unreportedCostsCsv) {
    fileManager.publicS3Link(period.unreportedCostsCsv, (err, publicLink) => {
      period.unreportedCostsCsvPublicLink = publicLink;
    });
  }
  if (period.suspenseCsv) {
    fileManager.publicS3Link(period.suspenseCsv, (err, publicLink) => {
      period.suspenseCsvPublicLink = publicLink;
    });
  }
  if (period.generalLedgerSummary) {
    fileManager.publicS3Link(period.generalLedgerSummary, (err, publicLink) => {
      period.generalLedgerSummaryPublicLink = publicLink;
    });
  }
  if (period.customStatement) {
    fileManager.publicS3Link(period.customStatement, (err, publicLink) => {
      period.customStatementPublicLink = publicLink;
    });
  }
  if (period.statementsZip) {
    fileManager.publicS3Link(period.statementsZip, (err, publicLink) => {
      period.statementsZipPublicLink = publicLink;
    });
  }
  period.setAccountingPeriodType();
});

periodSchema.pre('save', function (next) {
  const period = this;
  period.setAccountingPeriodType();
  if (!period.skipDateValidation) {
    Period.findOne({
      _id: { $ne: period._id }, clientId: period.clientId, accountingPeriodType: period.accountingPeriodType, contractType: period.contractType, locked: true,
    }, 'endDate startDate', { sort: { endDate: -1 }, limit: 1 })
      .then((previousPeriod) => {
        if (previousPeriod && period.startDate < previousPeriod.endDate) {
          next(new Error(`Period's start date should be after the last period's end date (${moment(previousPeriod.endDate).format('MMMM Do YYYY')}).`));
        } else if (previousPeriod && period.endDate < previousPeriod.endDate) {
          next(new Error(`Period's end date should be after the last period's end date (${moment(previousPeriod.endDate).format('MMMM Do YYYY')}).`));
        } else if (previousPeriod && period.endDate < period.startDate) {
          next(new Error("Period's end date should be after it's start date"));
        } else {
          next();
        }
      })
      .catch((err) => {
        logger.error(err);
        next(err);
      });
  } else {
    period.skipDateValidation = false;
    next();
  }
});

periodSchema.pre('deleteOne', { document: true, query: false }, function (next) {
  const period = this;
  period.clearPeriod(next);
});

periodSchema.methods.setAccountingPeriodType = function () {
  const period = this;
  if (!period.accountingPeriodType && period.accountingPeriod && period.accountingPeriod.includes('Y')) {
    period.accountingPeriodType = 'Yearly';
  } else if (!period.accountingPeriodType && period.accountingPeriod && period.accountingPeriod.includes('H')) {
    period.accountingPeriodType = 'Half-Yearly';
  } else if (!period.accountingPeriodType && period.accountingPeriod && period.accountingPeriod.includes('Q')) {
    period.accountingPeriodType = 'Quarterly';
  } else if (!period.accountingPeriodType && period.accountingPeriod && period.accountingPeriod.includes('M')) {
    period.accountingPeriodType = 'Monthly';
  }
};

periodSchema.methods.deleteFiles = function (callback) {
  const period = this;
  async.parallel([
    function (cb) {
      if (period.allCalculatedSalesCsv) {
        fileManager.deleteFromS3(period.allCalculatedSalesCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.allCalculatedCostsCsv) {
        fileManager.deleteFromS3(period.allCalculatedCostsCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.unreportedSalesCsv) {
        fileManager.deleteFromS3(period.unreportedSalesCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.unreportedCostsCsv) {
        fileManager.deleteFromS3(period.unreportedCostsCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.suspenseCsv) {
        fileManager.deleteFromS3(period.suspenseCsv, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.generalLedgerSummary) {
        fileManager.deleteFromS3(period.generalLedgerSummary, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.customStatement) {
        fileManager.deleteFromS3(period.customStatement, cb);
      } else {
        cb();
      }
    },
    function (cb) {
      if (period.statementsZip) {
        fileManager.deleteFromS3(period.statementsZip, cb);
      } else {
        cb();
      }
    },
  ], callback);
};

periodSchema.methods.deletePayments = function (callback) {
  const period = this;
  PaymentGroup.findOne({ clientId: period.clientId, periodId: period._id.toString() })
    .then((paymentGroup) => {
      if (!paymentGroup) {
        callback();
      } else {
        Payment.find({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString() })
          .then((payments) => {
            async.eachLimit(payments, 5, (payment, cb) => {
              payment.deleteTransactions = true;
              payment.deleteOne()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(`Payment Deletion Errored on ${payment._id.toString()} Period ID: ${period._id.toString()}`);
                  logger.error(err);
                  cb(err);
                });
            }, (callbackError) => {
              if (callbackError) { return callback(callbackError); }
              paymentGroup.deleteOne()
                .then(() => {
                  callback();
                })
                .catch((err) => {
                  logger.error(`Payment Group Deletion Errored on ${paymentGroup._id.toString()} Period ID: ${period._id.toString()}`);
                  logger.error(err);
                  callback(err);
                });
            });
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

const deleteStatementsBatch = (period, batchOffset, batchSize, callback) => {
  const Statement = require('./statement');

  Statement.find({ clientId: period.clientId, periodId: period._id.toString() }, {
    clientId: 1, name: 1, allFilesZip: 1, salesCsv: 1, costsCsv: 1, pdf: 1, statementOfAccount: 1, selfBillingInvoice: 1, feesInvoice: 1, customStatement: 1, contractId: 1, periodId: 1, _id: 1,
  }, { limit: batchSize, skip: batchOffset })
    .then((statements) => {
      if (statements.length > 0) {
        async.eachLimit(statements, 30, (statement, cb) => {
          statement.deleteOne()
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(`Statement Deletion Errored on ${statement._id.toString()} Period ID: ${period._id.toString()}`);
              logger.error(err);
              cb(err);
            });
        }, () => deleteStatementsBatch(period, batchOffset, batchSize, callback));
      } else {
        callback();
      }
    })
    .catch((err) => {
      logger.error(`Statement Deletion Errored on Period: ${period._id.toString()}`);
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.deleteStatements = function (callback) {
  const period = this;
  const batchSize = 1000;
  const batchOffset = 0;
  deleteStatementsBatch(period, batchOffset, batchSize, callback);
};

periodSchema.methods.checkPeriodPaymentsStatus = function (callback) {
  const period = this;
  PaymentGroup.findOne({ clientId: period.clientId, periodId: period._id.toString() })
    .then((paymentGroup) => {
      if (!paymentGroup) {
        callback();
      } else {
        Payment.countDocuments({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString(), status: 'Paid' })
          .then((payments) => {
            if (payments) {
              logger.error('Period has payments that are paid.');
              callback(new Error('Could not trigger recalculation as payments associated with this period have already been paid out.'));
            } else {
              callback();
            }
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.createSalesCsv = function (curveUser, callback) {
  const period = this;
  const User = require('./user');
  User.findById(curveUser.id)
    .then((user) => {
      Client.findById(period.clientId, 'name')
        .then((client) => {
          Task.countDocuments({
            name: { $in: ['Period Sales CSV'] },
            clientId: period.clientId,
            status: { $in: ['Pending', 'In Progress'] },
            'value.periodId': period._id.toString(),
          })
            .then((count) => {
              if (!count) {
                TaskHelpers.createTaskAndSendMessage(Task, {
                  name: 'Period Sales CSV', clientId: period.clientId, clientName: client.name, email: user.email, value: { periodId: period._id.toString() },
                })
                  .then(() => {
                    callback();
                  })
                  .catch(callback);
              } else {
                callback(new Error('This task is already running - please wait until it has completed before running again'));
              }
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.createCostsCsv = function (curveUser, callback) {
  const period = this;
  const User = require('./user');
  User.findById(curveUser.id)
    .then((user) => {
      Client.findById(period.clientId, 'name')
        .then((client) => {
          Task.countDocuments({
            name: { $in: ['Period Costs CSV'] },
            clientId: period.clientId,
            status: { $in: ['Pending', 'In Progress'] },
            'value.periodId': period._id.toString(),
          })
            .then((count) => {
              if (!count) {
                TaskHelpers.createTaskAndSendMessage(Task, {
                  name: 'Period Costs CSV', clientId: period.clientId, clientName: client.name, email: user.email, value: { periodId: period._id.toString() },
                })
                  .then(() => {
                    callback();
                  })
                  .catch(callback);
              } else {
                callback(new Error('This task is already running - please wait until it has completed before running again'));
              }
            })
            .catch((err) => {
              logger.error(err);
              callback(err);
            });
        })
        .catch((err) => {
          logger.error(err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.clearPeriod = function (callback) {
  const Contract = require('./contract');
  const Client = require('./client');
  const clearPeriod = require('../libs/clearPeriod');
  const period = this;
  logger.info(`${period._id.toString()} Clearing Period`);
  async.waterfall([
    function (cb) {
      logger.info(`${period._id.toString()} Deleting Payments and Payment Groups`);
      period.deletePayments((err) => {
        cb(err);
      });
    },
    function (cb) {
      logger.info(`${period._id.toString()} Deleting Statements`);
      period.deleteStatements((err) => {
        cb(err);
      });
    },
    function (cb) {
      logger.info(`${period._id.toString()} Deleting Period Files`);
      period.deleteFiles((err) => {
        cb(err);
      });
    },
    function (cb) {
      logger.info(`${period._id.toString()} Clearing Sales Data`);
      Client.findById(period.clientId)
        .then((client) => {
          const filter = { clientId: period.clientId };
          if (period.contractType === 'Mechanical') {
            filter.contractType = 'Mechanical';
          }
          Contract.distinct('_id', filter)
            .then((contractIds) => {
              MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
                .then((mongoClient) => {
                  // Select mongo db
                  const db = mongoClient.db(databaseUtils.getMongoDBName());
                  // Setup big query
                  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
                  const data = {
                    db,
                    bigQuery,
                    salesDatabaseTable: client.salesDatabaseTable,
                    writeSalesDatabaseTable: client.periodSalesDatabaseTable,
                    costsDatabaseTable: 'costs',
                    writeCostsDatabaseTable: client.periodCostsDatabaseTable,
                    statementsDatabaseTable: 'statements',
                    periodId: period._id.toString(),
                    contractIds: contractIds.map((contractId) => contractId.toString()),
                  };
                  // Manage MCPS contract ID when period is MCPS
                  if (period.contractType === 'MCPS') {
                    data.contractIds = ['MCPS'];
                  }
                  // Request deletion via request
                  clearPeriod(data, (cpErr) => {
                    // Close DB Connection
                    mongoClient.close();
                    cb(cpErr);
                  });
                })
                .catch(cb);
            })
            .catch((err) => {
              logger.error(err);
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
      logger.error(err);
      callback(err);
    } else {
      period.updateSalesFilesReportedStatus((err) => {
        callback(err);
      });
    }
  });
};

periodSchema.methods.updateSalesFilesReportedStatus = function (callback) {
  const period = this;
  // Update sale files status, that are in period.
  logger.info(`${period._id} Updating sales file reported status.`);
  SalesFile.find({ _id: { $in: period.salesFilesIds.map((id) => new ObjectId(id)) } })
    .then((salesFiles) => {
      async.eachLimit(salesFiles, 5, (salesFile, cb) => {
        logger.info('Updating Status of Sales File:', salesFile._id);
        salesFile.updateReportedStatus(cb);
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.sendStatementExport = function (curveUser, emailList) {
  const period = this;
  async.waterfall([
    function (cb) {
      period.createPeriodXlsx(cb);
    },
    function (filePath, cb) {
      fileManager.uploadToS3(`exports/${sanitize(period.name).split('/').join('-')} ${moment().format('YYYYMMDDHHmmssSSS')}.${filePath.split('.').pop()}`, filePath, cb);
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
            subject: 'Your Period Export for is Ready to Download',
            link,
          };
          if (!emailList) {
            Notification.generate('Period Export Ready', 'Your Period Export for is Ready to Download', link, curveUser, generateOptions, (err) => {
              cb(err);
            });
          }

          // Handle multiple Fuga emails, generating a notification for each
          if (emailList) {
            emailList.forEach((currentEmail) => {
              const curveUserEmail = { ...curveUser, email: currentEmail };
              Notification.generate(
                'Period Export Ready',
                'Your Period Export for is Ready to Download',
                link,
                curveUserEmail,
                { ...generateOptions, curveUser: curveUserEmail },
                () => { },
              );
            });
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
      logger.error(err);
      // Return error via email
      Client.findById(curveUser.clientId)
        .then((client) => {
          const generateOptions = {
            identifier: 'exportError',
            curveUser,
            client,
            subject: 'Your Period Export Has Errored',
            error: err.message,
          };
          Notification.generate('Your Period Export Has Errored', err.message, null, curveUser, generateOptions);
        })
        .catch((err) => {
          logger.error(err);
        });
    }
  });
};

periodSchema.methods.createPeriodXlsx = function (callback) {
  const period = this;
  const Statement = require('./statement');
  let output = [];

  Client.findById(period.clientId, 'features')
    .then((client) => {
      async.waterfall([
        function (cb) {
          // Get Statements
          logger.info(`${period._id} : createPeriodXlsx : Getting Statements`);
          // eslint-disable-next-line max-len
          Statement.find({ clientId: period.clientId, periodId: period._id }, '_id clientId periodId contractId name date openingValue units grossAmount netAmount grossCosts netCosts reservesWithheld reservesReleased withholdingTax netOutput lines contractType profitShareRate profitShareNetAmount currency selfBillingInvoice selfBillingInvoiceNo feesInvoice feesInvoiceNo status')
            .then((statements) => {
              cb(null, statements);
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        },
        function (statements, cb) {
          // Convert into data
          logger.info(`${period._id} : createPeriodXlsx : Statements Count:`, statements.length);

          const outputData = [];
          async.eachLimit(statements, 5, (statement, statementCb) => {
            statement.exportData((err, data) => {
              outputData.push(data);
              statementCb();
            });
          }, () => {
            output = [outputData];
            cb();
          });
        },
        function (cb) {
          if (!client.features?.payeeBalances) return cb();

          PeriodController.getPayeeTransfersExportData({ period }).then((payeeTransfersData) => {
            output.splice(1, 0, payeeTransfersData);
            cb();
          }).catch(cb);
        },
        function (cb) {
          if (!client.features?.payeeBalances) return cb();

          PeriodController.getPayeeBalancesExportData({ period }).then((payeeBalancesData) => {
            output.splice(2, 0, payeeBalancesData);
            cb();
          }).catch(cb);
        },
        function (cb) {
          // Create XLSX File
          Exports.getTemplate({ Client, templateName: 'periodStatements', clientId: period.clientId }).then((template) => {
            createXlsx.createInTemplate(output, template, cb);
          });
        },
      ], callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.archiveAllSalesFiles = function (callback) {
  const period = this;
  SalesFile.find({ _id: { $in: period.salesFilesIds } })
    .then((salesFiles) => {
      async.each(salesFiles, (salesFile, cb) => {
        salesFile.archived = true;
        // prevent timestamps update to avoid unnecessary recalculation
        salesFile.save({ timestamps: false })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.archiveFullyReportedSalesFiles = function (callback) {
  const period = this;
  SalesFile.find({ _id: { $in: period.salesFilesIds } })
    .then((salesFiles) => {
      async.each(salesFiles, (salesFile, cb) => {
        if (salesFile.reportedStatus === 'Complete') {
          salesFile.archived = true;
          // prevent timestamps update to avoid unnecessary recalculation
          salesFile.save({ timestamps: false })
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.archiveAllCosts = function (callback) {
  const Cost = require('./cost');

  const period = this;
  Cost.find({ _id: { $in: period.costIds } })
    .then((costs) => {
      async.each(costs, (cost, cb) => {
        cost.archived = true;
        // prevent timestamps update to avoid unnecessary recalculation
        cost.save({ timestamps: false })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.archiveFullyReportedCosts = function (callback) {
  const Cost = require('./cost');

  const period = this;
  Cost.find({ _id: { $in: period.costIds } })
    .then((costs) => {
      async.each(costs, (cost, cb) => {
        if (cost.reportedStatus === 'Complete') {
          cost.archived = true;
          // prevent timestamps update to avoid unnecessary recalculation
          cost.save({ timestamps: false })
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          cb();
        }
      }, callback);
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

periodSchema.methods.createStatement = function (contractId, callback) {
  const period = this;
  const Contract = require('./contract');
  const Statement = require('./statement');
  // Find contract by the passed ID
  Contract.findById(contractId)
    .then((contract) => {
      if (!contract) {
        // Handle contract not being found
        callback(new Error(`Contract not found with ID ${contractId}`));
      } else {
        logger.debug(contract);
        // Create statement
        const statement = new Statement({
          clientId: period.clientId,
          name: `${period.year} - ${period.accountingPeriod}: ${contract.name}`,
          periodId: period._id.toString(),
          contractId: contract._id.toString(),
          date: period.endDate,
          year: period.year,
          accountingPeriod: period.accountingPeriod,
          contractType: period.contractType,
          partitionNo: contract.partitionNo,
          periodType: period.contractType,
        });
        statement.save()
          .then(() => {
            // Trigger calculation on statement
            statement.calculate(callback);
          })
          .catch((err) => {
            logger.error(err);
            callback(err);
          });
      }
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
};

const Period = mongoose.model(name, periodSchema);

module.exports = Period;
