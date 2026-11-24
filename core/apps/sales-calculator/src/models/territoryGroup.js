/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {import('mongoose').Model} MongooseModel
 */

const mongoose = require('@curveroyaltysystems/models/mongoose');
const { TerritoryGroup: { name, schema } } = require('@curveroyaltysystems/models');

const territoryGroupSchema = schema;

/**
 * TerritoryGroup Mongoose model
 * @type {MongooseModel}
 */
const TerritoryGroup = mongoose.model(name, territoryGroupSchema);

/**
 * @type {MongooseModel}
 */
module.exports = TerritoryGroup;
