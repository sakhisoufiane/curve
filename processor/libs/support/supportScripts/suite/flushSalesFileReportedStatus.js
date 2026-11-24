require('dotenv').config();
require('../../../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { ObjectId } = require('mongodb');
const SalesFileController = require('../../../salesIngestion/salesFileController');

const SalesFile = require('../../../../models/salesFile');

const flushSalesFileStatus = (salesFileIds, callback) => {
  // Format ids before find
  const formattedSalesFileIds = salesFileIds.split('\n');
  const salesFileObjectIds = formattedSalesFileIds.map((id) => new ObjectId(id));

  // @Arjun: I think this is one of those cases that if it had errored it would have done nothing
  // but also reported flushing complete due to how jank the eachSeries is
  // going to make it callback properly with an error this time seeing as it's just a script
  SalesFile.find({ _id: { $in: salesFileObjectIds } })
    .then((salesFiles) => {
      async.eachSeries(salesFiles, (salesFile, cb) => {
        SalesFileController.updateReportedStatus(salesFile, cb);
      }, (err) => {
        logger.info('Flushing Complete');
        callback(err);
      });
    })
    .catch((err) => {
      logger.error('Error finding sales files:', err);
      callback(err);
    });
};

module.exports = { flushSalesFileStatus };
