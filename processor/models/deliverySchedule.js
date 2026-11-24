const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliverySchedule: { name, schema } } = require('@curveroyaltysystems/models');

const DeliverySchedule = mongoose.model(name, schema);

module.exports = DeliverySchedule;
