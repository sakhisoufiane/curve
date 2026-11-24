const _ = require('lodash');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../../models/user');
const Client = require('../../models/client');
const Task = require('../../models/task');
const { applyDateFilters } = require('../../libs/dateFilters');

const UnmappedReleaseController = this;

UnmappedReleaseController.exportUnmappedReleases = async ({ curveUser, body }) => {
  const user = await User.findById(curveUser.id, 'email').lean().exec();
  if (!user) throw new Error(`Could not find user with ${curveUser.id}`);
  const client = await Client.findById(curveUser.clientId, '_id name').lean().exec();
  if (!client) throw new Error(`Could not find client with ${curveUser.clientId}`);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Export Unmapped CSV',
    clientId: client._id,
    clientName: client.name,
    email: user.email,
    value: { type: 'release',
      clientId: curveUser.clientId,
      ids: body?.releaseIds,
      filter: !body?.releaseIds?.length && UnmappedReleaseController.paramsToFilterField({ ...body.filter }, curveUser),
    },
  });
};

UnmappedReleaseController.paramsToFilterField = (inputParams, user) => {
  const params = {};
  if (user.clientId) { params.clientId = user.clientId; }
  if (inputParams.salesFileIds) { params.salesFileId = { $in: inputParams.salesFileIds }; }
  if (String(inputParams.complete) === 'true') {
    params.complete = true;
  } else {
    params.complete = { $ne: true };
  }
  if (inputParams.text) {
    const regex = new RegExp(_.escapeRegExp(inputParams.text), 'i');
    params.$or = [{ title: { $regex: regex } }, { barcode: { $regex: regex } }, { catNo: { $regex: regex } }, { version: { $regex: regex } }];
  }
  const paramsWithDateFilters = applyDateFilters(inputParams, params);
  return paramsWithDateFilters;
};

module.exports = UnmappedReleaseController;
