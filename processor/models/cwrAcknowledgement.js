const mongoose = require('@curveroyaltysystems/models/mongoose');
const { CwrAcknowledgement: { name, schema } } = require('@curveroyaltysystems/models');

const CwrAcknowledgement = mongoose.model(name, schema);

module.exports = CwrAcknowledgement;
