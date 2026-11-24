require('dotenv').config();
require('../models/db');
const Track = require('../models/track');

Track.find({ clientId: '5ecfde431697157f2d8bab4a', defaultReleaseId: { $exists: false } }, (err, tracks) => {
  tracks.forEach((track) => {
    console.log(track.isrc);
  });
});
