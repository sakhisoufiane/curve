const mongoose = require('@curveroyaltysystems/models/mongoose');
const { UnmappedWork: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const unmappedWorkSchema = schema;

unmappedWorkSchema.plugin(mongoosePaginate);

const UnmappedWork = mongoose.model(name, unmappedWorkSchema);

module.exports = UnmappedWork;
