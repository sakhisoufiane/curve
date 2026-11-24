require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');

Period.findById('5a9c0139eea4de65d2844322', (err, period) => {
  logger.info(`No. of Cost Ids: ${period.costIds.length}`);
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    period.createUnreportedCostsCsv(db, (err, result) => {
      logger.info(result);
    });
  });
});
