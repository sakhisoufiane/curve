require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const Client = require('../models/client');
const Release = require('../models/release');
const Track = require('../models/track');

// Armada Music: 64d4b1346b0b7fb1ffda1714
// Beat Music Fund: 64947c233c4f50cfb78b0ab8

const mainClients = ['64d4b1346b0b7fb1ffda1714', '64947c233c4f50cfb78b0ab8'];

// releases on sub-client not linked to main client
let releasesUpdated = 0;
let releaseBatchCount = 0;

const handleReleases = async ({clientId, lastId}) => {
  releaseBatchCount += 1;
  const limit = 1000;
  const filter = {clientId};
  if (lastId) { filter._id = { $gt: lastId } }
  const releases = await Release.find(filter).sort({ _id: 1 }).limit(limit);
  lastId = releases[releases.length -1]._id;
  console.log(`Ingesting release batch ${releaseBatchCount} having ${releases.length} releases returned. ${releasesUpdated} releases updated`);
  await eachLimit(releases, 50, async (release) => {
    await release.save();
  });

  if (releases.length === limit) {
    await handleReleases({clientId, lastId});
  } else {
    console.log('Done updating releases');
  }
}

// tracks on sub-client not linked to main client
let tracksUpdated = 0;
let tracksBatchCount = 0;

const handleTracks = async ({clientId, lastId}) => {
  tracksBatchCount += 1;
  const limit = 5000;
  const filter = {clientId};
  if (lastId) { filter._id = { $gt: lastId } }
  const tracks = await Track.find(filter).sort({ _id: 1 }).limit(limit);
  lastId = tracks[tracks.length -1]._id;
  console.log(`Ingesting track batch ${tracksBatchCount} having ${tracks.length} tracks returned. ${tracksUpdated} tracks updated`);
  await eachLimit(tracks, 200, async (track) => {
    await track.save();
  });

  if (tracks.length === limit) {
    await handleTracks({clientId, lastId});
  } else {
    console.log('Done updating tracks');
  }
}

(async () => {
  for (const clientId of mainClients) {
    await handleTracks({clientId});
    await handleReleases({clientId});
  }
})();