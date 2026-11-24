const { fileManager } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Parent } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const parentSchema = Parent.schema;

parentSchema.plugin(modelHistory, { mongoose, name: 'parentPatches' });
parentSchema.plugin(mongoosePaginate);

parentSchema.post('init', (parent) => {
  if (parent.darkLogo) {
    fileManager.publicS3Link(parent.darkLogo, (err, link) => {
      parent.publicDarkLogo = link;
    });
  }
  if (parent.lightLogo) {
    fileManager.publicS3Link(parent.lightLogo, (err, link) => {
      parent.publicLightLogo = link;
    });
  }
  if (parent.favicon) {
    fileManager.publicS3Link(parent.favicon, (err, link) => {
      parent.publicFavicon = link;
    });
  }
});

module.exports = mongoose.model(Parent.name, parentSchema);
