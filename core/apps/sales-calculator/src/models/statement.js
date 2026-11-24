/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Statement: { name, schema } } = require('@curveroyaltysystems/models');

const statementSchema = schema;

/**
 * Statement Mongoose model
 * @type {MongooseModel}
 */
const Statement = mongoose.model(name, statementSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Statement;
