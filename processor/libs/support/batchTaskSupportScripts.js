const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Task = require('../../models/task');
const Period = require('../../models/period');
const BatchTask = require('../../models/batchTask');

const CalculateSalesBatch = require('../calculation/period/calculateSalesBatch');
const CalculateMechanicalSalesBatch = require('../calculation/period/calculateMechanicalSalesBatch');
const PeriodStatementCreationBatch = require('../calculation/period/periodStatementCreationBatch');

const BatchTaskSupportScripts = this;

function calculateSalesBatchById({ period, batchTask }) {
  return new Promise((resolve, reject) => {
    CalculateSalesBatch.calculateSalesBatch(period, batchTask, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function calculateSalesContractById({ period, batchTask }) {
  return new Promise((resolve, reject) => {
    CalculateSalesBatch.calculateSalesContract(period, batchTask, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createStatementBatchById({ period, batchTask }) {
  return new Promise((resolve, reject) => {
    PeriodStatementCreationBatch.createStatementBatch(period, batchTask, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createIndividualStatementBatchById({ period, batchTask }) {
  return new Promise((resolve, reject) => {
    PeriodStatementCreationBatch.createIndividualStatementBatch(period, batchTask, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function calculateMechanicalSalesBatchById({ period, batchTask }) {
  return new Promise((resolve, reject) => {
    CalculateMechanicalSalesBatch.calculateMechanicalSalesBatch(period, batchTask, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

BatchTaskSupportScripts.processBatchTaskById = async (batchTaskId) => {
  const batchTask = await BatchTask.findById(batchTaskId).catch(logger.error);
  if (!batchTask) throw new Error(`Could not find Batch Task ID: ${batchTaskId}`);

  const period = await Period.findById(batchTask.periodId).catch(logger.error);
  if (!period) throw new Error(`Could not find Period ID: ${batchTask.periodId}`);

  await BatchTask.findByIdAndUpdate(batchTaskId, { status: 'In Progress', processId: process.pid }).catch(logger.error);

  logger.info(`Processing Batch Task By ID: ${batchTask._id.toString()} - ${batchTask.name} for Period: ${period._id.toString()}`);

  switch (batchTask.name) {
    case 'Sales Batch Calculation':
      await calculateSalesBatchById({ period, batchTask });
      break;
    case 'Sales Individual Calculation':
      await calculateSalesContractById({ period, batchTask });
      break;
    case 'Statement Batch Creation':
      await createStatementBatchById({ period, batchTask });
      break;
    case 'Statement Individual Creation':
      await createIndividualStatementBatchById({ period, batchTask });
      break;
    case 'Mechanical Sales Calculation':
      await calculateMechanicalSalesBatchById({ period, batchTask });
      break;
    default:
      batchTask.status = 'Errored';
      await batchTask.save();
      throw new Error(`Unrecognised batch task name: ${batchTask.name}`);
  }
};

module.exports = BatchTaskSupportScripts;
