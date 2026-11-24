require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('../models/statement');
const Client = require('../models/client');

const statementId = '6155b9152a394e002930959f';

Statement.findById(statementId, (err, statement) => {
  if (err) {
    logger.error(err);
    process.exit(0);
  }
  Client.findById(statement.clientId, (err, client) => {
    // Remove lines from BigQuery
    const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
    const filter = { periodId: statement.periodId, contractId: statement.contractId };
    bigQuery.deleteData(bigQuery.outputTable, filter, (err) => {
      if (err) {
        logger.error(err);
      } else {
        // Remove statement using remove to ensure pre-remove process called
        statement.deleteOne((err) => {
          if (err) {
            logger.error(err);
          } else {
            logger.info(`Complete : Deleted Statement: ${ statementId }`);
          }
          process.exit(0);
        });
      }
    });
  });
});
