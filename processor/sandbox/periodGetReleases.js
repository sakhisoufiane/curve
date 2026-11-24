require('../models/db');
const Period = require('../models/period');
const Release = require('../models/release');

Period.findById('5c59ceed61138c0c1a5fdb61', (err, period) => {
  Release.find({ clientId: period.clientId, _id: { $in: period.usedReleaseIds } }).limit(100).skip(1000).exec((err, releases) => {
    if (err) {
      console.error(err);
    } else {
      console.log(releases.length);
    }
  });
});
