require('../models/db');
const { logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const SalesFile = require('../models/salesFile');

MongoClient.connect(databaseUtils.getMongoUrl('auth'), (err, mongoClient) => {
  const db = mongoClient.db(databaseUtils.getMongoDBName());
  SalesFile.findById('5ba92ecae8e29551f2bcb000', (err, salesFile) => {
    salesFile.getIngestionMappingValues(db, (err, result) => {
      logger.info('Complete');
      process.exit(-1);
    });
  });
});
