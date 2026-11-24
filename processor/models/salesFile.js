/**
 * @module salesFile
 */
const mongoose = require('@curveroyaltysystems/models/mongoose');
const { SalesFile: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

/**
 * salesFileSchema schema
 * @constructor salesFileSchema
 */
const salesFileSchema = schema;

salesFileSchema.plugin(mongoosePaginate);

salesFileSchema.pre('save', function (next) {
  // Set partitionNo on create only
  if (this.isNew) {
    this.setPartitionNo();
  }
  next();
});

/**
 * Sets the partition number according to today's date
 *
 * @method
 */
salesFileSchema.methods.setPartitionNo = function () {
  // PartitionNo is set to number of months after Jan 2020
  const today = new Date();
  // Get year today and minus from 2020 to get no of years since 2020
  const yearDifference = today.getFullYear() - 2020;
  // Get today's month - this is 0 indexed
  const month = today.getMonth();
  // Add the two together using the 12 * years for each year that's passed
  this.partitionNo = (12 * yearDifference) + month;
};

const SalesFile = mongoose.model(name, salesFileSchema);

module.exports = SalesFile;
