// File not functional to to non existent lmabda library
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const Track = require('../models/track');
const lambda = require('../libs/lambda');

Period.findById('5c3cd82a7a5ca34e37e9570c', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      const object = {
        salesDatabaseTable: client.salesDatabaseTable,
        writeSalesDatabaseTable: client.periodSalesDatabaseTable,
        periodId: period._id.toString(),
        salesFileIds: period.salesFilesIds,
      };
      const trackId = '5be1e9c3bd99ff4fe57a1ade';
      Track.findById(trackId, (err, track) => {
        track.contractsForSalesCalculation(period.accountingPeriodType, (data) => {
          const newObject = JSON.parse(JSON.stringify(object));
          newObject.contracts = data;
          newObject.type = 'Track';
          newObject.id = track._id;
          newObject.periodEndDate = period.endDate;
          logger.info(newObject);
          newObject.db = db;
          lambda.salesCalculation(newObject, (err) => {
            if (err) {
              logger.error(err);
            } else {
              logger.info('Track Complete');
            }
          });
        });
      });
    });
  });
});
