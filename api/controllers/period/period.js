/* eslint-disable global-require */
const moment = require('moment');
const { eachLimit } = require('async');
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { Page, UserAccess } = require('@curveroyaltysystems/curve-shared-logic');
const { each } = require('async');

const Task = require('../../models/task');
const Payee = require('../../models/payee');
const Client = require('../../models/client');
const Payment = require('../../models/payment');
const BatchTask = require('../../models/batchTask');
const PaymentGroup = require('../../models/paymentGroup');
const Notification = require('../../models/notification');
const Escalation = require('../../models/escalation');

const PayeeController = require('../payee');
const PayeeTransaction = require('../../models/payeeTransaction');
const HyperCare = require('../hypercare');

const CUSTOM_STATEMENT_DESIGNS = ['Proper', 'Just Music', 'Late Night Tales', 'Topic', 'Drag City', 'Combined Plus Release Summary'];

const PeriodController = this;

function paramsToFilterFieldBatchTasks({ periodId, query }) {
  const filter = { periodId, status: { $ne: 'Complete' } };

  if (query.status && query.status !== 'Complete') { filter.status = query.status; }

  return filter;
}

function getBatchPaginationParams({ query }) {
  const paginationParams = {
    page: Page.valueOrDefault(query.page, 1),
    limit: Page.valueOrDefault(query.limit, 25),
    sort: Page.sortOrDefault(query.orderBy, query.orderDir),
    allowDiskUse: true,
  };

  return paginationParams;
}

PeriodController.getBatchTasks = async ({ periodId, query }) => {
  const paginationParams = getBatchPaginationParams({ query });
  const filter = paramsToFilterFieldBatchTasks({ periodId, query });

  const result = await BatchTask.paginate(filter, paginationParams).catch(logger.error);

  return {
    batchTasks: result.docs,
    meta: {
      currentPage: paginationParams.page,
      totalPages: result.totalPages,
      total: result.totalDocs,
    },
  };
};

PeriodController.runBatchTask = async ({ batchTaskId, email }) => {
  const Period = require('../../models/period');
  const batchTask = await BatchTask.findById(batchTaskId).catch(logger.error);
  if (!batchTask) throw new Error(`Could not find Batch Task ID ${batchTaskId}`);

  const period = await Period.findById(batchTask.periodId).catch(logger.error);
  if (!period) throw new Error(`Could not find Period ${batchTask.periodId}`);

  const client = await Client.findById(batchTask.clientId).catch(logger.error);
  if (!client) throw new Error('Could not find Client');

  const taskCount = await Task.countDocuments({ 'value.batchTaskId': batchTask._id.toString(), status: 'In Progress' });
  if (taskCount > 0) throw new Error(`A Task for this Batch Task ${batchTask._id.toString()} is already processing`);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Process Batch Task By ID',
    clientId: batchTask.clientId,
    clientName: client.name,
    value: { batchTaskId: batchTask._id.toString(), email },
  });
};

PeriodController.validatePeriod = async ({ period, curveUser }) => {
  const Period = require('../../models/period');
  const Statement = require('../../models/statement');

  // Check user rights
  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) throw new Error('Forbidden');

  if (period.status === 'Processing') throw new Error('Could not trigger recalculation as the period is already processing. Please wait for this to complete and try again.');

  // Check if other periods with same accounting setup are running. This is to avoid closing balance errors.
  const periods = await Period.countDocuments({ clientId: period.clientId, status: 'Processing', accountingPeriodType: period.accountingPeriodType, contractType: period.contractType });
  if (periods) throw new Error('Please note you can not reprocess two Periods of the same Accounting Period Type at the same time. When multiple Periods need to be reprocessed, you should reprocess these one after the other and in chronological order, so that the Closing Balance of the statements in the first Period can be used as the Opening Balance of the statements in the next Period.');

  // Check if statements under this period are running.
  const statements = await Statement.countDocuments({ clientId: period.clientId, periodId: period._id.toString(), status: 'Processing' }).catch(logger.error);
  if (statements) throw new Error('Could not trigger recalculation as statements associated with this period are reprocessing. Please wait for them to complete and try again.');

  // Check if any payments associated with this period have already been paid out.
  const paymentGroup = await PaymentGroup.findOne({ clientId: period.clientId, periodId: period._id.toString() }).catch(logger.error);
  if (paymentGroup) {
    const payments = await Payment.countDocuments({ clientId: period.clientId, paymentGroupId: paymentGroup._id.toString(), status: 'Paid' }).catch(logger.error);
    if (payments) throw new Error('Could not trigger recalculation as payments associated with this period have already been paid out.');
  }
};

/**
 * Triggers the calculation of a period, (Creates 'Process Period' Task for Processor)
 *
 * @param {Object} params - Object containing the period id and the curveUser
 * @param {String} params.id - Period ID
 * @param {Object} params.curveUser - Curve User Object from Token
 * @param {Boolean} params.processFull - Force Full Calculation
 *
 * @returns {Promise} - Promise Object
 */
PeriodController.calculate = async ({ params, curveUser, processFull }) => {
  const Payee = require('../../models/payee');
  const Client = require('../../models/client');
  const Period = require('../../models/period');

  const client = await Client.findById(curveUser.clientId, 'name homeCurrency operations').catch(logger.error);
  if (!client) {
    const error = new Error('Client not found');
    error.status = 404;
    throw error;
  }

  if (!client.homeCurrency) {
    const error = new Error('Please ensure Home Currency is set against Client Settings');
    error.status = 400;
    throw error;
  }

  const period = await Period.findById(params.id, '_id name clientId status accountingPeriodType contractType currencyExchangeRates').catch(logger.error);
  if (!period) {
    const error = new Error('Period not found');
    error.status = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  const count = await Task
    .countDocuments({
      name: { $in: ['Process Period'] },
      clientId: period.clientId,
      status: { $in: ['Pending', 'In Progress'] },
      'value.periodId': period._id.toString(),
    })
    .catch(logger.error);

  if (count) {
    const error = new Error('This task is already running - please wait until it has completed before running again');
    error.status = 400;
    throw error;
  }

  await PeriodController.validatePeriod({ period, curveUser });

  if (processFull && curveUser.internal) {
    logger.info(`Running period with force full | ${period._id.toString()}`);
    period.forceFull = true;
  }

  period.status = 'Processing';
  await period.save();

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Process Period',
    clientId: period.clientId,
    clientName: client.name,
    email: curveUser.email,
    value: { periodId: period._id.toString() },
  });

  // Send Slack Notification
  if (client.operations?.hypercare) {
    await HyperCare.notifyPeriodRun({ client, period });
  }
};

PeriodController.platoonDownloadSAPOutput = async (period, curveUser) => {
  const Client = require('../../models/client');
  const User = require('../../models/user');
  const Task = require('../../models/task');

  const client = await Client.findById(period.clientId, 'name');
  const user = await User.findById(curveUser.id, 'email');
  const count = await Task.countDocuments({
    name: 'Platoon Generate Files', clientId: period.clientId, status: { $in: ['Pending', 'In Progress'] }, 'value.periodId': period._id.toString(),
  });
  if (!count) {
    await TaskHelpers.createTaskAndSendMessage(Task, {
      name: 'Platoon Generate Files',
      clientId: period.clientId,
      clientName: client.name,
      value: { periodId: period._id.toString(), user: { id: curveUser.id, email: user.email } },
    });
  } else {
    throw new Error('This task is already running - please wait until it has completed before running again');
  }
};

PeriodController.removePeriod = async ({ period, curveUser }) => {
  await period.deleteOne();
  // Remove period escalations
  await Escalation.deleteMany({ clientId: curveUser.clientId, periodId: period._id });
  const client = await Client.findById(curveUser.clientId, 'name');
  const generateOptions = {
    identifier: 'genericComplete',
    curveUser,
    client,
    subject: 'Period has been deleted',
    mainText: `Period - ${period.name} - has been deleted`,
  };
  Notification.generate(generateOptions.subject, `Period - ${period.name} - has been deleted`, null, curveUser, generateOptions);
};

PeriodController.platoonDeliverToSAP = async (period, curveUser) => {
  const Client = require('../../models/client');
  const User = require('../../models/user');
  const Task = require('../../models/task');

  const client = await Client.findById(period.clientId, 'name');
  const user = await User.findById(curveUser.id, 'email');
  const count = await Task.countDocuments({
    name: 'Platoon Deliver Files', clientId: period.clientId, status: { $in: ['Pending', 'In Progress'] }, 'value.periodId': period._id.toString(),
  });
  if (!count) {
    await TaskHelpers.createTaskAndSendMessage(Task, {
      name: 'Platoon Deliver Files',
      clientId: period.clientId,
      clientName: client.name,
      value: { periodId: period._id.toString(), user: { id: curveUser.id, email: user.email } },
    });
  } else {
    throw new Error('This task is already running - please wait until it has completed before running again');
  }
};

/**
 * For third tab, this displays all Payee Balances Generated from this period.
 *
 * @param {Object} period - Period Object from Mongodb
 * @returns {Array} - Array of Payee Transaction Data
 */
PeriodController.getPayeeBalancesExportData = async ({ period }) => {
  const Contract = require('../../models/contract');
  const Statement = require('../../models/statement');

  if (!period) throw new Error('Period is required');

  logger.info(`${period._id.toString()} | Statements Export | Payee Tab 3 | Starting...`);

  const payeeBalancesData = [];

  // Paginate through all payees and get their balances
  const getPayeesBalances = async ({ period, lastId, count }) => {
    const limit = 1000;
    const query = { clientId: period.clientId, payeeBalanceCurrency: { $exists: true } };

    if (lastId) { query._id = { $gt: lastId }; } // Pagination, we only process 1000 payees at a time

    const payees = await Payee
      .find(query)
      .select('_id name clientId minPayout openingBalance payeeBalanceCurrency notes payeeCategories selfBillingTaxText vatNo foreignId')
      .sort({ _id: 1 })
      .limit(limit);

    if (!payees?.length) {
      logger.info(`${period._id.toString()} | Payee Payments | No payees found`);
      return;
    }

    // Format the period start and end dates to query db
    const periodStartDate = moment.utc(period.startDate).format();
    const periodEndDate = moment.utc(period.endDate).format();

    await eachLimit(payees, 50, async (payee) => {
      // We only want to target payees that have a contract with the same accounting period as the period we are processing
      const contractQuery = { clientId: payee.clientId, 'payees.payeeId': payee._id.toString(), active: true, accountingPeriod: period.accountingPeriodType };
      const contract = await Contract.findOne(contractQuery).select('_id');
      if (!contract) return;

      const statement = await Statement.findOne({ clientId: payee.clientId, contractId: contract._id.toString(), periodId: period._id.toString() }).select('_id');
      if (!statement) return;

      // Get Payee Data for Excel Sheet
      const openingBalance = await PayeeController.balanceAtDate({ payee, date: periodStartDate });
      const closingBalance = await PayeeController.balanceAtDate({ payee, date: periodEndDate });

      const periodTransfersTotal = await PayeeController.getTransactionTotals({
        type: 'Period Transfer',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      const advanceTotal = await PayeeController.getTransactionTotals({
        type: 'Advance',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      const paymentTotal = await PayeeController.getTransactionTotals({
        type: 'Payment',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      const royaltiesTotal = await PayeeController.getTransactionTotals({
        type: 'Royalty',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      const otherTotal = await PayeeController.getTransactionTotals({
        type: 'Other',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      const autoPaymentTotal = await PayeeController.getTransactionTotals({
        type: 'Auto Payment',
        dateRange: { $gte: new Date(periodStartDate), $lte: new Date(periodEndDate) },
        payee,
      });

      // Create Payee Row
      const payeeRow = [
        payee._id.toString(),
        payee.name,
        payee.foreignId,
        payee.notes,
        payee.payeeCategories?.join('; '),
        payee.payeeBalanceCurrency,
        payee.selfBillingTaxText,
        payee.vatNo,
        openingBalance,
        periodTransfersTotal,
        advanceTotal,
        paymentTotal,
        royaltiesTotal,
        otherTotal,
        0, // TODO Withholding Tax
        0, // TODO Taxes
        autoPaymentTotal,
        closingBalance,
      ];

      payeeBalancesData.push(payeeRow);

      // Add to Count for logging purposes
      count += 1;
      logger.info(`${period._id.toString()} | Statements Export | Payee Tab 3 | ${count} payees processed`);
    });

    // Paginate the process to handle large requests
    if (payees.length !== limit) return;

    await getPayeesBalances({
      period,
      lastId: payees[payees.length - 1]._id,
      count,
    });
  };

  // Start the process
  await getPayeesBalances({ period, lastId: null, count: 0 });

  return payeeBalancesData;
};

/**
 * For the second tab of the Statement Export Excel Sheet, this displays all Payee Transactions Generated from this period.
 *
 * @param {Object} period - Period Object from Mongodb
 * @returns {Array} - Array of Payee Transaction Data
 */
PeriodController.getPayeeTransfersExportData = async ({ period }) => {
  const Contract = require('../../models/contract');
  const Statement = require('../../models/statement');

  if (!period) throw new Error('Period is required');

  const payeeTransferData = [];

  const payeeTransactions = await PayeeTransaction.find({
    clientId: period.clientId,
    periodId: period._id.toString(),
  })
    .select('originalCurrency payeeId statementId currency amountInOriginalCurrency amountInPayeeCurrency')
    .sort({ date: 1 });

  await eachLimit(payeeTransactions, 50, async (transaction) => {
    // Populate Ids
    const statement = await Statement.findById(transaction.statementId).select('contractId name');
    if (!statement) return;

    const contract = await Contract.findById(statement.contractId).select('name payees');
    if (!contract) return;

    const payeeRate = contract?.payees?.find((payee) => payee.payeeId === transaction.payeeId)?.percentage || 0;

    const payee = await Payee.findById(transaction.payeeId).select('name');
    if (!payee) return;

    // Create Transfer Row for Excel Sheet
    const payeeRow = [
      contract.name,
      transaction.originalCurrency,
      statement.name,
      payee.name,
      transaction.currency,
      payeeRate,
      transaction.amountInOriginalCurrency,
      transaction.amountInPayeeCurrency,
    ];

    payeeTransferData.push(payeeRow);
  });

  return payeeTransferData;
};

PeriodController.createStatementsZip = async (period, curveUser, selectedFiles) => {
  const User = require('../../models/user');
  const Statement = require('../../models/statement');

  const client = await Client.findById(period.clientId, 'name statementDesign');
  const user = await User.findById(curveUser.id, 'email');

  const fileInProgress = async (file) => {
    const count = await Task.countDocuments({
      name: { $in: ['Period Statements Zip'] },
      clientId: period.clientId,
      status: { $in: ['Pending', 'In Progress'] },
      value: { periodId: period.id, file },
    });
    return count > 0;
  };

  const exportStatus = { alreadyInProgress: [], started: [], errored: [], invalid: [] };

  if (CUSTOM_STATEMENT_DESIGNS.includes(client.statementDesign)) {
    if (selectedFiles.includes('feesInvoice') || selectedFiles.includes('selfBillingInvoice')) {
      exportStatus.invalid.push('invoices');
      selectedFiles = selectedFiles.filter((f) => f !== 'feesInvoice' && f !== 'selfBillingInvoice');
    }
    // Make sure we check if custom statements exist to prevent no files found error
    if (selectedFiles.includes('pdf')) {
      selectedFiles = selectedFiles.filter((f) => f !== 'pdf');
      selectedFiles.push('customStatement');
    }
    // Custom design Proper & Topic has no Sales CSVs
    if ((client.statementDesign === 'Proper' || client.statementDesign === 'Topic') && selectedFiles.includes('salesCsv')) {
      exportStatus.invalid.push('salesCsv');
      selectedFiles = selectedFiles.filter((f) => f !== 'salesCsv');
    }
  }

  await each(selectedFiles, async (file) => {
    const alreadyInProgress = await fileInProgress(file);
    if (alreadyInProgress) {
      exportStatus.alreadyInProgress.push(file);
      return;
    }

    // Check if the selected statement files exists
    const allStatements = await Statement.find({ clientId: period.clientId, periodId: period._id.toString() }, file);
    const statementsExist = allStatements.filter((statement) => statement?.[file]).length > 0;
    if (!statementsExist) {
      exportStatus.errored.push(file);
      return;
    }

    // If custom statement, revert type back to "pdf" as this used to look up standard & custom pdfs in processor
    const fileToDownload = file === 'customStatement' ? 'pdf' : file;

    const payload = { periodId: period.id, file: fileToDownload };
    await TaskHelpers.createTaskAndSendMessage(Task, {
      name: 'Period Statements Zip',
      clientId: period.clientId,
      clientName: client.name,
      email: user.email,
      value: payload,
    });
    exportStatus.started.push(fileToDownload);
  });
  return exportStatus;
};

/**
 * Validated the incoming request for PeriodController.validateUnreportedFileGeneration
 * @param {*} param0
 * @returns
 */
const validateUnreportedRequest = async ({ curveUser, id, type }) => {
  console.log(' validateUnreportedRequest called');

  const User = require('../../models/user');
  const Period = require('../../models/period');

  if (!id) {
    const error = new Error('Period ID is required');
    error.code = 400;
    throw error;
  }

  if (!type) {
    const error = new Error('Type is required');
    error.code = 400;
    throw error;
  }

  if (!['Unreported Sales', 'Unreported Costs'].includes(type)) {
    const error = new Error("Invalid type. Type must be either 'Unreported Sales' or 'Unreported Costs'");
    error.code = 400;
    throw error;
  }

  const period = await Period.findById(id).catch(logger.error);
  if (!period) {
    const error = new Error('Period not found');
    error.code = 404;
    throw error;
  }

  const user = await User.findById(curveUser.id, 'email').lean().catch(logger.error);
  if (!user) {
    const error = new Error('User not found');
    error.code = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  return { period };
};

const handleUnreportedSalesCsvValidation = async ({ period }) => {
  const Task = require('../../models/task');
  const Statement = require('../../models/statement');
  const SalesFile = require('../../models/salesFile');

  const response = { canGenerate: true, type: 'Unreported Sales' };

  // The rest of the logic is for Unreported Sales, by default set the public link and last run date
  if (!period.salesFilesIds?.length && !period.resolvedGroupIds?.length) {
    response.message = 'No Sales are attached to this period. Generating an Unreported Sales CSV is not necessary.';
    response.canGenerate = false;
    return response;
  }

  if (!period.unreportedSalesCsv) {
    const task = await Task
      .findOne({
        name: 'Unreported Sales',
        clientId: period.clientId,
        'value.periodId': period._id.toString(),
        status: 'In Progress',
      })
      .sort({ createdAt: -1 })
      .lean()
      .catch(logger.error);

    response.message = task ? 'File is currently being created, please come back later to download.' : 'No Unreported Sales CSV found for this period.';
    return response;
  }

  response.publicLink = period.unreportedSalesCsvPublicLink;
  response.unreportedLastRun = moment(period.unreportedSalesCsvLastRun || period.processEndTime).format();

  // Check if there are statements that have been reprocessed since the last period’s processing date.
  const statements = await Statement
    .find({ clientId: period.clientId, periodId: period._id.toString() })
    .select({ name: 1, _id: 1, updatedAt: 1 })
    .lean();

  const statementTasks = await Task
    .find({
      name: 'Process Statement',
      clientId: period.clientId,
      'value.statementId': { $in: statements.map((statement) => statement._id.toString()) },
      createdAt: { $gt: moment.utc(period.unreportedSalesCsvLastRun || period.processEndTime).format() },
    })
    .lean();

  if (statementTasks?.length) {
    response.statementMessage = `
    Some statements have been reprocessed since the last creation of the Unreported Sales CSV File, which may result in data discrepancies.
    To ensure accuracy, please re-generate the Unreported Sales CSV.
    Below is the list of statements reprocessed:
  `;
    response.statementList = statements
      .map((statement) => ({ _id: statement._id.toString(), name: statement.name, updatedAt: statement.updatedAt }))
      .filter((statement) => statementTasks.some((task) => task.value.statementId === statement._id));

    response.periodEndDate = moment.utc(period.processEndTime).format();
    response.canGenerate = true;
  }

  // Identify any sales files that have been reprocessed since the last period’s processing date.
  // Users will be asked to exclude these files from the unreported CSV, as re-ingesting them alters the IDs, potentially causing mismatches between the input and output tables.
  // This only Affects the following periods: Mechanical, Publisher, Label and Distrubtor (Artist) Periods.
  const salesFiles = await SalesFile
    .find({
      _id: { $in: period.salesFilesIds },
      'lastIngested.date': { $gt: moment.utc(period.unreportedSalesCsvLastRun || period.processEndTime).format() },
    })
    .select({ name: 1, _id: 1, lastIngested: 1 })
    .lean()
    .catch(logger.error);

  if (salesFiles?.length) {
    // If ALL sales files have been re-ingsted then we don't allow the user to generate the unreported file unless the period has been re-run.
    response.salesFileMessage = salesFiles?.length !== period.salesFilesIds?.length ? `
    Some sales files have been (re)ingested since the last creation of the Unreported Sales CSV File, which may result in data discrepancies.
    To ensure accuracy, these files will be automatically excluded from the Unreported Sales CSV.
    Below is the list of excluded sales files:
  ` : 'All sales files have been (re)ingested since the last processing of this period, which may result in data discrepancies. Please re-process the period.';

    response.salesFileList = salesFiles?.length !== period.salesFilesIds?.length ? salesFiles.map((salesFile) => ({ _id: salesFile._id.toString(), name: salesFile.name, lastIngestedDate: salesFile.lastIngested?.date })) : [];
    response.periodEndDate = moment.utc(period.processEndTime).format();
    // If all sales files have been re-ingested, we don't allow the user to generate the unreported file unless the period has been re-run.
    response.canGenerate = !(salesFiles?.length === period.salesFilesIds?.length);
  }

  // Return default response for Unreported Sales
  return response;
};
/**
 * { canGenerate: false, message: '', list: [], publicLink, unreportedLastRun }
 * @param {Object} params
 * @param {import('@curveroyaltysystems/models').period} params.period
 */
const handleUnreportedCostsCsvValidation = async ({ period }) => {
  const Task = require('../../models/task');
  const Statement = require('../../models/statement');

  const response = { canGenerate: true, type: 'Unreported Costs' };

  if (!period.costIds?.length) {
    response.message = 'No Costs are attached to this period. Generating an Unreported Costs CSV is not necessary.';
    response.canGenerate = false;
    return response;
  }

  if (!period.unreportedCostsCsv) {
    const task = await Task
      .findOne({
        name: 'Unreported Costs',
        clientId: period.clientId,
        'value.periodId': period._id.toString(),
        status: 'In Progress',
      })
      .sort({ createdAt: -1 })
      .lean()
      .catch(logger.error);

    response.message = task ? 'File is currently being created, please come back later to download.' : 'No Unreported Costs CSV found for this period.';
    return response;
  }

  response.publicLink = period.unreportedCostsCsvPublicLink;
  response.unreportedLastRun = period.unreportedCostsCsvLastRun || period.processEndTime;

  // Check if there are statements that have been reprocessed since the last period’s processing date.
  const statements = await Statement
    .find({ clientId: period.clientId, periodId: period._id.toString() })
    .select({ name: 1, _id: 1, updatedAt: 1 })
    .lean();

  const statementTasks = await Task
    .find({
      name: 'Process Statement',
      clientId: period.clientId,
      'value.statementId': { $in: statements.map((statement) => statement._id.toString()) },
      createdAt: { $gt: moment.utc(period.unreportedCostsCsvLastRun || period.processEndTime).format() },
    })
    .lean();

  if (statementTasks?.length) {
    response.statementMessage = `
    Some statements have been reprocessed since the last creation of the Unreported Costs CSV File, which may result in data discrepancies.
    To ensure accuracy, please re-generate the Unreported Costs CSV.
    Below is the list of statements reprocessed:
  `;
    response.statementList = statements
      .map((statement) => ({ _id: statement._id.toString(), name: statement.name, updatedAt: statement.updatedAt }))
      .filter((statement) => statementTasks.some((task) => task.value.statementId === statement._id));

    response.periodEndDate = moment.utc(period.processEndTime).format();
    response.canGenerate = true;
  }

  return response;
};

/**
 * Validates if the unreported file can be generated
 *
 * @param {Object} req - Request Object
 * @param {String} req.params.id - Period ID
 * @param {Object} req.body - Request Body
 *
 * @returns {Object} - Response Object
 * @returns {Boolean} canGenerate - If the file can be generated
 * @returns {String} message - Message to display
 * @returns {Array} list - List of excluded sales files
 */
PeriodController.validateUnreportedFileGeneration = async (req) => {
  console.log('**** validateUnreportedFileGeneration');

  const { id } = req.params;
  const { type } = req.body;
  const { curveUser } = req;

  // Validate Request
  const { period } = await validateUnreportedRequest({ id, type, curveUser });

  // Validate if the file can be generated
  if (type === 'Unreported Sales') {
    return handleUnreportedSalesCsvValidation({ period });
  }

  if (type === 'Unreported Costs') {
    return handleUnreportedCostsCsvValidation({ period });
  }
};

/**
 * Generates the unreported file
 * @param {*} req
 * @returns {Promise} - Promise Object
 */
PeriodController.generateUnreportedFile = async (req) => {
  const Task = require('../../models/task');
  const User = require('../../models/user');
  const Period = require('../../models/period');

  const { curveUser } = req;
  const { id } = req.params;
  const { type, excludedSalesFiles } = req.body;

  if (!id) {
    const error = new Error('Period ID is required');
    error.code = 400;
    throw error;
  }

  if (!type) {
    const error = new Error('Type is required');
    error.code = 400;
    throw error;
  }

  const period = await Period.findById(id).lean().catch(logger.error);
  if (!period) {
    const error = new Error('Period not found');
    error.code = 404;
    throw error;
  }

  const user = await User.findById(curveUser.id, 'email').lean().catch(logger.error);
  if (!user) {
    const error = new Error('User not found');
    error.code = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'read', type: 'periods', document: period, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  const currentTask = await Task
    .countDocuments({
      name: type,
      clientId: period.clientId,
      'value.periodId': period._id.toString(),
      status: 'In Progress',
    })
    .lean()
    .catch(logger.error);

  if (currentTask) {
    const error = new Error('File is currently being created, please come back later to download.');
    error.status = 400;
    throw error;
  }

  try {
    await TaskHelpers.createTaskAndSendMessage(Task, {
      name: type,
      clientId: period.clientId,
      value: {
        periodId: period._id.toString(),
        email: user.email,
        excludedSalesFiles: excludedSalesFiles?.length ? excludedSalesFiles : [],
      },
    });
  } catch (error) {
    throw new Error('An unknown error occurred while requesting file generation, try again. If the error persists, please contact support.');
  }
};

PeriodController.publishFugaStatements = async ({ curveUser, periodId }) => {
  const Period = require('../../models/period');
  const User = require('../../models/user');

  const period = await Period.findById(periodId, 'clientId name').catch(logger.error);
  if (!period) {
    const error = new Error(`Could not find period with ID: ${periodId}`);
    error.code = 404;
    throw error;
  }

  const user = await User.findById(curveUser.id, 'email').catch(logger.error);
  if (!user) {
    const error = new Error('User not found');
    error.code = 404;
    throw error;
  }

  if (await UserAccess.isUserForbidden({ Payee, user: curveUser, operation: 'write', type: 'periods', document: period, clientOnly: true })) {
    const error = new Error('Forbidden');
    error.code = 403;
    throw error;
  }

  // Check the client is a FUGA client AND has the publish statements setting enabled
  const client = await Client.findById(period.clientId, { features: 1 });
  if (!client?.features?.fugaPublishStatementsToCloudStorage) {
    const error = new Error('Client publish statements to GCS setting is disabled');
    error.code = 400;
    throw error;
  }

  const type = 'Fuga Publish Statements';
  const currentTasks = await Task
    .countDocuments({
      name: type,
      clientId: period.clientId,
      'value.periodId': period._id.toString(),
      status: 'In Progress',
    })
    .catch(logger.error);

  if (currentTasks > 0) {
    const error = new Error('Statements are currently being published, please wait until this has completed before attempting to publish again.');
    error.status = 400;
    throw error;
  }
  try {
    await TaskHelpers.createTaskAndSendMessage(Task, {
      name: type,
      clientId: period.clientId,
      value: { periodId: period._id.toString() },
      email: user.email,
    });
  } catch (error) {
    logger.error(error);
    throw new Error('An unknown error occurred while attempting to publish statements, try again. If the error persists, please contact support.');
  }
};

module.exports = PeriodController;
