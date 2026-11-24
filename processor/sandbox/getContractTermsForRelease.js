// File not functional to to non existent lmabda library
/* eslint-disable max-len, no-unused-vars  */
require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Track = require('../models/track');
const Period = require('../models/period');
const Client = require('../models/client');
const lambda = require('../libs/lambda');

const releaseId = '5c7e6880f866b50b9b753d84';
const trackId = '5c7e6a1eb3b8180b91fb30d2';

// Track.findById(trackId, function(err, release) {
// release.contractsForSalesCalculation("Half-Yearly", function(data) {
// logger.info(data[0].terms.sales);
// process.exit(-1);
// });
// });

MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
  keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
}, (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  Period.findById('5c5b103af3fce5450ff928bb', (err, period) => {
    Client.findById(period.clientId, (err, client) => {
      // Prepare general object
      const object = {
        salesDatabaseTable: client.salesDatabaseTable,
        writeSalesDatabaseTable: client.periodSalesDatabaseTable,
        periodId: period._id.toString(),
        salesFileIds: period.salesFilesIds,
      };
      Track.findById(trackId, (err, track) => {
        track.contractsForSalesCalculation('Half-Yearly', (data) => {
          const newObject = JSON.parse(JSON.stringify(object));
          newObject.contracts = data;
          newObject.type = 'Track';
          newObject.id = track._id;
          newObject.periodEndDate = new Date();
          newObject.db = db;
          lambda.salesCalculation(newObject, (err) => {
            logger.info('Complete');
            process.exit(-1);
          });
        });
      });
    });
  });
});
