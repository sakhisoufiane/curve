/* eslint-disable max-len  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Contract = require('../models/contract');

// Period.findById("5e7479a1adb0db1d2247eb1c", function(err, period) {
// MongoClient.connect(databaseUtils.getMongoUrl('auth'), { keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000000, connectTimeoutMS: 360000000 }, function(err, mongoClient) {
// let db = mongoClient.db(databaseUtils.getMongoDBName());
// var collection = db.collection("HospitalRecordsSales");
// Contract.find({ clientId: period.clientId, contractType: { $ne: "Mechanical" } }, { name: 1 }, function(err, contracts) {
// var contractIds = contracts.map(function(contract) { return contract._id.toString(); });
// logger.info("Contract IDs:", contractIds.length)
// async.eachSeries(period.salesFilesIds, function(salesFileId, cb) {
// collection.count({ salesFileId: salesFileId, periodIds: { $ne: "5e7479a1adb0db1d2247eb1c" }, calculationContractIds: { $in: contractIds } }, function(err, count) {
// logger.info(err);
// logger.info(salesFileId, "-", count);
// cb();
// });
// }, function() {
// logger.info("Complete");
// });
// });
// });
// });

Period.findById('5e7479a1adb0db1d2247eb1c', (err, period) => {
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
    keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000000, connectTimeoutMS: 360000000,
  }, (err, mongoClient) => {
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    const collection = db.collection('HospitalRecordsSales');
    Contract.find({ clientId: period.clientId, contractType: { $ne: 'Mechanical' } }, { name: 1 }, (err, contracts) => {
      const contractIds = contracts.map((contract) => contract._id.toString());
      logger.info('Contract IDs:', contractIds.length);
      const salesFileIds = period.salesFilesIds;
      salesFileIds.splice(0, 43);
      async.eachSeries(period.salesFilesIds, (salesFileId, cb) => {
        collection.updateMany({ salesFileId, periodIds: { $ne: '5e7479a1adb0db1d2247eb1c' }, calculationContractIds: { $in: contractIds } }, { $pull: { calculationContractIds: { $in: contractIds } } }, (err, result) => {
          logger.info(err);
          if (result.result) {
            logger.info(salesFileId, '-', result.result);
          } else {
            logger.info(salesFileId, '-', result);
          }
          cb();
        });
      }, () => {
        logger.info('Complete');
      });
    });
  });
});
