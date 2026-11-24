/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Escalation: { name, schema } } = require('@curveroyaltysystems/models');

const escalationSchema = schema;

/**
 * Escalation Mongoose model
 * @type {MongooseModel}
 */
const Escalation = mongoose.model(name, escalationSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Escalation;
