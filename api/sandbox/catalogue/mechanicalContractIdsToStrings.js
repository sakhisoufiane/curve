require('dotenv').config();
require('../../models/db');

const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');

const { eachLimit } = require('async');
const appRootDir = require('app-root-dir').get();
const Publisher = require('../../models/publisher');
const Track = require('../../models/track');
const Release = require('../../models/release');

const report = [];
const fixPublishers = async () => {
  let count = 1;
  const publishers = await Publisher.find({ 'linkedContracts.contractId': { $type: 'objectId' } }).select('clientId linkedContracts');
  console.log(`\nUpdating ${publishers.length} publishers..`)
  await eachLimit(publishers, 50, async (publisher) => {
    process.stdout.write(`\rUpdating ${count}/${publishers.length}`);
    count += 1;
    for (const contract of publisher.linkedContracts) { contract.contractId = contract.contractId.toString() }
    await Publisher.findByIdAndUpdate(publisher._id, { $set: { linkedContracts: publisher.linkedContracts } }, { timestamps: false })
    report.push([publisher.clientId, 'Publisher', publisher._id.toString()]);
  });
  console.log('\nDone updating publishers')
}

const fixTracks = async () => {
  let count = 1;
  const query = { $or: [
    { 'mechanicalContractIds.0': { $type: 'objectId' } },
    { 'mechanicalLicenses.contractId': { $type: 'objectId' } }
  ]}
  const tracks = await Track.find(query).select('clientId mechanicalContractIds mechanicalLicenses');
  console.log(`\nUpdating ${tracks.length} tracks..`)
  await eachLimit(tracks, 50, async (track) => {
    process.stdout.write(`\rUpdating ${count}/${tracks.length}`);
    count += 1;
    for (const license of track.mechanicalLicenses) { license.contractId = license.contractId.toString() }
    for (const index of track.mechanicalContractIds.keys()) { track.mechanicalContractIds[index] = track.mechanicalContractIds[index].toString(); }
    await Track.findByIdAndUpdate(track._id, { $set: { mechanicalContractIds: track.mechanicalContractIds, mechanicalLicenses: track.mechanicalLicenses } }, { timestamps: false })
    report.push([track.clientId, 'Track', track._id.toString()]);
  });
  console.log('\nDone updating tracks')
}

const fixReleases = async () => {
  let count = 1;
  const query = { $or: [
    { 'mechanicalContractIds.0': { $type: 'objectId' } },
  ]}
  const releases = await Release.find(query).select('clientId mechanicalContractIds mechanicalLicenses');
  console.log(`\nUpdating ${releases.length} releases..`)
  await eachLimit(releases, 50, async (release) => {
    process.stdout.write(`\rUpdating ${count}/${releases.length}`);
    count += 1;
    for (const index of release.mechanicalContractIds.keys()) { release.mechanicalContractIds[index] = release.mechanicalContractIds[index].toString(); }
    for (const trackId in release.mechanicalLicenses) {
      for (const license of release.mechanicalLicenses[trackId].licenses) { license.contractId = license.contractId.toString() }
    }
    await Release.findByIdAndUpdate(release._id, { $set: { mechanicalContractIds: release.mechanicalContractIds, mechanicalLicenses: release.mechanicalLicenses } }, { timestamps: false })
    report.push([release.clientId, 'Release', release._id.toString()]);
  });
  console.log('\nDone updating releases')
}


(async () => {
  const outputLocation = `${appRootDir}/tmp/mechanicalIDsToString.csv`;
  const writer = new WriteCsv({ headers: ['CLIENT ID', 'TYPE', 'ID'], outputLocation });
  
  await fixPublishers();
  await fixTracks();
  await fixReleases();
  
  await new Promise((resolve) => { writer.addData(report, () => { resolve(); }) });
  await new Promise((resolve) => { writer.write(() => { resolve(); }) });

  console.log('Done updating mechanical IDs')
})();