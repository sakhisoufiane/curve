const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { MongoClient } = require('mongodb');

run = async () => {
  const bigQuery = new BigQuery({
    datasetName: '', inputTable: '', outputTable: '', costsTable: '',
  });

  await bigQuery.setAutoscalerMaxSlots(0);
}

run();