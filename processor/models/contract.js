const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Contract: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const contractSchema = schema;

contractSchema.plugin(mongoosePaginate);

const Contract = mongoose.model(name, contractSchema);

module.exports = Contract;
