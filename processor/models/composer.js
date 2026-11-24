/**
 * @module composer
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Composer: { name, schema } } = require('@curveroyaltysystems/models');
const { ComposerPreSave, ComposerPostSave } = require('@curveroyaltysystems/curve-shared-logic');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const composerSchema = schema;

// Important: this must use function syntax, not an arrow function (so it can access the current composer)
composerSchema.pre('save', async function () {
  const Work = require('./work');
  try {
    await ComposerPreSave.preSave({ composer: this, Composer, Work });
  } catch (err) {
    logger.error('Error in Composer pre-save hook:', err);
    throw err;
  }
});

// Important: this must use function syntax, not an arrow function (so it can access the current composer)
composerSchema.post('save', async function () {
  const Client = require('./client');
  try {
    await ComposerPostSave.postSave({ composer: this, Composer, Client });
  } catch (err) {
    logger.error('Error in Composer post-save hook:', err);
  }
});

const Composer = mongoose.model(name, composerSchema);

module.exports = Composer;
