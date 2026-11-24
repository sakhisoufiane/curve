const { Escalation } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const escalationSchema = Escalation.schema;

escalationSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Escalation', escalationSchema);
