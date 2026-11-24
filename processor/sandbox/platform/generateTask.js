require('../../models/db');
const SalesFile = require('../../models/salesFile');
const Task = require('../../models/task');
const Client = require('../../models/client');

/**
 * Generates a task and returns the ID
 * @return {Promise<string>}
 */
const run = async () => {
  let salesFileId = process.argv[2];
  const salesFile = await SalesFile.findById(salesFileId);
  if (!salesFile) {
    throw new Error(`Sales file not found: ${salesFileId}`);
  }

  let clientId = salesFile.clientId;
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  const task = new Task({
    name: 'Sales File Ingest',
    clientId: clientId,
    clientName: client.name,
    priority: 1,
    status: 'Pending',
    value: {
      salesFileId: salesFile._id.toString(),
      user: 'internal',
    },
  });
  await task.save();
  return task._id.toString();
};

run()
  .then((taskId) => {
    console.log(`Task created: ${taskId}`);
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

