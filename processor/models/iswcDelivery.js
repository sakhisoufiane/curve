/**
 * @module iswcDelivery
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { IswcDelivery: { name, schema } } = require('@curveroyaltysystems/models');

const IswcDelivery = mongoose.model(name, schema);

module.exports = IswcDelivery;
