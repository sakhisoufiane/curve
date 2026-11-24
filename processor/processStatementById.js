require('dotenv').config();
require('./models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./models/statement');
const Client = require('./models/client');
const StatementController = require('./libs/calculation/statementController');
const DmpStatementController = require('./libs/dmpPeriod/dmpStatementController');

if (process.argv[2]) {
  const statementId = process.argv[2];
  logger.info({ statementId });
  Statement.findById(statementId)
    .then((statement) => {
      logger.info(`Processing Statement: ${statement}`);
      if (statement) {
        Client.findById(statement.clientId)
          .then((client) => {
            if (client?.features?.dmp) {
              logger.info(`Using DMP Statement recreation for client ${client.name} (${client._id})`);
              DmpStatementController.recreateSingleStatement(statement, client, (err) => {
                if (err) {
                  logger.error(err);
                  process.exit(-1);
                } else {
                  logger.info('Complete');
                  process.exit();
                }
              });
            } else {
              StatementController.calculate(statement, (err) => {
                if (err) {
                  logger.error(err);
                  process.exit(-1);
                } else {
                  logger.info('Complete');
                  process.exit();
                }
              });
            }
          })
          .catch((clientErr) => {
            logger.error(clientErr);
            process.exit(-1);
          });
      } else {
        logger.error(`Statement ${statementId} not found`);
        process.exit(-1);
      }
    })
    .catch((err) => {
      logger.error(err);
      process.exit(-1);
    });
} else {
  logger.error('No Statement ID passed as an argument');
  process.exit(-1);
}
