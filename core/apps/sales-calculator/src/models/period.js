/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Period: { name, schema } } = require('@curveroyaltysystems/models');

const periodSchema = schema;

/**
 * Period Mongoose model
 * @type {MongooseModel}
 */
const Period = mongoose.model(name, periodSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Period;
