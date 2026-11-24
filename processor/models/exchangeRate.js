/**
 * @module ExchangeRate
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ExchangeRate: { name, schema } } = require('@curveroyaltysystems/models');

const ExchangeRate = mongoose.model(name, schema);

module.exports = ExchangeRate;
