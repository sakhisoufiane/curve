/**
 * @module publisher
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Publisher: { name, schema } } = require('@curveroyaltysystems/models');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { PublisherPreSave, PublisherPostSave } = require('@curveroyaltysystems/curve-shared-logic');

const Client = require('./client');

const publisherSchema = schema;

// Important: this must use function syntax, not an arrow function (so it can access the current publisher)
publisherSchema.pre('save', async function () {
  try {
    await PublisherPreSave.preSave({ publisher: this, Publisher });
  } catch (err) {
    logger.error('Error in Publisher pre-save hook:', err);
    throw err;
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current publisher)
publisherSchema.post('save', async function () {
  try {
    await PublisherPostSave.postSave({ publisher: this, Publisher, Client });
  } catch (err) {
    logger.error('Error in Publisher post-save hook:', err);
  }
});

const Publisher = mongoose.model(name, publisherSchema);
module.exports = Publisher;
