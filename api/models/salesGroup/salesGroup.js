const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { SalesGroup: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../../libs/modelHistory');
const SalesGroupLines = require('../salesGroupLines');

const salesGroupSchema = schema;

salesGroupSchema.plugin(modelHistory, { mongoose, name: 'salesGroupPatches' });
salesGroupSchema.plugin(mongoosePaginate);

salesGroupSchema.pre('save', async function (next) {
  const salesGroup = this;
  try {
    const docs = await SalesGroupLines.find({ clientId: salesGroup.clientId, salesGroupId: salesGroup._id }, { salesLineIds: 1 }).lean();
    salesGroup.totalSalesLines = docs.reduce((sum, doc) => sum + doc.salesLineIds.length, 0);
    salesGroup.updatedAt = new Date();
    next();
  } catch (err) {
    next(err);
  }
});

const SalesGroup = mongoose.model(name, salesGroupSchema);

module.exports = SalesGroup;
