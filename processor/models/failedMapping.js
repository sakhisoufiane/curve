const mongoose = require('@curveroyaltysystems/models/mongoose');
const { FailedMapping: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const failedMappingSchema = schema;

failedMappingSchema.plugin(mongoosePaginate);

const FailedMapping = mongoose.model(name, failedMappingSchema);

module.exports = FailedMapping;
