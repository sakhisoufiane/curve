require('dotenv').config();
require('../models/db');
const { eachLimit } = require('async');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const SalesFile = require('../models/salesFile');

const deleteSalesFiles = (clientId, callback) => {

  SalesFile.find({ clientId, status: 'Deleting' }, (err, salesFiles) => {
    if (err || salesFiles?.length === 0) {
      logger.error('No Sales Files Found')
      return callback(err);
    }
    eachLimit(salesFiles, 5, (salesFile, eachCb) => salesFile.deleteOne(eachCb), callback);
  });
};


const client = '61963e7f7296d30021e717d3';

deleteSalesFiles(client, (err) => {
  if (err) { logger.error(err); }
  logger.info('Done!');
  process.exit(0);
});