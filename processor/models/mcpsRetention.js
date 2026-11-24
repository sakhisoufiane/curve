const mongoose = require('@curveroyaltysystems/models/mongoose');
const { McpsRetention: { name, schema } } = require('@curveroyaltysystems/models');

const mcpsRetentionSchema = schema;

const McpsRetention = mongoose.model(name, mcpsRetentionSchema);

module.exports = McpsRetention;
