/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { BatchTask: { name, schema } } = require('@curveroyaltysystems/models');

const batchTaskSchema = schema;

/**
 * BatchTask Mongoose model
 * @type {MongooseModel}
 */
const BatchTask = mongoose.model(name, batchTaskSchema);

/**
 * @type {MongooseModel}
 */
module.exports = BatchTask;
