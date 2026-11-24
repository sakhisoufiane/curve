const mongoose = require('@curveroyaltysystems/models/mongoose');
const { BatchTask: { name, schema } } = require('@curveroyaltysystems/models');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SQS = require('../libs/sqs');

const batchTaskSchema = schema;

// eslint-disable-next-line prefer-arrow-callback
batchTaskSchema.pre('save', async function (next) {
  const batchTask = this;
  const Period = require('./period');

  if (batchTask.isNew) {
    const { clientId, periodId } = batchTask;
    // Get the period SQS queue
    const { sqsBatchQueue: QueueUrl } = await Period.findById(periodId).select('sqsBatchQueue');
    // Create a new message containing the batch task id and add it to the period queue
    const message = { clientId, periodId, batchTaskId: batchTask._id.toString() };
    SQS.sendMessage(message, QueueUrl, (err) => {
      if (err) { logger.error(err); }
      next();
    });
  } else {
    next();
  }
});

const BatchTask = mongoose.model(name, batchTaskSchema);

module.exports = BatchTask;
