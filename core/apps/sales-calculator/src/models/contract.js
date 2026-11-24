/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Contract: { name, schema } } = require('@curveroyaltysystems/models');

const contractSchema = schema;

/**
 * Contract Mongoose model
 * @type {MongooseModel}
 */
const Contract = mongoose.model(name, contractSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Contract;
