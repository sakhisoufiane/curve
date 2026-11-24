const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { IswcDelivery } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const iswcDeliverySchema = IswcDelivery.schema;

iswcDeliverySchema.plugin(modelHistory, { mongoose, name: 'iswcDeliveryPatches' });
iswcDeliverySchema.plugin(mongoosePaginate);

module.exports = mongoose.model(IswcDelivery.name, iswcDeliverySchema);
