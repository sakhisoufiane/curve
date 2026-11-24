require('dotenv').config();
require('../models/db');
const async = require('async');
const Release = require('../models/release');

Release.find({ clientId: '5f8ef58f2b1847001b69e960' }, (err, releases) => {
  console.log(releases.length);
  async.eachLimit(releases, 5, (release, cb) => {
    Release.findByIdAndUpdate(release._id, { $set: { catNo: release.barcode } }, cb);
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
