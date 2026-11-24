const mongoose = require('@curveroyaltysystems/models/mongoose');
const { DeliveryPartner: { name, schema } } = require('@curveroyaltysystems/models');

const deliveryPartnerSchema = schema;

const DeliveryPartner = mongoose.model(name, deliveryPartnerSchema);

module.exports = DeliveryPartner;
