const mongoose = require('@curveroyaltysystems/models/mongoose');
const { User: { name, schema } } = require('@curveroyaltysystems/models');

const userSchema = schema;

const User = mongoose.model(name, userSchema);
module.exports = User;
