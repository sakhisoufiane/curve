const mongoose = require('@curveroyaltysystems/models/mongoose');
const { McpsNegative: { name, schema } } = require('@curveroyaltysystems/models');

// Set up model
const McpsNegative = mongoose.model(name, schema);

module.exports = McpsNegative;
