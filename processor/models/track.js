const mongoose = require('@curveroyaltysystems/models/mongoose');
const { Track: { name, schema } } = require('@curveroyaltysystems/models');
const mongoosePaginate = require('mongoose-paginate');
const {
  preSaveLogic,
  postSaveErrorHandling,
  postSaveLogic,
  copyValues,
} = require('../controllers/track');

const trackSchema = schema;

trackSchema.pre('save', function (next) {
  preSaveLogic({ next, track: this });
});

trackSchema.post('save', (err, savedTrack, next) => {
  postSaveErrorHandling({ err, next });
});

trackSchema.post('save', function (savedTrack, next) {
  postSaveLogic({ next, track: this });
});

trackSchema.plugin(mongoosePaginate);

const Track = mongoose.model(name, trackSchema);

// Required to be defined on the Track model by catalogueInheritance/work in CSL
// This needs to remain until that consuming function is updated
Track.prototype.copyValues = function (track, clientId, callback) {
  copyValues({ track: this, trackToCopy: track, clientId }, callback);
};

module.exports = Track;
