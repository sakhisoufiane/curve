const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { UnmappedTrack: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const unmappedTrackSchema = schema;

unmappedTrackSchema.plugin(modelHistory, { mongoose, name: 'unmappedTrackPatches' });
unmappedTrackSchema.plugin(mongoosePaginate);

unmappedTrackSchema.methods.checkForCompletion = async function (previousUnmappedTrack) {
  const unmappedTrack = this;
  if (unmappedTrack.trackId && !previousUnmappedTrack?.trackId) {
    unmappedTrack.complete = true;
    await unmappedTrack.save();
    await unmappedTrack.mapTrack();
  } else if (unmappedTrack.trackId !== previousUnmappedTrack.trackId) {
    // Check previous aliases if releaseId is null
    await unmappedTrack.checkPreviousTrackAliases(previousUnmappedTrack);
  }
};

unmappedTrackSchema.methods.checkPreviousTrackAliases = async function (previousUnmappedTrack) {
  const Track = require('./track');
  const unmappedTrack = this;
  const filteredAliases = [];

  const track = await Track.findById(previousUnmappedTrack.trackId);
  if (!Array.isArray(track?.aliases)) { return; }

  track.aliases.forEach((alias) => {
    if (unmappedTrack.isrc !== alias) { filteredAliases.push(alias); }
  });

  track.aliases = filteredAliases;

  if (!unmappedTrack.trackId) {
    unmappedTrack.complete = false;
  } else {
    unmappedTrack.complete = true;
  }

  await track.save();
  await unmappedTrack.save();
  await unmappedTrack.mapTrack();
};

unmappedTrackSchema.methods.mapTrack = async function () {
  const Track = require('./track');
  const unmappedTrack = this;
  if (unmappedTrack.trackId) {
    const track = await Track.findById(unmappedTrack.trackId);
    if (track) {
      track.aliases.push(UnmappedTrack.foundIdentifier(this));
      await track.save();
    }
  }
};

unmappedTrackSchema.statics.foundIdentifier = function (unmappedTrack) {
  return unmappedTrack.isrc || unmappedTrack.title;
};

const UnmappedTrack = mongoose.model(name, unmappedTrackSchema);

module.exports = UnmappedTrack;
