require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const Client = require('../models/client');
const Release = require('../models/release');
const Track = require('../models/track');

// Armada Music: 64d4b1346b0b7fb1ffda1714
// Beat Music Fund: 64947c233c4f50cfb78b0ab8

const mainClients = ['64947c233c4f50cfb78b0ab8', '64d4b1346b0b7fb1ffda1714'];

(async () => {
  const clients = await Client.find({'inheritCatalogueFrom.clientId': { $in: mainClients }});
  console.log(`Found ${clients.length} clients`)
  // Handle sub-client
  eachLimit(clients, 5, async (client) => await handleSubClient({mainClients, subClient: client._id.toString()}));
})();

const handleSubClient = async ({mainClients, subClient}) => {
  await handleReleases({mainClients, subClient});
  await handleTracks({mainClients, subClient});
}
// releases on sub-client not linked to main client
let releasesUpdated = 0;
let releaseBatchCount = 0;

const handleReleases = async ({mainClients, subClient, lastId}) => {
  releaseBatchCount += 1;
  const limit = 1000;
  const filter = {clientId: subClient};
  if (lastId) { filter._id = { $gt: lastId } }
  const releases = await Release.find(filter).sort({ _id: 1 }).limit(limit).select('title catNo duplicatedFrom');
  lastId = releases[releases.length -1]._id;
  console.log(`Ingesting release batch ${releaseBatchCount} having ${releases.length} releases returned. ${releasesUpdated} releases updated`);
  await eachLimit(releases, 50, async (release) => {
    for (const mainClient of mainClients) {
      if (!release.duplicatedFrom) {
        const releaseOnMainClient = await Release.findOne({clientId: mainClient, catNo: release.catNo}).select('title catNo duplicatedFrom');;
        if (releaseOnMainClient?._id) {
          await Release.findByIdAndUpdate(release._id, {$set: {duplicatedFrom: releaseOnMainClient._id.toString()}}, {timestamps: false})
          releasesUpdated += 1;
        }
      }
    }
  });

  if (releases.length === limit) {
    await handleReleases({mainClients, subClient, lastId});
  } else {
    console.log('Done updating releases');
  }
}

// tracks on sub-client not linked to main client
let tracksUpdated = 0;
let tracksBatchCount = 0;

const handleTracks = async ({mainClients, subClient, lastId}) => {
  tracksBatchCount += 1;
  const limit = 5000;
  const filter = {clientId: subClient};
  if (lastId) { filter._id = { $gt: lastId } }
  const tracks = await Track.find(filter).sort({ _id: 1 }).limit(limit).select('title isrc duplicatedFrom');
  lastId = tracks[tracks.length -1]._id;
  console.log(`Ingesting track batch ${tracksBatchCount} having ${tracks.length} tracks returned. ${tracksUpdated} tracks updated`);
  await eachLimit(tracks, 50, async (track) => {
    for (const mainClient of mainClients) {
      const trackOnMainClient = await Track.findOne({clientId: mainClient, isrc: track.isrc}).select('title isrc duplicatedFrom');;
      if (trackOnMainClient?._id && !track.duplicatedFrom) {
        await Track.findByIdAndUpdate(track._id, {$set: {duplicatedFrom: trackOnMainClient._id.toString()}}, {timestamps: false})
        tracksUpdated += 1;
      }
    }
  });

  if (tracks.length === limit) {
    await handleTracks({mainClients, subClient, lastId});
  } else {
    console.log('Done updating tracks');
  }
}
