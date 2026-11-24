const _ = require('lodash');
const { TaskHelpers } = require('@curveroyaltysystems/platform-shared-utils');
const User = require('../../models/user');
const Client = require('../../models/client');
const Task = require('../../models/task');
const { applyDateFilters } = require('../../libs/dateFilters');

const UnmappedTrackController = this;

UnmappedTrackController.exportUnmappedTracks = async ({ curveUser, body }) => {
  const user = await User.findById(curveUser.id, 'email').lean().exec();
  if (!user) throw new Error(`Could not find user with ${curveUser.id}`);
  const client = await Client.findById(curveUser.clientId, '_id name').lean().exec();
  if (!client) throw new Error(`Could not find client with ${curveUser.clientId}`);

  await TaskHelpers.createTaskAndSendMessage(Task, {
    name: 'Export Unmapped CSV',
    clientId: client._id,
    clientName: client.name,
    email: user.email,
    value: { type: 'track',
      clientId: curveUser.clientId,
      ids: body?.trackIds,
      filter: !body?.trackIds?.length && UnmappedTrackController.paramsToFilterField({ ...body.filter }, curveUser),
    },
  });
};

UnmappedTrackController.paramsToFilterField = (inputParams, user) => {
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
    params.$or = [{ title: { $regex: regex } }, { isrc: { $regex: regex } }, { version: { $regex: regex } }];
  }
  const paramsWithDateFilters = applyDateFilters(inputParams, params);
  return paramsWithDateFilters;
};

module.exports = UnmappedTrackController;
