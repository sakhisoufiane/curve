const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Track: { name, schema } } = require('@curveroyaltysystems/models');

const trackSchema = schema;

const Track = mongoose.model(name, trackSchema);

module.exports = Track;
