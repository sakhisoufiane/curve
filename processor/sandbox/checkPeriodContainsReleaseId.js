require('../models/db');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5a9049ca3e630c3da1934a5d', (err, period) => {
  if (period) {
    console.log(`Release IDs: ${period.usedReleaseIds.length}`);
    console.log(`Track IDs: ${period.usedTrackIds.length}`);
    console.log('Contains ID 5a6a30fa24866f739391ea59:');
    console.log(period.usedReleaseIds.includes('5a6a30fa24866f739391ea59'));
  } else {
    console.log('Period not found');
  }
});
