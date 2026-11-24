/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

/**
 * @module composer
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Composer: { name, schema } } = require('@curveroyaltysystems/models');

const composerSchema = schema;

/**
 * Composer Mongoose model
 * @type {MongooseModel}
 */
const Composer = mongoose.model(name, composerSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Composer;
