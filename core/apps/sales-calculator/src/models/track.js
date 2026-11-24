/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Track: { name, schema } } = require('@curveroyaltysystems/models');

const trackSchema = schema;

/**
 * Track Mongoose model
 * @type {MongooseModel}
 */
const Track = mongoose.model(name, trackSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Track;
