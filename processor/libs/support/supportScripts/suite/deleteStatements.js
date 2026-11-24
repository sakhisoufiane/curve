require('dotenv').config();
require('../../../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const async = require('async');
const Statement = require('../../../../models/statement');
const Client = require('../../../../models/client');

const deleteStatements = (statementIds, callback) => {
  const formattedStatementIds = statementIds.split('\n');

  Statement.find({ _id: { $in: formattedStatementIds } })
    .then((statements) => {
      Client.findById(statements[0].clientId)
        .then((client) => {
          const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
          async.eachLimit(statements, 5, (statement, cb) => {
            // Remove lines from BigQuery
            const filter = { periodId: statement.periodId, contractId: statement.contractId };
            bigQuery.deleteData(bigQuery.outputTable, filter, (err) => {
              if (err) {
                return cb(err);
              }
              // Remove statement using deleteOne to ensure deleteOne hook `deleteAssocations` is called
              statement.deleteOne()
                .then(() => {
                  cb();
                })
                .catch((deleteErr) => {
                  logger.error('Error deleting statement:', deleteErr);
                  cb(deleteErr);
                });
            });
          }, (eachLimitErr) => {
            if (eachLimitErr) {
              return callback(eachLimitErr);
            }

            logger.debug('Statements deletion complete');
            callback();
          });
        })
        .catch((clientErr) => {
          logger.error('Error finding client:', clientErr);
          callback(clientErr);
        });
    })
    .catch((findErr) => {
      logger.error('Error finding statements:', findErr);
      callback(findErr);
    });
};

module.exports = { deleteStatements };
