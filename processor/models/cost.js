const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Cost: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const costSchema = schema;

costSchema.plugin(mongoosePaginate);

costSchema.post('init', (cost) => {
  if (cost.calculationContractIds && cost.calculationContractIds.length > 0) {
    cost.reportedStatus = 'Complete';
  } else {
    cost.reportedStatus = 'Unreported';
  }
});

const Cost = mongoose.model(name, costSchema);

module.exports = Cost;
