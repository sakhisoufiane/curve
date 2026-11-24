const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../../models/user');
const Task = require('../../models/task');

const TASK_NAME = 'Find Catalogue Duplicates';

async function runTaskForFindingDuplicates({ client, user, type }) {
  const curveUser = await User.findById(user.id, { email: 1 });

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: TASK_NAME,
    clientId: client._id.toString(),
    clientName: client.name,
    email: curveUser.email,
    value: {
      clientId: client._id.toString(),
      catalogueType: type,
    },
  });
}

module.exports = {
  runTaskForFindingDuplicates,
  TASK_NAME,
};
