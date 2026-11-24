require('dotenv').config();
require('./models/db');
const moment = require('moment');
const axios = require('axios').default;
const { logger } = require('@curveroyaltysystems/logger');
const async = require('async');
const { promisify } = require('@curveroyaltysystems/platform-shared-utils/libs/promisify');
const Period = require('./models/period');
const AccountingPeriod = require('./models/accountingPeriod');
const Statement = require('./models/statement');
const SalesFile = require('./models/salesFile');
const Task = require('./models/task');
const IswcDelivery = require('./models/iswcDelivery');
const Client = require('./models/client');
const CwrAcknowledgement = require('./models/cwrAcknowledgement');
const SQS = require('./libs/sqs');
const PeriodController = require('./libs/calculation/periodController');
const DmpPeriodController = require('./libs/dmpPeriod/dmpPeriodController');
const DmpStatementController = require('./libs/dmpPeriod/dmpStatementController');
const StatementController = require('./libs/calculation/statementController');
const AllSalesCsv = require('./libs/calculation/period/allSalesCsv');
const AllCostsCsv = require('./libs/calculation/period/allCostsCsv');
const FugaCatalogueSync = require('./libs/fuga/fugaCatalogueSync');
const Batch = require('./libs/calculation/period/batch');
const CreatePeriodZip = require('./libs/calculation/period/createZip');
const AppSettings = require('./models/appSettings');
const { runFlushContractToWorksFromIpChain } = require('./libs/support/supportScripts/suite/flushContractsToWorksFromIPChain');
const { supportScriptModule } = require('./libs/support/supportScripts/index');
const SalesFileController = require('./libs/salesIngestion/salesFileController');
const Reports = require('./libs/reports');
const CwrAcknowledgementIngest = require('./libs/cwr/cwrAcknowledgementIngest');
const BatchTaskSupportScripts = require('./libs/support/batchTaskSupportScripts');
const SendEmail = require('./libs/sendEmail');
const FixedReportController = require('./libs/fixedReports/fixedReportsController');
const IswcDeliveryController = require('./controllers/iswcDelivery');
const IswcAcknowledgementController = require('./controllers/iswcAcknowledgement');
const Platoon = require('./libs/platoon');
const Platform = require('./libs/platform');
const FugaYoutubeIngest = require('./libs/splitsYoutubeIngestion/ingestFile');
const fugaSalesIngestion = require('./libs/fuga/fugaSalesIngestion');
const fugaYouTubeCatalogSync = require('./libs/fuga/fugaYouTubeCatalogSync');
const fugaPublishStatements = require('./libs/fuga/fugaPublishStatements');
const DeleteClient = require('./libs/support/stagingDeletion/deleteClients');
const CopyClient = require('./libs/support/copyClient');
const PeriodFiles = require('./libs/calculation/period/periodFiles');
const SongList = require('./libs/songlist');
const FindDuplicates = require('./libs/catalogue/findDuplicates');
const CwrExport = require('./libs/cwr/export');
const { downloadStatementFiles } = require('./libs/statements/downloadStatementFiles/downloadStatementFiles');
const WorksExport = require('./libs/works/export');
const UnmappedExport = require('./libs/unmapped/unmapped');

let busy = false;
let currentTaskId;

/**
 * Get the Task ID of the current Fargate Task
 * @returns {<Promise<String>>}
 */
const getFargateTaskId = async () => {
  // Fargate injects this Env Var into the container
  const { ECS_CONTAINER_METADATA_URI_V4 } = process.env;
  if (!ECS_CONTAINER_METADATA_URI_V4) return;

  const response = await axios.get(`${ECS_CONTAINER_METADATA_URI_V4}/task`).catch(logger.error);
  return response?.data?.TaskARN;
};

// Run every 2.5 seconds, inside a new logger context
setInterval(getTaskInContext, 2500);

/**
 * Create a new logging context and fetch the task
 */
async function getTaskInContext() {
  await logger.runInContext({}, getTask);
}

async function getTask() {
  const settings = await AppSettings.findOne({}, 'state').catch(logger.error);
  logger.info('Task Manager Running');
  if (currentTaskId) { await Task.findByIdAndUpdate(currentTaskId, { $set: { healthCheck: moment.utc().format() } }); }
  if (!busy && !settings?.state?.deployment && !settings?.state?.scaleDown) {
    logger.debug('Getting Task');
    // Get the taskArn of the current Fargate task
    const taskArn = await getFargateTaskId();
    busy = true;
    async.waterfall([
      function (cb) {
        // Check queue 1
        // Test 2
        logger.debug('Getting from Queue 1');
        SQS.getMessage(1, cb);
      },
      function (message, cb) {
        // Check if message returned from queue 1, continue if so
        if (message) {
          logger.debug(message);
          cb(null, message);
        } else {
          // Check queue 2
          logger.debug('Getting from Queue 2');
          SQS.getMessage(2, cb);
        }
      },
      function (message, cb) {
        if (message) {
          logger.info('SQS Message received: ', message);
          // Update Task to In Progress
          const update = { status: 'In Progress' };
          if (taskArn) { update.taskArn = taskArn; }
          // Get Task from API
          Task.findByIdAndUpdate(message._id, { $set: update }).then(async (task) => {
            if (task) {
              currentTaskId = task._id;
              await Task.findByIdAndUpdate(currentTaskId, { $set: { healthCheck: moment.utc().format() } }).catch(logger.error);
              logger.info(`Task: ${task}`);
              if (task.name === 'Process Period') {
                busy = true;
                processPeriod(task._id, task.value.periodId);
              } else if (task.name === 'Batch Worker') {
                busy = true;
                processPeriodBatch(task);
              } else if (task.name === 'Process Statement') {
                busy = true;
                processStatement(task._id, task.value.statementId);
              } else if (task.name === 'Process Accounting Period') {
                busy = true;
                processAccountingPeriod(task._id, task.value.accountingPeriodId);
              } else if (task.name === 'ISWC Delivery') {
                busy = true;
                iswcDelivery(task._id, task.value.iswcDeliveryId, task.value.userId);
              } else if (task.name === 'ISWC Acknowledgment') {
                busy = true;
                iswcAcknowledgment(task._id, task.value.fileName, task.value.serverId, task.value.clientId);
              } else if (task.name === 'Sales File Ingest') {
                busy = true;
                salesFileIngest(task, task.value.salesFileId, task.value.user)
                  .catch((e) => completeErrored(task._id, e));
              } else if (task.name === 'Sales File Revalidate') {
                busy = true;
                salesFileRevalidate(task._id, task.value.salesFileId, task.value.user);
              } else if (task.name === 'Report Creation') {
                busy = true;
                reportCreation(task._id, task.email, task.value.reportId);
              } else if (task.name === 'Period Statements Zip') {
                busy = true;
                periodStatementsZip(task._id, task.email, task.value.periodId, task.value.file);
              } else if (task.name === 'Period Sales CSV') {
                busy = true;
                periodSalesCsv(task._id, task.email, task.value.periodId);
              } else if (task.name === 'Period Costs CSV') {
                busy = true;
                periodCostsCsv(task._id, task.email, task.value.periodId);
              } else if (task.name === 'Flushing Contracts to Works') {
                // Client facing script
                busy = true;
                flushContractsToWorks(task._id, task.email, task.value.clientId, task.value.filter);
              } else if (task.name === 'Copy Client') {
                busy = true;
                runCopyClient(task._id, task.value.user, task.clientId, task.value.includeTables, task.value.includeSalesFiles, task.value.includeArchived, task.value.includePeriodAndStatementFiles);
              } else if (task.name === 'CWR Acknowledgement File Ingest') {
                busy = true;
                importAcknowledgementFile(task._id, task.email, task.value.cwrAcknowledgementId);
              } else if (task.type === 'Support Script') {
                busy = true;
                runSupportScript(task._id, task.value.script, task.value.scriptParams, task.value.user);
              } else if (task.name === 'Fuga Cat Sync') {
                busy = true;
                runSyncClient(task._id, task.value.syncClientId, task.value?.userEmail);
              } else if (task.name === 'Process Batch Task By ID') {
                runProcessBatchTaskById(task);
              } else if (task.name === 'Fixed Report') {
                runFixedReport(task);
              } else if (task.name === 'Platoon Generate Files') {
                busy = true;
                runPlatoonGenerateFiles(task);
              } else if (task.name === 'Platoon Deliver Files') {
                busy = true;
                runPlatoonDeliverFiles(task);
              } else if (task.name === 'Sales File Complete Platform Ingestion') {
                busy = true;
                runPlatformSalesIngestionCompletion(task)
                  .catch((e) => completeErrored(task._id, e));
              } else if (task.name === 'Fuga Youtube Ingestion') {
                busy = true;
                runFugaYoutubeIngestion(task);
              } else if (task.name === 'Fuga Youtube Catalog Sync') {
                busy = true;
                runFugaYouTubeCatalogSync(task);
              } else if (task.name === 'Fuga Publish Statements') {
                busy = true;
                runFugaPublishStatements(task);
              } else if (task.name === 'Staging Delete Client' && process.env?.CLIENT_DELETION_ENV === 'staging') {
                busy = true;
                stagingDeleteClients(task);
              } else if (task.name === 'RASA Statement') {
                busy = true;
                runFugaSalesFileIngestion(task)
                  .catch((e) => completeErrored(task._id, e));
              } else if (['Unreported Sales', 'Unreported Costs'].includes(task.name)) {
                busy = true;
                createUnreportedFiles(task);
              } else if (task.name === 'Songlist Export') {
                busy = true;
                exportSonglist(task);
              } else if (task.name === 'Find Catalogue Duplicates') {
                busy = true;
                runFindDuplicateCatalogue(task);
              } else if (task.name === 'CWR Delivery Export') {
                exportCwrDelivery(task);
                busy = true;
              } else if (task.name === 'Download Selected Statements Zip') {
                busy = true;
                runDownloadSelectedStatements(task);
              } else if (task.name === 'Works Export') {
                busy = true;
                runWorksExport(task);
              } else if (task.name === 'Export Unmapped CSV') {
                busy = true;
                runExportUnmappedCSV(task);
              } else {
                logger.error('Unknown task type:', task.name);
                logger.error(task);
              }
            }
          })
            .catch((err) => {
              logger.error(err);
              busy = false;
              currentTaskId = null;
              cb();
            });
        } else {
          logger.debug('No Message');
          busy = false;
          currentTaskId = null;
          cb();
        }
      },
    ], (err) => {
      if (err) {
        logger.error(err);
      }
    });
  }
}

function processPeriod(taskId, periodId) {
  Period.findById(periodId)
    .then((period) => {
      logger.info(`Processing Period: ${period}`);
      if (period) {
        Client.findById(period.clientId)
          .then((client) => {
            if (client?.features?.dmp) {
              logger.info(`${period._id} Using DMP Period Controller for client ${client.name} (${client._id})`);
              DmpPeriodController.calculate(period, (calcErr) => {
                if (calcErr) {
                  completeErrored(taskId, calcErr);
                } else {
                  completeTask(taskId);
                }
              });
            } else {
              PeriodController.calculate(period, (calcErr) => {
                if (calcErr) {
                  completeErrored(taskId, calcErr);
                } else {
                  completeTask(taskId);
                }
              });
            }
          })
          .catch((clientErr) => {
            logger.error(clientErr);
            completeErrored(taskId, clientErr);
          });
      } else {
        busy = false;
        currentTaskId = null;
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

function processAccountingPeriod(taskId, accountingPeriodId) {
  AccountingPeriod.findById(accountingPeriodId)
    .then((accountingPeriod) => {
      logger.info(`Processing Accounting Period: ${accountingPeriod}`);
      if (accountingPeriod) {
        accountingPeriod.calculate((err) => {
          if (err) {
            completeErrored(taskId, err);
          } else {
            completeTask(taskId);
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Accounting Period found with ID ${accountingPeriodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function iswcDelivery(taskId, iswcDeliveryId, userId) {
  const iswcDelivery = await IswcDelivery.findById(iswcDeliveryId);
  if (iswcDelivery) {
    logger.info(`Delivering ISWC Delivery: ${iswcDeliveryId}`);
    try {
      await IswcDeliveryController.deliver({ iswcDeliveryId, userId });
      completeTask(taskId);
    } catch (err) {
      completeErrored(taskId, err);
    }
  } else {
    busy = false;
    currentTaskId = null;
    logger.error(`No ISWC Delivery found with ID ${iswcDeliveryId}`);
  }
}

async function iswcAcknowledgment(taskId, fileName, serverId, clientId) {
  if (fileName) {
    logger.info(`Digesting ISWC Acknowledgment: ${fileName}`);
    try {
      await IswcAcknowledgementController.digestAckFile({ fileName, serverId, clientId });
      completeTask(taskId);
    } catch (err) {
      completeErrored(taskId, err);
    }
  } else {
    busy = false;
    currentTaskId = null;
    logger.error('No ISWC Acknowledgment file name');
  }
}

function processPeriodBatch(task) {
  Period.findById(task.value.periodId)
    .then((period) => {
      logger.info(`Processing Batch for Period: ${period}`);
      if (period) {
        Batch.runBatches(task, period, (err) => {
          if (err) {
            completeErrored(task._id, err);
          } else {
            completeTask(task._id);
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Period found with ID ${task.value.periodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

function processStatement(taskId, statementId) {
  Statement.findById(statementId)
    .then((statement) => {
      logger.info(`Processing Statement: ${statement}`);
      if (statement) {
        Client.findById(statement.clientId)
          .then((client) => {
            if (client?.features?.dmp) {
              logger.info(`Using DMP Statement recreation for client ${client.name} (${client._id})`);
              DmpStatementController.recreateSingleStatement(statement, client, (err) => {
                if (err) {
                  completeErrored(taskId, err);
                } else {
                  completeTask(taskId);
                }
              });
            } else {
              StatementController.calculate(statement, (err) => {
                if (err) {
                  completeErrored(taskId, err);
                } else {
                  completeTask(taskId);
                }
              });
            }
          })
          .catch((clientErr) => {
            logger.error(clientErr);
            completeErrored(taskId, clientErr);
          });
      } else {
        busy = false;
        currentTaskId = null;
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

/**
 * Ingest a Sales file.
 * @param {Task} task The Task object in Mongo
 * @param {string} salesFileId The ID of the Sales File to ingest
 * @param {string} curveUserId The User ID of the Curve user running the ingestion
 * @return {Promise<void>}
 */
async function salesFileIngest(task, salesFileId, curveUserId) {
  logger.info('Running ingestion');

  const salesFile = await SalesFile.findById(salesFileId).exec();
  if (!salesFile) {
    throw new Error(`Failed to ingest sales file - No Sales File found with ID ${salesFileId}`);
  }

  logger.info(`Found sales file: ${salesFileId}`);

  const client = await Client.findById(salesFile.clientId).exec();
  if (client?.features?.platformSalesIngestion) {
    logger.info(`Found platform ingestion client: ${salesFile.clientId}`);
    logger.info(`Ingesting Sales File on Platform: ${salesFileId}: ${salesFile}`);

    // Update the task to mark it has having run on the platform (for traceability)
    task.value.runningOn = 'Platform';
    await task.save();

    await Platform.ingestSalesFile(salesFile, task._id, curveUserId);

    // Don't complete the task here - This will be done in the Sales File Complete Platform Ingestion task.
    // Remove the Task ARN from the Task, to indicate this task is no longer running on the processor.
    task.taskArn = null;
    await task.save();
    busy = false;
    currentTaskId = null;
  } else {
    logger.info(`Ingesting Sales File: ${salesFileId}: ${salesFile}`);
    await promisify(SalesFileController.ingest, salesFile, curveUserId);
    completeTask(task._id);
  }
}

function salesFileRevalidate(taskId, salesFileId, curveUserId) {
  SalesFile.findById(salesFileId)
    .then((salesFile) => {
      logger.info(`Revalidating Sales File: ${salesFile}`);
      if (salesFile) {
        SalesFileController.runRevalidation(salesFile, curveUserId, (err) => {
          if (err) {
            completeErrored(taskId, err);
          } else {
            completeTask(taskId);
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Sales File found with ID ${salesFileId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function reportCreation(taskId, email, reportId) {
  logger.info(`Creating Report: ${reportId}`);
  try {
    await Reports.createReport({ reportId, email });
    completeTask(taskId);
  } catch (err) {
    completeErrored(taskId, err);
  }
}

function periodStatementsZip(taskId, email, periodId, file) {
  Period.findById(periodId)
    .then((period) => {
      if (period) {
        logger.info(`Creating Statements Zip for Period: ${period}`);
        CreatePeriodZip.createStatementZip(period, email, file, (err) => {
          if (err) {
            completeErrored(taskId, err);
          } else {
            completeTask(taskId);
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Period found with ID ${periodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function periodSalesCsv(taskId, email, periodId) {
  try {
    await AllSalesCsv.create(periodId, email);
    completeTask(taskId);
  } catch (err) {
    logger.error(err);
    completeErrored(taskId, err);
  }
}

function periodCostsCsv(taskId, email, periodId) {
  Period.findById(periodId)
    .then((period) => {
      logger.info(`Processing Period: ${period}`);
      if (period) {
        AllCostsCsv.create(period, email, (err) => {
          if (err) {
            completeErrored(taskId, err);
          } else {
            completeTask(taskId);
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Period found with ID ${periodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function flushContractsToWorks(taskId, email, clientId, filter) {
  try {
    const client = await Client.findById(clientId);
    if (client) {
      runFlushContractToWorksFromIpChain(taskId, email, clientId, filter, (flushErr) => {
        if (flushErr) {
          completeErrored(taskId, flushErr);
        } else {
          completeTask(taskId);
        }
      });
    }
  } catch (err) {
    logger.error(err);
  }
}

function runSupportScript(taskId, script, scriptParams, email) {
  supportScriptModule(taskId, script, scriptParams, email, (err) => {
    if (err) {
      completeErrored(taskId, err);
      logger.error(err);
    } else {
      completeTask(taskId);
    }
  });
}

// Come back to
function runCopyClient(taskId, email, clientId, includeTables, includeSales, includeArchived, includePeriodAndStatementFiles) {
  const options = { includeTables, includeSales, includeArchived, includePeriodAndStatementFiles };
  CopyClient.run({ taskId, email, clientId, options }).then(() => {
    completeTask(taskId);
    logger.info(`${clientId} succesfully copied to Staging DB`);
  }).catch((err) => {
    logger.error(err);
    completeErrored(taskId, err);
  });
}

function importAcknowledgementFile(taskId, email, cwrAcknowledgementId) {
  CwrAcknowledgement.findById(cwrAcknowledgementId)
    .populate('deliveryPartnerId')
    .then((cwrAcknowledgement) => {
      if (cwrAcknowledgement) {
        cwrAcknowledgement.status = 'In Progress';
        cwrAcknowledgement.save()
          .then(() => {
            const cwrAcknowledgementIngest = new CwrAcknowledgementIngest();
            const modifiedEmails = email.includes(',') ? email.split(',') : email;
            cwrAcknowledgementIngest.ingestFile(cwrAcknowledgement, modifiedEmails, (err) => {
              if (err) {
                logger.error(err);
                completeErrored(taskId, err);
              } else {
                completeTask(taskId);
                logger.info(`Succesfully ingested cwrAcknowledgement file ${cwrAcknowledgementId}`);
              }
            });
          })
          .catch((err) => {
            logger.error(err);
            completeErrored(taskId, err);
          });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No cwrAcknowledgement  found with ID ${cwrAcknowledgementId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function runSyncClient(taskId, syncClientId, userEmail) {
  if (syncClientId) {
    logger.info(`Processing syncClientId: ${syncClientId}`);
    try {
      await FugaCatalogueSync.syncClient({ clientId: syncClientId, userEmail });
      completeTask(taskId);
    } catch (err) {
      completeErrored(taskId, err);
    }
  } else {
    busy = false;
    currentTaskId = null;
    logger.error(`No syncClientId found with task ID ${taskId}`);
  }
}

async function runProcessBatchTaskById(task) {
  BatchTaskSupportScripts.processBatchTaskById(task.value.batchTaskId).then(async () => {
    await sendCompleteEmail({ script: task.name, email: task.value.email });
    completeTask(task._id);
  }).catch(async (err) => {
    await sendErroredEmail({ script: task.name, email: task.value.email });
    completeErrored(task._id, err);
  });
}

function runFixedReport(task) {
  const { reportId } = task.value;

  FixedReportController.runFixedReport({ reportId, email: task.email }).then(() => {
    completeTask(task._id);
  }).catch((err) => {
    completeErrored(task._id, err);
  });
}

function completeTask(taskId) {
  busy = false;
  currentTaskId = null;
  // set progressStatus to null as progression is complete
  Task.findByIdAndUpdate(taskId, { $set: { progressStatus: null, status: 'Complete' } })
    .then((task) => {
      logger.info('Completed Task: ', task);
    })
    .catch((err) => {
      logger.error(err);
    });
}

function completeErrored(taskId, error) {
  busy = false;
  currentTaskId = null;
  // leave progressStatus in the stae it was in when the error occured
  Task.findByIdAndUpdate(taskId, { $set: { status: 'Errored', error } })
    .then((task) => {
      logger.info('Completed Task: ', task);
    })
    .catch((err) => {
      // There seems to be some strange logging of errors here, will just log both
      logger.error(`Task with id ${taskId} failed with error: ${error}`);
      logger.error(err);
    });
}

function sendCompleteEmail({ script, email }) {
  return new Promise((resolve, reject) => {
    SendEmail.scriptCompleteEmail(script, email, (err) => {
      if (err) { logger.error(err); }
      resolve();
    });
  });
}

function sendErroredEmail({ script, email }) {
  return new Promise((resolve, reject) => {
    SendEmail.scriptErrorEmail(script, email, (err) => {
      if (err) { logger.error(err); }
      resolve();
    });
  });
}

function runPlatoonGenerateFiles(task) {
  Period.findById(task.value.periodId)
    .then((period) => {
      logger.info(`Platoon: Generating Files for Period: ${task.value.periodId}`);
      if (period) {
        Platoon.downloadSAPOutput(period, task.value.user, (err) => {
          if (err) {
            completeErrored(task._id.toString(), err);
          } else {
            completeTask(task._id.toString());
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Period found with ID ${task.value.periodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

function runPlatoonDeliverFiles(task) {
  Period.findById(task.value.periodId)
    .then((period) => {
      logger.info(`Platoon: Delivering Files for Period: ${task.value.periodId}`);
      if (period) {
        Platoon.encodeAndSftpOnly(period, task.value.user, (err) => {
          if (err) {
            completeErrored(task._id.toString(), err);
          } else {
            completeTask(task._id.toString());
          }
        });
      } else {
        busy = false;
        currentTaskId = null;
        logger.error(`No Period found with ID ${task.value.periodId}`);
      }
    })
    .catch((err) => {
      logger.error(err);
      busy = false;
      currentTaskId = null;
    });
}

async function createUnreportedFiles(task) {
  try {
    if (!task?.value?.periodId) throw new Error(`No periodId found in task ${task._id.toString()}`);

    await PeriodFiles.get({
      periodId: task.value.periodId,
      email: task.value.email,
      type: task.name,
      excludedSalesFiles: task.value.excludedSalesFiles,
    });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function runPlatformSalesIngestionCompletion(task) {
  const salesFile = await SalesFile.findById(task.value.salesFileId).exec();

  if (!salesFile) {
    throw new Error(`Failed to complete Platform Sales Ingestion Process - No SalesFile found with ID ${task.value.salesFileId}`);
  }

  logger.info(`Platform: Completing Sales Ingestion Process: ${task.value.salesFileId}`);

  await Platform.completeIngestSalesFileProcess(salesFile, task.value.platformTaskId, task.value.user);
  completeTask(task._id.toString());
}

async function runFugaYoutubeIngestion(task) {
  await FugaYoutubeIngest(task.value.s3Key, task.value.clientId);
  completeTask(task._id.toString());
}

async function stagingDeleteClients(task) {
  const { clientIds } = task.value;

  if (!clientIds?.length) {
    const error = new Error(`Failed to complete Staging Delete Client Process - No clients found with the ids ${task.value.clientIds}`);
    return completeErrored(task._id.toString(), error);
  }

  try {
    await DeleteClient.run(clientIds);
    completeTask(task._id.toString());
  } catch (error) {
    completeErrored(task._id.toString(), error);
  }
}

async function runFugaSalesFileIngestion(task) {
  try {
    await fugaSalesIngestion.ingestFile({ message: task.value });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function runFugaYouTubeCatalogSync(task) {
  try {
    await fugaYouTubeCatalogSync(task.value);
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function runFugaPublishStatements(task) {
  try {
    await fugaPublishStatements.publishStatements({
      periodId: task.value.periodId,
      email: task.email,
    });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function exportSonglist(task) {
  const { deliveryId } = task.value;
  try {
    await SongList.createSongList({ deliveryId, email: task.email });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function runFindDuplicateCatalogue(task) {
  try {
    logger.addToContext({
      taskId: task._id.toString(),
      taskName: 'Find Catalogue Duplicates',
      clientId: task.value.clientId,
      catalogueType: task.value.catalogueType,
      email: task.email,
    });
    await FindDuplicates.findDuplicates({ clientId: task.value.clientId, type: task.value.catalogueType, email: task.email });
    completeTask(task._id.toString());
  } catch (error) {
    completeErrored(task._id.toString(), error);
  }
}

async function exportCwrDelivery(task) {
  const { deliveryId, markWorksAsDelivered } = task.value;
  try {
    await CwrExport.exportCwrDelivery({ deliveryId, markWorksAsDelivered, email: task.email });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

/**
 * Run Download Selected Statements task
 *
 * @description
 * Given a list of statement IDs, this task will download the statements and create a zip file.
 * The zip file will be uploaded to S3 and a public link will be generated.
 * A notification will be sent to the user with the link to the zip file.
 *
 * @param {Object} task - The task object
 *
 * @returns {Promise<void>}
 */
async function runDownloadSelectedStatements(task) {
  try {
    await downloadStatementFiles(task.value.ids, task.clientName, task.email);
    completeTask(task._id.toString());
  } catch (error) {
    completeErrored(task._id.toString(), error);
  }
}

async function runWorksExport(task) {
  try {
    await WorksExport.exportWorks({ clientId: task.value.clientId, filter: task.value.filter, email: task.email });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}

async function runExportUnmappedCSV(task) {
  try {
    await UnmappedExport.exportUnmapped({
      clientId: task.clientId,
      type: task.value.type,
      email: task.email,
      selector: task.value,
    });
    completeTask(task._id.toString());
  } catch (err) {
    completeErrored(task._id.toString(), err);
  }
}
