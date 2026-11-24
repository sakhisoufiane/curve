require('dotenv').config();
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { eachSeries } = require('async');
const Client = require('../models/client');

Client.find({ name: { $in: ['Master Canary', '+ Publishing Playground', '+ Publishing Canary', '+ Soufiane Test Client'] } })
  .then((clients) => {
    eachSeries(clients, (client, cb) => {
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      bigQuery.updateSchema(client.bigQueryPeriodSales, bigQuery.outputSchema, (err) => {
        if (err) {
          logger.error(err);
        }
        cb(err);
      });
    }, (err) => {
      if (err) {
        logger.error(`Errored in Updating Schemas ${err.message}`);
      } else {
        logger.info('Completed Updating Schemas');
      }
    });
  })
  .catch((err) => {
    logger.error(err);
  });
