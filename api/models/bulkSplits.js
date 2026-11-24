/**
 * @module bulkSplits
 */
const { BulkSplits } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const bulkSplitsSchema = BulkSplits.schema;

bulkSplitsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(BulkSplits.name, bulkSplitsSchema);
