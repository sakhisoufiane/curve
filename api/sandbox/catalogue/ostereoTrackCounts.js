require('dotenv').config();
require('../models/db');
const Release = require('../models/release');

Release.find({ clientId: '5d00bf7f37ff9c112529055e' }, 'trackIds', (err, releases) => {
  const output = [];
  releases.forEach((release) => {
    output.push([release._id.toString(), release.trackIds.length]);
  });
  output.sort((a, b) => b[1] - a[1]);
  console.log(output);
});
