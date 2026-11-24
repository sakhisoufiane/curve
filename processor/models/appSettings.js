const mongoose = require('@curveroyaltysystems/models/mongoose');
const { AppSettings: { name, schema } } = require('@curveroyaltysystems/models');

const appSettingsSchema = schema;

const AppSettings = mongoose.model(name, appSettingsSchema);

module.exports = AppSettings;
