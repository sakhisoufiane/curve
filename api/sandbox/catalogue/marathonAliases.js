require('dotenv').config();
require('../models/db');
const Track = require('../models/track');

Track.find({ clientId: '5daed100d5ddcc29154e1fa2' }, 'isrc aliases', (err, tracks) => {
  tracks.forEach((track) => {
    track.aliases.forEach((alias) => {
      console.log(`${track.isrc}|${alias}`);
    });
  });
});
