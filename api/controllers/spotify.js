/* eslint-disable no-await-in-loop */
const SpotifyController = this;

const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const moment = require('moment');
const { setTimeout } = require('timers/promises');
const Release = require('../models/release');
const Track = require('../models/track');
const Client = require('../models/client');
const Notification = require('../models/notification');
const Spotify = require('../libs/spotify');

const spotifyApiTimeout = 100;

SpotifyController.search = async ({ searchTerm, album, artist, label, type, page = 1, limit = 25 }) => {
  const result = await Spotify.search({ searchTerm, album, artist, label, type, page, limit, retries: 1 });
  return { items: await formatSearchResult({ items: result.items, type }), meta: { total: result.total || result.items.length, currentPage: page, totalPages: Math.ceil(result.total / limit) } };
};

SpotifyController.import = async ({ curveUser, data, searchTerm, album, artist, label, type, updateExistingItems }) => {
  data = data || await getSpotifyDataToImport({ searchTerm, album, artist, label, type });
  logger.debug(`Spotify: Client ${curveUser.clientId} Importing ${data.length} ${type}s`);
  const { tracksCount, releasesCount, partialImportErrorsTracks, releaseAlreadyExistsErrors } = await ImportCatalogue({ clientId: curveUser.clientId, data, type, updateExistingItems });
  const client = await Client.findById(curveUser.clientId);

  generateNotification(releasesCount, tracksCount, releaseAlreadyExistsErrors, partialImportErrorsTracks, curveUser, client, type);
};

const generateNotification = (releasesCount, tracksCount, releaseAlreadyExistsErrors, partialImportErrorsTracks, curveUser, client, type) => {
  const releasesCompleted = releasesCount.succeeded;
  const releasesFailed = releasesCount.failed;
  const tracksCompleted = tracksCount.succeeded;
  const tracksFailed = tracksCount.failed;

  const importType = type === 'album' ? 'Release' : 'Track';
  const errors = releaseAlreadyExistsErrors.concat(partialImportErrorsTracks);

  let identifier;
  let subject;
  let message;

  let importMessage = releasesCompleted ? `${releasesCompleted} ${importType}${releasesCompleted !== 1 ? 's' : ''} imported from Spotify` : `${tracksCompleted} ${importType}${tracksCompleted !== 1 ? 's' : ''} imported from Spotify`;

  const noFailures = !tracksFailed && !releasesFailed;
  const trackImportPartiallyFailed = importType === 'Track' && tracksFailed > 0 && tracksCompleted > 0;
  const releaseImportPartiallyFailed = importType === 'Release' && ((releasesFailed > 0 && releasesCompleted) > 0 || (releasesCompleted > 0 && tracksFailed > 0));
  const releaseAlreadyExists = releaseAlreadyExistsErrors?.length > 0;
  const trackImportFailed = importType === 'Track' && tracksCompleted === 0 && tracksFailed > 0;

  if (noFailures) {
    identifier = 'importComplete';
    subject = `Your ${importType} Import Has Completed`;
    message = 'Import Has Completed';
  } else if (releaseImportPartiallyFailed || trackImportPartiallyFailed) {
    identifier = 'partialSpotifyImportError';
    subject = `Your ${importType} Import Was Partially Successful`;
    message = 'Import Was Partially Successful';
  } else if (releaseAlreadyExists || trackImportFailed) {
    identifier = 'spotifyImportError';
    subject = `Your ${importType} Import Failed`;
    message = 'Import failed';
    const failureCount = releaseAlreadyExists ? releasesFailed : tracksFailed;
    importMessage = `${failureCount} ${importType}${failureCount !== 1 ? 's' : ''} failed on import from Spotify`;
  }

  const generateOptions = {
    identifier,
    curveUser,
    client,
    subject,
    count: releasesCompleted || tracksCompleted,
    spotifyImport: true,
    error: errors,
  };

  Notification.generate(`Your ${importType} ${message}`, importMessage, null, curveUser, generateOptions);
};

const ImportCatalogue = async ({ clientId, data, type, updateExistingItems }) => {
  const releasesCount = { succeeded: 0, failed: 0 };
  const tracksCount = { succeeded: 0, failed: 0 };
  const importErrorsPartial = [];
  const alreadyExistsErrorRelease = [];
  if (type === 'album') {
    await eachSeries(data, async (spotifyAlbum) => {
      const { partialImportErrorsTracks, releaseAlreadyExistsErrors, succeededCount, failedCount } = await importRelease({ spotifyAlbum, clientId, updateExistingItems });
      releasesCount.succeeded += succeededCount.releases;
      releasesCount.failed += failedCount.releases;
      tracksCount.succeeded += succeededCount.tracks;
      tracksCount.failed += failedCount.tracks;

      if (partialImportErrorsTracks?.length) { importErrorsPartial.push(...partialImportErrorsTracks); }
      if (releaseAlreadyExistsErrors?.length) { alreadyExistsErrorRelease.push(...releaseAlreadyExistsErrors); }
    });
  } else if (type === 'track') {
    await eachSeries(data, async (spotifyTrack) => {
      const { partialImportErrors, tracksCount: individualTrackCount } = await importTrack({ spotifyTrack, clientId, updateExistingItems });
      tracksCount.succeeded += individualTrackCount.succeeded;
      tracksCount.failed += individualTrackCount.failed;
      if (partialImportErrors?.length) { importErrorsPartial.push(...partialImportErrors); }
    });
  }
  return { tracksCount, releasesCount, partialImportErrorsTracks: importErrorsPartial, releaseAlreadyExistsErrors: alreadyExistsErrorRelease };
};

const importRelease = async ({ spotifyAlbum, clientId, updateExistingItems }) => {
  logger.info(`Spotify: Client ${clientId} Importing Release ${JSON.stringify(spotifyAlbum)}`);

  const { id: spotifyId, name: title, upc: barcode, artist, release_date: spotifyReleaseDate } = spotifyAlbum;
  let releaseDate;

  const partialImportErrorsTracks = [];
  const releaseAlreadyExistsErrors = [];
  const failedCount = { tracks: 0, releases: 0 };
  const succeededCount = { tracks: 0, releases: 0 };

  if (spotifyReleaseDate) {
    if (spotifyAlbum.release_date_precision === 'day') { releaseDate = moment(spotifyReleaseDate, 'YYYY/MM/DD').format(); }
    if (spotifyAlbum.release_date_precision === 'month') { releaseDate = moment(spotifyReleaseDate, 'YYYY/MM').format(); }
    if (spotifyAlbum.release_date_precision === 'year') { releaseDate = moment(spotifyReleaseDate, 'YYYY/').format(); }
  }

  const release = { clientId, spotifyId, title, catNo: barcode, barcode, artist, distributionChannel: 'Digital', releaseDate, trackIds: [] };
  const tracks = await getSpotifyAlbumTracks({ id: spotifyId });

  const releaseExists = await Release.findOne({ clientId, barcode }, { _id: 1, title: 1 });
  if (releaseExists && !updateExistingItems) {
    const errMessage = `Spotify Release '${title}' did not import because it already exists with ID: ${releaseExists._id} ${releaseExists?.title ? `(${releaseExists.title})` : ''}`;
    releaseAlreadyExistsErrors.push(errMessage);
    logger.error(`Release already exists and overwrite was not selected: ${releaseAlreadyExistsErrors}`);
    failedCount.releases += 1;
  } else if (!releaseExists || updateExistingItems) {
    for (const spotifyTrack of tracks) {
      const track = await importTrack({ spotifyTrack, clientId, updateExistingItems, isPartOfRelease: true });
      const trackId = track?.savedTrack?._id || track?.updatedTrack?._id;
      if (trackId) { release.trackIds.push(trackId.toString()); }
      succeededCount.tracks += track.tracksCount.succeeded;
      failedCount.tracks += track.tracksCount.failed;
      if (track?.partialImportErrors) { partialImportErrorsTracks.push(...track.partialImportErrors); }
    }
    if (!releaseExists) {
      await Release(release).save();
      succeededCount.releases += 1;
    } else if (releaseExists && updateExistingItems) {
      await Release.findOneAndUpdate({ clientId, barcode }, { $set: release }, { new: true });
      succeededCount.releases += 1;
    }
  }
  return { partialImportErrorsTracks, releaseAlreadyExistsErrors, succeededCount, failedCount };
};

const importTrack = async ({ spotifyTrack, clientId, updateExistingItems, isPartOfRelease }) => {
  logger.info(`Spotify: Client ${clientId} Importing Track ${JSON.stringify(spotifyTrack)}`);

  const { id: spotifyId, name: title, isrc, artist, duration } = spotifyTrack;
  const track = { clientId, spotifyId, title, isrc, artist, duration };
  const trackExists = await Track.findOne({ clientId, isrc }, { _id: 1 });
  const trackExistsIsrcAsAlias = await Track.findOne({ clientId, aliases: { $in: [isrc] } }, { _id: 1 });
  const partialImportErrors = [];
  const tracksCount = { succeeded: 0, failed: 0 };

  if (trackExistsIsrcAsAlias) {
    const errMessage = `Spotify Track '${track.title}' did not save - The ISRC '${track.isrc}' matches an existing alias on Track: ${trackExistsIsrcAsAlias._id} ${trackExistsIsrcAsAlias?.title ? `(${trackExistsIsrcAsAlias.title})` : ''}`;
    logger.error(errMessage);
    partialImportErrors.push(errMessage);
    tracksCount.failed += 1;
    return { partialImportErrors, tracksCount };
  }

  if (!trackExists && !trackExistsIsrcAsAlias) {
    try {
      const savedTrack = await new Track(track).save();
      tracksCount.succeeded += 1;
      return { savedTrack, tracksCount };
    } catch (saveErr) {
      logger.error(saveErr.message || saveErr);
      partialImportErrors.push(`Spotify Track '${track.title}' did not save - ${saveErr.message || saveErr}`);
      tracksCount.failed += 1;
      return { partialImportErrors, tracksCount };
    }
  }

  if (trackExists && updateExistingItems && !trackExistsIsrcAsAlias) {
    if (isPartOfRelease) {
      tracksCount.succeeded += 1;
      return { updatedTrack: { _id: trackExists._id }, tracksCount };
    }

    try {
      const updatedTrack = await Track.findOneAndUpdate({ clientId, isrc }, { $set: track }, { new: true });
      tracksCount.succeeded += 1;
      return { updatedTrack, tracksCount };
    } catch (err) {
      logger.error(`Error updating track: ${err.message || err}`);
      partialImportErrors.push(`Error updating Spotify Track '${track.title}': ${err.message || err}`);
      tracksCount.failed += 1;
      return { partialImportErrors, tracksCount };
    }
  }

  if (trackExists && !updateExistingItems) {
    if (isPartOfRelease) {
      tracksCount.succeeded += 1;
      return { savedTrack: { _id: trackExists._id }, tracksCount };
    }

    // notify Users of failed import, even though they didn't select overwrite
    const errMessage = `Spotify Track '${track.title}' did not save - The ISRC '${track.isrc}' matches an existing ISRC on Track: ${trackExists._id} ${trackExists?.title ? `(${trackExists.title})` : ''}`;
    logger.error(errMessage);
    partialImportErrors.push(errMessage);
    tracksCount.failed += 1;
    return { partialImportErrors, tracksCount };
  }
};

const getSpotifyDataToImport = async ({ data = [], searchTerm, album, artist, label, type, page = 1 }) => {
  const result = await SpotifyController.search({ searchTerm, album, artist, label, type, page, limit: 50 });
  if (result?.items?.length) {
    data = [...data, ...result.items];
    await setTimeout(spotifyApiTimeout);
    return getSpotifyDataToImport({ data, searchTerm, album, artist, label, type, page: page + 1 });
  }

  return data;
};

const getSpotifyAlbumTracks = async ({ data = [], id, page = 1 }) => {
  const result = await Spotify.getAlbumTracks({ id, limit: 50, page, retries: 1 });
  const tracks = await formatSearchResult({ items: result.items, type: 'track' });
  if (tracks?.length) {
    data = [...data, ...tracks];
    await setTimeout(spotifyApiTimeout);
    return getSpotifyAlbumTracks({ data, id, page: page + 1 });
  }

  return data;
};

const formatSearchResult = async ({ items, type }) => {
  if (!type) throw Error('A Spotify search type is required');
  const formattedItems = [];
  if (type === 'album') {
    await eachSeries(items, async (album) => {
      await setTimeout(spotifyApiTimeout);
      const spotifyAlbum = await Spotify.getAlbum({ id: album.id, retries: 1 });
      const formattedAlbum = {
        id: album.id,
        name: album.name,
        release_date: album.release_date,
        release_date_precision: album.release_date_precision,
        total_tracks: album.total_tracks,
        upc: spotifyAlbum?.external_ids?.upc,
        artist: album.artists?.map((artist) => artist.name).join(', '),
        spotify_url: album.external_urls?.spotify,
        image: album.images?.[0]?.url,
      };

      formattedItems.push(formattedAlbum);
    });
  }

  if (type === 'track') {
    await eachSeries(items, async (track) => {
      await setTimeout(spotifyApiTimeout);
      const spotifyTrack = await Spotify.getTrack({ id: track.id, retries: 1 });
      const formattedTrack = {
        id: track.id,
        name: track.name,
        duration: track.duration_ms / 1000,
        isrc: spotifyTrack?.external_ids?.isrc,
        artist: track.artists?.map((artist) => artist.name).join(', '),
        spotify_url: track.external_urls?.spotify,
        image: track.album?.images?.[0]?.url,
      };

      formattedItems.push(formattedTrack);
    });
  }

  return formattedItems;
};
