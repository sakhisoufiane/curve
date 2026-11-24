require('dotenv').config();
require('../../models/db');
const async = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { clientSpecificFeeds, generalIngestionFeeds } = require('./xmlRunnerTypes');

const devMode = (process.env.environmentName.toLowerCase() === 'development');

function run() {
  async.waterfall([
    (cb) => {
      clientSpecificFeeds(null, cb);
    },
    (cb) => {
      generalIngestionFeeds(cb);
    },
  ], (err) => {
    logger.info('DDEX Ingestion: Complete');
  });
}

if (devMode) {
  run();
} else {
  setInterval(run, 1000 * 60 * 30); // 30 minutes
}
