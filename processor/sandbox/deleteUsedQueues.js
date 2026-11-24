/* eslint-disable no-promise-executor-return */
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const fs = require('fs');
const appRootDir = require('app-root-dir').get();
const _ = require('lodash');
const async = require('async');

const { makeTmpDir } = require('@curveroyaltysystems/platform-shared-utils/libs/testUtils');
const Period = require('../models/period');
const Task = require('../models/task');
const SQS = require('../libs/sqs');

// Environment queues (should be left unchanged)
const envQueues = [
  // Main dev queues
  process.env.SQS_queue_1,
  process.env.SQS_queue_2,
  // Lambdas/fuga-youtube
  // Lambdas/rasa-statements
  // Lambdas/staging-delete-clients
];
const envName = process.env.environmentName;
const hasForceFlag = process.argv?.[2] === '--force';

async function main() {
  // Fetch all queues
  logger.info('Fetching all queues in current environment:', envName);
  const { QueueUrls: queues } = await new Promise((resolve, reject) => {
    SQS.getQueues((err, queues) => (err ? reject(err) : resolve(queues)));
  });
  logger.info('Retrieved queues:', queues.length);

  // Fetch active Period tasks
  logger.info('Checking active tasks');
  const tasks = await Task.find({ name: 'Process Period', status: ['Pending', 'In Progress'] }, {
    clientId: 1,
    value: 1,
    createdAt: 1,
  }).lean();
  logger.info('Active "Process Period" tasks:', tasks.length);

  // Work out which queues to exclude and which to delete
  const excludePeriodQueues = tasks.map((task) => queues.filter((url) => url.includes(task.value.periodId)));
  const exclude = envQueues.concat(...excludePeriodQueues);

  let queuesToDelete = queues.filter((url) => !exclude.includes(url));

  // Check the Periods for the queues to delete
  const periodIds = queuesToDelete.map((url) => {
    const match = url.match(/\/([a-f0-9]{24})-/i);
    if (!match) {
      logger.info("!!! Queue doesn't match period format, excluding from deletion:", url);
      exclude.push(url);
      return null;
    }
    return match[1];
  });
  const uniquePeriodIds = _.uniq(periodIds);
  const periods = await Period.find({ _id: uniquePeriodIds }, 'status').lean();

  queuesToDelete = queuesToDelete.filter((url) => !exclude.includes(url));
  logger.info('Queues to delete:', queuesToDelete.length);
  logger.info('-- for Periods that exist in the db:', periods.length);
  logger.info('-- for non-existent Periods (or other queue types):', periodIds.length - periods.length);

  logger.info('Queues to exclude from deletion:', exclude, 'Count:', exclude.length);

  // Write queues to delete to a file for review
  makeTmpDir(`${appRootDir}/tmp`);
  fs.writeFileSync(`${appRootDir}/tmp/queues.txt`, queuesToDelete.join('\n'));
  logger.info('Queues to delete written to:', `${appRootDir}/tmp/queues.txt`);

  fs.writeFileSync(`${appRootDir}/tmp/exclude-queues.txt`, exclude.join('\n'));
  logger.info('Queues to exclude from deletion written to:', `${appRootDir}/tmp/exclude-queues.txt`);

  if (queuesToDelete.length === 0) {
    logger.info('No queues to delete - none remaining or are unrelated to Periods');
    logger.info('Finished');
    return process.exit();
  }

  if (!hasForceFlag) {
    logger.info('To delete the queues as well, use the --force flag');
    logger.info('Finished');
    return process.exit();
  }

  logger.info('Warning! Deleting queues in:', envName);
  let index = 0;
  await async.eachLimit(queuesToDelete, 5, async (queueUrl) => {
    if (index > 0 && index % 100 === 0) {
      logger.info('Queues to delete remaining:', queuesToDelete.length - index);
    }
    logger.info('Deleting queue:', queueUrl);
    await deleteQueue(queueUrl);
    index += 1;
  });

  logger.info('Finished (with deletion)');
  process.exit();
}

async function deleteQueue(queueUrl) {
  return SQS.deleteQueue(queueUrl);
}

main();
