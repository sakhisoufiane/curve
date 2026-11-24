const { ImportPartner } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

module.exports = mongoose.model(ImportPartner.name, ImportPartner.schema);
