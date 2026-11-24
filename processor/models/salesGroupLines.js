const mongoose = require('@curveroyaltysystems/models/mongoose');
const { SalesGroupLines: { name, schema } } = require('@curveroyaltysystems/models');

const salesGroupLinesSchema = schema;

const SalesGroupLines = mongoose.model(name, salesGroupLinesSchema);

module.exports = SalesGroupLines;
