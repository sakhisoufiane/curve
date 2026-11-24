/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Client: { name, schema } } = require('@curveroyaltysystems/models');

const clientSchema = schema;

/**
 * Client Mongoose model
 * @type {MongooseModel}
 */
const Client = mongoose.model(name, clientSchema);

/**
 * @type {MongooseModel}
 */
module.exports = Client;
