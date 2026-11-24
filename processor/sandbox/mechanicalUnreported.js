require('../models/db');
const { BigQuery, logger, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const CreatePeriodFiles = require('../libs/calculation/period/createPeriodFiles');
const Client = require('../models/client');
const Period = require('../models/period');

const run = async () => {
  const period = await Period.findById('5dfcac46059cf1363005df7f');
  const client = await Client.findById(period.clientId);
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  CreatePeriodFiles.createMechanicalUnreportedSalesCsv(period, bigQuery, client, [], (err, result) => {
    if (err) {
      logger.error(err);
    } else {
      logger.info(result);
    }
    process.exit(-1);
  });
};

run();
