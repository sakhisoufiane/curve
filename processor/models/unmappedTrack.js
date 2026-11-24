const mongoose = require('@curveroyaltysystems/models/mongoose');
const { UnmappedTrack: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const unmappedTrackSchema = schema;

unmappedTrackSchema.plugin(mongoosePaginate);

const UnmappedTrack = mongoose.model(name, unmappedTrackSchema);

module.exports = UnmappedTrack;
