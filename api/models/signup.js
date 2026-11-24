const { Signup } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const signupSchema = Signup.schema;

signupSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(Signup.name, signupSchema);
