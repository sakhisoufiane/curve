require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Release = require('../models/release');

const limit = 5000;

function run(offset, callback) {
  const clientId = '5cf62997a3d3de7c623b1261';
  Release.find({ clientId })
    .skip(offset)
    .limit(limit)
    .then((releases) => {
      logger.debug('Found Releases:', releases.length);
      let count = 0;
      async.eachSeries(releases, (release, cb) => {
        count += 1;
        logger.debug(offset + count, 'of', releases.length + offset, release.catNo);
        release.proRataTrackContracts((err, output) => {
          release.salesReturnsRights = output;
          release.proRataTrackCostContracts((err, costOutput) => {
            release.costsRights = costOutput;
            Release.updateOne({ _id: release._id }, { $set: { salesReturnsRights: release.salesReturnsRights, costsRights: release.costsRights } })
              .then(() => {
                cb();
              })
              .catch((err) => {
                logger.debug(err);
                cb();
              });
          });
        });
      }, (err) => {
        if (err) {
          callback(err);
        } else if (releases.length == limit) {
          run(offset += limit, callback);
        } else {
          callback(err);
        }
      });
    })
    .catch((err) => {
      logger.error(err);
      callback(err);
    });
}

run(0, (err) => {
  logger.debug('Complete');
  if (err) { logger.error(err); }
  process.exit(-1);
});
