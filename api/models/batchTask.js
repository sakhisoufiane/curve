/**
 * @module batchTasks
 */
const { BatchTask } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const batchTaskSchema = BatchTask.schema;

batchTaskSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(BatchTask.name, batchTaskSchema);
