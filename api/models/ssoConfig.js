const { SsoConfig } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(SsoConfig.name, SsoConfig.schema);
