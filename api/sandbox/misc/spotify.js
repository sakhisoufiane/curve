require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Spotify = require('../libs/spotify');

// const query = { searchTerm: 'changes', type: 'album', artist: 'Justin Bieber' };
// Spotify.search(query).then(logger.debug).catch(logger.error);

// const albumId = '0POYPvGgqNdWX1G3BQBncS';
// Spotify.getAlbum({ id: albumId }).then(logger.debug).catch(logger.error);

const trackId = '1uNFoZAHBGtllmzznpCI3s';
Spotify.getTrack({ id: trackId }).then(logger.debug).catch(logger.error);