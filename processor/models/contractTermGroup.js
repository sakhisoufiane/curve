const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ContractTermGroup: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const contractTermGroupSchema = schema;

contractTermGroupSchema.plugin(mongoosePaginate);

const ContractTermGroup = mongoose.model(name, contractTermGroupSchema);

module.exports = ContractTermGroup;
