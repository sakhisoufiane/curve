/* eslint-disable max-len  */
require('../models/db');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');

const Period = require('../models/period');
const Statement = require('../models/statement');
const Client = require('../models/client');
const Contract = require('../models/contract');
const PaymentGroup = require('../models/paymentGroup');
const Payment = require('../models/payment');
const Release = require('../models/release');
const AppSettings = require('../models/appSettings');
const Task = require('../models/task');

const Clear = require('../libs/calculation/statement/clear');
const QueryMetadata = require('../libs/calculation/period/queryMetadata');
const CreatePeriodFiles = require('../libs/calculation/period/createPeriodFiles');
const GetPeriodData = require('../libs/calculation/period/getPeriodData');
const LogoFiles = require('../libs/calculation/logoFiles');
const StatementDesigns = require('../libs/calculation/statement/statementDesigns');
const CalculateSales = require('../libs/calculation/statement/calculateSales');
const CalculateCosts = require('../libs/calculation/statement/calculateCosts');
const GetStatementData = require('../libs/calculation/statement/getStatementData');
const GetSummaryData = require('../libs/calculation/statement/getSummaryData');
const StatementTransactions = require('../libs/calculation/statement/statementTransactions');
const SubtractFromTransactions = require('../libs/calculation/statement/subtractFromTransactions');
const AddToTransactions = require('../libs/calculation/statement/addToTransactions');
const TaxAmounts = require('../libs/calculation/statement/taxAmounts');
const ProfitShare = require('../libs/calculation/profitShare');
const setClosingBalance = require('../libs/calculation/statement/closingBalance');
const AutoPayments = require('../libs/calculation/statement/autoPayments');
const CreateFiles = require('../libs/calculation/statement/createFiles');
const ReleaseMechanicalAmount = require('../libs/calculation/release/mechanicalAmount');

const StatementController = {
  calculate: (statement, callback) => {
    // Get Client
    Client.findById(statement.clientId, (err, client) => {
      // Get Period
      Period.findById(statement.periodId, (err, period) => {
        // Get application settings
        AppSettings.findOne({}, (err, settings) => {
          // Connect to MongoDb, to be passed into each function
          const generatePayments = settings?.features?.payments && client.features?.payments;
          MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts(), (err, mongoClient) => {
            if (err) {
              logger.error(`${statement._id} Error connecting to database`);
              logger.error(err);
              callback(err);
            } else {
              const db = mongoClient.db(databaseUtils.getMongoDBName());
              // Setup BigQuery connection
              const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
              async.waterfall([
                // (cb) => StatementController.startupStatus(statement, cb),
                // (cb) => StatementController.clear(statement, client, db, bigQuery, cb),
                // (cb) => StatementController.getQueryMetadata(statement, period, bigQuery, cb),
                // (cb) => StatementController.setExchangeRates(statement, period, client, cb),
                // (cb) => StatementController.setEscalationStartingFigures(statement, period, cb),
                // (cb) => StatementController.setStatementDesign(statement, period, cb),
                // (cb) => StatementController.updateStatementName(statement, period, cb),
                // // Calculate Release mechanical amount once before calculation start, instead of doing it inside of CalculateContract.calculateRelease()
                // (cb) => StatementController.getReleaseMechanicalAmounts(statement, period, client, cb),
                // (cb) => StatementController.calculateCosts(statement, client, db, bigQuery, cb),
                // (cb) => StatementController.calculateSales(statement, client, db, bigQuery, cb),
                // (cb) => StatementController.createSalesUnreportedFiles(statement, period, client, db, bigQuery, cb),
                // (cb) => StatementController.createCostsUnreportedFiles(period, client, db, cb),
                // (cb) => StatementController.getPeriodData(statement, period, db, bigQuery, cb),
                (cb) => StatementController.getStatementData(statement, period, client, db, bigQuery, cb),
                (cb) => StatementController.createPaymentGroup(period, client, generatePayments, cb),
                (cb) => StatementController.createTransactions(statement, period, client, generatePayments, cb),
                (cb) => StatementController.checkPaymentGroup(period, client, generatePayments, cb),
                (cb) => StatementController.checkForSummary(statement, period, client, db, bigQuery, cb),
                (cb) => StatementController.createFiles(statement, period, client, db, bigQuery, cb),
                (cb) => StatementController.clearLogoFiles(period, client, cb),
              ], (err) => {
                StatementController.complete(err, statement, mongoClient, callback);
              });
            }
          });
        });
      });
    });
  },
  startupStatus: (statement, cb) => {
    Statement.findByIdAndUpdate(statement._id, { $set: { status: 'Processing', calculationStatus: 'Clearing Previous Data' } }).exec((err) => {
      cb(err);
    });
  },
  clear: (statement, client, db, bigQuery, cb) => {
    // Clear old data out and return periodIds to blank where required
    logger.info(`${statement._id} Clearing old statement data`);
    Clear.clearStatement(statement, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${statement._id} Error in clearing previous data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } }).exec(() => {
          cb(err);
        });
      } else {
        logger.info(`${statement._id} Successfully Cleared old statement data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Updating Catalogue Data' } }).exec((err) => {
          cb(err);
        });
      }
    });
  },
  getQueryMetadata: (statement, period, bigQuery, cb) => {
    // Get Used Catalogue
    logger.info(`${statement._id} Getting Used Catalogue`);
    QueryMetadata.get(period, bigQuery, (err, result) => {
      if (err) {
        logger.error(`${statement._id} Error in Getting Used Catalogue`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Updating Catalogue Data' } }).exec(() => {
          cb(err);
        });
      } else {
        cb();
      }
    });
  },
  setExchangeRates: (statement, period, client, cb) => {
    // Set multicurrency default 1 exchange rates
    logger.info(`${statement._id} Setting Exchange Rates`);
    // Loop through each exchange rate
    [client.homeCurrency, client.currency2, client.currency3, client.currency4].filter(Boolean).forEach((currency) => {
      // Check that exchange rates doesn't already include another exchange
      let includesCurrency = false;
      let includesHome = false;
      period.currencyExchangeRates.forEach((c) => {
        if (c && c.from === currency && c.to === currency) {
          includesCurrency = true;
        }
        if (c && c.from === client.homeCurrency && c.to === 'Home Currency') {
          includesHome = true;
        }
      });
      if (!includesCurrency) {
        // Add a default of 1 to each
        period.currencyExchangeRates.push({ from: currency, to: currency, rate: 1 });
      }
      if (!includesHome) {
        period.currencyExchangeRates.push({ from: currency, to: 'Home Currency', rate: 1 });
      }
    });
    Period.findByIdAndUpdate(period._id, { $set: { currencyExchangeRates: period.currencyExchangeRates } }, () => {
      cb();
    });
  },
  setEscalationStartingFigures: (statement, period, cb) => {
    // Reset escalation for this contract
    if (period.escalationStartingFigures) {
      // Loop through escalations and remove this contract
      period.escalationStartingFigures.forEach((startingFigure, index) => {
        if (startingFigure.contractId === statement.contractId) {
          period.escalationStartingFigures.splice(index, 1);
        }
      });
      // Add contract figures
      Contract.findOne(statement.contractId, '_id name escalationTracking', (err, contract) => {
        if (contract) {
          period.escalationStartingFigures.push({ contractId: contract._id.toString(), escalationTracking: contract.escalationTracking });
          Period.findByIdAndUpdate(period._id, { $set: { escalationStartingFigures: period.escalationStartingFigures } }, (err) => {
            cb(err);
          });
        } else {
          cb();
        }
      });
      // Save period
    } else {
      cb();
    }
  },
  setStatementDesign: (statement, period, cb) => {
    logger.info(`${period._id} Setting Contract Statement Designs`);
    StatementDesigns.setContractStatementDesign(statement, (err, result) => {
      if (err) {
        logger.error(`${period._id} Error in Setting Contract Statement Designs`, err);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Setting Contract Statement Designs' } }).exec(() => {
          cb(err);
        });
      } else {
        cb();
      }
    });
  },
  updateStatementName: (statement, period, cb) => {
    // Update Statement Name in Mongo Document
    Contract.findById(statement.contractId, (contractFindErr, contract) => {
      if (contractFindErr) {
        return cb(contractFindErr);
      }

      if (contract) {
        Statement.findByIdAndUpdate(statement._id, { $set: { name: `${period.year} - ${period.accountingPeriod}: ${contract.name}` } }).exec((err) => {
          logger.info(`${period._id} ${statement._id} Statement name updated`);
          cb(err);
        });
      } else {
        logger.info(`${period._id} ${statement._id} No contract found, to update statement name`);
        cb();
      }
    });
  },
  getReleaseMechanicalAmounts: (statement, period, client, cb) => {
    Contract.findById(statement.contractId, '_id', (contractFindErr, contract) => {
      if (contractFindErr || !contract) { return cb(contractFindErr); }

      logger.info(`${statement._id} Getting Release Mechanical Amounts`);

      Release.find({ clientId: period.clientId, 'salesReturnsRights.contractId': contract._id.toString() }, { salesReturnsRights: 1, mechanicalLicenses: 1, mechanicalBasisPercentage: 1, trackIds: 1, mechanicalTrackCap: 1, dealerPrice: 1, priceCategoryDealerPrices: 1, controlledCompositionClause: 1 }, (err, releases) => {
        async.eachLimit(releases, 100, (release, releaseCb) => {
          ReleaseMechanicalAmount.get(release, client, (err, mechanicalAmount) => {
            if (err) { logger.error(err); }

            Release.findByIdAndUpdate(release._id, { $set: { mechanicalAmount } }, { timestamps: false }).exec(() => {
              releaseCb();
            });
          });
        }, cb);
      });
    });
  },
  calculateCosts: (statement, client, db, bigQuery, cb) => {
    // Calculate Costs
    logger.info(`${statement._id} Starting to Calculate Costs`);
    CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
      logger.info(`${statement._id} Completed Calculating Costs`);
      if (err) {
        logger.error(`${statement._id} Errored in Calculating Costs`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Costs Calculation Errored' } }).exec(() => {
          cb(err);
        });
      } else {
        logger.info(`${statement._id} Sucessfully Completed Calculating Costs`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Calculating Sales' } }).exec((err) => {
          cb(err);
        });
      }
    });
  },
  calculateSales: (statement, client, db, bigQuery, cb) => {
    // Calculate Sales
    logger.info(`${statement._id} Starting to Calculate Sales`);
    CalculateSales.calculate(statement, db, bigQuery, client, (err) => {
      logger.info(`${statement._id} Completed Calculating Sales`);
      if (err) {
        logger.error(`${statement._id} Errored in Calculating Sales`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Sales Calculation Errored' } }).exec(() => {
          cb(err);
        });
      } else {
        logger.info(`${statement._id} Sucessfully Completed Calculating Sales`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Flushing Catalogue Data to Output' } }).exec((err) => {
          cb(err);
        });
      }
    });
  },
  createSalesUnreportedFiles: (statement, period, client, db, bigQuery, cb) => {
    // Create unreported sales period CSV export
    if (period.contractType === 'Mechanical') {
      // Mechanical Specific Filters
      logger.info(`${statement._id} Creating Mechanical Unreported File`);
      CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, (err) => {
        cb(err);
      });
    } else {
      CreatePeriodFiles.createUnreportedSalesCsv(period, bigQuery, client, (err) => {
        cb(err);
      });
    }
  },
  createCostsUnreportedFiles: (period, client, db, cb) => {
    // Create unreported costs period CSV export
    if (client.clientType !== 'Publisher' && period.contractType !== 'Mechanical') {
      CreatePeriodFiles.createUnreportedCostsCsv(period, db, client, (err) => {
        cb(err);
      });
    } else {
      cb();
    }
  },
  getPeriodData: (statement, period, db, bigQuery, cb) => {
    // Get Period Data
    logger.info(`${statement._id} Starting to Get Period Data`);
    GetPeriodData.getData(period, db, bigQuery, (err, result) => {
      cb(err);
    });
  },
  getStatementData: (statement, period, client, db, bigQuery, cb) => {
    logger.info(`${statement._id} Starting to Get Statement Data`);
    GetStatementData.getData(statement, db, bigQuery, client, period, (err, result) => {
      if (err) {
        logger.error(`${statement._id} Errored in Getting Statement Data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Getting Statement Data' } }).exec(() => {
          cb(err);
        });
      } else {
        logger.info(`${statement._id} Sucessfully Received Statement Data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Statement Files' } }).exec((err) => {
          cb(err);
        });
      }
    });
  },
  createPaymentGroup: (period, client, generatePayments, cb) => {
    // Skip if payments are disabled
    if (!generatePayments) { return cb(); }
    // Create a payment group if no group exists already
    PaymentGroup.findOne({ clientId: client._id.toString(), periodId: period._id.toString() }, (err, periodPaymentGroup) => {
      if (err) { return cb(err); }
      if (!periodPaymentGroup) {
        const newPaymentGroup = new PaymentGroup({ clientId: client._id.toString(), periodId: period._id.toString(), name: period.name });
        newPaymentGroup.save((err) => {
          cb(err);
        });
      } else {
        cb();
      }
    });
  },
  createTransactions: (statement, period, client, generatePayments, cb) => {
    logger.info(`${statement._id} Starting to Create Transactions`);
    Statement.findById(statement._id, (err, statement) => {
      async.waterfall([
        function (waterfallCb) {
          StatementTransactions.create(statement, client, period, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          SubtractFromTransactions.create(statement, client, period, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          TaxAmounts.createByStage(statement, 'Early', period, client, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          AddToTransactions.create(statement, client, period, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          TaxAmounts.createByStage(statement, 'Late', period, client, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          ProfitShare.createTransactions(statement, period, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          setClosingBalance(statement, period, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          AutoPayments.create(statement, period, generatePayments, (err) => {
            waterfallCb();
          });
        },
        function (waterfallCb) {
          ProfitShare.manageNegativeBalanceFromTransfers(statement, period, (err) => {
            waterfallCb();
          });
        },
      ], (err) => {
        if (err) {
          logger.error(`${statement._id} Errored in Creating Transactions`, err);
          Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Creating Transactions' } }).exec(() => {
            cb(err);
          });
        } else {
          cb();
        }
      });
    });
  },
  checkPaymentGroup: (period, client, generatePayments, cb) => {
    // Skip if payments are disabled
    if (!generatePayments) { return cb(); }
    PaymentGroup.findOne({ clientId: client._id.toString(), periodId: period._id.toString() }, (err, paymentGroup) => {
      if (err) { return cb(err); }
      Payment.countDocuments({ clientId: client._id.toString(), paymentGroupId: paymentGroup._id.toString() }, (err, payments) => {
        // Delete group if no payments associated with it
        if (!payments) {
          paymentGroup.remove((err) => {
            cb(err);
          });
        } else {
          cb();
        }
      });
    });
  },
  checkForSummary: (statement, period, client, db, bigQuery, cb) => {
    logger.info(`${statement._id} Starting to Set Summary Data`);
    GetSummaryData.checkForSummary(statement, db, bigQuery, client, period, (err) => {
      if (err) {
        logger.error(`${statement._id} Setting Summary Data Errored`, err);
        cb(err);
      } else {
        logger.info(`${statement._id} Sucessfully Set Summary Data`);
        cb();
      }
    });
  },
  createFiles: (statement, period, client, db, bigQuery, cb) => {
    logger.info(`${statement._id} Starting to Create Statement Files`);
    LogoFiles.downloadLogos(client, () => {
      CreateFiles.create(statement, db, bigQuery, client, period, null, (err) => {
        if (err) {
          logger.error(`${statement._id} Creating Statement Files Errored`);
          Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } }).exec(() => {
            cb(err);
          });
        } else {
          logger.info(`${statement._id} Sucessfully Created Statement Files`);
          Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } }).exec((err) => {
            cb(err);
          });
        }
      });
    });
  },
  clearLogoFiles: (period, client, cb) => {
    // Clear Logo Files
    logger.info(`${period._id} Clear Logos`);
    LogoFiles.clearLogoFiles(client, (err) => {
      cb();
    });
  },
  complete: (err, statement, mongoClient, callback) => {
    mongoClient.close();
    if (err) {
      logger.error(`${statement._id} Statement Processing Errored`);
      Statement.findByIdAndUpdate(statement._id, { $set: { calculationError: err, status: 'Errored' } }).exec(callback);
    } else {
      logger.info(`${statement._id} Statement Processing Complete`);
      Statement.findByIdAndUpdate(statement._id, { $set: { status: 'Pending' } }).exec(callback);
    }
  },
};

const oldStatementIds = [
  "65c87fe4f169c14168491fb5",
  "65c87fe4f169c14168491fb7",
  "65c87fe5f169c14168492387",
  "65c87fecf169c14168493402",
  "65c87fedf169c1416849377a",
  "65c87ff5f169c141684946a4",
  "65c87ff5f169c141684946a6",
  "65c87ff5f169c141684946a8",
  "65c87ff5f169c141684946aa",
  "65c87ffaf169c1416849520b",
  "65c87ffaf169c1416849520d",
  "65c88003f169c14168496264",
  "65c88006f169c14168496b44",
  "65c8800af169c14168497371",
  "65c8800cf169c141684979fa",
  "65c87ffaf169c1416849520f",
  "65c87ffaf169c14168495211",
  "65c88005f169c14168496721",
  "65c88005f169c14168496723",
  "65c88005f169c14168496725",
  "65c88005f169c14168496727",
  "65c88005f169c14168496729",
  "65c88005f169c1416849672b",
  "65c88005f169c1416849672d",
  "65ca46a38f20ffbd227f35a2",
  "65ca46c58f20ffbd227f3702",
  "65ca46d48f20ffbd227f3792",
  "65ca46e4fc6c995ff2e2431c"
];
Statement.find({ clientId: '64d4b1346b0b7fb1ffda1714', status: 'Processing' }, (err, statements) => {
  console.log(`TOTAL STATEMENTS: ${statements.length}`);
  const statementIds = statements.map((s) => s._id.toString());
  async.eachLimit(statementIds, 5, (statementId, cb) => {
    if (oldStatementIds.includes(statementId)) {
      cb();
    } else {
      console.log(statementId);
      Statement.findById(statementId, (err, statement) => {
        if (statement) {
          StatementController.calculate(statement, (err) => {
            cb();
          });
        } else {
          cb();
        }
      });
    }
  });
});

// Statement.findById('5f5e3e3e3e3e3e3e3e3e3e3e', (err, statement) => {
//   StatementController.calculate(statement, (err) => {
//     console.log('done', err);
//   });
// });

