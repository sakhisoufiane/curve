const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { SFNClient, StopExecutionCommand } = require('@aws-sdk/client-sfn');
const { BatchClient, TerminateJobCommand } = require('@aws-sdk/client-batch');
const { connectToDb } = require('../../db/connect');
// Models
const Task = require('../../models/task');

const killStepFunctionExecution = async (executionId) => {
  const client = new SFNClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const command = new StopExecutionCommand({
    executionArn: `arn:aws:states:eu-central-1:682397077070:execution:ProcessorTaskManagerStateMachine7A3928D7-p1ahNFVKTVXj:${executionId}`,
  });
  await client.send(command);
};

const killBatchJob = async (jobId) => {
  const client = new BatchClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new TerminateJobCommand({
    jobId,
    reason: 'Task execution purged',
  });
  await client.send(command);
};

const purgeTaskExecutions = async () => {
  await connectToDb();

  const tasks = await Task.find({ status: { $ne: 'Complete' } }).lean();
  logger.info(`Found ${tasks.length} tasks to purge`);

  const stepFunctionExecutionIds = tasks.map((task) => task.metadata.awsStepFunctionExecutionId);
  const awsBatchJobIds = tasks.map((task) => task.metadata.awsBatchJobId);

  logger.info(`Found ${stepFunctionExecutionIds.length} step function execution IDs to purge`);

  await Promise.all([
    ...stepFunctionExecutionIds
      .filter((stepFunctionExecutionId) => stepFunctionExecutionId)
      .map((stepFunctionExecutionId) => killStepFunctionExecution(stepFunctionExecutionId)),

    ...awsBatchJobIds
      .filter((awsBatchJobId) => awsBatchJobId)
      .map((awsBatchJobId) => killBatchJob(awsBatchJobId)),
  ]);

  const response = await Task.deleteMany({ status: { $ne: 'Complete' } });
  logger.info('Deleted tasks', response);
};

purgeTaskExecutions()
  .then(() => {
    logger.info('Purge Task Executions has completed');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Purge Task Executions has failed', err);
    process.exit(1);
  });
