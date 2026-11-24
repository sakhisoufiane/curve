/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Release: { name, schema } } = require('@curveroyaltysystems/models');

const releaseSchema = schema;

/**
 * Release Mongoose model
 * @type {MongooseModel}
 */
const Release = mongoose.model(name, releaseSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Release;
