const mongoose = require('@curveroyaltysystems/models/mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { UnmappedRelease: { name, schema } } = require('@curveroyaltysystems/models');
const modelHistory = require('../libs/modelHistory');

const unmappedReleaseSchema = schema;

unmappedReleaseSchema.plugin(modelHistory, { mongoose, name: 'unmappedReleasePatches' });
unmappedReleaseSchema.plugin(mongoosePaginate);

unmappedReleaseSchema.methods.checkForCompletion = async function (previousUnmappedRelease) {
  const unmappedRelease = this;
  if (unmappedRelease.releaseId && !previousUnmappedRelease?.releaseId) {
    unmappedRelease.complete = true;
    await unmappedRelease.save();
    await unmappedRelease.mapRelease();
  } else if (unmappedRelease.releaseId !== previousUnmappedRelease.releaseId) {
    // Check previous aliases if releaseId is null
    await unmappedRelease.checkPreviousReleaseAliases(previousUnmappedRelease);
  }
};

unmappedReleaseSchema.methods.checkPreviousReleaseAliases = async function (previousUnmappedRelease) {
  const Release = require('./release');
  const unmappedRelease = this;
  const filteredAliases = [];

  const release = await Release.findById(previousUnmappedRelease.releaseId);
  if (!Array.isArray(release?.aliases)) { return; }

  release.aliases.forEach((alias) => {
    if (unmappedRelease.catNo !== alias) { filteredAliases.push(alias); }
  });

  release.aliases = filteredAliases;

  if (!unmappedRelease.releaseId) {
    unmappedRelease.complete = false;
  } else {
    unmappedRelease.complete = true;
  }

  await release.save();
  await unmappedRelease.save();
  await unmappedRelease.mapRelease();
};

unmappedReleaseSchema.methods.mapRelease = async function () {
  const Release = require('./release');
  const unmappedRelease = this;
  if (unmappedRelease.releaseId) {
    const release = await Release.findById(unmappedRelease.releaseId);
    if (release) {
      release.aliases.push(UnmappedRelease.foundIdentifier(unmappedRelease));
      await release.save();
    }
  }
};

unmappedReleaseSchema.statics.foundIdentifier = function (unmappedRelease) {
  return unmappedRelease.catNo || unmappedRelease.barcode || unmappedRelease.title;
};

const UnmappedRelease = mongoose.model(name, unmappedReleaseSchema);

module.exports = UnmappedRelease;
