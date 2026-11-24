const mongoosePaginate = require('mongoose-paginate-v2');
const { Sale } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const modelHistory = require('../libs/modelHistory');

const saleSchema = Sale.schema;

saleSchema.plugin(modelHistory, { mongoose, name: 'salePatches' });
saleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(Sale.name, saleSchema);
