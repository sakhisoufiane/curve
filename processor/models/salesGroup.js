const mongoose = require('@curveroyaltysystems/models/mongoose');
const { SalesGroup: { name, schema } } = require('@curveroyaltysystems/models');

const salesGroupSchema = schema;

const SalesGroup = mongoose.model(name, salesGroupSchema);

module.exports = SalesGroup;
