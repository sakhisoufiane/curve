require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Track = require('../models/track');

const limit = 100000;
const offset = 100000;

function run(offset, callback) {
  Track.find({ clientId: { $ne: '5ec2ad7f5608267aa5d07d67' } }, 'duration isrc')
    .limit(limit)
    .skip(offset)
    .then((tracks) => {
      let count = 0 + offset;
      async.eachLimit(tracks, 10, (track, cb) => {
        count += 1;
        logger.debug(count, '/', tracks.length, track.isrc);
        track.calculateMechanicalStatutoryRate();
        Track.findByIdAndUpdate(track._id, { $set: { canadianStatutoryRate: track.canadianStatutoryRate } }, cb);
      }, (err) => {
        if (err) {
          callback(err);
        } else if (tracks.length == limit) {
          run(offset += limit, callback);
        } else {
          callback();
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

run(offset, (err) => {
  if (err) {
    logger.error(err);
  }
  logger.debug('Complete');
});
