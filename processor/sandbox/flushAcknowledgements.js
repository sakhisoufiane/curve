require('dotenv').config();
require('../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const { ObjectId } = require('mongodb');
const CwrAcknowledgementIngest = require('../libs/cwr/cwrAcknowledgementIngest');
const CwrAcknowledgement = require('../models/cwrAcknowledgement');
const DeliveryLog = require('../models/deliveryLog');

// {createdAt: {$gt: new Date(2023, 7, 6)}}
CwrAcknowledgement.find({ createdAt: { $gt: new Date(2023, 7, 6) } }, (err, acknowledgements) => {
  eachSeries(acknowledgements, (acknowledgement, cb) => {
    // Remove delivery logs for acknowledgement
    logger.info(`Removing Logs for ${acknowledgement._id}`);
    removeLogs(acknowledgement, () => {
      // Reingest
      const cwrAcknowledgementIngest = new CwrAcknowledgementIngest();
      cwrAcknowledgementIngest.ingestFile(acknowledgement, () => {
        logger.info(`Completed Acknowledgement ${acknowledgement._id}`);
      });
    });
  });
});

const removeLogs = (acknowledgement, callback) => {
  DeliveryLog.updateMany({ 'log.acknowledgementId': ObjectId(acknowledgement._id) }, { $pull: { log: { acknowledgementId: acknowledgement._id } } }, (err, res) => {
    console.log(err);
    console.log(res);
    callback();
  });
}
