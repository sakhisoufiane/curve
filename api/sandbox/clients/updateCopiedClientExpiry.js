require('dotenv').config();
require('../../models/db');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');

async function runUpdate({ clientId, expiryDays }) {
  const client = await Client.findById(clientId, { name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1, bigQueryPeriodSales: 1, bigQueryAccountingPeriodSales: 1, bigQueryPeriodCosts: 1, copiedAt: 1 }).lean();
  if (!client) throw new Error(`Client with id '${clientId}' not found`);
  console.log(`\n> Found client ${client._id} | '${client.name}'`);
  if (!client.copiedAt) throw new Error(` !! Won't update as client with id '${clientId}' is not a copied client (no copiedAt field)`);
  const updatedCopiedAtDate = Date.now() + (expiryDays - 2) * 24 * 60 * 60 * 1000;
  await Client.findByIdAndUpdate(clientId, { $set: { copiedAt: updatedCopiedAtDate } });
  console.log(` - Updated client ${client._id} | '${client.name}' copiedAt date so that it does not get deleted for another ${expiryDays} days\n`);

  const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });
  const [datasetExists] = await bigQuery.client.dataset(bigQuery.datasetName).exists();
  if (datasetExists) {
    console.log(`> Updating Big Query tables expiry for ${client._id} | ${client.name}`);
    const tablesToUpdate = [
      client.bigQuerySalesTable,
      client.bigQueryPeriodSales,
      client.bigQueryAccountingPeriodSales,
      client.bigQueryPeriodCosts,
    ];
    await Promise.all(tablesToUpdate.map(async (tableName) => updateExpiryOfTable({ bigQuery, client, tableName, expiryDays })));
  } else {
    throw new Error(`Dataset '${bigQuery.datasetName}' doesn't exist for ${client._id} | ${client.name}`);
  }
}

async function updateExpiryOfTable({ bigQuery, client, tableName, expiryDays }) {
  const expirationTime = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
  // Check table exists
  const [tableExists] = await bigQuery.client.dataset(client.bigQueryDataset).table(tableName).exists();
  if (!tableExists) {
    console.log(` !! Table '${tableName}' doesn't exist in dataset '${bigQuery.datasetName}'`);
    return;
  }
  const [table] = await bigQuery.client.dataset(client.bigQueryDataset).table(tableName).get();
  // only update if the table has an expirationTime set
  if (!table.metadata.expirationTime) {
    console.error(` !! Won't update as table '${tableName}' doesn't have an expirationTime set`);
  }

  // Update the table metadata
  await bigQuery.client
    .dataset(client.bigQueryDataset)
    .table(tableName)
    .setMetadata({
      expirationTime,
    });

  // Verify the update
  const [updatedTable] = await bigQuery.client.dataset(client.bigQueryDataset).table(tableName).get();
  if (parseInt(updatedTable.metadata.expirationTime, 10) !== expirationTime) {
    throw new Error(`Failed to update table '${tableName}' expiry`);
  }
  console.log(` - Updated table '${tableName}' expiry to ${expiryDays} days from now`);
}

if (process.argv.length < 3 || process.argv[2] === '--help') {
  console.log('Specify client id to update copied client\'s expiry (including Big Query tables)');
  console.log('Optionally specify number of days to extend expiry by (default 7, max 14)');
  console.log('Example for 10 days: node sandbox/clients/updateCopiedClientExpiry.js 1234f0c8e4b0c8b1f0a1d2e3 10');
  process.exit(1);
}

const expiryProvided = Number(process.argv[3]);
if (process.argv[3] && (Number.isNaN(expiryProvided) || expiryProvided <= 0 || (process.argv[3] > 14))) {
  console.error('Expiry must be a number between 1 and 14 (days)');
  process.exit(1);
}
const expiryDays = expiryProvided || 7;
runUpdate({ clientId: process.argv[2], expiryDays }).then(() => {
  console.log('Done.');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
