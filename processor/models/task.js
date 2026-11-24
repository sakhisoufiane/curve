const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Task: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const taskSchema = schema;

taskSchema.plugin(mongoosePaginate);

taskSchema.pre('save', function (next) {
  const task = this;

  if (task.isNew) {
    task.environment = process.env.PROCESSOR_ENVIRONMENT || 'Development';
  }

  next();
});

const Task = mongoose.model(name, taskSchema);

module.exports = Task;
