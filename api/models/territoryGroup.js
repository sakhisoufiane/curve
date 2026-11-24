const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { TerritoryGroup } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');
const TerritoryGroupController = require('../controllers/territoryGroup');

const territoryGroupSchema = TerritoryGroup.schema;

territoryGroupSchema.plugin(modelHistory, { mongoose, name: 'territoryGroupPatches', useArchive: true, removePatches: true });
territoryGroupSchema.plugin(mongoosePaginate);

territoryGroupSchema.pre('save', async function (next) {
  const territoryGroup = this;
  try {
    if (!territoryGroup.name) {
      const error = new Error('A name is required.');
      return next(error);
    }
    const isDisallowed = TerritoryGroupController.isNameDisallowed(territoryGroup.name);
    if (isDisallowed) {
      const error = new Error('The provided name is disallowed as it matches a territory code, name, or continent.');
      return next(error);
    }
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model(TerritoryGroup.name, territoryGroupSchema);
