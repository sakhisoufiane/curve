const { ImportPartner } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const importPartnerSchema = ImportPartner.schema;

importPartnerSchema.plugin(modelHistory, { mongoose, name: 'importPartnerPatches' });
importPartnerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(ImportPartner.name, importPartnerSchema);
