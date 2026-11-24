require('dotenv').config();
require('../../models/db');
const Track = require('../../models/track');

Track.find({ clientId: '5cf62997a3d3de7c623b1261' }, '_id isrc aliases', (err, tracks) => {
  console.log(tracks.length);
  const output = {};
  tracks.forEach((track) => {
    output[track.isrc] = output[track.isrc] || 0;
    output[track.isrc] += 1;
    track.aliases.forEach((alias) => {
      output[alias] = output[alias] || 0;
      output[alias] += 1;
    });
  });
  console.log(Object.keys(output).length);
  Object.keys(output).forEach((key) => {
    if (output[key] > 1) {
      console.log(key, output[key]);
    }
  });
});
