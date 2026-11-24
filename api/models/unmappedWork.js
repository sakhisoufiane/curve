const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { UnmappedWork } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const unmappedWorkSchema = UnmappedWork.schema;

unmappedWorkSchema.plugin(modelHistory, { mongoose, name: 'unmappedWorkPatches' });
unmappedWorkSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(UnmappedWork.name, unmappedWorkSchema);
