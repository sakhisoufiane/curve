const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Import } = require('@curveroyaltysystems/models');

const importModel = mongoose.model(Import.name, Import.schema);

module.exports = importModel;
