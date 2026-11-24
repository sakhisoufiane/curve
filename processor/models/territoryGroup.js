const mongoose = require('@curveroyaltysystems/models/mongoose');
const { TerritoryGroup: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const territoryGroupSchema = schema;

territoryGroupSchema.plugin(mongoosePaginate);

const TerritoryGroup = mongoose.model(name, territoryGroupSchema);

module.exports = TerritoryGroup;
