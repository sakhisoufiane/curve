const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Client: { name, schema } } = require('@curveroyaltysystems/models');

const clientSchema = schema;

const Client = mongoose.model(name, clientSchema);

module.exports = Client;
