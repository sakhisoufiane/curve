require('dotenv').config();
require('../../models/db');
const { BigQuery } = require('@google-cloud/bigquery');
const Client = require('../../models/client');

const privateKey = (process.env.BQ_private_key) ? process.env.BQ_private_key.replace(/\\n/g, '\n') : '';
const bgClientOptions = { projectId: process.env.BQ_project_id, credentials: { client_email: process.env.BQ_client_email, private_key: privateKey,},};
let bigQueryClient = new BigQuery(bgClientOptions);


// Fields to add to the schema
const fields = {
  // Input Schema
  bigQuerySalesTable: [
    { name: 'homeCurrencySalePrice', type: 'FLOAT' },
    { name: 'currency2SalePrice', type: 'FLOAT' },
    { name: 'currency3SalePrice', type: 'FLOAT' },
    { name: 'currency4SalePrice', type: 'FLOAT' },
  ],
  // Output Schema
  bigQueryPeriodSales: [
    { name: 'homeCurrencySalePrice', type: 'FLOAT' },
    { name: 'contractCurrencySalePrice', type: 'FLOAT' },
  ],
  // Accounting Schema
  bigQueryAccountingPeriodSales: [
    
  ],
  // Costs Schema
  bigQueryPeriodCosts: [

  ]
};

const clientTables = ['bigQuerySalesTable', 'bigQueryPeriodSales', 'bigQueryAccountingPeriodSales', 'bigQueryPeriodCosts'];


const updateClients = async () => {
  const clients = await Client.find();
  for(const client of clients) {
    console.log(`${clients.indexOf(client)}/${clients.length}: Updating schema for ${client.name}`)
    await updateClientSchema(client).catch((error) => console.log(error.message))
  }
}

const updateClientSchema = async (client) => {
    for (const table of clientTables) {
      if (fields[table].length) {
        // Get the client's schema
        const [metadata] = await bigQueryClient.dataset(client.bigQueryDataset).table(client[table]).getMetadata();
        // Add fields to the schema
        for(const field of fields[table]){
          let fieldExistAlready = false;
          metadata.schema.fields.forEach((schemaField) => { if (schemaField.name === field.name) { fieldExistAlready = true; } });
          // Only add a field if it doesn't exist already against the schema
          if (!fieldExistAlready) {
            metadata.schema.fields.push(field);
          } else {
            console.log(`Field ${field.name} exists already`)
          }
        }

        // Update the schema
        await bigQueryClient.dataset(client.bigQueryDataset).table(client[table]).setMetadata(metadata);
        console.log(`${table} schema updated.`)
      }
    }
    console.log('_________')
}

updateClients().then(() => { console.log('Complete'); })