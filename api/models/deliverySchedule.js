const { DeliverySchedule } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const deliveryScheduleSchema = DeliverySchedule.schema;

deliveryScheduleSchema.plugin(modelHistory, { mongoose, name: 'deliverySchedulePatches' });
deliveryScheduleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(DeliverySchedule.name, deliveryScheduleSchema);
