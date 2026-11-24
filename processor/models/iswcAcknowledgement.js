/**
 * @module iswcAcknowledgement
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { IswcAcknowledgement: { name, schema } } = require('@curveroyaltysystems/models');

const IswcAcknowledgement = mongoose.model(name, schema);

module.exports = IswcAcknowledgement;
