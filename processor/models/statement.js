const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Statement: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const DeleteAssociations = require('../libs/calculation/statement/deleteAssociations');

const statementSchema = schema;

statementSchema.plugin(mongoosePaginate);

// Delete Processes
statementSchema.pre('deleteOne', { document: true }, function (next) {
  DeleteAssociations.deleteAssociations(this, next);
});

const Statement = mongoose.model(name, statementSchema);

module.exports = Statement;
