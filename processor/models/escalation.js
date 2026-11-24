const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Escalation: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');

const escalationSchema = schema;

escalationSchema.plugin(mongoosePaginate);

const Escalation = mongoose.model(name, escalationSchema);

module.exports = Escalation;
