/**
 * @module FixedReport
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { FixedReport: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const fixedReportSchema = schema;

fixedReportSchema.plugin(mongoosePaginate);
const FixedReport = mongoose.model(name, fixedReportSchema);

module.exports = FixedReport;
