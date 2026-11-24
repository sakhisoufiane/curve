const { IswcAcknowledgement } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const modelHistory = require('../libs/modelHistory');

const iswcAcknowledgementSchema = IswcAcknowledgement.schema;

iswcAcknowledgementSchema.plugin(modelHistory, { mongoose, name: 'iswcAcknowledgementPatches' });
iswcAcknowledgementSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(IswcAcknowledgement.name, iswcAcknowledgementSchema);
