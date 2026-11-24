const { IswcDeliveredWork } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const iswcDeliveredWorkSchema = IswcDeliveredWork.schema;

iswcDeliveredWorkSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(IswcDeliveredWork.name, iswcDeliveredWorkSchema);
