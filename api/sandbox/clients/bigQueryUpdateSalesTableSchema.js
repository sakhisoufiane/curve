require('dotenv').config();
require('../../models/db');
const { promisify } = require('node:util');
const { BigQuery } = require('@curveroyaltysystems/platform-shared-utils');
const Client = require('../../models/client');

async function runUpdate(filter) {
  const clients = await Client.find(filter, { name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1 });
  console.log(`Found ${clients.length} with`, filter);
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    console.log(`${i + 1}/${clients.length}: Updating schema for ${client.name}`)
    const bigQuery = new BigQuery({ datasetName: client.bigQueryDataset });
    const [datasetExists] = await bigQuery.client.dataset(bigQuery.datasetName).exists();
    if (datasetExists) {
      const [tableExists] = await bigQuery.client.dataset(bigQuery.datasetName).table(client.bigQuerySalesTable).exists();
      if (tableExists) {
        await (promisify(bigQuery.updateSchema).bind(bigQuery))(client.bigQuerySalesTable, bigQuery.inputSchema);
      } else {
        console.log('   Table doesn\'t exist.');
      }
    } else {
      console.log('   Dataset doesn\'t exist.');
    }
  }
}

if (process.argv.length !== 3) {
  console.error('Specify client id or "--all" to update all clients.');
  process.exit(1);
}

const filter = (process.argv[2] === '--all') ? {} : { _id: process.argv[2] };

runUpdate(filter).then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
})
