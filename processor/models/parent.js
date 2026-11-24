const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Parent: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const parentSchema = schema;

parentSchema.plugin(mongoosePaginate);

const Parent = mongoose.model(name, parentSchema);

module.exports = Parent;
