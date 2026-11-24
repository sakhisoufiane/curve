const moment = require('moment');
const { eachLimit } = require('async');
const { ECSClient, ListTasksCommand } = require('@aws-sdk/client-ecs');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const Task = require('../models/task');
const Period = require('../models/period');
const BatchTask = require('../models/batchTask');
const Client = require('../models/client');

const TaskController = this;

const getFargateInstances = async () => []; // TODO - OPS-438

TaskController.getStatusCounts = async ({ curveUser }) => {
  // TODO - the /tasks is not covered by the autnentication middleware
  // if (!curveUser?.internal && !curveUser?.monitoring) {
  //   const error = new Error('Forbidden');
  //   error.status = 403;
  //   throw error;
  // }

  const currentDate = moment().startOf('day').format();

  const [queued, errored, hung, calculations, ingestions, today, processing, fargateInstances] = await Promise.all([
    Task.countDocuments({ status: 'Pending', createdAt: { $gte: currentDate } }),
    Task.countDocuments({ status: 'Errored', createdAt: { $gte: currentDate } }),
    Task.countDocuments({ status: 'Hung', createdAt: { $gte: currentDate } }),
    Task.countDocuments({ name: 'Process Period', createdAt: { $gte: currentDate } }),
    Task.countDocuments({ name: 'Sales File Ingest', createdAt: { $gte: currentDate } }),
    Task.countDocuments({ createdAt: { $gte: currentDate } }),
    Task.find({ status: 'In Progress' }),
    getFargateInstances(),
  ]);

  let runningInstances = 0;
  let idleInstances = 0;
  fargateInstances.forEach((instance) => {
    if (processing.find((task) => task.taskArn === instance)) {
      runningInstances += 1;
    } else {
      idleInstances += 1;
    }
  });

  return {
    queued,
    processing: processing?.length,
    runningInstances,
    idleInstances,
    errored,
    hung,
    calculations,
    ingestions,
    today,
  };
};

/**
 * Formats a period task by enriching it with calculation progress status from the associated period document.
 * Appends completed/total contract counts for 'Calculating Sales' and 'Creating Statement Files' statuses.
 *
 * @param {Object} params
 * @param {Object} params.task - The lean task document with a value.periodId field
 * @returns {Promise<Object>} The task with an updated progressStatus field
 */
const formatPeriodTask = async ({ task }) => {
  const formattedTask = { ...task };

  const period = await Period
    .findById(task.value.periodId)
    .select({ _id: 1, calculationStatus: 1, completedCatalogueItems: 1, totalContractsForCalculation: 1 })
    .lean()
    .catch(logger.error);

  if (!period) return formattedTask;

  formattedTask.progressStatus = period.calculationStatus;
  if (['Calculating Sales', 'Creating Statement Files'].includes(period.calculationStatus)) {
    formattedTask.progressStatus = `${period.calculationStatus} (${period.completedCatalogueItems}/${period.totalContractsForCalculation})`;
  }

  return formattedTask;
};

/**
 * Formats a RASA statement task by resolving the associated client from the Fuga organization ID
 * stored in the task's metadata and setting the clientId on the task.
 *
 * @param {Object} params
 * @param {Object} params.task - The lean task document with a value containing RASA metadata
 * @returns {Promise<Object>} The task with the resolved clientId field
 */
const formatRasaTask = async ({ task }) => {
  const formattedTask = { ...task };

  const parsedValue = (typeof task.value === 'string') ? JSON.parse(task.value) : task.value;
  const parsedOrgId = parsedValue.metadata?.organization_id
    ? JSON.parse(parsedValue.metadata.organization_id)
    : null;

  const client = await Client.findOne({ fugaIntegration: { fugaOrgId: parsedOrgId } });
  formattedTask.clientId = client ? client._id : parsedOrgId;
  return formattedTask;
};

TaskController.getTasks = async ({ status, curveUser }) => {
  if (!curveUser?.internal && !curveUser?.monitoring) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  const filter = { status, environment: process.env.PROCESSOR_ENVIRONMENT || 'Development' };

  if (status === 'Errored' || status === 'Hung') {
    const erroredTimeframe = moment().startOf('day').subtract(3, 'days').format();
    filter.createdAt = { $gte: erroredTimeframe };
  }

  if (status === 'Errored') {
    filter.name = { $ne: 'CWR Acknowledgement File Ingest' };
  }

  const tasks = await Task.find(filter).sort({ createdAt: 1 }).lean();
  if (tasks?.length === 0) { return []; }

  const formattedTasks = await Promise.all(tasks.map(async (task) => {
    if (task.name === 'Process Period') {
      const formattedTask = await formatPeriodTask({ task });
      return formattedTask;
    }

    if (task.name === 'RASA Statement') {
      const formattedTask = await formatRasaTask({ task });
      return formattedTask;
    }

    if (task.value.runningOn === 'Platform') {
      task.name = `${task.name} (Platform)`;
    }

    return task;
  }));

  return formattedTasks;
};

module.exports = TaskController;
