/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
require('./libs/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { exportWorks } = require('./libs/works');
const { Task } = require('./models');

interface ExportTask {
  clientId: string;
  name: string;
  email: string;
  value: {
    clientId: string;
    filter?: {
      ids?: string[];
      filter?: Record<string, unknown>;
    };
  };
}

const runTask = async () => {
  try {
    const taskId = process.env.taskId || null;
    if (!taskId) throw Error('No taskId provided');


    const task = (await Task.findById(taskId).lean()) as ExportTask;
    if (!task) throw new Error(`Task not found: ${taskId}`);

    logger.info('Received Task:', task);

    if (task.name === 'Works Export') await runWorksExport(taskId, task);

    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
};

runTask();

async function runWorksExport(taskId: string, task: ExportTask): Promise<void> {
  const filter = task.value.filter?.ids?.length
    ? { clientId: task.value.clientId, _id: { $in: task.value.filter.ids } }
    : { clientId: task.value.clientId };

  const curveUser = {
    id: task.clientId,
    clientId: task.value.clientId,
    email: task.email,
  };

  await exportWorks(taskId, filter, curveUser);
}
