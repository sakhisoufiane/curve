/* eslint-disable no-await-in-loop */
const { logger, TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const { SFNClient, StopExecutionCommand, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');
const { BatchClient, TerminateJobCommand, DescribeJobsCommand } = require('@aws-sdk/client-batch');
const Task = require('../../models/task');
const Period = require('../../models/period');
const Statement = require('../../models/statement');
const SalesFile = require('../../models/salesFile/salesFile');
const User = require('../../models/user');

const MonitoringController = {};

const awsCredentials = {
  accessKeyId: process.env.PROCESSOR_ACCESS_KEY,
  secretAccessKey: process.env.PROCESSOR_SECRET_KEY,
};
const region = process.env.ECS_REGION || process.env.S3_region;

const TERMINAL_SFN_STATUSES = ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'];
const TERMINAL_BATCH_STATUSES = ['SUCCEEDED', 'FAILED'];
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 24;

/**
 * Polls an AWS Step Function execution until it reaches a terminal state.
 * @param {Object} params
 * @param {SFNClient} params.sfnClient - The Step Functions client
 * @param {string} params.executionArn - The ARN of the execution to poll
 * @returns {Promise<string>} The final status of the execution
 * @throws {Error} If the execution does not reach a terminal state within the max attempts
 */
const waitForStepFunctionToStop = async ({ sfnClient, executionArn }) => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const { status } = await sfnClient.send(new DescribeExecutionCommand({ executionArn }));
    logger.debug(`Step Function execution ${executionArn} status: ${status}`);
    if (TERMINAL_SFN_STATUSES.includes(status)) return status;
    await new Promise((resolve) => { setTimeout(resolve, POLL_INTERVAL_MS); });
  }
  throw new Error(`Step Function execution ${executionArn} did not stop within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
};

/**
 * Polls an AWS Batch job until it reaches a terminal state.
 * @param {Object} params
 * @param {BatchClient} params.batchClient - The Batch client
 * @param {string} params.jobId - The ID of the Batch job to poll
 * @returns {Promise<string>} The final status of the job
 * @throws {Error} If the job does not reach a terminal state within the max attempts
 */
const waitForBatchJobToStop = async ({ batchClient, jobId }) => {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const { jobs } = await batchClient.send(new DescribeJobsCommand({ jobs: [jobId] }));
    const status = jobs?.[0]?.status;
    logger.debug(`Batch job ${jobId} status: ${status}`);
    if (TERMINAL_BATCH_STATUSES.includes(status)) return status;
    await new Promise((resolve) => { setTimeout(resolve, POLL_INTERVAL_MS); });
  }
  throw new Error(`Batch job ${jobId} did not stop within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`);
};

/**
 * Sets any stateful documents associated with a task to Complete.
 * Currently handles Period and Statement documents.
 * @param {Object} task - The task document (lean)
 * @param {Object} [task.value] - The task value containing document references
 * @param {string} [task.value.periodId] - The ID of the associated period
 * @param {string} [task.value.statementId] - The ID of the associated statement
 * @param {string} [task.value.salesFileId] - The ID of the associated sales file
 */
MonitoringController.setStatefulDocumentsToComplete = async (task) => {
  if (task.value?.periodId) {
    const period = await Period.findById(task.value.periodId);
    if (period) {
      period.status = 'Complete';
      await period.save();
      logger.debug(`Set period ${task.value.periodId} to Complete`);
    }
  }

  if (task.value?.statementId) {
    const statement = await Statement.findById(task.value.statementId);
    if (statement) {
      statement.status = 'Complete';
      await statement.save();
      logger.debug(`Set statement ${task.value.statementId} to Complete`);
    }
  }

  if (task.value?.salesFileId) {
    const salesFile = await SalesFile.findById(task.value.salesFileId);
    if (salesFile) {
      salesFile.status = 'Complete';
      await salesFile.save();
      logger.debug(`Set sales file ${task.value.salesFileId} to Complete`);
    }
  }
};

/**
 * Stops the AWS Step Function execution and Batch job associated with a task,
 * waiting for each to reach a terminal state before returning.
 * @param {Object} params
 * @param {Object} params.task - The task document (lean)
 * @param {string} params.reason - The reason for stopping (used in AWS stop/terminate calls)
 */
const stopAwsProcesses = async ({ task, reason }) => {
  if (task.metadata?.stepFunctionExecutionId) {
    const sfnClient = new SFNClient({ region, credentials: awsCredentials });
    const executionArn = `${process.env.STEP_FUNCTION_STATE_MACHINE_ARN.replace(':stateMachine:', ':execution:')}:${task.metadata.stepFunctionExecutionId}`;
    await sfnClient.send(new StopExecutionCommand({ executionArn, cause: reason }));
    await waitForStepFunctionToStop({ sfnClient, executionArn });
  }

  if (task.metadata?.awsBatchJobId) {
    const batchClient = new BatchClient({ region, credentials: awsCredentials });
    await batchClient.send(new TerminateJobCommand({ jobId: task.metadata.awsBatchJobId, reason }));
    await waitForBatchJobToStop({ batchClient, jobId: task.metadata.awsBatchJobId });
  }
};

/**
 * Terminates a running task by:
 * 1. Stopping the associated AWS Step Function execution and Batch job
 * 2. Setting any stateful documents (period/statement/sales file) to Complete
 * 3. Setting the task itself to Complete
 *
 * @param {Object} params
 * @param {string} params.taskId - The ID of the task to terminate
 * @throws {Error} If the task is not found or if AWS operations fail
 */
MonitoringController.terminateTask = async ({ taskId, curveUser }) => {
  const task = await Task.findById(taskId).lean();
  if (!task) { throw new Error('Task not found'); }
  if (task.value?.processState) { throw new Error(`Task is already being processed: ${task.value.processState}`); }

  const user = await User.findById(curveUser.id, 'email').lean();
  if (!user) throw new Error(`No user found ${curveUser.id}`);

  const { email } = user;

  await Task.findByIdAndUpdate(task._id, { $set: { 'value.processState': 'Terminating' } });

  // Resolve here so the route can respond immediately — AWS work runs in the background
  (async () => {
    try {
      const reason = `Task has been terminated by ${email} via the monitoring dashboard`;
      await stopAwsProcesses({ task, reason });
      await MonitoringController.setStatefulDocumentsToComplete(task);
      await Task.findByIdAndUpdate(task._id, { $set: { status: 'Complete', 'value.notes': reason, 'value.processState': null } });
    } catch (err) {
      logger.error(err);
      await Task.findByIdAndUpdate(task._id, { $set: { status: 'Errored', error: err.message, 'value.processState': null } }).catch(logger.error);
    }
  })();
};

/**
 * Re-runs a task by:
 * 1. Stopping the associated AWS Step Function execution and Batch job
 * 2. Setting the original task to Complete (for audit purposes)
 * 3. For period tasks, setting forceFull to true so the calculation re-runs fully
 * 4. Creating a new Pending task and sending it to the SQS queue
 *
 * @param {Object} params
 * @param {string} params.taskId - The ID of the task to re-run
 * @throws {Error} If the task is not found or if AWS operations fail
 */
MonitoringController.rerunTask = async ({ taskId, curveUser }) => {
  const task = await Task.findById(taskId);
  if (!task) { throw new Error('Task not found'); }
  if (task.value?.processState) { throw new Error(`Task is already being processed: ${task.value.processState}`); }

  const user = await User.findById(curveUser.id, 'email').lean();
  if (!user) throw new Error(`No user found ${curveUser.id}`);

  const { email } = user;

  await Task.findByIdAndUpdate(task._id, { $set: { 'value.processState': 'Re-running' } });

  // Resolve here so the route can respond immediately — AWS work runs in the background
  (async () => {
    try {
      // Create a new task and send to queue
      const taskToRerun = task.toObject();
      taskToRerun.status = 'Pending';
      taskToRerun.email = email;
      delete taskToRerun._id;
      delete taskToRerun.createdAt;
      delete taskToRerun.updatedAt;
      delete taskToRerun.metadata;
      const newTask = new Task(taskToRerun);

      const reason = `Task has been re-run by ${email} via the monitoring dashboard. The new Task ID is ${newTask._id.toString()}`;

      // Stop existing AWS processes
      await stopAwsProcesses({ task: task.toObject(), reason });

      // For period tasks, set forceFull so the calculation re-runs fully
      if (task.value?.periodId) {
        const period = await Period.findById(task.value.periodId);
        if (period) {
          period.forceFull = true;
          period.status = 'Complete';
          await period.save();
        }
      }

      await newTask.save();
      await Task.findByIdAndUpdate(task._id, { $set: { status: 'Complete', 'value.notes': reason, 'value.processState': null } });
      await TaskHelpers.sendTaskMessage(newTask);
    } catch (err) {
      logger.error(err);
      await Task.findByIdAndUpdate(task._id, { $set: { status: 'Errored', error: err.message, 'value.processState': null } }).catch(logger.error);
    }
  })();
};

module.exports = MonitoringController;
