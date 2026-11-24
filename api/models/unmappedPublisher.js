const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { UnmappedPublisher: { name, schema } } = require('@curveroyaltysystems/models');

const unmappedPublisherSchema = schema;

unmappedPublisherSchema.plugin(mongoosePaginate);

const UnmappedPublisher = mongoose.model(name, unmappedPublisherSchema);

module.exports = UnmappedPublisher;
