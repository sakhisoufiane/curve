/**
 * @module FixedReport
 */
const { FixedReport } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const fixedReportSchema = FixedReport.schema;

fixedReportSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(FixedReport.name, fixedReportSchema);
