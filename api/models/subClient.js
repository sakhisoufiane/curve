const { SubClient } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const subClientSchema = SubClient.schema;

subClientSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(SubClient.name, subClientSchema);
