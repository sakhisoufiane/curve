/**
 * @module ExchangeRate
 */
const { ExchangeRate } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(ExchangeRate.name, ExchangeRate.schema);
