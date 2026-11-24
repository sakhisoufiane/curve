const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Release: { name, schema } } = require('@curveroyaltysystems/models');

const releaseSchema = schema;

const Release = mongoose.model(name, releaseSchema);

module.exports = Release;
