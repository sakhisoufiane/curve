require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const Period = require('../models/period');
const Client = require('../models/client');

Period.findById('5c4af01302f0cb4a6c7ab801', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      async.waterfall([
        function (cb) {
          // Calculate Sales
          const object = {
            salesDatabaseTable: client.salesDatabaseTable,
            writeSalesDatabaseTable: client.periodSalesDatabaseTable,
            periodId: period._id.toString(),
            salesFileIds: period.salesFilesIds,
          };
          period.runReleaseSalesCalculations(db, object, cb);
        },
      ], (err) => {
        logger.info('Complete');
        process.exit(-1);
      });
    });
  });
});
