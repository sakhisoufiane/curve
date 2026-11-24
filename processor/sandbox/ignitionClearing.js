/* eslint-disable max-len  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Contract = require('../models/contract');

Contract.find({ clientId: '5c61ee9892da8c212d0e0267', accountingPeriod: 'Quarterly' }, (err, contracts) => {
  const contractIds = contracts.map((contract) => contract._id.toString());
  Period.findById('5d2db5e8a32e3c13d9f2dac9', (err, period) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      const salesCollection = db.collection('Ignition-IgnitionSales');
      logger.info('Total:', contractIds.length);
      let count = 0;
      async.eachSeries(contractIds, (contractId, cb) => {
        salesCollection.updateMany({ salesFileId: { $in: period.salesFilesIds }, calculationContractIds: contractId, periodIds: { $ne: '5d84cf03867d0628b1a001b3' } }, { $pull: { calculationContractIds: contractId, periodIds: '5d2db5e8a32e3c13d9f2dac9' } }, (err, response) => {
          if (err) {
            logger.info(err);
          } else {
            logger.info(response.result);
          }
          count += 1;
          logger.info('Completed:', count);
          cb();
        });
      });
    });
  });
});
