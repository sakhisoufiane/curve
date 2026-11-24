/* eslint-disable no-await-in-loop */
const moment = require('moment');
const axios = require('axios').default;
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const Release = require('../../models/release');
const Track = require('../../models/track');
const Contract = require('../../models/contract');
const SendEmail = require('../sendEmail');
const Notification = require('../../models/notification');
const { trackPostSaveActions, trackPreSaveActions } = require('./trackActions');
const { releasePostSaveActions, releasePreSaveActions } = require('./releaseActions');

axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common.Accept = 'application/json';

let logIdentifier = '';
let processInfo = '';

const { FUGA_NAME, FUGA_PASSWORD } = process.env;

const logInfo = (message) => logger.info(`${logIdentifier}${processInfo ? ` : ${processInfo}` : ''} : ${message}`);
const logError = (error) => logger.error(`${logIdentifier}${processInfo ? ` : ${processInfo}` : ''} - ${error}`);

const logFugaResponse = ({ name, response }) => {
  logInfo(`${name} FUGA response code - ${response.status} - message - ${response.statusText}`);
};

const sendNotificationToChosenEmail = ({ email, client, mainText }) => new Promise((resolve) => {
  SendEmail.genericCompleteNoUser(email, client, mainText, () => resolve());
});

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const readCookie = async () => new Promise((resolve, reject) => {
  const params = new URLSearchParams();
  params.append('name', FUGA_NAME);
  params.append('password', FUGA_PASSWORD);
  axios.post('https://fugamusic.com/fuga/login', params, { headers: {
    Cookie: '',
    'Content-Type': 'application/x-www-form-urlencoded',
  } })
    .then((response) => {
      logFugaResponse({ name: 'refreshFugaAuthCookie', response });
      resolve(response);
    }).catch((error) => {
      reject(error);
    });
});

const refreshFugaAuthCookie = async () => {
  let response;
  let tries = 5;

  while (tries > 0) {
    try {
      response = await readCookie();
      axios.defaults.headers.common.Cookie = response.headers['set-cookie'][0];
      break;
    } catch (err) {
      logError(err);
      tries -= 1;
    }
  }

  if (tries === 0) {
    throw new Error(`${logIdentifier} - refreshFugaAuthCookie: too many tries`);
  }
};

const sendFugaSyncEmail = async ({ client }) => {
  const currentDateString = client.fugaIntegration.fugaLastSync.toString();
  const formattedDate = `${currentDateString.substring(4, 10)} at ${currentDateString.substring(16, 21)}.`;
  const mainText = `
    Hi, <br/><br/>
    Your Fuga catalogue (organization ID - ${client.fugaIntegration.fugaOrgId}) was successfully synced to Curve on ${formattedDate}
  `;
  if (client?.fugaIntegration?.fugaNotifyEmails?.length > 0) {
    const emails = [...new Set(client.fugaIntegration.fugaNotifyEmails)];
    for (const email of emails) {
      await sendNotificationToChosenEmail({ email, client, mainText });
    }
  }
};

const sendUserNotification = async ({ client, userEmail }) => {
  const subject = 'Catalogue Sync Complete';
  const generateOptions = {
    client: client._id,
    subject,
    email: userEmail,
    identifier: 'genericComplete',
  };
  Notification.generate('Catalogue Sync', subject, null, generateOptions);
};

const readReleases = async ({ organizationId, state, batchSize, offsetId }) => new Promise((resolve, reject) => {
  axios.get(`https://fugamusic.com/fuga/catalog_export/products?organization_id=${organizationId}&state=${state}&batch_size=${batchSize}&offset_id=${offsetId}`)
    .then((response) => {
      logFugaResponse({ name: 'readReleases', response });
      const fugaReleases = response?.data?.fuga?.entities?.product || [];
      resolve(fugaReleases);
    }).catch((error) => {
      reject(error);
    });
});

const getFugaReleases = async ({ offsetId, batchSize, organizationId }) => {
  const state = 'PUBLISHED';
  let fugaReleases = [];
  let tries = 5;

  while (tries > 0) {
    try {
      fugaReleases = await readReleases({ organizationId, state, batchSize, offsetId });
      break;
    } catch (err) {
      logError(err);
      await delay(25_000);
      tries -= 1;
    }
  }

  if (tries === 0) {
    throw new Error(`${logIdentifier} - getFugaReleases: too many tries`);
  }

  return fugaReleases;
};

const matchReleaseWithContracts = async ({ release }) => {
  const contracts = await Contract.find({ clientId: release.clientId, labels: release.label });
  const salesReturnsRights = [];
  const costsRights = [];
  for (const contract of contracts) {
    const contractId = contract._id.toString();
    salesReturnsRights.push({
      contractId,
      percentage: 100,
    });
    costsRights.push({
      contractId,
      percentage: 100,
    });
  }
  await Release.findByIdAndUpdate(release._id, { $set: { costsRights, salesReturnsRights } });
};

const syncRelease = async ({ updateRun, fugaRelease, fugaIntegration, clientId, client, trackIds, inheritanceClients, duplicatedCatNo = false, checkFirstFugaId }) => {
  let newRelease = false;
  let release;

  if (checkFirstFugaId && fugaRelease?.id) {
    release = await Release.findOne({ clientId, fugaId: fugaRelease.id });
  }

  if (!release) {
    if (duplicatedCatNo && !fugaIntegration.setCatNoFromBarcodeOnImport) {
      release = await Release.findOne({ clientId, catNo: fugaRelease?.catalogNumber });
    } else if (fugaRelease?.upcCode) {
      release = await Release.findOne({ clientId, barcode: fugaRelease?.upcCode });
    }
  }

  let newForeignId = null;
  if (fugaIntegration.setCatNoFromBarcodeOnImport) {
    newForeignId = fugaRelease?.catalogNumber;
  } else if (!fugaIntegration.setCatNoFromBarcodeOnImport && fugaIntegration.ingestForeignIdsFromDelivery) {
    newForeignId = fugaRelease?.id;
  }

  if (release) {
    logInfo(`release found - updating release with upc ${fugaRelease?.upcCode}, update run: ${updateRun}`);
    release.version = fugaRelease?.releaseVersion;
    release.title = fugaRelease?.name;
    release.catNo = fugaIntegration.setCatNoFromBarcodeOnImport ? fugaRelease?.upcCode : fugaRelease?.catalogNumber;
    release.artist = fugaRelease?.displayArtist;
    release.foreignId = newForeignId;
    release.barcode = fugaRelease?.upcCode;
    release.label = fugaRelease?.label?.name;
    // These dates are sent from Fuga Servers in Amsterdam, so we need to convert them to UTC+2 to match their dates
    release.releaseDate = moment(fugaRelease?.consumerReleaseDate).add(2, 'hours').format();
    release.fugaId = fugaRelease?.id;
    release.distributionChannel = fugaIntegration.defaultDistributionChannel || null;
    release.trackIds = trackIds;
    await Release.findByIdAndUpdate(release._id, { $set: {
      version: release.version,
      title: release.title,
      catNo: release.catNo,
      artist: release.artist,
      foreignId: release.foreignId,
      barcode: release.barcode,
      label: release.label,
      // These dates are sent from Fuga Servers in Amsterdam, so we need to convert them to UTC+2 to match their dates
      releaseDate: release.releaseDate,
      fugaId: release.fugaId,
      distributionChannel: release.distributionChannel,
      trackIds: release.trackIds,
    } });
  } else {
    logInfo(`release not found - creating release with upc ${fugaRelease?.upcCode}, update run: ${updateRun}`);
    newRelease = true;
    release = new Release({
      clientId,
      version: fugaRelease?.releaseVersion,
      title: fugaRelease?.name,
      catNo: fugaIntegration.setCatNoFromBarcodeOnImport ? fugaRelease?.upcCode : fugaRelease?.catalogNumber,
      artist: fugaRelease?.displayArtist,
      foreignId: newForeignId,
      barcode: fugaRelease?.upcCode,
      label: fugaRelease?.label?.name,
      releaseDate: moment(fugaRelease?.consumerReleaseDate).add(2, 'hours').format(),
      fugaId: fugaRelease?.id,
      distributionChannel: fugaIntegration.defaultDistributionChannel || null,
      trackIds,
      skipPostSaveHook: true,
      skipPreSaveHook: true,
    });
    await release.save();
  }

  if (fugaIntegration?.matchContractsOnImport && release?.label && newRelease) {
    await matchReleaseWithContracts({ release });
  }

  release.skipPostSaveHook = false;
  release.skipPreSaveHook = false;
  const updateRunFugaSync = updateRun;
  await releasePreSaveActions({ release, client, updateRunFugaSync });
  await releasePostSaveActions({ release, inheritanceClients });

  return release._id;
};

const handleRelease = async ({ type, updateRun, fugaRelease, currentFugaReleaseNo, fugaIntegration, releaseBatchNo, clientId, client, inheritanceClients, fugaReleasesBatchAmount, fugaReleasesWithMongoIds, checkFirstFugaId }) => {
  let duplicatedCatNo = false;
  let tries = 5;
  while (tries > 0) {
    try {
      logInfo(`syncing release of the batch: ${currentFugaReleaseNo} / ${fugaReleasesBatchAmount} - batch number: ${releaseBatchNo} - type: ${type}`);
      let foundTrackIds = [];
      if (updateRun) {
        const foundReleaseData = fugaReleasesWithMongoIds.find((item) => item.fugaReleaseId === fugaRelease.id);
        foundTrackIds = foundReleaseData?.trackIds || [];
      }
      const mongoReleaseId = await syncRelease({ updateRun, fugaRelease, fugaIntegration, clientId, client, inheritanceClients, duplicatedCatNo, trackIds: foundTrackIds, checkFirstFugaId });
      if (!updateRun) {
        fugaReleasesWithMongoIds.push({
          mongoReleaseId: mongoReleaseId.toString(),
          fugaReleaseId: fugaRelease.id,
        });
      }
      break;
    } catch (err) {
      logError(err);
      if (err?.message?.indexOf('Cat No is required to be unique under each Distribution Channel') > -1) {
        duplicatedCatNo = true;
      }
      tries -= 1;
    }
  }

  if (tries === 0) {
    throw new Error(`${logIdentifier} - handleRelease: too many tries`);
  }
};

const handleReleaseProcess = async ({ type, updateRun, fugaIntegration, inheritanceClients, fugaReleases, releaseBatchNo, client, clientId, fugaReleasesBatchAmount, fugaReleasesWithMongoIds, checkFirstFugaId }) => {
  if (fugaReleases.length === 0) return;

  const currentFugaReleaseNo = fugaReleasesBatchAmount - fugaReleases.length + 1;
  const fugaRelease = fugaReleases.shift();

  await handleRelease({
    type,
    clientId,
    client,
    updateRun,
    fugaRelease,
    releaseBatchNo,
    fugaIntegration,
    inheritanceClients,
    currentFugaReleaseNo,
    fugaReleasesBatchAmount,
    fugaReleasesWithMongoIds,
    checkFirstFugaId,
  });

  await handleReleaseProcess({ type, updateRun, fugaIntegration, inheritanceClients, fugaReleases, releaseBatchNo, clientId, client, fugaReleasesBatchAmount, fugaReleasesWithMongoIds, checkFirstFugaId });
};

const segragateReleases = ({ fugaReleases }) => {
  const catalogNumbers = {};
  for (const fugaRelease of fugaReleases) {
    if (catalogNumbers?.[fugaRelease.catalogNumber]) {
      catalogNumbers[fugaRelease.catalogNumber] += 1;
    } else {
      catalogNumbers[fugaRelease.catalogNumber] = 1;
    }
  }
  const parallelFugaReleases = [];
  const subsequentFugaReleases = [];
  for (const fugaRelease of fugaReleases) {
    if (catalogNumbers[fugaRelease.catalogNumber] === 1) {
      parallelFugaReleases.push(fugaRelease);
    } else {
      subsequentFugaReleases.push(fugaRelease);
    }
  }

  return {
    parallelFugaReleases,
    subsequentFugaReleases,
  };
};

const saveAllReleases = async ({ fugaReleases, client, clientId, releaseBatchNo, inheritanceClients, fugaReleasesWithMongoIds, updateRun, checkFirstFugaId }) => {
  const {
    parallelFugaReleases,
    subsequentFugaReleases,
  } = segragateReleases({ fugaReleases });
  const parallelFugaReleasesBatchAmount = parallelFugaReleases.length;
  const subsequentFugaReleasesBatchAmount = subsequentFugaReleases.length;

  const promises = [];
  promises.push(handleReleaseProcess({ type: 'subsequent', updateRun, fugaIntegration: client.fugaIntegration, inheritanceClients, fugaReleases: subsequentFugaReleases, releaseBatchNo, clientId, client, fugaReleasesBatchAmount: subsequentFugaReleasesBatchAmount, fugaReleasesWithMongoIds, checkFirstFugaId }));
  for (let parallelProcesses = 0; parallelProcesses < 50; parallelProcesses += 1) {
    promises.push(handleReleaseProcess({ type: 'parallel', updateRun, fugaIntegration: client.fugaIntegration, inheritanceClients, fugaReleases: parallelFugaReleases, releaseBatchNo, clientId, client, fugaReleasesBatchAmount: parallelFugaReleasesBatchAmount, fugaReleasesWithMongoIds, checkFirstFugaId }));
  }
  await Promise.all(promises);
};

const groupTracks = ({ fugaTracks }) => {
  const groupedTracks = {};
  for (const fugaTrack of fugaTracks) {
    if (groupedTracks?.[fugaTrack.isrcCode]) {
      groupedTracks[fugaTrack.isrcCode].push(fugaTrack);
    } else {
      groupedTracks[fugaTrack.isrcCode] = [fugaTrack];
    }
  }
  return groupedTracks;
};

const readTracks = async ({ productId }) => new Promise((resolve, reject) => {
  axios.get(`https://fugamusic.com/fuga/catalog/assets?product_id=${productId}`)
    .then((response) => {
      logFugaResponse({ name: 'readTracks', response });
      const fugaTracks = response?.data?.fuga?.entities?.asset || [];
      resolve(fugaTracks);
    }).catch((error) => {
      reject(error);
    });
});

const handleReadTracks = async ({ fugaReleasesAmount, fugaReleases, fugaRelease, fugaTracks, fugaReleasesWithMongoIds }) => {
  let tries = 5;
  while (tries > 0) {
    try {
      logInfo(`reading tracks for fuga release with upc ${fugaRelease?.upcCode}, ${fugaReleasesAmount - fugaReleases.length} / ${fugaReleasesAmount}`);
      const tracks = await readTracks({ productId: fugaRelease.id });
      for (const track of tracks) {
        const mongoReleaseId = fugaReleasesWithMongoIds.find((item) => item.fugaReleaseId === fugaRelease.id)?.mongoReleaseId;
        track.label = fugaRelease?.label?.name;
        track.mongoReleaseId = mongoReleaseId;
        fugaTracks.push(track);
      }
      break;
    } catch (err) {
      logError(err);
      await delay(5_000);
      tries -= 1;
    }
  }
  if (tries === 0) {
    throw new Error(`${logIdentifier} - handleReadTracks: too many tries`);
  }
};

const handleReadTracksProcess = async ({ fugaReleases, fugaReleasesAmount, fugaTracks, fugaReleasesWithMongoIds }) => {
  if (fugaReleases.length === 0) return;
  const fugaRelease = fugaReleases.shift();

  await handleReadTracks({ fugaRelease, fugaReleasesAmount, fugaReleases, fugaTracks, fugaReleasesWithMongoIds });
  await handleReadTracksProcess({ fugaReleases, fugaReleasesAmount, fugaTracks, fugaReleasesWithMongoIds });
};

const matchTrackWithContracts = async ({ track }) => {
  const contracts = await Contract.find({ clientId: track.clientId, labels: track.label });
  const salesReturnsRights = [];
  const costsRights = [];
  for (const contract of contracts) {
    const contractId = contract._id.toString();
    salesReturnsRights.push({
      contractId,
      percentage: 100,
    });
    costsRights.push({
      contractId,
      percentage: 100,
    });
  }
  await Track.findByIdAndUpdate(track._id, { $set: { costsRights, salesReturnsRights } });
};

const syncTrack = async ({ fugaTrack, clientId, client, fugaIntegration, inheritanceClients, checkFirstFugaId }) => {
  let newTrack = false;
  let track;
  let durationChanged;

  if (checkFirstFugaId && fugaTrack?.id) {
    track = await Track.findOne({ clientId, fugaId: fugaTrack.id });
  }

  if (!track && fugaTrack?.isrcCode) {
    track = await Track.findOne({ clientId, $or: [{ isrc: fugaTrack?.isrcCode }, { aliases: fugaTrack?.isrcCode }] });
  }

  // Track found - exclude if found by alias
  if (track && (track.fugaId === fugaTrack?.id || track.isrc === fugaTrack?.isrcCode)) {
    logInfo(`track found - updating track with isrc ${fugaTrack?.isrcCode}`);
    durationChanged = !(fugaTrack?.duration === track.duration);
    track.title = fugaTrack?.name;
    track.version = fugaTrack?.assetVersion;
    track.artist = fugaTrack?.displayArtist;
    track.foreignId = fugaTrack?.id;
    track.label = fugaTrack?.label;
    track.pLine = `${fugaTrack?.PLineYear ? fugaTrack.PLineYear : ''} ${fugaTrack?.PLineText ? fugaTrack.PLineText : ''}`.trim();
    track.duration = fugaTrack?.duration;
    track.fugaId = fugaTrack?.id;

    if (track.isrc !== fugaTrack?.isrcCode && !track.aliases?.includes(fugaTrack?.isrcCode)) {
      track.isrc = fugaTrack?.isrcCode;
    }

    await Track.findByIdAndUpdate(track._id, {
      $set: {
        title: track.title,
        version: track.version,
        artist: track.artist,
        foreignId: track.foreignId,
        isrc: track.isrc,
        label: track.label,
        pLine: track.pLine,
        duration: track.duration,
        fugaId: track.fugaId,
      } });
  } else {
    logInfo(`track found - not updating track with alias isrc ${fugaTrack?.isrcCode}`);
  }

  if (!track) {
    logInfo(`track not found - creating track with isrc ${fugaTrack?.isrcCode}`);
    newTrack = true;
    track = new Track({
      clientId,
      title: fugaTrack?.name,
      version: fugaTrack?.assetVersion,
      artist: fugaTrack?.displayArtist,
      foreignId: fugaTrack?.id,
      isrc: fugaTrack?.isrcCode,
      label: fugaTrack?.label,
      pLine: `${fugaTrack?.PLineYear ? fugaTrack.PLineYear : ''} ${fugaTrack?.PLineText ? fugaTrack.PLineText : ''}`.trim(),
      duration: fugaTrack?.duration,
      fugaId: fugaTrack?.id,
      skipPostSaveHook: true,
      skipPreSaveHook: true,
    });

    if (client.defaultMechanicalBasis) {
      track.mechanicalCalculationBasis = client.defaultMechanicalBasis;
      track.reportMechanicals = client.defaultReportMechanicals;
    }

    await track.save();
  }

  if (fugaIntegration?.matchContractsOnImport && track?.label && newTrack) {
    await matchTrackWithContracts({ track });
  }

  track.skipPostSaveHook = false;
  track.skipPreSaveHook = false;

  await trackPreSaveActions({ track, client, durationChanged });
  await trackPostSaveActions({ track, inheritanceClients });

  return track._id;
};

const handleTrack = async ({ tracksCounter, track, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId }) => {
  let tries = 5;
  while (tries > 0) {
    try {
      logInfo(`syncing track with isrc ${track?.isrcCode}, ${tracksCounter.amount - tracksCounter.left} / ${tracksCounter.amount}`);
      const trackMongoId = await syncTrack({ fugaTrack: track, clientId, client, fugaIntegration, inheritanceClients, checkFirstFugaId });
      for (let i = 0; i < fugaReleasesWithMongoIds.length; i += 1) {
        if (fugaReleasesWithMongoIds[i].mongoReleaseId === track.mongoReleaseId) {
          if (fugaReleasesWithMongoIds[i]?.trackIds) {
            fugaReleasesWithMongoIds[i].trackIds.push(trackMongoId.toString());
          } else {
            fugaReleasesWithMongoIds[i].trackIds = [trackMongoId.toString()];
          }
        }
      }
      break;
    } catch (err) {
      logError(err);
      tries -= 1;
    }
  }
  if (tries === 0) {
    throw new Error(`${logIdentifier} - handleTrack: too many tries`);
  }
};

const handleTrackProcess = async ({ tracksCounter, groupedTracks, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId }) => {
  if (Object.keys(groupedTracks).length === 0) return;

  const groupName = Object.keys(groupedTracks)[0];
  const group = groupedTracks[groupName];
  delete groupedTracks[groupName];

  for (const track of group) {
    tracksCounter.left -= 1;
    await handleTrack({ tracksCounter, track, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId });
  }

  await handleTrackProcess({ tracksCounter, groupedTracks, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId });
};

const saveAllTracks = async ({ fugaReleases, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId }) => {
  const fugaReleasesAmount = fugaReleases.length;
  const fugaTracks = [];
  let promises = [];
  for (let parallelProcesses = 0; parallelProcesses < 10; parallelProcesses += 1) {
    promises.push(handleReadTracksProcess({ fugaReleases, fugaReleasesAmount, fugaTracks, fugaReleasesWithMongoIds }));
  }
  await Promise.all(promises);
  const groupedTracks = groupTracks({ fugaTracks });

  const tracksCounter = { amount: 0 };
  for (const [key, value] of Object.entries(groupedTracks)) {
    tracksCounter.amount += value.length;
  }
  tracksCounter.left = tracksCounter.amount;

  promises = [];
  for (let parallelProcesses = 0; parallelProcesses < 50; parallelProcesses += 1) {
    promises.push(handleTrackProcess({ tracksCounter, groupedTracks, clientId, client, fugaIntegration, fugaReleasesWithMongoIds, inheritanceClients, checkFirstFugaId }));
  }
  await Promise.all(promises);
};

const syncClient = async ({ clientId, userEmail }) => {
  const initializeClientSync = async () => {
    const client = await Client.findById(clientId);
    logIdentifier = `FUGA-CAT-SYNC : syncClient ${clientId}`;

    if (!client) throw new Error('Client not found');
    if (client.fugaIntegration?.fugaCurrentlySyncing) {
      logInfo('STOP - currently syncing');
      return null;
    }

    if (!client.fugaIntegration?.fugaOrgId) {
      logInfo('STOP - missing fugaOrgId');
      return null;
    }

    client.fugaIntegration.fugaCurrentlySyncing = true;
    await client.save();
    return client;
  };

  const resetSyncFlag = async (client) => {
    if (client) {
      client.fugaIntegration.fugaCurrentlySyncing = false;
      await client.save();
    }
  };

  const syncOperation = async (client, inheritanceClients, checkFirstFugaId) => {
    let releaseBatchNo = 1;
    let stop = false;
    let offsetId = '0';
    const releaseBatchSize = 100;

    while (!stop) {
      processInfo = `Batch ${releaseBatchNo}`;
      await refreshFugaAuthCookie();

      logInfo(`releaseBatchNo: ${releaseBatchNo}`);

      const fugaReleases = await getFugaReleases({
        offsetId,
        batchSize: releaseBatchSize,
        organizationId: client.fugaIntegration.fugaOrgId,
      });

      const fugaReleasesBatchAmount = fugaReleases.length;
      const fugaReleasesLastId = fugaReleases[fugaReleases.length - 1]?.id;
      const fugaReleasesWithMongoIds = [];

      logInfo(`releases count: ${fugaReleasesBatchAmount}`);

      const saveReleaseData = ((releaseBatchNo) => (updateRun) => saveAllReleases({
        fugaReleases: JSON.parse(JSON.stringify(fugaReleases)),
        client,
        clientId,
        inheritanceClients,
        releaseBatchNo,
        fugaReleasesWithMongoIds,
        updateRun,
        checkFirstFugaId,
      }))(releaseBatchNo);
      await saveReleaseData(false);
      await saveAllTracks({
        fugaReleases: JSON.parse(JSON.stringify(fugaReleases)),
        client,
        clientId,
        fugaIntegration: client.fugaIntegration,
        fugaReleasesWithMongoIds,
        inheritanceClients,
        checkFirstFugaId,
      });
      await saveReleaseData(true);
      if (fugaReleasesBatchAmount === releaseBatchSize) {
        releaseBatchNo += 1;
        offsetId = fugaReleasesLastId;
      } else {
        stop = true;
      }
    }

    client.fugaIntegration.fugaLastSync = new Date();
    await client.save();

    if (userEmail) {
      await sendUserNotification({ client, userEmail });
    }
    await sendFugaSyncEmail({ client });

    logInfo('COMPLETE');
  };

  try {
    const client = await initializeClientSync();
    if (!client) return;

    const inheritanceClients = await Client.find({ 'inheritCatalogueFrom.clientId': clientId });
    const checkFirstFugaId = ['Fuga Split', 'White Label Split'].includes(client?.fugaSplitType);

    await syncOperation(client, inheritanceClients, checkFirstFugaId);
  } catch (error) {
    logError(`FINAL ERROR - ${error.message}`);
  } finally {
    const client = await Client.findById(clientId);
    await resetSyncFlag(client);
    logInfo('Sync process cleanup complete');
  }
};

module.exports = {
  syncClient,
};
