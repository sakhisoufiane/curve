require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const moment = require('moment');
const Client = require('../models/client');

Client.findById('5cf62997a3d3de7c623b1261', (err, client) => {
  // Set up Big Query connection
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  // Connect to Mongo
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
    keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
  }, (err, mongoClient) => {
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    const collection = db.collection(client.periodCostsDatabaseTable);
    const limit = 100000;
    // Setup write file
    bigQuery.setupFile(() => {
      // Get total size
      collection.count({}, (err, total) => {
        const rounds = listFromNumber(Math.floor(total / limit));
        logger.info(rounds);
        async.eachSeries(rounds, (batch, batchCb) => {
          logger.info('Batch:', batch);
          // Find data
          collection.find({}).limit(limit).skip(batch * limit).toArray((err, data) => {
            logger.info(data.length);
            const costSchemaFields = bigQuery.costsSchema.map((item) => item.name);
            // Map data to remove any unwanted values
            data = data.map((item) => {
              // Remove any unwanted keys
              Object.keys(item).forEach((key) => {
                if (!costSchemaFields.includes(key)) {
                  delete item[key];
                }
              });
              // License No should be string
              if (item.licenseNo) { item.licenseNo = String(item.licenseNo); }
              // Set dates to SQL style dates
              if (item.date) { item.date = moment(item.date).format('YYYY-MM-DD'); }
              // Return edited item
              return item;
            });
            // Write data to file
            bigQuery.writeToFile(data, () => {
              // Callback
              batchCb();
            });
          });
        }, (err) => {
          if (err) {
            // Handle Errors
            logger.error(err);
          } else {
            // Write file to DB
            bigQuery.writeFileToDb(bigQuery.costsTable, (err, res) => {
              logger.error(err);
              logger.info('Complete');
            });
          }
        });
      });
    });
  });
});

function listFromNumber(number) {
  const list = [];
  for (let i = 0; i <= number; i += 1) { list.push(i); }
  return list;
}
