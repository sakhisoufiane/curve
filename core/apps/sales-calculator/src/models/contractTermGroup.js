/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { ContractTermGroup: { name, schema } } = require('@curveroyaltysystems/models');

const contractTermGroupSchema = schema;

/**
 * ContractTermGroup Mongoose model
 * @type {MongooseModel}
 */
const ContractTermGroup = mongoose.model(name, contractTermGroupSchema);

/**
 * @type {MongooseModel}
 */
module.exports = ContractTermGroup;
