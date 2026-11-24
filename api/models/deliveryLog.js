const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliveryLog } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate-v2');

const deliveryLog = DeliveryLog.schema;

deliveryLog.plugin(mongoosePaginate);

module.exports = mongoose.model(DeliveryLog.name, deliveryLog);
