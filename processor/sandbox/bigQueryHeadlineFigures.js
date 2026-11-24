require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');
const Period = require('../models/period');
const Client = require('../models/client');
const analysisFigures = require('../libs/statementAnalysisFigures');

Period.findById('5d289c6df4c22b2f563c9d7e', (err, period) => {
  Client.findById(period.clientId, (err, client) => {
    MongoClient.connect(databaseUtils.getMongoUrl('auth'), {
      keepAlive: true, poolSize: 30, autoReconnect: true, socketTimeoutMS: 360000, connectTimeoutMS: 360000,
    }, (err, mongoClient) => {
      const db = mongoClient.db(databaseUtils.getMongoDBName());
      // Setup big query
      const bigQuery = new BigQuery({
        datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts,
      });

      const object = {
        db,
        bigQuery,
        salesInputDatabaseTable: client.salesDatabaseTable,
        salesOutputDatabaseTable: client.periodSalesDatabaseTable,
        costsInputDatabaseTable: 'costs',
        costsOutputDatabaseTable: client.periodCostsDatabaseTable,
        outputFilter: { periodId: period._id.toString() },
      };
      analysisFigures(object, (err, output) => {
        logger.error(err);
        logger.info(output);
      });
    });
  });
});
