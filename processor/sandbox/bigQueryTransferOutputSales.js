require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const moment = require('moment');
const Client = require('../models/client');

Client.findById('5a670a94add44416ebcd0f4e', (err, client) => {
  // Set up Big Query connection
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  // Connect to Mongo
  MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
    keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
  }, (err, mongoClient) => {
    const db = mongoClient.db(databaseUtils.getMongoDBName());
    const collection = db.collection(client.periodSalesDatabaseTable);
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
            const outputSchemaFields = bigQuery.outputSchema.map((item) => item.name);
            // Map data to remove any unwanted values
            data = data.map((item) => {
              // Remove any unwanted keys
              Object.keys(item).forEach((key) => {
                if (!outputSchemaFields.includes(key)) {
                  delete item[key];
                }
              });
              // License No should be string
              if (item.licenseNo) { item.licenseNo = String(item.licenseNo); }
              if (item.duration) { item.duration = String(item.duration); }
              if (!item.duration) { delete item.duration; }
              if (item.originalTerritory) { item.originalTerritory = String(item.originalTerritory); }
              // Delete priceCategoryDealerPrices
              delete item.priceCategoryDealerPrices;
              // Set dates to SQL style dates
              if (item.saleDate && new Date(item.saleDate) > new Date(1900, 0, 1) && new Date(item.saleDate) < new Date(2030, 0, 1)) {
                item.saleDate = moment(item.saleDate).format('YYYY-MM-DD');
              } else {
                delete item.saleDate;
              }
              if (item.transactionDate && new Date(item.transactionDate) > new Date(1900, 0, 1) && new Date(item.transactionDate) < new Date(2030, 0, 1)) {
                item.transactionDate = moment(item.transactionDate).format('YYYY-MM-DD');
              } else {
                delete item.transactionDate;
              }
              if (item.dateFrom && new Date(item.dateFrom) > new Date(1900, 0, 1) && new Date(item.dateFrom) < new Date(2030, 0, 1)) {
                item.dateFrom = moment(item.dateFrom).format('YYYY-MM-DD');
              } else {
                delete item.dateFrom;
              }
              if (item.dateTo && new Date(item.dateTo) > new Date(1900, 0, 1) && new Date(item.dateTo) < new Date(2030, 0, 1)) {
                item.dateTo = moment(item.dateTo).format('YYYY-MM-DD');
              } else {
                delete item.dateTo;
              }
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
            bigQuery.writeFileToDb(bigQuery.outputTable, (err, res) => {
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
