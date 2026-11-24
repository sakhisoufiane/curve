require('dotenv').config();
require('../models/db');
const csv = require('csv-parser');
const fs = require('fs');
const async = require('async');
const Release = require('../models/release');
const Track = require('../models/track');

const data = [];

fs.createReadStream('tmp/ktelData.csv')
  .pipe(csv())
  .on('data', (row) => {
    data.push(row);
  })
  .on('end', () => {
    runData();
  });

function runData() {
  const releases = {};
  let lineCount = 0;
  async.eachSeries(data, (line, cb) => {
    lineCount += 1;
    console.log(lineCount);
    async.waterfall([
      function (cb) {
        if (releases[line.c]) {
          cb(null, releases[line.c]);
        } else {
          console.log({ clientId: '5efa72899b27c3162e5c37d5', catNo: line.c });
          Release.findOne({ clientId: '5efa72899b27c3162e5c37d5', catNo: line.c }, '_id catNo trackIds', cb);
        }
      },
      function (release, cb) {
        if (!release) {
          console.log('No Release Under', line.c);
          cb();
        } else {
          Track.findOne({ clientId: '5efa72899b27c3162e5c37d5', isrc: line.i.replace(/[\W_]+/g, '').toUpperCase() }, '_id', (err, track) => {
            if (track) {
              release.trackIds.push(track._id.toString());
              release.trackIds = release.trackIds.filter((item, pos) => release.trackIds.indexOf(item) == pos);
              releases[release.catNo] = release;
              cb();
            } else {
              console.log('No Track Under', line.i.replace(/[\W_]+/g, '').toUpperCase());
              cb();
            }
          });
        }
      },
    ], cb);
  }, (err) => {
    const releasesToSave = Object.keys(releases).length;
    let count = 0;
    async.eachLimit(Object.keys(releases), 10, (release, releaseCb) => {
      count += 1;
      console.log('Saving', count, 'of', releasesToSave);
      Release.update({ _id: release._id }, { $set: { trackIds: release.trackIds } }, (err) => {
        if (err) {
          console.log(err);
        }
        cb();
      });
    }, (err) => {
      console.log('Complete');
    });
  });
}
