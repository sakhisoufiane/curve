const { logger, BigQuery, databaseUtils, ExchangeRateLib } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

const Payee = require('../../models/payee');
const Contract = require('../../models/contract');
const Client = require('../../models/client');
const Period = require('../../models/period');
const Release = require('../../models/release');
const AppSettings = require('../../models/appSettings');
const PaymentGroup = require('../../models/paymentGroup');
const Payment = require('../../models/payment');
const Notification = require('../../models/notification');

const SQS = require('../sqs');
const recalculationFilter = require('./recalculationFilter');
const Clear = require('./period/clear/clear');
const Escalations = require('./period/escalations');
const StatementDesigns = require('./period/statementDesigns');
const GetIdsForCalculation = require('./period/getIdsForCalculation');
const QueryMetadata = require('./period/queryMetadata');
const CalculateSales = require('./period/calculateSales');
const CalculateCosts = require('./period/calculateCosts');
const CreatePeriodFiles = require('./period/createPeriodFiles');
const GetPeriodData = require('./period/getPeriodData');
const CreateStatements = require('./period/createStatements');
const { PeriodStatementData } = require('./period/periodStatementData');
const PeriodTransactions = require('./period/periodTransactions');
const PeriodStatementCreation = require('./period/periodStatementCreation');
const LogoFiles = require('./logoFiles');
const ReleaseMechanicalAmount = require('./release/mechanicalAmount');
const PayeeBalanceController = require('./payeeBalances');
const PayeeBalanceStatements = require('./statement/payeeBalances');
const ExchangeRate = require('../../models/exchangeRate');
const { SuspenseHelpers } = require('./helpers');

let period; let client; let db; let bigQuery; let modComparisonTime;
// Set values to their default state, to be updated through process
let overrideAlwaysRunFull = false;
let generatePayments = false;
let useRefactoredSalesCalculation = false;

const Controller = {
  calculate: (inputPeriod, callback) => {
    // Sets period as variable to be used across functions
    period = inputPeriod;
    modComparisonTime = period.processStartTime; // new Date('2022-01-28T00:10:36.961+00:00');
    // Increment runNo for each calculation
    period.runNo += 1;
    Client.findById(period.clientId).then((foundClient) => {
      // Set client as variable to be used across functions
      client = foundClient;
      // Connect to MongoDb, to be passed into each function
      MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts()).then((mongoClient) => {
        db = mongoClient.db(databaseUtils.getMongoDBName());
        // Setup BigQuery connection
        bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        // Calculation Steps
        async.waterfall([
          // Set Period Status on Startup
          Controller.startupStatus,
          // Flush Currencies
          (cb) => Controller.flushCurrencies().then(cb).catch(cb),
          // Create an SQS queue for the Period
          (cb) => Controller.createSqsQueue().then(cb).catch(cb),
          // Refresh Sales File Ids
          (cb) => Controller.refreshSalesFileIds().then(cb).catch(cb),
          // Refresh Cost Ids
          (cb) => Controller.refreshCostIds().then(cb).catch(cb),
          // Set Exchange Rates
          Controller.setExchangeRates,
          // Check App Settings
          Controller.checkAppSettings,
          // Build recalculation Filter
          (cb) => { Controller.buildRecalculationFilter(cb, callback); },
          // Create Sales Lines filter table for for suspense / resolved sales groups filtering when building main filter
          (cb) => SuspenseHelpers.createSalesLinesFilterTable({ client, period, bigQuery }).then(cb).catch(cb),
          // Clear Period Data, Statements and files
          (cb) => Controller.clearPeriod().then(cb).catch(cb),
          // Set Escalation Starting Figures
          Controller.setEscalcationStartingFigures,
          // Statement Designs
          Controller.setStatementDesigns,
          // Get Query Meta data : direct sales-contract associations and used partitions : Formerly Used Catalogue
          Controller.getQueryMetadata,
          // Check if Client can use the new Refactored Sales Calculation
          Controller.checkIfClientCanUseRefactoredSalesCalculation,
          // Calculate Release mechanical amount once before calculation start, instead of doing it inside of CalculateContract.calculateRelease()
          Controller.getReleaseMechanicalAmounts,
          // Calculate Costs
          Controller.calculateCosts,
          // Calculate Sales
          Controller.calculateSales,
          // Double accounting check
          Controller.checkForDoubleAccounting,
          // Get Period Data
          Controller.getPeriodData,
          // Create Period Files
          Controller.createPeriodFiles,
          // Create statements
          Controller.createStatements,
          // Get Statement Data
          Controller.getStatementData,
          // Create Period Payment Group
          Controller.createPaymentGroup,
          // Create Transactions
          Controller.createTransactions,
          // Check that the created payment group has payments in it.
          Controller.checkPaymentGroup,
          // Set Summary Statement Values
          Controller.setSummaryStatementValues,
          // Create Statement Files
          Controller.createStatementFiles,
          // Create Payee Balances
          (cb) => {
            // Do not run if period type is MCPS
            if (!client.features?.payeeBalances || period.contractType === 'MCPS') return cb();
            Controller.setPayeeBalances().then(cb).catch(cb);
          },
          (cb) => {
            // Do not run if period type is MCPS
            if (!client.features?.payeeBalances || period.contractType === 'MCPS') return cb();
            Controller.createPayeeStatements().then(cb).catch(cb);
          },
          // Delete Sales Lines filter table
          (cb) => SuspenseHelpers.deleteSalesLinesFilterTable({ client, period, bigQuery }).then(cb).catch(cb),
          // Clear Logo Files
          Controller.clearLogoFiles,
        ], (calculationErr) => {
          Controller.complete(mongoClient, modComparisonTime, calculationErr, callback);
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
  startupStatus: (cb) => {
    // Update period to starting point
    Period.findByIdAndUpdate(period._id, {
      $set: {
        processStartTime: new Date(), status: 'Processing', calculationStatus: 'Determining Recalculation Type', runNo: period.runNo,
      },
    })
      .then(() => {
        cb();
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  flushCurrencies: async () => {
    logger.info(`${period._id} Flushing Currencies`);
    const { homeCurrency } = client;

    // Get all exchange rates for the Client, Contracts, Payees, and Releases
    const loadedCurrencies = await ExchangeRateLib.getExchangeRates({
      clientId: client._id,
      Payee,
      Client,
      Release,
      Contract,
      ExchangeRate,
    }).catch(logger.error);
    if (!loadedCurrencies) return;

    const newCurrencies = Object.keys(loadedCurrencies)
      // Format Loaded Currencies
      .map((key) => {
        const split = key.split('_');
        if (split[0] === homeCurrency) { split[0] = 'Home Currency'; }
        if (split[1] === homeCurrency) { split[1] = 'Home Currency'; }

        return { from: split[0], to: split[1], rate: loadedCurrencies[key] };
      })
      // Filter out any currencies that are not already in the period
      .filter((currencyPair) => {
        if (!period.currencyExchangeRates.find((existingPair) => existingPair.from === currencyPair.from && existingPair.to === currencyPair.to)) {
          return currencyPair;
        }
      });

    // If any new currencies are found, add them to the period
    if (newCurrencies?.length) {
      const currencies = [...new Set([...period.currencyExchangeRates, ...newCurrencies])];
      // When updating a period with new Currencies a full recalculation will run
      const updatedPeriod = await Period.findByIdAndUpdate(period._id, { currencyExchangeRates: currencies }, { new: true });
      period = updatedPeriod;
    }

    logger.info(`${period._id} Completed Flushing Currencies`);
  },
  createSqsQueue: async () => {
    const { QueueUrl } = await SQS.createQueue(period._id.toString());
    period.sqsBatchQueue = QueueUrl;
    await Period.findByIdAndUpdate(period._id, { $set: { sqsBatchQueue: QueueUrl } });
  },
  refreshSalesFileIds: async () => {
    logger.info(`${period._id} Getting Sales File IDs`);
    try {
      await GetIdsForCalculation.getSalesFileIds(period);
    } catch (error) {
      logger.error(`${period._id} Error in Getting Sales File IDs`, error);
      await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting Sales File IDs' } });
    }
  },
  refreshCostIds: async () => {
    logger.info(`${period._id} Getting Cost IDs`);
    try {
      await GetIdsForCalculation.getCostIds(period);
    } catch (err) {
      logger.error(`${period._id} Error in Getting Cost IDs`, err);
      await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting Cost IDs' } });
    }
  },
  setExchangeRates: (cb) => {
    // Set multicurrency default 1 exchange rates
    logger.info(`${period._id} Setting Exchange Rates`);
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
        // log the error but don't pass it to callback to maintain previous behaviour
        cb();
      });
  },
  buildRecalculationFilter: (cb, mainCallback) => {
    let calculationStatus;
    // Set period.recalculation to an empty object enabling easier checking of properties throughout
    period.recalculation = {};
    // Limit the calculationLog to the last 50 calculation objects
    period.calculationLog = period.calculationLog.slice(-49);
    logger.info(`${period._id} Determining Recalculation Type`);
    // Check the recalculaion requirements
    recalculationFilter.createFilter(db, bigQuery, period.toObject(), client, modComparisonTime, overrideAlwaysRunFull, (calculationError, recalculation) => {
      if (calculationError) {
        // Update the period record with relevant data
        const logType = (recalculation?.type) ? recalculation.type : 'Partial';
        calculationStatus = 'Error in building recalculation filter';
        period.calculationLog.push({ startTime: period.processStartTime, endTime: new Date(), type: logType, status: 'Errored' });
        logger.error(`${period._id} ${calculationStatus}`);

        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus, calculationLog: period.calculationLog } })
          .then(() => {
            cb(calculationError);
          })
          .catch((err) => {
            logger.error(err);
            cb(calculationError);
          });
      } else {
        let setQuery;
        calculationStatus = 'Clearing Previous Data';
        period.recalculation = recalculation;
        period.calculationLog.push(recalculation);
        logger.info(`${period._id} Recalculation: ${recalculation.type} | ${recalculation.status}`);

        if (recalculation.type === 'Partial' && recalculation.status === 'No Changes') {
          logger.info(`${period._id} Period Processing Complete`);
          setQuery = {
            processEndTime: new Date(),
            status: 'Complete',
            calculationStatus: 'Complete',
            recalculation: null, // necessity for this will be worked out later
            calculationLog: period.calculationLog,
            calculationError: null,
          };
        } else {
          setQuery = { calculationStatus, recalculation, calculationLog: period.calculationLog };
        }

        Period.findByIdAndUpdate(period._id, { $set: setQuery })
          .then(() => {
            // If there are no changes then end the calculation by calling callback
            if (recalculation.type === 'Partial' && recalculation.status === 'No Changes') {
              return mainCallback();
            }
            cb();
          })
          .catch((err) => {
            logger.error(err);
            if (recalculation.type === 'Partial' && recalculation.status === 'No Changes') {
              return mainCallback(err);
            }
            cb(err);
          });
      }
    });
  },
  checkAppSettings: (cb) => {
    logger.info(`${period._id} Getting App Settings`);
    AppSettings.findOne({})
      .then((settings) => {
        // Checks app
        ({ overrideAlwaysRunFull } = settings);
        generatePayments = settings.features?.payments && client.features?.payments;
        cb();
      })
      .catch((err) => {
        logger.error(`${period._id} Error in Getting App Settings`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting App Settings' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      });
  },
  clearPeriod: async () => {
    // Clear old data out and return periodIds to blank where required
    if (period.recalculation.type === 'Initial') {
      logger.info(`${period._id} Skipping clearing period data on Initial Run`);
      return;
    }

    logger.info(`${period._id} Clearing old period data`);

    try {
      await Clear.clearPeriod(period, db, bigQuery);
      logger.info(`${period._id} Successfully Cleared old period data`);
      await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Updating Catalogue Data' } });
    } catch (err) {
      logger.error(`${period._id} Error in clearing previous data`, err);
      await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } });
      throw err;
    }
  },
  setEscalcationStartingFigures: (cb) => {
    logger.info(`${period._id} Getting Escalation Starting Figures`);
    Escalations.getEscalationStartingFigures(period)
      .then(cb)
      .catch((err) => {
        logger.error(`${period._id} Error in Escalation Starting Figures`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting Escalation Starting Figures' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      });
  },
  setStatementDesigns: (cb) => {
    logger.info(`${period._id} Setting Contract Statement Designs`);
    StatementDesigns.setContractStatementDesigns(period, client, (err) => {
      if (err) {
        logger.error(`${period._id} Error in Setting Contract Statement Designs`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Setting Contract Statement Designs' } })
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
  getQueryMetadata: (cb) => {
    logger.info(`${period._id} Getting Used Catalogue`);
    QueryMetadata.get(period, bigQuery, (err, result) => {
      if (err) {
        logger.error(`${period._id} Error in Getting Used Catalogue`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Updating Catalogue Data' } })
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
  checkIfClientCanUseRefactoredSalesCalculation: (cb) => {
    logger.info(`${period._id} Checking if Client can use the new Refactored Sales Calculation`);
    // Run new refactored sales calculations for: clients with the feature flag enabled, non-mechanical contracts, non MCPS contracts
    if (client.features.refactoredSalesCalculation && period.contractType !== 'Mechanical' && period.contractType !== 'MCPS') {
      logger.info(`${period._id} Period will use the new Refactored Sales Calculation`);
      useRefactoredSalesCalculation = true;
    }
    cb();
  },
  getReleaseMechanicalAmounts: (cb) => {
    // We're now getting the release mechanical amounts from the new Refactored Sales Calculation, skip this if client can use it
    if (useRefactoredSalesCalculation) { return cb(); }
    // Otherwise, get the release mechanical amounts
    logger.info(`${period._id} Getting Release Mechanical Amounts`);
    Release.find({ clientId: period.clientId }, { salesReturnsRights: 1, mechanicalLicenses: 1, mechanicalBasisPercentage: 1, trackIds: 1, mechanicalTrackCap: 1, dealerPrice: 1, priceCategoryDealerPrices: 1, controlledCompositionClause: 1 })
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
        }, (err) => {
          if (err) return cb(err);
          Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Calculating Costs' } })
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(err);
              cb(err);
            });
        });
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  calculateCosts: (cb) => {
    logger.info(`${period._id} Starting to Calculate Costs`);
    CalculateCosts.calculate(period, db, bigQuery, client, (err) => {
      logger.info(`${period._id} Completed Calculating Costs`);
      if (err) {
        logger.error(`${period._id} Errored in Calculating Costs`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Costs Calculation Errored' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Completed Calculating Costs`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Calculating Sales' } })
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
  calculateSales: (cb) => {
    // Need to run calculateSales logic twice for partial periods which include salesFile changes
    async.waterfall([
      function (wcb) {
        // If running a partial with only salesfile updates we can skip the main (contract) calculation)
        if (period.recalculation?.salesFiles && !period.recalculation.contractIds) {
          setImmediate(() => { wcb(null, null); });
        } else {
          logger.info(`${period._id} Starting to Calculate Sales (Main Run)`);
          // Calculates full set of sales data, or only updated contracts
          CalculateSales.calculate(period, db, bigQuery, client, 'main', (err) => {
            let calculationStatus;
            if (err) {
              logger.error(`${period._id} Errored in Calculating Sales (Main Run)`);
              logger.error(err);
              calculationStatus = 'Sales Calculation Errored';
            } else {
              logger.info(`${period._id} Sucessfully Completed Calculating Sales (Main Run)`);
              calculationStatus = 'Flushing Catalogue Data to Output';
            }
            wcb(err, calculationStatus);
          });
        }
      },
      function (calculationStatus, wcb) {
        // check period recalculation to determine if we need to recalculate modified salesFiles
        if (period.recalculation?.salesFiles?.contractIds?.length > 0) {
          logger.info(`${period._id} Starting to Calculate Sales (Modified SalesFiles Run)`);
          CalculateSales.calculate(period, db, bigQuery, client, 'modifiedSales', (err) => {
            if (err) {
              logger.error(`${period._id} Errored in Calculating Sales (Modified SalesFiles Run)`);
              logger.error(err);
              calculationStatus = 'Sales Calculation Errored';
            } else {
              logger.info(`${period._id} Sucessfully Completed Calculating Sales (Modified SalesFiles Run)`);
              calculationStatus = 'Flushing Catalogue Data to Output';
            }
            wcb(err, calculationStatus);
          });
        } else {
          setImmediate(() => { wcb(null, calculationStatus); });
        }
      },
    ], (err, calculationStatus) => {
      if (err) return cb(err);
      // Update sales file statuses
      CalculateSales.updateSalesFilesReportedStatus(period, (errSFR) => {
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus } })
          .then(() => {
            cb(errSFR);
          })
          .catch((err) => {
            logger.error(err);
            cb(errSFR);
          });
      });
    });
  },
  checkForDoubleAccounting: (cb) => {
    if (period.contractType !== 'Mechanical') {
      logger.info(`${period._id.toString()} | Checking for any duplicate sales lines`);

      // Config
      const options = { limit: 1 };
      const filter = { periodId: period._id.toString() };
      const selectColumns = [
        { column: 'salesLineId', isSelector: true, isGroupBy: true },
        { column: 'contractId', isSelector: true, isGroupBy: true },
      ];

      // Lookup
      bigQuery.getAggregate(bigQuery.outputTable, selectColumns, [], 'lines', filter, options, (err, data) => {
        if (err) { return cb(err); }

        const log = `${period._id.toString()} | Duplicate sales line reporting check | ${data?.[0]?.contractId} - ${data?.[0]?.lines}`;
        logger.info(log);

        // A sales line should only be reported to a contract once
        if (data?.[0]?.lines > 1) {
          logger.error(`${period._id.toString()} | Double Accounting on sales lines has occurred`);
          return cb(new Error(log)); // This error is saved against period object later in the process
        }

        cb();
      });
    } else {
      logger.info(`${period._id.toString()} | Skip checking for any duplicate sales lines`);
      cb();
    }
  },
  getPeriodData: (cb) => {
    logger.info(`${period._id} Starting to Get Period Data`);
    GetPeriodData.getData(period, db, bigQuery, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored In Getting Period Data`);
        logger.error(`${period._id} ${err}`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored In Getting Period Data' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Completed Getting Period Data`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Period Files' } })
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
  createPeriodFiles: (cb) => {
    logger.info(`${period._id} Starting to Create Period Files`);
    CreatePeriodFiles.createFiles(period, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored In Creating Period Files`, err);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored In Creating Period Files' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Completed Creating Period Files`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statements' } })
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
  createStatements: (cb) => {
    logger.info(`${period._id} Starting to Create Statements`);
    CreateStatements.create(period, db, client, (err, result) => {
      logger.info(`${period._id} Completed Creating Statements`);
      if (err) {
        logger.error(`${period._id} Errored in Creating Statements`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Creating Statements' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Created Statements`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Setting Statement Data' } })
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
  getStatementData: (cb) => {
    logger.info(`${period._id} Starting to Get Statement Data`);
    PeriodStatementData.getStatementData(period, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored in Getting Statement Data`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Getting Statement Data' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Received Statement Data`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files', completedCatalogueItems: 0 } })
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
  createPaymentGroup: (cb) => {
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
  createTransactions: (cb) => {
    logger.info(`${period._id} Starting to Create Transactions`);
    PeriodTransactions.create(period, db, client, generatePayments, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored in Creating Transactions`, err);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Creating Transactions' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Created Transactions`);
        // return cb(new Error('KILL POST Create Transactions')); // on removal readd  || period.status === 'Errored' in calculation type determination
        cb();
      }
    });
  },
  checkPaymentGroup: (cb) => {
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
      })
      .catch((err) => {
        logger.error(err);
        cb(err);
      });
  },
  setSummaryStatementValues: (cb) => {
    logger.info(`${period._id} Starting to Set Summary Statement Values`);
    PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored in Creating Transactions`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Summary Statement Values' } })
          .then(() => {
            cb(err);
          })
          .catch((error) => {
            logger.error(error);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Set Summary Statement Values`);
        // return cb(new Error('KILL POST Set Summary Statement Values')); // on removal readd  || period.status === 'Errored' in calculation type determination
        cb();
      }
    });
  },
  createStatementFiles: (cb) => {
    logger.info(`${period._id} Starting to Create Statement Files`);
    // Download logos first - only downloads once through the process instead of every time
    LogoFiles.downloadLogos(client, () => {
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, (err, result) => {
        if (err) {
          logger.error(`${period._id} Creating Statement Files Errored`);
          Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } })
            .then(() => {
              cb(err);
            })
            .catch((error) => {
              logger.error(error);
              cb(err);
            });
        } else {
          logger.info(`${period._id} Sucessfully Created Statement Files`);
          Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } })
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
  setPayeeBalances: async () => {
    logger.info(`${period._id} | Creating Payee Balances 💰`);

    const foundPeriod = await Period.findById(period._id)
      .select('clientId name accountingPeriodType endDate startDate currencyExchangeRates runNo');

    if (!foundPeriod) throw new Error(`${period._id.toString()} | Payee Balances | Period not found`);

    await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Payee Balances' } });

    console.time(`${period._id.toString()} | Payee Balances | Process Time`);

    await PayeeBalanceController.createBalances({ period: foundPeriod });

    console.timeEnd(`${period._id.toString()} | Payee Balances | Process Time`);
  },
  createPayeeStatements: async () => {
    logger.info(`${period._id} | Creating Payee Statements 💰📂`);

    const foundPeriod = await Period.findById(period._id)
      .select('clientId name accountingPeriodType endDate startDate currencyExchangeRates runNo year accountingPeriod');

    if (!foundPeriod) throw new Error(`${period._id.toString()} | Payee Statements | Period not found`);

    await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Payee Statements' } });

    console.time(`${period._id.toString()} | Payee Statements | Process Time`);

    await PayeeBalanceStatements.createStatements({ period: foundPeriod });

    console.timeEnd(`${period._id.toString()} | Payee Statements | Process Time`);
  },
  clearLogoFiles: (cb) => {
    LogoFiles.clearLogoFiles(client, cb);
  },
  complete: (mongoClient, modComparisonTime, calculationErr, callback) => {
    mongoClient.close();
    // Calculation Notes are stored in the calculation process but not present on the period object here so reload
    Period.findById(period._id, 'calculationNotes')
      .then(async (currentCalculationNotes) => {
        const processEndTime = new Date();
        const setQuery = { status: 'Complete', forceFull: false, recalculation: null, calculationError: null, processEndTime, calculationStatus: 'Complete' };
        const { calculationLog } = period;
        const recalculation = calculationLog[calculationLog.length - 1];
        recalculation.endTime = processEndTime;
        // Only if we have succesfully reloaded the period can we set recalculation.calculationNotes
        recalculation.calculationNotes = currentCalculationNotes.calculationNotes;
        if (calculationErr) {
          recalculation.status = 'Errored';
          recalculation.calculationError = { message: calculationErr.message, stack: calculationErr.stack };
          // processEndTime set to the previous successful one on a fail. If left as null - next partial will run a client inception to date
          // So processEndTime effectively become process last succesful end time
          setQuery.processEndTime = modComparisonTime;
          setQuery.status = recalculation.status;
          setQuery.calculationError = recalculation.calculationError;
          logger.error(`${period._id} Period Processing Errored`);
          logger.error(calculationErr);
        } else {
          // Fuga Integration - Generate Client Period Complete Notification
          if (client?.fugaIntegration?.statementNotifications) {
            const { statementNotifications } = client.fugaIntegration;
            const subject = 'Your Splits Statements Are Now Available for Review';
            const generateOptions = {
              identifier: 'periodComplete',
              client,
              subject,
              mainText: `<div>Your statements are now available for review on FUGA.</div>
                        <br />
                        <div>To review your statements, please visit your Payee Statements tab on FUGA.</div>
                        <br />
                        <div>Spot something wrong? Then simply click ‘Report a Problem’ on the statement period.</div>`,
            };
            const emailList = statementNotifications && statementNotifications.includes(',') ? statementNotifications.split(',') : [statementNotifications];
            await Promise.all(emailList.map(async (email) => new Promise((resolve) => {
              Notification.generate('Period Complete', subject, null, { ...generateOptions, email }, (err) => {
                if (err) logger.error(err);
                resolve();
              });
            })));
          }

          recalculation.status = 'Complete';
          logger.info(`${period._id} Period Processing Complete`);
        }
        setQuery.calculationLog = calculationLog;
        // Delete SQS Queue
        await SQS.deleteQueue(period.sqsBatchQueue).catch(logger.error);
        setQuery.sqsBatchQueue = null;
        Period.findByIdAndUpdate(period._id, { $set: setQuery })
          .then((period) => {
            callback(null, period);
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
};

module.exports = Controller;
