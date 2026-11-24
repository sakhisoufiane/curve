const { logger } = require('@curveroyaltysystems/logger');
// Models
const Client = require('../models/client');
const Period = require('../models/period');
const SalesFile = require('../models/salesFile');
const Statement = require('../models/statement');
const IswcDelivery = require('../models/iswcDelivery');
const AccountingPeriod = require('../models/accountingPeriod');
// Libs
const platoon = require('../libs/platoon');
const Reports = require('../libs/reports');
const Songlist = require('../libs/songlist');
const Platform = require('../libs/platform');
const sendEmail = require('../libs/sendEmail');
const WorksExport = require('../libs/works/export');
const CopyClient = require('../libs/support/copyClient');
const Batch = require('../libs/calculation/period/batch');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const FugaCatalogueSync = require('../libs/fuga/fugaCatalogueSync');
const FindDuplicates = require('../libs/catalogue/findDuplicates');
const AllSalesCsv = require('../libs/calculation/period/allSalesCsv');
const IswcDeliveryController = require('../controllers/iswcDelivery');
const AllCostsCsv = require('../libs/calculation/period/allCostsCsv');
const fugaSalesIngestion = require('../libs/fuga/fugaSalesIngestion');
const PeriodFiles = require('../libs/calculation/period/periodFiles');
const CreatePeriodZip = require('../libs/calculation/period/createZip');
const PeriodController = require('../libs/calculation/periodController');
const { supportScriptModule } = require('../libs/support/supportScripts');
const fugaPublishStatements = require('../libs/fuga/fugaPublishStatements');
const DmpPeriodController = require('../libs/dmpPeriod/dmpPeriodController');
const FugaYouTubeCatalogSync = require('../libs/fuga/fugaYouTubeCatalogSync');
const DeleteClient = require('../libs/support/stagingDeletion/deleteClients');
const FugaYoutubeIngest = require('../libs/splitsYoutubeIngestion/ingestFile');
const StatementController = require('../libs/calculation/statementController');
const CwrAcknowledgementIngest = require('../libs/cwr/cwrAcknowledgementIngest');
const CwrExport = require('../libs/cwr/export');
const CwrImport = require('../libs/cwr/import');
const DmpStatementController = require('../libs/dmpPeriod/dmpStatementController');
const SalesFileController = require('../libs/salesIngestion/salesFileController');
const BatchTaskSupportScripts = require('../libs/support/batchTaskSupportScripts');
const IswcAcknowledgementController = require('../controllers/iswcAcknowledgement');
const FixedReportController = require('../libs/fixedReports/fixedReportsController');
const { downloadStatementFiles } = require('../libs/statements/downloadStatementFiles/downloadStatementFiles');
const { runFlushContractToWorksFromIpChain } = require('../libs/support/supportScripts/suite/flushContractsToWorksFromIPChain');
const UnmappedExport = require('../libs/unmapped/unmapped');

/**
 * Process a Statement
 *
 * @param {import('../models/task')} task - Task Document
 * @returns {Promise<void>}
 * @throws {Error} If the statement is not found
 * @throws {Error} If the client is not found
 * @throws {Error} If the statement fails to be recalculated
 * @throws {Error} If the statement fails to be calculated
 * @throws {Error} If the statement fails to be recalculated
 */
const processStatement = async (task) => {
  const { statementId } = task.value;

  const statement = await Statement.findById(statementId);
  if (!statement) throw new Error(`Statement ${statementId} not found`);

  const client = await Client.findById(statement.clientId);
  if (!client) throw new Error(`Client ${statement.clientId} not found`);

  if (client.features?.dmp) {
    return new Promise((resolve, reject) => {
      DmpStatementController.recreateSingleStatement(statement, client, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  await new Promise((resolve, reject) => {
    StatementController.calculate(statement, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Ingest a Sales File
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} If the sales file is not found
 * @throws {Error} If the client is not found
 * @throws {Error} If the sales file fails to be ingested
 * @throws {Error} If the sales file fails to be ingested on the platform
 * @throws {Error} If the sales file fails to be ingested on the processor
 * @throws {Error} If the sales file fails to be ingested on the processor
 */
const salesFileIngest = async (task) => {
  const { salesFileId, user } = task.value;

  logger.info('Running ingestion');

  const salesFile = await SalesFile.findById(salesFileId);
  if (!salesFile) {
    throw new Error(`Failed to ingest sales file - No Sales File found with ID ${salesFileId}`);
  }

  logger.info(`Found sales file: ${salesFileId}`);

  if (task.value.runningOn === 'Platform') {
    logger.info(`Found platform ingestion client: ${salesFile.clientId}`);
    logger.info(`Ingesting Sales File on Platform: ${salesFileId}: ${salesFile}`);

    await Platform.ingestSalesFile(salesFile, task._id, user);

    // Don't complete the task here - This will be done in the Sales File Complete Platform Ingestion task.
    // Remove the Task ARN from the Task, to indicate this task is no longer running on the processor.
    task.taskArn = null;
    await task.save();

    return;
  }

  logger.info(`Ingesting Sales File: ${salesFileId}: ${salesFile}`);
  await new Promise((resolve, reject) => {
    SalesFileController.ingest(salesFile, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Calculates a Period - Joins & Calculate Sales Tables, Creates Statement PDFs and Transactions
 *
 * @param {import('../models/task')} task - Task Document
 * @returns Promise<Void>
 */
const processPeriod = async (task) => {
  const { periodId } = task.value;

  const period = await Period.findById(periodId).catch((error) => {
    throw new Error(`Failed to find period ${periodId}`, error);
  });

  if (!period) throw new Error(`Period ${periodId} not found`);

  const client = await Client.findById(period.clientId).catch((error) => {
    throw new Error(`Failed to find client ${period.clientId}`, error);
  });

  if (!client) throw new Error(`Client ${period.clientId} not found`);

  if (client?.features?.dmp) {
    logger.info(`Using DMP Period Controller for client ${client.name} (${client._id})`);
    await new Promise((resolve, reject) => {
      DmpPeriodController.calculate(period, (calcErr) => {
        if (calcErr) {
          reject(calcErr);
        } else {
          resolve();
        }
      });
    });

    return;
  }

  await new Promise((resolve, reject) => {
    PeriodController.calculate(period, (calcErr) => {
      if (calcErr) {
        reject(calcErr);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Process a Period Batch
 * @param {import('../models/task')} task - Task Document
 * @returns {Promise<void>}
 * @throws {Error} If the period is not found
 * @throws {Error} If the period fails to be processed
 */
const processPeriodBatch = async (task) => {
  const { periodId } = task.value;
  const period = await Period.findById(periodId);
  if (!period) throw new Error(`Period ${periodId} not found`);

  await new Promise((resolve, reject) => {
    Batch.runBatches(task, period, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Revalidate a Sales File
 *
 * @param {import('../models/task')} task - Task Document
 * @returns {Promise<void>}
 * @throws {Error} If the sales file is not found
 * @throws {Error} If the sales file fails to be revalidated
 * @throws {Error} If the sales file fails to be revalidated on the platform
 * @throws {Error} If the sales file fails to be revalidated on the processor
 * @throws {Error} If the sales file fails to be revalidated on the processor
 */
const salesFileRevalidate = async (task) => {
  const { salesFileId, user } = task.value;

  const salesFile = await SalesFile.findById(salesFileId);
  if (!salesFile) throw new Error(`Sales File ${salesFileId} not found`);

  await new Promise((resolve, reject) => {
    SalesFileController.runRevalidation(salesFile, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Process an Accounting Period
 *
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 * @throws {Error} If the accounting period is not found
 * @throws {Error} If the accounting period fails to be processed
 * @throws {Error} If the accounting period fails to be processed on the platform
 * @throws {Error} If the accounting period fails to be processed on the processor
 * @throws {Error} If the accounting period fails to be processed on the processor
 */
const processAccountingPeriod = async (task) => {
  const { accountingPeriodId } = task.value;

  const accountingPeriod = await AccountingPeriod.findById(accountingPeriodId);
  if (!accountingPeriod) throw new Error(`Accounting Period ${accountingPeriodId} not found`);

  await new Promise((resolve, reject) => {
    accountingPeriod.calculate((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Deliver an ISWC Delivery via FTP
 *
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 * @throws {Error} If the ISWC delivery is not found
 * @throws {Error} If the ISWC delivery fails to be delivered
 * @throws {Error} If the ISWC delivery fails to be delivered on the platform
 * @throws {Error} If the ISWC delivery fails to be delivered on the processor
 * @throws {Error} If the ISWC delivery fails to be delivered on the processor
 */
const iswcDelivery = async (task) => {
  const { iswcDeliveryId, userId } = task.value;

  const iswcDelivery = await IswcDelivery.findById(iswcDeliveryId);
  if (!iswcDelivery) throw new Error(`ISWC Delivery ${iswcDeliveryId} not found`);

  await IswcDeliveryController.deliver({ iswcDeliveryId, userId });
};

const iswcAcknowledgment = async (task) => {
  const { fileName, serverId, clientId } = task.value;

  if (fileName) {
    logger.info(`Digesting ISWC Acknowledgment: ${fileName}`);
    await IswcAcknowledgementController.digestAckFile({ fileName, serverId, clientId });
    return;
  }

  //! Should we just ignore this??
  logger.error('No ISWC Acknowledgment file name');
};

/**
 * Create a Custom Report
 *
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 * @throws {Error} If the report fails to be created
 */
const reportCreation = async (task) => {
  const { reportId } = task.value;
  await Reports.createReport({ reportId, email: task.email });
};

/**
 * Create a Period Statements Zip
 *
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 * @throws {Error} If the period is not found
 * @throws {Error} If the period statements zip fails to be created
 */
const periodStatementsZip = async (task) => {
  const { periodId, file } = task.value;

  const period = await Period.findById(periodId);
  if (!period) throw new Error(`Period ${periodId} not found`);

  await new Promise((resolve, reject) => {
    CreatePeriodZip.createStatementZip(period, task.email, file, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Create a Period Sales CS
 *
 * @param {import('../models/task')} task - Task Document
 *
 * @returns {Promise<void>}
 * @throws {Error} If the period is not found
 * @throws {Error} If the period sales csv fails to be created
 */
const periodSalesCsv = async (task) => {
  const { periodId } = task.value;
  await AllSalesCsv.create(periodId, task.email);
};

const periodCostsCsv = async (task) => {
  const { periodId } = task.value;

  const period = await Period.findById(periodId);
  // Client could delete the period before this task runs
  if (!period) {
    logger.error(`Period ${periodId} not found`);
    return;
  }

  await new Promise((resolve, reject) => {
    AllCostsCsv.create(period, task.email, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const flushingContractsToWorks = async (task) => {
  const { clientId, filter } = task.value;
  const client = await Client.findById(clientId);
  if (!client) throw new Error(`Client ${clientId} not found`);

  await new Promise((resolve, reject) => {
    runFlushContractToWorksFromIpChain(task._id, task.email, clientId, filter, (flushErr) => {
      if (flushErr) {
        reject(flushErr);
      } else {
        resolve();
      }
    });
  });
};

const runCopyClient = async (task) => {
  const {
    user,
    includeTables,
    includeSalesFiles,
    includeArchived,
    includePeriodAndStatementFiles,
  } = task.value;

  const options = { includeTables, includeSales: includeSalesFiles, includeArchived, includePeriodAndStatementFiles };
  await CopyClient.run({ taskId: task._id, email: user, clientId: task.clientId, options });
};

const importAcknowledgementFile = async (task) => {
  const { cwrAcknowledgementId } = task.value;

  const cwrAcknowledgement = await CwrAcknowledgement.findById(cwrAcknowledgementId).populate('deliveryPartnerId');
  if (!cwrAcknowledgement) throw new Error(`CWR Acknowledgement ${cwrAcknowledgementId} not found`);

  cwrAcknowledgement.status = 'In Progress';
  await cwrAcknowledgement.save();

  const cwrAcknowledgementIngest = new CwrAcknowledgementIngest();
  // email is stored directly on task object, not in task.value
  const modifiedEmails = task.email.includes(',') ? task.email.split(',') : task.email;
  await new Promise((resolve, reject) => {
    cwrAcknowledgementIngest.ingestFile(cwrAcknowledgement, modifiedEmails, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runSupportScript = async (task) => {
  const { taskId, script, scriptParams, user } = task.value;

  await new Promise((resolve, reject) => {
    supportScriptModule(taskId, script, scriptParams, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runSyncClient = async (task) => {
  const { syncClientId, userEmail } = task.value;

  if (syncClientId) {
    logger.info(`Processing syncClientId: ${syncClientId}`);
    await FugaCatalogueSync.syncClient({ clientId: syncClientId, userEmail });
    return;
  }

  logger.error(`No syncClientId found with task ID ${task._id}`);
};

const runProcessBatchTaskById = async (task) => {
  const { batchTaskId, email } = task.value;

  try {
    await BatchTaskSupportScripts.processBatchTaskById(batchTaskId);

    await new Promise((resolve, reject) => {
      sendEmail.scriptCompleteEmail(task.name, email, (err) => {
        if (err) { logger.error(err); }
        resolve();
      });
    });
  } catch (err) {
    await new Promise((resolve, reject) => {
      sendEmail.scriptErrorEmail(task.name, email, (err) => {
        if (err) { logger.error(err); }
        resolve();
      });
    });
    throw new Error(err);
  }
};

const runFixedReport = async (task) => {
  const { reportId } = task.value;

  await FixedReportController.runFixedReport({ reportId, email: task.email });
};

const runPlatoonGenerateFiles = async (task) => {
  const { periodId, user } = task.value;

  const period = await Period.findById(periodId);
  if (!period) {
    logger.error(`No Period found with ID ${periodId}`);
    return;
  }

  await new Promise((resolve, reject) => {
    platoon.downloadSAPOutput(period, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runPlatoonDeliverFiles = async (task) => {
  const { periodId, user } = task.value;

  const period = await Period.findById(periodId);
  if (!period) {
    logger.error(`No Period found with ID ${periodId}`);
    return;
  }

  await new Promise((resolve, reject) => {
    platoon.encodeAndSftpOnly(period, user, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runFugaYoutubeIngestion = async (task) => {
  const { s3Key, clientId } = task.value;
  await FugaYoutubeIngest(s3Key, clientId);
};

const runFugaYouTubeCatalogSync = async (task) => {
  await FugaYouTubeCatalogSync(task.value);
};

const runStagingDeleteClient = async (task) => {
  if (process.env?.environmentName?.toLowerCase() !== 'staging') {
    throw new Error('Staging Delete Client Process is only available in staging environment');
  }

  const { clientIds } = task.value;

  if (!clientIds?.length) {
    const error = new Error(`Failed to complete Staging Delete Client Process - No clients found with the ids ${task.value.clientIds}`);
    throw new Error(error);
  }

  await DeleteClient.run(clientIds);
};

const runFugaSalesFileIngestion = async (task) => {
  // Pass entire task.value as the message (matches old taskManager.js behavior)
  await fugaSalesIngestion.ingestFile({ message: task.value });
};

const createUnreportedFiles = async (task) => {
  const { periodId, email, excludedSalesFiles } = task.value;
  if (!periodId) throw new Error(`No periodId found in task ${task._id.toString()}`);

  await PeriodFiles.get({
    periodId,
    email,
    type: task.name,
    excludedSalesFiles,
  });
};

const exportSonglist = async (task) => {
  const { deliveryId } = task.value;
  await Songlist.createSongList({ deliveryId, email: task.email });
};

const runDownloadSelectedStatements = async (task) => {
  const { ids } = task.value;
  // clientName and email are stored directly on task object, not in task.value
  await downloadStatementFiles(ids, task.clientName, task.email);
};

async function runPlatformSalesIngestionCompletion(task) {
  const salesFile = await SalesFile.findById(task.value.salesFileId);

  if (!salesFile) {
    throw new Error(`Failed to complete Platform Sales Ingestion Process - No SalesFile found with ID ${task.value.salesFileId}`);
  }

  logger.info(`Platform: Completing Sales Ingestion Process: ${task.value.salesFileId}`);

  await Platform.completeIngestSalesFileProcess(salesFile, task.value.platformTaskId, task.value.user);
}

async function runFugaPublishStatements(task) {
  await fugaPublishStatements.publishStatements({
    periodId: task.value.periodId,
    email: task.email,
  });
}

async function runFindDuplicateCatalogue(task) {
  logger.addToContext({
    taskId: task._id.toString(),
    taskName: 'Find Catalogue Duplicates',
    clientId: task.value.clientId,
    catalogueType: task.value.catalogueType,
    email: task.email,
  });
  await FindDuplicates.findDuplicates({ clientId: task.value.clientId, type: task.value.catalogueType, email: task.email });
}

async function runWorksExport(task) {
  await WorksExport.exportWorks({ clientId: task.value.clientId, filter: task.value.filter, email: task.email });
}

async function exportCwrDelivery(task) {
  const { deliveryId, markWorksAsDelivered } = task.value;
  await CwrExport.exportCwrDelivery({ deliveryId, markWorksAsDelivered, email: task.email });
}

async function runCwrImport(task) {
  await CwrImport.runCwrImport({ importId: task.value.importId, email: task.email, clientId: task.clientId });
}

/**
 * Trigger a CSV export of unmapped records for a given client task.
 *
 * Delegates to UnmappedExport.exportUnmapped with the client ID, export type,
 * email and either selected IDs or afilter.
 *
 * @async
 * @param {Object} task - Job task payload.
 * @param {string|Object} task.clientId - ID of the client to export for.
 * @param {string} task.email - Email address to notify with the export result.
 * @param {Object} task.value - Selector object forwarded to the export function.
 * @param {string} task.value.type - Export type: one of 'work', 'release', or 'track'.
 * @param {string[]} [task.value.ids] - Optional array of record IDs to export.
 * @param {Object} [task.value.filter] - Optional MongoDB filter to select records.
 *
 * @returns {Promise<void>} Resolves when the export invocation completes.
 * @throws {Error} Propagates any error thrown by UnmappedExport.exportUnmapped.
 */
async function runExportUnmappedCSV(task) {
  await UnmappedExport.exportUnmapped({
    clientId: task.clientId,
    type: task.value.type,
    email: task.email,
    selector: task.value,
  });
}

/**
 * Jobs
 * @type {Object.<string, (task: import('../models/task')) => Promise<void>>}
 * @description - Jobs are the functions that are called when a task is created.
 * Each job function takes a task parameter and returns a Promise<void>.
 *
 * @example
 * const task = {
 *   _id: '123',
 *   name: 'Process Period',
 *   value: {
 *     periodId: '456',
 *   },
 * };
 * const Jobs = require('../jobs');
 * await Jobs[task.name](task);
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} - If the task is not found.
 * @throws {Error} - If the task is not valid.
 * @throws {Error} - If the task is not complete.
 * @throws {Error} - If the task is not errored.
 */
const Jobs = {
  'Process Period': processPeriod,
  'Sales File Ingest': salesFileIngest,
  'Process Statement': processStatement,
  'Batch Worker': processPeriodBatch,
  'Sales File Revalidate': salesFileRevalidate,
  'Process Accounting Period': processAccountingPeriod,
  'ISWC Delivery': iswcDelivery,
  'ISWC Acknowledgment': iswcAcknowledgment,
  'Report Creation': reportCreation,
  'Period Statements Zip': periodStatementsZip,
  'Period Sales CSV': periodSalesCsv,
  'Period Costs CSV': periodCostsCsv,
  'Flushing Contracts to Works': flushingContractsToWorks,
  'Copy Client': runCopyClient,
  'CWR Acknowledgement File Ingest': importAcknowledgementFile,
  'Support Script': runSupportScript,
  'Fuga Cat Sync': runSyncClient,
  'Process Batch Task By ID': runProcessBatchTaskById,
  'Fixed Report': runFixedReport,
  'Platoon Generate Files': runPlatoonGenerateFiles,
  'Platoon Deliver Files': runPlatoonDeliverFiles,
  'Fuga Youtube Ingestion': runFugaYoutubeIngestion,
  'Fuga Youtube Catalog Sync': runFugaYouTubeCatalogSync,
  'Staging Delete Client': runStagingDeleteClient,
  'RASA Statement': runFugaSalesFileIngestion,
  'Unreported Sales': createUnreportedFiles,
  'Unreported Costs': createUnreportedFiles,
  'Songlist Export': exportSonglist,
  'Download Selected Statements Zip': runDownloadSelectedStatements,
  'Sales File Complete Platform Ingestion': runPlatformSalesIngestionCompletion,
  'Fuga Publish Statements': runFugaPublishStatements,
  'Find Catalogue Duplicates': runFindDuplicateCatalogue,
  'CWR Delivery Export': exportCwrDelivery,
  'CWR Import': runCwrImport,
  'Works Export': runWorksExport,
  'Export Unmapped CSV': runExportUnmappedCSV,
};

module.exports = { Jobs };
