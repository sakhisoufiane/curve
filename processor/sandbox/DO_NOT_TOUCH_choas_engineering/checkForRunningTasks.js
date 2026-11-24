/* eslint-disable no-await-in-loop */
const { SFNClient, DescribeExecutionCommand } = require('@aws-sdk/client-sfn');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { connectToDb } = require('../../db/connect');

const Task = require('../../models/task');

const checkForRunningTasks = async () => {
  await connectToDb();

  const tasks = await Task
    .find({ status: 'In Progress' })
    .lean();

  for (const task of tasks) {
    const { stepFunctionExecutionId } = task.metadata;

    // Check for step function execution status
    const client = new SFNClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new DescribeExecutionCommand({
      executionArn: `arn:aws:states:eu-central-1:682397077070:execution:ProcessorTaskManagerStateMachine7A3928D7-p1ahNFVKTVXj:${stepFunctionExecutionId}`,
    });
    const { status } = await client.send(command);
    // logger.info(`Step function execution ${stepFunctionExecutionId} status: ${status}`);
    if (status === 'SUCCEEDED') {
      logger.info(`${task._id.toString()}Step function execution ${stepFunctionExecutionId}`);
    }
  }
};

checkForRunningTasks()
  .then(() => {
    logger.info('Tasks checked for running tasks');
    process.exit(0);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
