const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { Task } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const taskSchema = Task.schema;

taskSchema.plugin(modelHistory, { mongoose, name: 'taskPatches' });
taskSchema.plugin(mongoosePaginate);

taskSchema.pre('save', function (next) {
  const task = this;

  if (task.isNew) {
    task.environment = process.env.PROCESSOR_ENVIRONMENT || 'Development';
  }

  next();
});

module.exports = mongoose.model(Task.name, taskSchema);
