const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const { MongoClient } = require('mongodb');

const CreateStatementFiles = require('../calculation/statement/createFiles');
const Period = require('../../models/period');
const Contract = require('../../models/contract');
const StatementController = require('../calculation/statementController');
const setClosingBalance = require('../calculation/statement/closingBalance');

/**
 * Recreates a DMP Statement
 * @param {Object} statement - The statement object
 * @param {Object} client - The client object
 * @param {function} callback - The callback function
 */
const recreateSingleStatement = (statement, client, callback) => {
  logger.info(`Recreating DMP Statement ${statement._id}`);

  MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts())
    .then((mongoClient) => {
      Period.findById(statement.periodId).then((period) => {
        Contract.findById(statement.contractId).then((contract) => {
          const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
          async.series([
          // Set closing balance
            (cb) => {
              setClosingBalance(statement, period, (err) => {
                cb(err);
              });
            },
            // Create the statement files
            (cb) => {
              CreateStatementFiles.createPdf(statement, bigQuery, client, period, contract, null, cb);
            },
            // Create sales CSV
            (cb) => {
              statement._isDmpCrossContractUpdate = true;

              CreateStatementFiles.createSalesCsv(statement, bigQuery, client, null, cb);
            },
            // Create zip of files
            (cb) => {
              CreateStatementFiles.createZipOfFiles(statement, cb);
            },
            // Clear the logo files
            (cb) => {
              StatementController.clearLogoFiles(period, client, cb);
            },
          ], (err) => {
            StatementController.complete(err, statement, mongoClient, callback);
          });
        })
          .catch((err) => {
            logger.error(`Error getting contract for statement ${statement._id}:`, err);
            callback(err);
          });
      })
        .catch((err) => {
          logger.error(`Error getting period for statement ${statement._id}:`, err);
          callback(err);
        });
    })
    .catch((err) => {
      logger.error(`Error connecting to database: ${err}`);
      callback(err);
    });
};

module.exports = {
  recreateSingleStatement,
};
