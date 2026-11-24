const { DeliveredWork } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const deliveredWorkSchema = DeliveredWork.schema;

deliveredWorkSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(DeliveredWork.name, deliveredWorkSchema);
