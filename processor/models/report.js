const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Report: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const reportSchema = schema;

reportSchema.plugin(mongoosePaginate);

const Report = mongoose.model(name, reportSchema);

module.exports = Report;
