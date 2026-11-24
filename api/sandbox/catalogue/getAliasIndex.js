require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');

Release.findById('604a736fe66a38000ff2cc0b', (err, release) => {
  async.eachSeries(release.aliases, (alias, cb) => {
    alias = String(alias);
    Release.find({ _id: { $ne: release._id }, clientId: release.clientId, distributionChannel: { $in: [null, ''] }, aliases: alias }, (err, releases) => {
      if (releases.length > 0) {
        console.log(alias);
        console.log(releases);
      }
      cb();
    });
  }, () => {
    console.log('Complete');
  });
});
