const mongoose = require('@curveroyaltysystems/models/mongoose');
const { IswcDeliveredWork: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const iswcDeliveredWorkSchema = schema;

iswcDeliveredWorkSchema.plugin(mongoosePaginate);

const IswcDeliveredWork = mongoose.model(name, iswcDeliveredWorkSchema);

module.exports = IswcDeliveredWork;
