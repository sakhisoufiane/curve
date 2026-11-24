const mongoose = require('@curveroyaltysystems/models/mongoose');
const { CwrDelivery } = require('@curveroyaltysystems/models');

const cwrDelivery = mongoose.model(CwrDelivery.name, CwrDelivery.schema);

module.exports = cwrDelivery;
