const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');

const Period = require('../../models/period');
const Statement = require('../../models/statement');
const Client = require('../../models/client');
const Contract = require('../../models/contract');
const PaymentGroup = require('../../models/paymentGroup');
const Payment = require('../../models/payment');
const Release = require('../../models/release');
const AppSettings = require('../../models/appSettings');
const Escalation = require('../../models/escalation');

const Clear = require('./statement/clear');
const QueryMetadata = require('./period/queryMetadata');
const CreatePeriodFiles = require('./period/createPeriodFiles');
const GetPeriodData = require('./period/getPeriodData');
const LogoFiles = require('./logoFiles');
const StatementDesigns = require('./statement/statementDesigns');
const CalculateSales = require('./statement/calculateSales');
const CalculateCosts = require('./statement/calculateCosts');
const GetStatementData = require('./statement/getStatementData');
const { GetSummaryData } = require('./statement/getSummaryData');
const StatementTransactions = require('./statement/statementTransactions');
const SubtractFromTransactions = require('./statement/subtractFromTransactions');
const AddToTransactions = require('./statement/addToTransactions');
const TaxAmounts = require('./statement/taxAmounts');
const ProfitShare = require('./profitShare');
const setClosingBalance = require('./statement/closingBalance');
const AutoPayments = require('./statement/autoPayments');
const CreateFiles = require('./statement/createFiles');
const ReleaseMechanicalAmount = require('./release/mechanicalAmount');
const PayeeBalanceController = require('./payeeBalances');
const PayeeBalanceStatements = require('./statement/payeeBalances');
const { SuspenseHelpers } = require('./helpers');

let useRefactoredSalesCalculation = false;

const StatementController = {
  calculate: (statement, callback) => {
    // Get Client
    Client.findById(statement.clientId).then((client) => {
      // Get Period
      Period.findById(statement.periodId).then((period) => {
        // Get application settings
        AppSettings.findOne({}).then((settings) => {
          // Connect to MongoDb, to be passed into each function
          const generatePayments = settings?.features?.payments && client.features?.payments;
          MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts()).then((mongoClient) => {
            const db = mongoClient.db(databaseUtils.getMongoDBName());
            // Setup BigQuery connection
            const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            async.waterfall([
              (cb) => StatementController.startupStatus(statement, cb),
              // Create Sales Lines filter table for for suspense / resolved sales groups filtering when building main filter
              (cb) => SuspenseHelpers.createSalesLinesFilterTable({ client, period, statement, bigQuery }).then(cb).catch(cb),
              (cb) => StatementController.clear(statement, client, db, bigQuery, cb),
              (cb) => StatementController.getQueryMetadata(statement, period, bigQuery, cb),
              (cb) => StatementController.setExchangeRates(statement, period, client, cb),
              (cb) => { StatementController.setEscalationStartingFigures(statement, period).then(cb).catch((e) => cb(e.message)); },
              (cb) => StatementController.setStatementDesign(statement, period, cb),
              (cb) => StatementController.updateStatementName(statement, period, cb),
              (cb) => StatementController.checkIfClientCanUseRefactoredSalesCalculation(statement, period, client, cb),
              // Calculate Release mechanical amount once before calculation start, instead of doing it inside of CalculateContract.calculateRelease()
              (cb) => StatementController.getReleaseMechanicalAmounts(statement, period, client, cb),
              (cb) => StatementController.calculateCosts(statement, client, db, bigQuery, cb),
              (cb) => StatementController.calculateSales(statement, client, db, bigQuery, cb),
              (cb) => StatementController.createSalesUnreportedFiles({ statement, period, client, bigQuery }).then(cb).catch(cb),
              (cb) => StatementController.createCostsUnreportedFiles(period, client, db, cb),
              (cb) => StatementController.getPeriodData(statement, period, db, bigQuery, cb),
              (cb) => StatementController.getStatementData(statement, period, client, db, bigQuery, cb),
              (cb) => StatementController.createPaymentGroup(period, client, generatePayments, cb),
              (cb) => StatementController.createTransactions(statement, period, client, generatePayments, cb),
              (cb) => StatementController.checkPaymentGroup(period, client, generatePayments, cb),
              (cb) => StatementController.checkForSummary(statement, period, client, db, bigQuery, cb),
              (cb) => StatementController.createFiles(statement, period, client, db, bigQuery, cb),
              // Create Payee Balances
              (cb) => {
                if (!client.features?.payeeBalances || period.contractType === 'MCPS') return cb();
                StatementController.setPayeeBalances({ period, statement }).then(cb).catch(cb);
              },
              (cb) => {
                if (!client.features?.payeeBalances || period.contractType === 'MCPS') return cb();
                StatementController.createPayeeStatement({ period, statement }).then(cb).catch(cb);
              },
              // Delete Sales Lines filter table
              (cb) => SuspenseHelpers.deleteSalesLinesFilterTable({ client, period, statement, bigQuery }).then(cb).catch(cb),
              (cb) => StatementController.clearLogoFiles(period, client, cb),
            ], (err) => {
              StatementController.complete(err, statement, mongoClient, callback);
            });
          }).catch((mongoConnectionErr) => {
            logger.error(`${statement._id} Error connecting to database`);
            logger.error(mongoConnectionErr);
            callback(mongoConnectionErr);
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
    })
      .catch((err) => {
        logger.error(err);
        callback(err);
      });
  },
  startupStatus: (statement, cb) => {
    Statement.findByIdAndUpdate(statement._id, { $set: { status: 'Processing', calculationStatus: 'Clearing Previous Data' } })
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  clear: (statement, client, db, bigQuery, cb) => {
    // Clear old data out and return periodIds to blank where required
    logger.info(`${statement._id} Clearing old statement data`);
    Clear.clearStatement(statement, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${statement._id} Error in clearing previous data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            // Log new error but cb the original error
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${statement._id} Successfully Cleared old statement data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Updating Catalogue Data' } })
          .then(() => {
            // If no main error then we would overwrite the callback 'err' with undefined
            // So we can just call cb() here
            cb();
          })
          .catch((err) => {
            // If there is an error, we would update the 'err' with the new error, so we
            // cb it
            logger.error(err);
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
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Updating Catalogue Data' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
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
    Period.findByIdAndUpdate(period._id, { $set: { currencyExchangeRates: period.currencyExchangeRates } })
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(err);
        cb();
      });
  },
  setEscalationStartingFigures: async (statement, period) => {
    // Reset escalation for this contract
    period.escalationStartingFigures = period.escalationStartingFigures || [];
    // Loop through escalations and remove this contract
    period.escalationStartingFigures.forEach((startingFigure, index) => {
      if (startingFigure.contractId === statement.contractId) {
        period.escalationStartingFigures.splice(index, 1);
      }
    });
    // Get contract
    const contract = await Contract.findById(statement.contractId).select('_id escalationTracking');
    if (contract) {
      const contractEscalations = {};
      contract.escalationTracking = contract.escalationTracking || {};
      Object.keys(contract.escalationTracking).forEach((tracker) => {
        contractEscalations[tracker] = {
          units: contract.escalationTracking[tracker].startingUnits,
          gross: contract.escalationTracking[tracker].startingGross,
          net: contract.escalationTracking[tracker].startingNet,
        };
      });

      // Get total escalation per contract before the current period
      const filter = { clientId: period.clientId, startDate: { $lt: period.startDate }, contractId: contract._id };
      const escalations = await Escalation.find(filter);
      escalations.forEach((escalation) => {
        // For each of the escalation trackers, add the escalations to the contracts object
        if (escalation.trackers) {
          Object.keys(escalation.trackers).forEach((tracker) => {
            contractEscalations[tracker] = contractEscalations[tracker] || { units: 0, gross: 0, net: 0 };
            contractEscalations[tracker].units += escalation.trackers[tracker].units;
            contractEscalations[tracker].gross += escalation.trackers[tracker].gross;
            contractEscalations[tracker].net += escalation.trackers[tracker].net;
          });
        }
      });

      period.escalationStartingFigures.push({ contractId: contract._id.toString(), escalationTracking: contractEscalations });
      await Period.findByIdAndUpdate(period._id, { $set: { escalationStartingFigures: period.escalationStartingFigures } });
    }
  },
  setStatementDesign: (statement, period, cb) => {
    logger.info(`${period._id} Setting Contract Statement Designs`);
    StatementDesigns.setContractStatementDesign(statement, (err, result) => {
      if (err) {
        logger.error(`${period._id} Error in Setting Contract Statement Designs`, err);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Setting Contract Statement Designs' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        cb();
      }
    });
  },
  updateStatementName: (statement, period, cb) => {
    // Update Statement Name in Mongo Document
    Contract.findById(statement.contractId)
      .then((contract) => {
        if (contract) {
          Statement.findByIdAndUpdate(statement._id, { $set: { name: `${period.year} - ${period.accountingPeriod}: ${contract.name}` } })
            .then(() => {
              logger.info(`${period._id} ${statement._id} Statement name updated`);
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        } else {
          logger.info(`${period._id} ${statement._id} No contract found, to update statement name`);
          cb();
        }
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  checkIfClientCanUseRefactoredSalesCalculation: (statement, period, client, cb) => {
    logger.info(`${statement._id} Checking if Client can use the new Refactored Sales Calculation`);
    // Run new refactored sales calculations for: clients with the feature flag enabled, non-mechanical contracts, non MCPS contracts
    if (client.features.refactoredSalesCalculation && period.contractType !== 'Mechanical' && period.contractType !== 'MCPS') {
      logger.info(`${period._id} Period will use the new Refactored Sales Calculation`);
      useRefactoredSalesCalculation = true;
    }
    cb();
  },
  getReleaseMechanicalAmounts: (statement, period, client, cb) => {
    // We're now getting the release mechanical amounts from the new Refactored Sales Calculation, skip this if client can use it
    if (useRefactoredSalesCalculation) { return cb(); }
    // Otherwise, get the release mechanical amounts
    Contract.findById(statement.contractId, '_id')
      .then((contract) => {
        if (!contract) { return cb(); }

        logger.info(`${statement._id} Getting Release Mechanical Amounts`);

        Release.find({ clientId: period.clientId, 'salesReturnsRights.contractId': contract._id.toString() }, { salesReturnsRights: 1, mechanicalLicenses: 1, mechanicalBasisPercentage: 1, trackIds: 1, mechanicalTrackCap: 1, dealerPrice: 1, priceCategoryDealerPrices: 1, controlledCompositionClause: 1 })
          .then((releases) => {
            async.eachLimit(releases, 100, (release, releaseCb) => {
              ReleaseMechanicalAmount.get(release, client, (err, mechanicalAmount) => {
                if (err) { logger.error(err); }

                Release.findByIdAndUpdate(release._id, { $set: { mechanicalAmount } }, { timestamps: false })
                  .then(() => {
                    releaseCb();
                  })
                  .catch((err) => {
                    logger.error(err);
                    releaseCb();
                  });
              });
            }, cb);
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
  calculateCosts: (statement, client, db, bigQuery, cb) => {
    // Calculate Costs
    logger.info(`${statement._id} Starting to Calculate Costs`);
    CalculateCosts.calculate(statement, db, bigQuery, client, (err) => {
      logger.info(`${statement._id} Completed Calculating Costs`);
      if (err) {
        logger.error(`${statement._id} Errored in Calculating Costs`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Costs Calculation Errored' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${statement._id} Sucessfully Completed Calculating Costs`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Calculating Sales' } })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
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
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Sales Calculation Errored' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${statement._id} Sucessfully Completed Calculating Sales`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Flushing Catalogue Data to Output' } })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }
    });
  },
  createSalesUnreportedFiles: async ({ statement, period, client, bigQuery }) => {
    if (client.features?.unreportedFileV2) return;

    const statements = await Statement
      .find({
        status: 'Processing',
        clientId: statement.clientId,
        periodId: statement.periodId,
        calculationStatus: {
          $in: [
            'Calculating Sales',
            'Calculating Costs',
            'Updating Catalogue Data',
          ],
        },
      })
      .select({ _id: 1 })
      .lean();

    if (statements?.length) {
      logger.info(`${statement._id} Statement is at a prior state, skipping unreported file creation`);
      return;
    }

    if (period.contractType === 'Mechanical') {
      // Mechanical Specific Filters
      logger.info(`${statement._id} Creating Mechanical Unreported File`);
      await new Promise((resolve, reject) => {
        CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err) => {
          if (err) {
            reject(err);
          } else {
            logger.info(`${statement._id} Mechanical Unreported File Created`);
            resolve();
          }
        });
      });
    } else {
      await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
    }
  },
  createCostsUnreportedFiles: (period, client, db, cb) => {
    if (client.features?.unreportedFileV2) return cb();

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
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Getting Statement Data' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${statement._id} Sucessfully Received Statement Data`);
        Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Statement Files' } })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(err);
            cb(err);
          });
      }
    });
  },
  createPaymentGroup: (period, client, generatePayments, cb) => {
    // Skip if payments are disabled
    if (!generatePayments) { return cb(); }
    // Create a payment group if no group exists already
    PaymentGroup.findOne({ clientId: client._id.toString(), periodId: period._id.toString() })
      .then((periodPaymentGroup) => {
        if (!periodPaymentGroup) {
          const newPaymentGroup = new PaymentGroup({ clientId: client._id.toString(), periodId: period._id.toString(), name: period.name });
          newPaymentGroup.save()
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
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  createTransactions: (statement, period, client, generatePayments, cb) => {
    logger.info(`${statement._id} Starting to Create Transactions`);
    Statement.findById(statement._id)
      .then((statement) => {
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
          function (waterfallCb) {
            // When Statement is Profit Share and balance is positive, we need to set any payments
            // manageNegativeBalanceFromTransfers is where statement.payments get set, but this only happens when balance is negative
            // We use statement.payments to display the payments on the statement PDF
            ProfitShare.checkProfitSharePayments({ statement, period }).then(waterfallCb).catch(waterfallCb);
          },
        ], (err) => {
          if (err) {
            logger.error(`${statement._id} Errored in Creating Transactions`, err);
            Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Errored in Creating Transactions' } })
              .then(() => {
                cb(err);
              })
              .catch((error) => {
                logger.error(error);
                cb(err);
              });
          } else {
            cb();
          }
        });
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  checkPaymentGroup: (period, client, generatePayments, cb) => {
    // Skip if payments are disabled
    if (!generatePayments) { return cb(); }
    PaymentGroup.findOne({ clientId: client._id.toString(), periodId: period._id.toString() })
      .then((paymentGroup) => {
        if (!paymentGroup) { return cb(); }
        Payment.countDocuments({ clientId: client._id.toString(), paymentGroupId: paymentGroup._id.toString() })
          .then((payments) => {
            // Delete group if no payments associated with it
            if (!payments) {
              paymentGroup.deleteOne()
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  cb(err);
                });
            } else {
              cb();
            }
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
          Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } })
            .then(() => {
              cb(err);
            })
            .catch((error) => {
              logger.error(error);
              cb(err);
            });
        } else {
          logger.info(`${statement._id} Sucessfully Created Statement Files`);
          Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } })
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        }
      });
    });
  },
  setPayeeBalances: async ({ period, statement }) => {
    logger.info(`${statement._id.toString()} ${period._id} | Creating Payee Balances 💰`);

    await Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Payee Balances' } });

    const foundPeriod = await Period.findById(period._id)
      .select('clientId name accountingPeriodType endDate startDate currencyExchangeRates');

    if (!foundPeriod) throw new Error(`${period._id.toString()} | Payee Balances | Period not found`);

    // No need to the run the process if the contract has no Payees
    const contract = await Contract.findById(statement.contractId, 'payees');
    if (!contract?.payees?.length) return;

    console.time(`${statement._id.toString()} | Payee Balances | Process Time`);

    // If one statement gets run but the payee is linked to many contracts or many payees
    // Any contract transactions that are linked to the payee will be re-created
    await PayeeBalanceController.createBalances({ period: foundPeriod, contract, statement });

    console.timeEnd(`${statement._id.toString()} | Payee Balances | Process Time`);
  },
  createPayeeStatement: async ({ period, statement }) => {
    await Statement.findByIdAndUpdate(statement._id, { $set: { calculationStatus: 'Creating Payee Statement' } });

    const foundPeriod = await Period.findById(period._id)
      .select('clientId name accountingPeriodType endDate startDate currencyExchangeRates runNo year accountingPeriod');

    if (!foundPeriod) throw new Error(`${period._id.toString()} | Payee Statements | Period not found`);

    // No need to the run the process if the contract has no Payees
    const contract = await Contract.findById(statement.contractId, 'payees');
    if (!contract?.payees?.length) return;

    console.time(`${statement._id.toString()} | Payee Balance Statement Creation | Process Time`);

    // If one statement gets run but the payee is linked to many contracts or many payees, all associated payee statements will be re-created
    await PayeeBalanceStatements.createStatements({ period: foundPeriod, contract });

    console.time(`${statement._id.toString()} | Payee Balance Statement Creation | Process Time`);
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
      Statement.findByIdAndUpdate(statement._id, { $set: { calculationError: err, status: 'Errored' } })
        .then((statement) => {
          callback(null, statement);
        })
        .catch((error) => {
          logger.error(error);
          callback(err);
        });
    } else {
      logger.info(`${statement._id} Statement Processing Complete`);
      Statement.findByIdAndUpdate(statement._id, { $set: { status: 'Pending' } })
        .then((statement) => {
          callback(null, statement);
        })
        .catch((error) => {
          logger.error(error);
          callback(err);
        });
    }
  },
};

module.exports = StatementController;
