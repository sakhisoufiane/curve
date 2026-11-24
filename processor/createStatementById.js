require('dotenv').config();
require('./models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const Statement = require('./models/statement');
const Client = require('./models/client');
const Period = require('./models/period');
const Contract = require('./models/contract');
const { createPdf } = require('./libs/calculation/statement/createFiles');

const run = async () => {
  if (process.argv[2]) {
    logger.debug(process.argv[2]);
    try {
      const statement = await Statement.findById(process.argv[2]);
      const client = await Client.findById(statement.clientId);
      const period = await Period.findById(statement.periodId);
      const contract = await Contract.findById(statement.contractId);
      logger.info({ contract }, { statement });
      if (statement) {
        const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
        createPdf(statement, bigQuery, client, period, contract, null, () => {
          logger.info('Complete');
          process.exit(-1);
        });
      } else {
        logger.error(`No Statement found with ID ${process.argv[2]}`);
        process.exit(-1);
      }
    } catch (err) {
      logger.error(err);
      process.exit(-1);
    }
  } else {
    logger.error('No Statement ID passed as an argument');
    process.exit(-1);
  }
};

run();
