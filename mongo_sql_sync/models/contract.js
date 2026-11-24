const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Contract: { name, schema } } = require('@curveroyaltysystems/models');

const contractSchema = schema;

const Contract = mongoose.model(name, contractSchema);

module.exports = Contract;
