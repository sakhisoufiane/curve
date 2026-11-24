require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const async = require('async');
const moment = require('moment');
const Client = require('../models/client');
const SalesFile = require('../models/salesFile');

// Memphis 5ad4cdffe94e863f20c366b3
// Mad Decent 5d2d9f169d1f4f26150c6b6b
// Anjuna 5cf62997a3d3de7c623b1261
// Anjuna Publishing 5cf629a5a3d3de7c623b1262
// Audiosalad 5cdec3a5d3853e3de5c3edec
// Fatcat 5ad5c5b1d2f8c23ea44de711
// Lex 5d8dd7f866b18d355874d731
// CV 5a670a94add44416ebcd0f4e
// Hospital 5ad4b75de94e863f20c366a5
// SITKOK 5b8d5f1aebe3190f018da121
// Domino 5d07759340fd0951e9f622bf
// Unique Leader

Client.findById('5e14dcf8b13d8904cfd5eeaf', (err, client) => {
  // Set up Big Query connection
  const bigQuery = new BigQuery({
    datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
  });
  bigQuery.deleteData(bigQuery.inputTable, 'true', (err) => {
    // Connect to Mongo
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      const collection = db.collection(client.salesDatabaseTable);
      const limit = 100000;
      // Setup write file
      bigQuery.setupFile(() => {
        // Get total size
        SalesFile.find({ clientId: client._id.toString() }, (err, salesFiles) => {
          logger.info('No of Sales File:', salesFiles.length);
          async.eachSeries(salesFiles, (salesFile, salesFileCb) => {
            collection.count({ salesFileId: salesFile._id.toString() }, (err, total) => {
              const rounds = listFromNumber(Math.floor(total / limit));
              logger.info(rounds);
              async.eachSeries(rounds, (batch, batchCb) => {
                logger.info({ batch });
                const fieldFormats = {};
                bigQuery.inputSchema.forEach((item) => {
                  fieldFormats[item.name] = item.type;
                });
                // Find data
                collection.find({ salesFileId: salesFile._id.toString() }).limit(limit).skip(batch * limit).toArray((err, data) => {
                  if (err) {
                    logger.error(err);
                    batchCb(err);
                  } else if (data) {
                    logger.info(data.length);
                    const inputSchemaFields = bigQuery.inputSchema.map((item) => item.name);
                    // Map data to remove any unwanted values
                    data = data.map((item) => {
                      // Set ID
                      item.id = item._id.toString();
                      // Delete original ID
                      delete item._id;
                      delete item.priceCategoryDealerPrices;
                      delete item.catalogueContractIds;
                      // License No should be string
                      if (item.licenseNo) { item.licenseNo = String(item.licenseNo); }
                      if (item.duration) { item.duration = String(item.duration); }
                      if (item.originalTerritory) { item.originalTerritory = String(item.originalTerritory); }
                      if (!item.duration) { delete item.duration; }
                      // Remove NULL values from catalogueContractIds
                      if (!item.catalogueContractIds) {
                        delete item.catalogueContractIds;
                      } else {
                        item.catalogueContractIds = item.catalogueContractIds.filter(Boolean);
                      }
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
                      // Remove any unwanted keys
                      Object.keys(item).forEach((key) => {
                        if (!inputSchemaFields.includes(key)) {
                          delete item[key];
                        } else if (fieldFormats[key] === 'STRING') {
                          item[key] = String(item[key]);
                        }
                      });
                      // Return edited item
                      return item;
                    });
                    // Write data to file
                    bigQuery.writeToFile(data, bigQuery.inputTable, batchCb);
                  } else {
                    batchCb();
                  }
                });
              }, salesFileCb);
            });
          }, (err) => {
            if (err) {
              // Handle Errors
              console.log(err);
            } else {
              // Write file to DB
              bigQuery.writeFileToDb(bigQuery.inputTable, (err, res) => {
                console.log(err);
                console.log('Complete');
              });
            }
          });
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
