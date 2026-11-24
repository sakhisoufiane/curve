const axios = require('axios');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const { logger } = require('@curveroyaltysystems/logger');

// const { connectToDb } = require('./db/connect');
require('./models/db');
const Task = require('./models/task');

const { Jobs } = require('./jobs');

/**
 * Get the Task ID of the current Fargate Task
 * @returns {Promise<{ taskArn: string, imageTag: string, imageId: string } | undefined>} The Fargate Information
 */
const getFargateInformation = async () => {
  // Fargate injects this Env Var into the container
  const { ECS_CONTAINER_METADATA_URI_V4 } = process.env;
  if (!ECS_CONTAINER_METADATA_URI_V4) return;

  const response = await axios.get(`${ECS_CONTAINER_METADATA_URI_V4}/task`).catch(logger.error);
  return {
    taskArn: response?.data?.TaskARN,
    imageTag: response?.data?.Containers?.[0]?.Image,
    imageId: response?.data?.Containers?.[0]?.ImageID,
  };
};

/**
 * Run a Task by ID in AWS Batch environment
 */
const runTask = async () => {
  const startTime = moment();

  const batchTaskId = process.env.AWS_BATCH_JOB_ID;
  logger.addToContext({ awsBatchJobId: batchTaskId });

  // Get Task ID
  const taskId = process.env.TASK_ID;
  if (!taskId) throw new Error('Task ID is not set');
  logger.addToContext({ taskId });

  logger.info(`Found Task ID in Environment: ${taskId}`);

  const task = await Task.findById(new ObjectId(taskId)).catch((error) => {
    throw new Error(`Failed to find task ${taskId}`, error);
  });
  if (!task) throw new Error(`Task ${taskId} not found`);

  logger.info(`Found Task To Process: ${JSON.stringify(task)}`);

  const fargateInfo = await getFargateInformation();

  try {
    // Update task to In Progress
    const updateData = {
      status: 'In Progress',
      taskArn: fargateInfo?.taskArn,
      $set: {
        'metadata.image.tag': fargateInfo?.imageTag,
        'metadata.image.id': fargateInfo?.imageId,
        'metadata.awsBatchJobId': batchTaskId,
      },
    };

    await Task.findByIdAndUpdate(taskId, updateData).catch((error) => {
      throw new Error(`Failed to update task ${taskId} to In Progress`, error);
    });

    // Find the job function
    /** @type {(task: any) => Promise<void>} */
    // TODO Edge case where Support Script is defined in the type and not the name. Need to normalise this with other Tasks.
    const job = task.type === 'Support Script' ? Jobs[task.type] : Jobs[task.name];
    if (!job) throw new Error(`Job ${task.name} not found`);

    // Run the job
    await job(task);

    // If Task is running on Platform, the post processor will set the Task state complete or failed.
    if (task.value?.runningOn === 'Platform') return;

    // Update task to Complete
    await Task.findByIdAndUpdate(taskId, {
      status: 'Complete',
      duration: moment().diff(startTime, 'milliseconds'),
    }).catch((error) => {
      throw new Error(`Failed to update task ${taskId} to Complete`, error);
    });
  } catch (error) {
    // Update task to Errored and error
    // Serialize the error to avoid "Cannot convert circular structure to BSON"
    const serializedError = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };

    await Task.findByIdAndUpdate(taskId, {
      status: 'Errored',
      error: serializedError,
      duration: moment().diff(startTime, 'milliseconds'),
    }).catch((updateError) => {
      throw new Error(`Failed to update task ${taskId} to Errored ${updateError.message} with error:`, error);
    });

    throw error;
  }
};

const gracefulShutdown = async () => {
  await logger.flush();
};

logger.runInContext({}, () => runTask()
  .then(async () => {
    logger.info('Process Task Completed');
    await gracefulShutdown();
    process.exit(0);
  })
  .catch((error) => {
    // Output structured error information for Step Functions to capture
    const errorPayload = {
      // These env vars are injected at Runtime by AWS
      taskId: process.env.TASK_ID,
      awsBatchJobId: process.env.AWS_BATCH_JOB_ID,
      awsBatchJobName: process.env.AWS_BATCH_JOB_NAME,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      timestamp: moment().toISOString(),
    };

    // eslint-disable-next-line no-restricted-syntax
    console.error('BATCH_ERROR_PAYLOAD:', JSON.stringify(errorPayload));

    // Exit with non-zero code so AWS Batch reports failure
    process.exit(1);
  }));
