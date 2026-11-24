const Spotify = this;
const axios = require('axios');
const { setTimeout } = require('timers/promises');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');

const clientId = process.env.spotifyClientId;
const clientSecret = process.env.spotifyClientSecret;
const spotifyApiTimeoutSearch = 200;
const spotifyApiTimeoutImport = 500;
const importRetryLimit = 25;
const searchRetryLimit = 10;

Spotify.search = async ({ searchTerm, album, artist, label, type, page = 1, limit = 25, retries }) => {
  if (!type) throw Error('A search type is required');
  const token = await getSpotifyToken();
  if (!token) throw Error('Couldn\'t generate a Spotify token');
  const url = 'https://api.spotify.com/v1/search';
  const headers = { Authorization: `Bearer ${token}` };
  const query = [];
  if (searchTerm) query.push(searchTerm);
  if (album) query.push(`album:${album}`);
  if (artist) query.push(`artist:${artist}`);
  if (label) query.push(`label:${label}`);

  if (!query.length) throw Error('Search params are required');
  const params = { q: query.join(' '), type, offset: (page - 1) * limit, limit };
  try {
    const response = await axios.get(url, { params, headers });
    const result = response?.data?.[`${type}s`];
    if (!result) throw Error('Couldn\'t retrieve data from Spotify');
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      if (retries <= searchRetryLimit) {
        logger.info(`Error 429 received on search, attempting retry number ${retries}`);
        await setTimeout(spotifyApiTimeoutSearch);
        retries += 1;
        return Spotify.search({ searchTerm, album, artist, label, type, page, limit, retries });
      } throw Error(`Retried search more than ${searchRetryLimit} times`);
    }
    throw error;
  }
};

Spotify.getAlbum = async ({ id, retries }) => {
  const token = await getSpotifyToken();
  if (!token) throw Error('Couldn\'t generate a Spotify token');
  const url = `https://api.spotify.com/v1/albums/${id}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const response = await axios.get(url, { headers });
    const result = response?.data;
    if (!result) throw Error('Couldn\'t retrieve data from Spotify');
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      if (retries <= importRetryLimit) {
        logger.info(`Error 429 received on getAlbum, attempting retry number ${retries}`);
        await setTimeout(spotifyApiTimeoutImport);
        retries += 1;
        return Spotify.getAlbum({ id, retries });
      } throw Error(`Retried getAlbum more than ${importRetryLimit} times`);
    }
    throw error;
  }
};

Spotify.getAlbumTracks = async ({ id, limit, page, retries }) => {
  const token = await getSpotifyToken();
  if (!token) throw Error('Couldn\'t generate a Spotify token');
  const url = `https://api.spotify.com/v1/albums/${id}/tracks?offset=${(page - 1) * limit}&limit=${limit}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const response = await axios.get(url, { headers });
    const result = response?.data;
    if (!result) throw Error('Couldn\'t retrieve data from Spotify');
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      if (retries <= importRetryLimit) {
        logger.info(`Error 429 received on getAlbumTracks, attempting retry number ${retries}`);
        await setTimeout(spotifyApiTimeoutImport);
        retries += 1;
        return Spotify.getAlbumTracks({ id, limit, page, retries });
      } throw Error(`Retried getAlbumTracks more than ${importRetryLimit} times`);
    }
    throw error;
  }
};

Spotify.getTrack = async ({ id, retries }) => {
  const token = await getSpotifyToken();
  if (!token) throw Error('Couldn\'t generate a Spotify token');
  const url = `https://api.spotify.com/v1/tracks/${id}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const response = await axios.get(url, { headers });
    const result = response?.data;
    if (!result) throw Error('Couldn\'t retrieve data from Spotify');
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      if (retries <= importRetryLimit) {
        logger.info(`Error 429 received on getTrack, attempting retry number ${retries}`);
        await setTimeout(spotifyApiTimeoutImport);
        retries += 1;
        return Spotify.getTrack({ id, retries });
      } throw Error(`Retried getTrack more than ${importRetryLimit} times`);
    }
    throw error;
  }
};

const getSpotifyToken = async () => {
  const url = 'https://accounts.spotify.com/api/token';
  const headers = { 'content-type': 'application/x-www-form-urlencoded' };
  const data = new URLSearchParams();
  data.append('grant_type', 'client_credentials');
  data.append('client_id', clientId);
  data.append('client_secret', clientSecret);
  const response = await axios.post(url, data, { headers });
  const token = response?.data?.access_token;
  return token;
};
