/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Work: { name, schema } } = require('@curveroyaltysystems/models');

const workSchema = schema;

/**
 * Work Mongoose model
 * @type {MongooseModel}
 */
const Work = mongoose.model(name, workSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Work;
