const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliveryLog: { name, schema } } = require('@curveroyaltysystems/models');

const DeliveryLog = mongoose.model(name, schema);

module.exports = DeliveryLog;
