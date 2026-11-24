const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliveredWork: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const deliveredWorkSchema = schema;

deliveredWorkSchema.plugin(mongoosePaginate);

const DeliveredWork = mongoose.model(name, deliveredWorkSchema);

module.exports = DeliveredWork;
