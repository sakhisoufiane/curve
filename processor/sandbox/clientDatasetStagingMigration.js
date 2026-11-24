require('dotenv').config();
require('../models/db');
const Client = require('../models/client');
const { BigQuery } = require('@google-cloud/bigquery');

const alphaNumericName = (string) => string.replace(/[^0-9a-z]/gi, '');

const prodBQConfig = {
  projectId: process.env.BQ_project_id,
  credentials: {
    client_email: process.env.BQ_client_email,
    private_key: process.env.BQ_private_key.replace(/\\n/g, '\n'),
  },
};

const stagingBQConfig = {
    projectId: process.env.Staging_BQ_project_id,
    credentials: {
      client_email: process.env.Staging_BQ_client_email,
      private_key: process.env.Staging_BQ_private_key.replace(/\\n/g, '\n'),
    },
  };

async function createDatasetList () {
  const count = await Client.countDocuments();
  console.log(`Total Clients in Staging: ${count}`);
  const projectionString = 'name bigQueryDataset bigQuerySalesTable bigQueryPeriodSales bigQueryAccountingPeriodSales bigQueryPeriodCosts';
  const clientInfo = await Client.find({_id: '646cbfb5d1c4a9bf8f23ed84' }, projectionString).lean();
  // When we want the real deal we uncomment this
  // const clientInfo = await Client.find({ }, projectionString).lean();
  const prodBQ = new BigQuery(prodBQConfig);
  const stagingBQ = new BigQuery(stagingBQConfig);

  // WOW you can do this without a third party library?! That's crazy!
  const eachLimit = 10;
  for (let i = 0; i < clientInfo.length; i += eachLimit) {
    const batch = clientInfo.slice(i, i + eachLimit);
    await Promise.all(batch.map(async (client) => {
      try {
        const [datasetExists] = await prodBQ.dataset(client.bigQueryDataset).exists();
        client.productionDatasetExists = datasetExists;
        console.log(`Dataset ${client.bigQueryDataset} exists: ${datasetExists}`);
      } catch (err) {
        console.error(`Error checking dataset ${client.bigQueryDataset}:`, err);
      }
    }));
  }

  const noBQDatasetClients = [];
  for (const client of clientInfo) {
    if (!client.productionDatasetExists) {
      noBQDatasetClients.push(client);
    }
  }
  console.log(`There are ${noBQDatasetClients.length} clients without a BigQuery dataset.`);

  await copyAllTables(clientInfo, prodBQ, stagingBQ);
}

async function copyAllTables(clientInfo, prodBQ, stagingBQ) {
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  for (const client of clientInfo) {
    if (client.productionDatasetExists) {
      const alphaNumericClientName = `${alphaNumericName(client.name)}Staging`;
      client.bigQueryDatasetOriginal = client.bigQueryDataset;
      client.bigQuerySalesTableOriginal = client.bigQuerySalesTable;
      client.bigQueryPeriodSalesOriginal = client.bigQueryPeriodSales;
      client.bigQueryAccountingPeriodSalesOriginal = client.bigQueryAccountingPeriodSales;
      client.bigQueryPeriodCostsOriginal = client.bigQueryPeriodCosts;
      client.bigQueryDataset = alphaNumericClientName;
      client.bigQuerySalesTable = `${alphaNumericClientName}Sales`;
      client.bigQueryPeriodSales = `${alphaNumericClientName}PeriodSales`;
      client.bigQueryAccountingPeriodSales = `${alphaNumericClientName}AccountingSales`;
      client.bigQueryPeriodCosts = `${alphaNumericClientName}Costs`;

      // Check if the dataset already exists in staging and delete it
      const [exists] = await stagingBQ.dataset(client.bigQueryDataset).exists();
      if (exists) {
        console.log('Clearing old Dataset');
        const dataset = stagingBQ.dataset(client.bigQueryDataset);
        await dataset.delete({ force: true });
      }

      // Create the dataset in staging
      const defaultTableExpirationMs = `${twoDaysMs}`;
      await stagingBQ.createDataset(client.bigQueryDataset, { location: 'EU', defaultTableExpirationMs });

      await Promise.all([
        checkAndCopyTable(prodBQ, stagingBQ, client, 'bigQuerySalesTable'),
        checkAndCopyTable(prodBQ, stagingBQ, client, 'bigQueryPeriodSales'),
        checkAndCopyTable(prodBQ, stagingBQ, client, 'bigQueryAccountingPeriodSales'),
        checkAndCopyTable(prodBQ, stagingBQ, client, 'bigQueryPeriodCosts'),
      ]);

      await updateClientInfo(client);

      await deleteOriginalTables(client, prodBQ);
    }
  }
};

async function checkAndCopyTable(prodBQ, stagingBQ, client, tableName) {
  if (client[`${tableName}Original`]) {
    await prodBQ
      .dataset(client.bigQueryDatasetOriginal)
      .table(client[`${tableName}Original`])
      .copy(stagingBQ.dataset(client.bigQueryDataset, { projectId: stagingBQ.projectId }).table(client[tableName]));
      logger.info(`Copy job finished for ${client.bigQueryDataset}.${client[tableName]}`);
  }
};

async function deleteOriginalTables(client, prodBQ) {
  const [exists] = await prodBQ.dataset(client.bigQueryDatasetOriginal).exists();
  if (exists) {
    console.log('Clearing old Dataset');
    const dataset = prodBQ.dataset(client.bigQueryDatasetOriginal);
    await dataset.delete({ force: true });
  }
};

async function updateClientInfo(client) {
  await Client.findByIdAndUpdate(client._id, {
    $set: {
      bigQueryDataset: client.bigQueryDataset,
      bigQuerySalesTable: client.bigQuerySalesTable,
      bigQueryPeriodSales: client.bigQueryPeriodSales,
      bigQueryAccountingPeriodSales: client.bigQueryAccountingPeriodSales,
      bigQueryPeriodCosts: client.bigQueryPeriodCosts,
    }
  });
};

createDatasetList()
  .then(() => {
    console.log('Dataset copy completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error creating dataset copy:', err);
    process.exit(1);
  });