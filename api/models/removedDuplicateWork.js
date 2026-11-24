const { RemovedDuplicateWork } = require('@curveroyaltysystems/models');
const mongoose = require('@curveroyaltysystems/models/mongoose');

const removedDuplicateWorkSchema = RemovedDuplicateWork.schema;

module.exports = mongoose.model(RemovedDuplicateWork.name, removedDuplicateWorkSchema);
