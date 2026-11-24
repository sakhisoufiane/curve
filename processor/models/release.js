const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Release: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const {
  preSaveLogic,
  postSaveErrorHandling,
  postSaveLogic,
} = require('../controllers/release');

const releaseSchema = schema;

releaseSchema.pre('save', function (next) {
  preSaveLogic({ next, release: this });
});

releaseSchema.post('save', (err, savedRelease, next) => {
  postSaveErrorHandling({ err, next });
});

releaseSchema.post('save', function (savedRelease, next) {
  postSaveLogic({ next, release: this });
});

releaseSchema.plugin(mongoosePaginate);

const Release = mongoose.model(name, releaseSchema);

module.exports = Release;
