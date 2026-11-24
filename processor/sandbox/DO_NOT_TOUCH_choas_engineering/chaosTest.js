/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
// Libs
const SQS = require('../../libs/sqs');
const { connectToDb } = require('../../db/connect');
// Models
const Task = require('../../models/task');
const Period = require('../../models/period');
const Client = require('../../models/client');
const Statement = require('../../models/statement');
const SalesFile = require('../../models/salesFile');

// Constants
const LIMIT = 20;
const CLIENT_LIMIT = 100;

const createSqsMessage = (task) => new Promise((resolve, reject) => {
  SQS.sendMessage(task, 1, (err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
});

const chaosThisClient = async (client) => {
  const clientId = client._id.toString();
  const query = { clientId, $or: [{ status: 'Complete' }, { status: 'Errored' }] };
  const select = { _id: 1, clientId: 1 };

  // Chaos Sales Files
  const salesFiles = await SalesFile
    .find(query)
    .select(select)
    .limit(LIMIT)
    .lean();

  logger.info(`🚨 ${client.name}: running ${salesFiles.length} sales files...`);

  await Promise.all(salesFiles.map(async (salesFile) => {
    const task = new Task({
      name: 'Sales File Ingest',
      clientId: salesFile.clientId,
      clientName: client.name,
      priority: 1,
      status: 'Pending',
      value: {
        salesFileId: salesFile._id.toString(),
        user: 'internal',
      },
    });
    await task.save();
    await createSqsMessage(task);
  }));

  // Choas Periods
  const periods = await Period
    .find(query)
    .select(select)
    .limit(1)
    .lean();

  logger.info(`🚨 ${client.name}: running ${periods.length} periods...`);
  await Promise.all(periods.map(async (period) => {
    const task = new Task({
      name: 'Process Period',
      clientId: period.clientId,
      clientName: client.name,
      status: 'Pending',
      value: { periodId: period._id.toString() },
    });
    await task.save();
    await createSqsMessage(task);
  }));

  // Chaos Statements
  const statements = await Statement
    .find({
      clientId,
      periodId: { $nin: periods.map((period) => period._id.toString()) },
    })
    .select(select)
    .limit(LIMIT)
    .lean();

  logger.info(`🚨 ${client.name}: running ${statements.length} statements...`);
  await Promise.all(statements.map(async (statement) => {
    const task = new Task({
      name: 'Process Statement',
      clientId: statement.clientId,
      clientName: client.name,
      status: 'Pending',
      value: { statementId: statement._id.toString() },
    });
    await task.save();
    await createSqsMessage(task);
  }));
};

const run = async () => {
  await connectToDb();

  const clients = await Client.find({ name: { $not: /gelo/i } }).limit(CLIENT_LIMIT).lean();
  if (!clients?.length) throw new Error('No clients found');

  logger.info(`🥵 Chaos Baby: ${clients.length} clients to chaos`);

  for (const client of clients) {
    if (client.name.includes('Gelo')) continue;
    logger.info(`🚀 Chaos Baby: Chasing ${client.name}...`);
    await chaosThisClient(client);
  }
};

run()
  .then(() => {
    logger.info('Chaos Test has completed');
    process.exit(0);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
