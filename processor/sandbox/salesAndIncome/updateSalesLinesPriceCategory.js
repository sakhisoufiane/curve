/*
Description: Updates Price Catgerory for all Sales Lines linked to two particular Contract IDs for one Client
Time to run: 00:00:56s
Ticket No: SUP-462
Category: Sales
Author: Joe Osborne
*/

require('../../models/db');
const { logger, BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');
const clientId = '624cd7f28bd451009919c643';
const contractIds = ['62f4c3deab460821e9c4cdfe', '62ff1585a1a93397d4d032b5'];

function updateBigQueryData(bigQuery) {
  const promise = new Promise((resolve, reject) => {
    bigQuery.updateData(bigQuery.inputTable, { contractId: { $in: contractIds }}, { priceCategory: 'Republic' }, (err, data) => {
      if (err) {
        logger.error(err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
  return promise;
};

const updateSalesLinesPriceCategory = async () => {
  const client = await Client.findById(clientId);
  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset, inputTable: client.bigQuerySalesTable, outputTable: client.bigQueryPeriodSales, costsTable: client.bigQueryPeriodCosts });
  await updateBigQueryData(bigQuery);
};

updateSalesLinesPriceCategory().then(() => {
  process.exit(0);
}).catch((err) => {
  logger.error(err);
});
