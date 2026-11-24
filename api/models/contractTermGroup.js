const { ContractTermGroup: { name, schema } } = require('@curveroyaltysystems/models');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const contractTermGroupSchema = schema;

contractTermGroupSchema.plugin(modelHistory, { mongoose, name: 'contractTermGroupPatches', useArchive: true, removePatches: true });
contractTermGroupSchema.plugin(mongoosePaginate);

contractTermGroupSchema.pre('save', function (next) {
  const Client = require('./client');
  // remove any blank items
  this.items = this.items.filter(Boolean);
  const typeMappings = {
    'Distribution Channel': 'distributionChannels',
    Configuration: 'configurations',
    'Price Category': 'priceCategories',
    Source: 'sources',
    'Cost Type': 'costTypes',
  };
  const groupType = this.type;
  const typeName = this.name;
  if (typeName.toUpperCase() === 'ALL') next(new Error('Invalid configuration: The term "All" is not allowed. Please remove it from your client configuration'));
  // get client data
  Client.findById(this.clientId)
    .then((client) => {
      // check group type has a mapping
      if (Object.prototype.hasOwnProperty.call(typeMappings, groupType)) {
        // and ensure the supplied term group name does not exist in the relevant terms list
        if (client[typeMappings[groupType]].map((item) => item.toUpperCase()).includes(typeName.toUpperCase())) {
          next(new Error(`The provided name: ${typeName} is disallowed as it either matches a reserved term or a term used as an existing configuration in your ${groupType}`));
        } else {
          next();
        }
      } else {
        next();
      }
    })
    .catch((err) => {
      logger.error(`Error finding client in contractTermGroup with contractTermGroup.clientId '${this.clientId}': ${err}`);
      next();
    });
});

const ContractTermGroup = mongoose.model(name, contractTermGroupSchema);

module.exports = ContractTermGroup;
