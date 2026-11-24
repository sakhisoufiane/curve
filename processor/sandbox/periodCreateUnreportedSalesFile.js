/* eslint-disable no-unused-vars  */
require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const CreatePeriodFiles = require('../libs/calculation/period/createPeriodFiles');
const { SuspenseHelpers } = require('../libs/calculation/helpers');

Period.findById('602be466f7360f001052a037').then((period) => {
  Client.findById(period.clientId).then((client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), databaseUtils.getMongoConnectOpts()).then(async (mongoClient) => {
      const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
      // Create Sales Lines filter table for for suspense / resolved sales groups filtering when building main filter
      await SuspenseHelpers.createSalesLinesFilterTable({ client, period, bigQuery });
      await CreatePeriodFiles.createUnreportedSalesCsv({ period, client, excludedSalesFiles: [] });
      // Delete Sales Lines filter table
      await SuspenseHelpers.deleteSalesLinesFilterTable({ client, period, bigQuery });
      logger.info('Complete');
      process.exit(-1);
    });
  });
});
