require('dotenv').config();
require('../models/db');
const { logger, databaseUtils, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Statement = require('../models/statement');
const Period = require('../models/period');
const Client = require('../models/client');


if (process.argv[2]) {
  const statementId = process.argv[2];
  logger.info({ statementId });
  
  Statement.findById(statementId, (err, statement) => {
    if (err) {
      logger.error(err);
      process.exit(-1);
    } else if (statement) {
      // Get Client
      Client.findById(statement.clientId, (err, client) => {
        if (err) {
          logger.error(err);
          process.exit(-1);
        } else if (client) {
          // Connect to MongoDb, to be passed into each function
          MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts(), (err, mongoClient) => {
            if (err) {
              logger.error(`${statement._id} Error connecting to database`);
              logger.error(err);
              callback(err);
            } else {
              const db = mongoClient.db(databaseUtils.getMongoDBName());
              // Setup BigQuery connection
              const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
              statement.clearStatement(db, bigQuery, client, (err, result) => {
                if (err) {
                  logger.error(err);
                  process.exit(-1);
                } else {
                  logger.info('--- Statement cleared -- ');
                  logger.info(`deleting statement ${statement._id}`)
                  statement.remove((err) => {
                    if (err) {
                      logger.error(err);
                      process.exit(-1);
                    } else {
                      logger.info('--- Statement deleted -- ');
                      // Get Period
                      Period.findById(statement.periodId, (err, period) => {
                        if (err) {
                          logger.error(err);
                          process.exit(-1);
                        } else if (period) {
                          logger.info('updating period data');
                          period.getData(db, bigQuery, (err, result) => {
                            if (err) {
                              logger.error(err);
                              process.exit(-1);
                            } else {
                              logger.info('--- Period data updated -- ');
                              process.exit(-1);
                            }
                          });
                        } else {
                          logger.error(`No Period found with ID ${statement.periodId}`);    
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        } else {
          logger.error(`No Client found with ID ${statement.clientId}`);    
        }
      });
    } else {
      logger.error(`No Statement found with ID ${process.argv[2]}`);
      process.exit(-1);
    }
  });
 } else {
  logger.error('No Statement ID passed as an argument');
  process.exit(-1);
}
