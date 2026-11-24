require('dotenv').config();
require('../models/db');
const async = require('async');
const { ObjectId } = require('mongodb');
const Track = require('../models/track');
const Release = require('../models/release');

Release.find({ clientId: '5fd218cc0e01de004b0b90a0' }, (err, releases) => {
  async.eachSeries(releases, (release, cb) => {
    console.log(releases.indexOf(release), 'of', releases.length);
    Track.find({ _id: { $in: release.trackIds.map((id) => ObjectId(id)) } }, (err, tracks) => {
      const catGroups = [];
      tracks.forEach((track) => {
        track.catalogueGroups.forEach((catGroup) => {
          if (!catGroups.includes(catGroup)) {
            catGroups.push(catGroup);
          }
        });
      });
      release.catalogueGroups = catGroups;
      release.save(cb);
    });
  }, (err) => {
    console.log(err);
    console.log('Complete');
  });
});
