const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');

const Client = require('../../models/client');
const Period = require('../../models/period');
const Transaction = require('../../models/transaction');
const Contract = require('../../models/contract');
const Statement = require('../../models/statement');
const SQS = require('../sqs');
const recalculationFilter = require('../calculation/recalculationFilter');
const Clear = require('../calculation/period/clear/clear');
const GetPeriodData = require('../calculation/period/getPeriodData');
const StatementDesigns = require('../calculation/period/statementDesigns');
const CreateStatements = require('../calculation/period/createStatements');
const CreateStatementFiles = require('../calculation/statement/createFiles');
const { PeriodStatementData } = require('../calculation/period/periodStatementData');
const PeriodTransactions = require('../calculation/period/periodTransactions');
const PeriodStatementCreation = require('../calculation/period/periodStatementCreation');
const { processDmpPeriodIngest } = require('./ingest');

const LogoFiles = require('../calculation/logoFiles');

let period; let client; let db; let bigQuery; let modComparisonTime; let fullReingest; let extractDate; let initialRun; let extractFolder; let foreignContractIds = []; let ingestionType; let modifiedContracts = [];
// Set values to their default state, to be updated through process
const generatePayments = false;

const Controller = {
  calculate: (inputPeriod, callback) => {
    // Sets period as variable to be used across functions
    period = inputPeriod;
    modComparisonTime = period.processStartTime;
    period.runNo += 1;
    const { processEndTime, runNo } = period;
    initialRun = (runNo === 1 && !processEndTime);

    if (period.dmpIngestData) {
      const dataParts = period.dmpIngestData.split(':');
      [extractDate, extractFolder, ingestionType] = dataParts;
      fullReingest = ingestionType === 'full';

      if (ingestionType === 'update' && dataParts.length === 4) {
        foreignContractIds = dataParts[3].split(',');
      }
    }

    // Increment runNo for each calculation
    Client.findById(period.clientId)
      .then((foundClient) => {
        // Set client as variable to be used across functions
        client = foundClient;
      })
      .catch((err) => {
        logger.error(`${period._id} Error finding client in DMP Calculate`, err);
      })
      .finally(() => {
        logger.info(`${period._id} Starting DMP Period Processing`);

        // Connect to MongoDb, to be passed into each function
        MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
          .then((mongoClient) => {
            db = mongoClient.db(databaseUtils.getMongoDBName());
            // Setup BigQuery connection
            bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
            // Calculation Steps
            async.waterfall([
              // Set Period Status on Startup
              Controller.startupStatus,
              // Create an SQS queue for the Period
              (cb) => Controller.createSqsQueue().then(cb).catch(cb),
              // Build recalculation Filter
              (cb) => { Controller.buildRecalculationFilter(cb, callback); },
              // Clear transactions for the period, as these arent associated to payments
              (cb) => dmpClearTransactions().then(cb).catch(cb),
              // Clear Period Data, Statements and files
              (cb) => Controller.clearPeriod().then(cb).catch(cb),
              // Ingest snowflake data
              (cb) => dmpIngestion().then(cb).catch(cb),
              // Statement Designs
              Controller.setStatementDesigns,
              // Get Period Data
              Controller.getPeriodData,
              // Create statements
              Controller.createStatements,
              // Get Statement Data
              Controller.getStatementData,
              // Create Transactions
              Controller.createTransactions,
              // Set Summary Statement Values
              Controller.setSummaryStatementValues,
              // Create Statement Files
              Controller.createStatementFiles,
              // Create statement files for cross contract summary statements
              (cb) => createDmpCrossContractSummaryStatments().then(cb).catch(cb),
              // Clear Logo Files
              Controller.clearLogoFiles,
            ], (calculationErr) => {
              Controller.complete(mongoClient, modComparisonTime, calculationErr, callback);
            });
          })
          .catch((dbConnectionErr) => {
            logger.error(`${period._id} Error connecting to database`);
            logger.error(dbConnectionErr);
            callback(dbConnectionErr);
          });
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
        logger.error(`${period._id} Error updating period on startupStatus in DMP controller`, err);
        cb(err);
      });
  },
  createSqsQueue: async () => {
    const { QueueUrl } = await SQS.createQueue(period._id.toString());
    period.sqsBatchQueue = QueueUrl;
    await Period.findByIdAndUpdate(period._id, { $set: { sqsBatchQueue: QueueUrl } });
  },
  buildRecalculationFilter: (cb, mainCallback) => {
    let calculationStatus;
    // Set period.recalculation to an empty object enabling easier checking of properties throughout
    period.recalculation = {};
    // Limit the calculationLog to the last 50 calculation objects
    period.calculationLog = period.calculationLog.slice(-49);
    logger.info(`${period._id} Determining Recalculation Type`);

    // Check the recalculation requirements
    recalculationFilter.createFilter(db, bigQuery, period.toObject(), client, modComparisonTime, false, (calculationError, recalculation) => {
      if (calculationError) {
        // Update the period record with relevant data
        const logType = recalculation?.type ? recalculation.type : 'Partial';
        calculationStatus = 'Error in building recalculation filter';
        period.calculationLog.push({ startTime: period.processStartTime, endTime: new Date(), type: logType, status: 'Errored' });
        logger.error(`${period._id} ${calculationStatus}`);

        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus, calculationLog: period.calculationLog } })
          .then(() => {
            cb(calculationError);
          })
          .catch((updateError) => {
            logger.error(`${period._id} Error updating period with recalculation filter error`, updateError);
            cb(calculationError);
          });
      } else {
        // Force full recalculation for DMP
        recalculation.type = 'Full';
        recalculation.status = 'Changes Detected';
        if (ingestionType === 'update' && foreignContractIds.length > 0) {
          lookupContractIdsByForeign(foreignContractIds)
            .then((contractIds) => {
              recalculation.contractIds = contractIds;
              recalculation.type = 'Partial';

              calculationStatus = 'Clearing Previous Data';
              period.recalculation = recalculation;
              const recalculationForLog = { ...recalculation, dmpIngestData: period.dmpIngestData };
              period.calculationLog.push(recalculationForLog);
              logger.info(`${period._id} Recalculation: ${recalculation.type} | ${recalculation.status}`);

              const setQuery = { calculationStatus, recalculation, calculationLog: period.calculationLog };

              Period.findByIdAndUpdate(period._id, { $set: setQuery })
                .then(() => {
                  cb();
                })
                .catch((err) => {
                  logger.error(`${period._id} Error updating period in create recalculation filter`, err);
                  cb(err);
                });
            })
            .catch((lookupError) => {
              logger.error(`Error in lookupContractIdsByForeign: ${lookupError}`);
              cb(lookupError);
            });
        } else {
          calculationStatus = 'Clearing Previous Data';
          period.recalculation = recalculation;
          const recalculationForLog = { ...recalculation, dmpIngestData: period.dmpIngestData };
          period.calculationLog.push(recalculationForLog);
          logger.info(`${period._id} Recalculation: ${recalculation.type} | ${recalculation.status}`);

          const setQuery = { calculationStatus, recalculation, calculationLog: period.calculationLog };

          Period.findByIdAndUpdate(period._id, { $set: setQuery })
            .then(() => {
              cb();
            })
            .catch((err) => {
              logger.error(`${period._id} Error updating period in create recalculation filter`, err);
              cb(err);
            });
        }
      }
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
      if (ingestionType === 'update') {
        const $or = [];
        $or.push({ contractId: { $in: period.recalculation.contractIds } });
        const salesFilter = { periodId: period._id, $or };
        logger.debug('clearPeriod: salesFilter'); logger.debug(JSON.stringify(salesFilter, null, 4));

        await new Promise((resolve, reject) => {
          bigQuery.deleteData(bigQuery.outputTable, salesFilter, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        logger.info(`DMP Ingestion: ${period._id} Successfully Cleared old sales data for update`);
        await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Updating Catalogue Data' } });
      } else {
        await Clear.clearPeriod(period, db, bigQuery);
        logger.info(`${period._id} Successfully Cleared old period data`);
        await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Updating Catalogue Data' } });
      }
    } catch (err) {
      logger.error(`${period._id} Error in clearing previous data`, err);
      await Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Clearing Previous Data' } });
      throw err;
    }
  },
  setStatementDesigns: (cb) => {
    if (ingestionType === 'update') {
      return cb();
    }
    logger.info(`${period._id} Setting Contract Statement Designs`);
    StatementDesigns.setContractStatementDesigns(period, client, (err) => {
      if (err) {
        logger.error(`${period._id} Error in Setting Contract Statement Designs`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Setting Contract Statement Designs' } })
          .then(() => {
            cb(err);
          })
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP setting contract statement designs`, updateErr);
            cb(err);
          });
      } else {
        cb();
      }
    });
  },
  getPeriodData: (cb) => {
    if (ingestionType === 'update') {
      return cb();
    }
    logger.info(`${period._id} Starting to Get Period Data`);
    GetPeriodData.getData(period, db, bigQuery, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored In Getting Period Data`);
        logger.error(`${period._id} ${err}`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored In Getting Period Data' } })
          .then(() => {
            cb(err);
          })
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP getting period data`, updateErr);
            cb(updateErr);
          });
      } else {
        logger.info(`${period._id} Sucessfully Completed Getting Period Data`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Period Files' } })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(`${period._id} Error updating period with error in DMP getting period data`, err);
            cb(err);
          });
      }
    });
  },
  createStatements: (cb) => {
    if (ingestionType === 'update') {
      return cb();
    }
    logger.info(`${period._id} Starting to Create Statements`);
    CreateStatements.create(period, db, client, (err, result) => {
      logger.info(`${period._id} Completed Creating Statements`);
      if (err) {
        logger.error(`${period._id} Errored in Creating Statements`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Creating Statements' } })
          .then(() => {
            cb(err);
          })
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP creating statements`, updateErr);
            cb(updateErr);
          });
      } else {
        logger.info(`${period._id} Sucessfully Created Statements`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Setting Statement Data' } })
          .then(() => {
            // return cb(new Error('KILL POST STATEMENT CREATION')); // on removal readd  || period.status === 'Errored' in calculation type determination
            cb();
          })
          .catch((err) => {
            logger.error(`${period._id} Error updating period with error in DMP setting statement data`, err);
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
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP getting statement data`, updateErr);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Received Statement Data`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files', completedCatalogueItems: 0 } })
          .then(() => {
            cb();
          })
          .catch((err) => {
            logger.error(`${period._id} Error updating period with error in DMP getting statement data`, err);
            cb(err);
          });
      }
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
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP creating transactions`, updateErr);
            cb(err);
          });
      } else {
        logger.info(`${period._id} Sucessfully Created Transactions`);
        // return cb(new Error('KILL POST Create Transactions')); // on removal readd  || period.status === 'Errored' in calculation type determination
        cb();
      }
    });
  },
  setSummaryStatementValues: (cb) => {
    if (ingestionType === 'update') {
      return cb();
    }
    logger.info(`${period._id} Starting to Set Summary Statement Values`);
    PeriodStatementData.setSummaryStatementHeadlineAndAnalysis(period, db, bigQuery, client, (err, result) => {
      if (err) {
        logger.error(`${period._id} Errored in Setting Summary Statement Values`);
        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Errored in Summary Statement Values' } })
          .then(() => {
            cb(err);
          })
          .catch((updateErr) => {
            logger.error(`${period._id} Error updating period with error in DMP setting summary statement values`, updateErr);
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

    LogoFiles.downloadLogos(client, () => {
      PeriodStatementCreation.createStatementFiles(period, db, bigQuery, client, (err, result) => {
        if (err) {
          logger.error(`${period._id} Creating Statement Files Errored`);
          // Project Bongo: not sure if this is the equivalent refactor below
          return Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Statement Files Errored' } })
            .then(() => {
              cb(err);
            })
            .catch((updateErr) => {
              logger.error(`${period._id} Error updating period with error in DMP creating statement files`, updateErr);
              cb(err);
            });
        }

        logger.info(`${period._id} Successfully Created Statement Files`);

        Period.findByIdAndUpdate(period._id, { $set: { calculationStatus: 'Creating Zip of All Statements' } })
          .catch((err) => {
            logger.error(`${period._id} Error updating period with error in DMP creating zip of all statements`, err);
          })
          .finally(() => {
            if (modifiedContracts.length > 0) {
              Contract.updateMany({ clientId: period.clientId, _id: { $in: modifiedContracts } }, { $set: { summaryContractTotals: true } })
                .then(() => {
                  logger.info(`${period._id} Reverted summaryContractTotals for modified contracts`);
                  cb();
                })
                .catch((err) => {
                  logger.error(`${period._id} Error reverting summaryContractTotals: ${err.message}`);
                  return cb(err);
                });
            } else {
              cb();
            }
          });
      });
    });
  },

  clearLogoFiles: (cb) => {
    LogoFiles.clearLogoFiles(client, cb);
  },
  complete: (mongoClient, modComparisonTime, calculationErr, callback) => {
    mongoClient.close();
    // Calculation Notes are stored in the calculation process but not present on the period object here so reload
    // Project Bongo: This seems a bit of a janky refactor but should be equivalent
    let periodLoadErr;
    let currentCalculationNotes;
    Period.findById(period._id, 'calculationNotes')
      .then((foundCurrentCalculationNotes) => {
        currentCalculationNotes = foundCurrentCalculationNotes;
      })
      .catch((err) => {
        periodLoadErr = err;
        logger.error(`${period._id} Error loading current calculation notes`, err);
      })
      .finally(async () => {
        const processEndTime = new Date();
        const setQuery = { status: 'Complete', forceFull: false, recalculation: null, calculationError: null, processEndTime };
        const { calculationLog } = period;
        const recalculation = calculationLog[calculationLog.length - 1] || {};
        recalculation.endTime = processEndTime;
        // Only if we have succesfully reloaded the period can we set recalculation.calculationNotes
        if (!periodLoadErr) {
          recalculation.calculationNotes = currentCalculationNotes.calculationNotes;
        }
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
            logger.error(`${period._id} Error updating period in DMP controller complete`, err);
            callback(err);
          });
      });
  },
};

async function dmpClearTransactions() {
  logger.info(`${period._id} Clearing Transactions`);

  const contracts = await Contract.find({ clientId: period.clientId, accountingPeriod: period.accountingPeriodType }, '_id').lean();
  const contractIds = contracts.map((c) => c._id);

  const allTargetIds = period.recalculation.contractIds || contractIds;

  const filter = {
    clientId: period.clientId,
    contractId: { $in: allTargetIds },
    date: { $gte: period.startDate, $lte: period.endDate },
    userCreated: false,
  };

  const res = await Transaction.deleteMany(filter);
  logger.info(`${period._id} Deleted ${res.deletedCount} transactions`);
}
async function dmpIngestion() {
  try {
    logger.info(`${period._id} Starting DMP Period Ingest`);

    await Period.findByIdAndUpdate(period._id, {
      $set: { calculationStatus: 'DMP Period Ingest' },
    });

    if (!extractDate) {
      logger.info(`${period._id} No DMP extract note found, skipping ingest step`);
      return;
    }

    await processDmpPeriodIngest(extractDate, extractFolder, period._id.toString(), fullReingest, client._id.toString());

    await Period.findByIdAndUpdate(period._id, {
      $set: { calculationStatus: 'DMP Period Ingest Completed' },
    });
  } catch (err) {
    logger.error(`${period._id} Error in DMP Period Ingest`, err);

    await Period.findByIdAndUpdate(period._id, {
      $set: { calculationStatus: 'DMP Period Ingest Failed' },
    });

    throw err;
  }
}

async function createDmpCrossContractSummaryStatments() {
  logger.info('DMP Period: Starting DMP cross contract summary statements...');

  const baseQuery = {
    clientId: period.clientId,
    accountingPeriod: period.accountingPeriodType,
    crossContracts: { $elemMatch: { process: 'Add To' } },
  };

  // If this is an update, only look for contracts that receive data from the updated contracts
  if (ingestionType === 'update' && period.recalculation?.contractIds?.length > 0) {
    baseQuery._id = { $in: period.recalculation.contractIds };
    logger.info(`DMP Period: Update mode - filtering for ${period.recalculation.contractIds.length} updated contracts`);
  }

  const crossLinkedContracts = await Contract.find(baseQuery).lean();

  const targetContractIds = [];
  crossLinkedContracts.forEach((contract) => {
    contract.crossContracts.forEach((cross) => {
      if (cross.process === 'Add To' && !targetContractIds.includes(cross.contractId)) {
        targetContractIds.push(cross.contractId);
      }
    });
  });

  logger.info(`DMP Period: Found ${targetContractIds.length} cross-linked contracts to process`);

  if (targetContractIds.length === 0) {
    logger.info('DMP Period: No cross-contract statements to process');
    return;
  }

  const statements = await Statement.find({
    clientId: period.clientId,
    periodId: period._id,
    contractId: { $in: targetContractIds },
  }).lean();

  await async.eachLimit(statements, 10, async (statement) => {
    try {
      // Add temporary flag for this specific invocation
      statement._isDmpCrossContractUpdate = true;
      await new Promise((resolve, reject) => {
        CreateStatementFiles.createSalesCsv(statement, bigQuery, client, null, (err) => {
          if (err) return reject(err);
          CreateStatementFiles.createZipOfFiles(statement, (createZipErr) => {
            if (createZipErr) return reject(createZipErr);
            resolve();
          });
        });
      });
    } catch (err) {
      logger.error(`DMP Period: Error processing statement ${statement._id}: ${err.message}`);
      throw err;
    }
  });

  logger.info('DMP Period: All cross contract statements completed');
}

async function lookupContractIdsByForeign(foreignIds) {
  try {
    logger.info(`DMP ingestion: Looking up contracts by foreign IDs: ${foreignIds}`);

    const contracts = await Contract.find(
      { clientId: period.clientId, foreignId: { $in: foreignIds } },
      '_id summaryContractTotals',
    ).lean();

    logger.info(`DMP ingestion: Contracts found: ${contracts.length}`);

    const contractIds = contracts.map((contract) => contract._id.toString());

    modifiedContracts = contracts
      .filter((contract) => contract.summaryContractTotals === true)
      .map((contract) => contract._id);

    logger.info(`DMP ingestion: Modified Contracts: ${modifiedContracts.length}`);

    await Contract.updateMany({ _id: { $in: modifiedContracts } }, { $set: { summaryContractTotals: false } });

    return contractIds;
  } catch (err) {
    logger.error('Error looking up contract ids by foreign:', err);
    throw err;
  }
}

module.exports = Controller;
