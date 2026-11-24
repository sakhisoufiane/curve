const mongoose = require('@curveroyaltysystems/models/mongoose');
const { UnmappedRelease: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const unmappedReleaseSchema = schema;

unmappedReleaseSchema.plugin(mongoosePaginate);

const UnmappedRelease = mongoose.model(name, unmappedReleaseSchema);

module.exports = UnmappedRelease;
