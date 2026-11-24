/* eslint-disable no-unreachable */
/* eslint-disable no-multiple-empty-lines */
/* eslint-disable padded-blocks */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Period: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const periodSchema = schema;

periodSchema.plugin(mongoosePaginate);

const Period = mongoose.model(name, periodSchema);

module.exports = Period;
