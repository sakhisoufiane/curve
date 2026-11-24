require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');
const SalesFile = require('../models/salesFile');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
  keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 3600000000, connectTimeoutMS: 36000000,
}, (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  SalesFile.find({ clientId: '5cf62997a3d3de7c623b1261' }).limit(10).exec((err, salesFiles) => {
    let count = 0;
    async.eachLimit(salesFiles, 3, (salesFile, cb) => {
      count += 1;
      logger.infp(`Sales File ${salesFile._id}: ${count}/${salesFiles.length}`);
      salesFile.setCatalogueData(db, cb);
    }, (err) => {
      logger.error(err);
      logger.info('Complete');
    });
  });
});
