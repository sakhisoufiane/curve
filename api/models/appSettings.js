const { AppSettings } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(AppSettings.name, AppSettings.schema);
