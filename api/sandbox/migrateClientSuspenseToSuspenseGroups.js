/* eslint-disable no-await-in-loop */

require('../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const { salesGroupHelpers } = require('../libs/helpers/salesGroupHelpers');
const { salesHelpers } = require('../libs/helpers/salesHelpers');
const ValidateSales = require('../libs/validateSales');

const Client = require('../models/client');
const SalesGroup = require('../models/salesGroup');

async function migrateSuspenseToGroups(client) {
  logger.info(`Checking for sales lines with status 'Suspense' for client '${client.name}'`);
  const clientId = client._id.toString();
  const bigQuery = new BigQuery(databaseUtils.getBigQueryOpts(client));
  const query = `SELECT id, salesFileId, catType, territory, distributionChannel, configuration, source, originalCurrency, exchangeRate, saleDate, transactionDate, netAmount, contractId, releaseId, trackId, workId
      FROM \`${bigQuery.datasetName}.${bigQuery.inputTable}\` 
      WHERE status = "Suspense"`;

  // stream data from BigQuery and add to suspenseSalesLines
  const suspenseSalesLines = [];
  const rows = bigQuery.client.createQueryStream(query);
  if (!rows) return;
  try {
    for await (const row of rows) {
      suspenseSalesLines.push(row);
      if (suspenseSalesLines.length % 100000 === 0) logger.debug(suspenseSalesLines.length);
    }
  } catch (_err) {
    logger.info(`- no sales data for client '${client.name}'`);
  }
  if (suspenseSalesLines?.length) {
    logger.info(`>> migrating ${suspenseSalesLines.length} suspense lines to sales groups for client '${client.name}' with id '${clientId}'`);
    const salesGroupName = 'Historic Suspense';
    const existingSalesGroup = await SalesGroup.findOne({ clientId, type: 'suspense', name: salesGroupName }).lean();
    if (existingSalesGroup) {
      logger.info(`!! Sales Group with name '${salesGroupName}' already exists for client '${client.name}' - skipping migration`);
      return;
    }
    const salesGroup = new SalesGroup({
      name: salesGroupName,
      type: 'suspense',
      clientId,
    });
    logger.info(`- created sales group '${salesGroup.name}' for client '${client.name}'`);

    // group sales lines by salesFileId
    const salesLinesGrouped = suspenseSalesLines.reduce((acc, row) => {
      if (!acc[row.salesFileId]) {
        acc[row.salesFileId] = [];
      }
      acc[row.salesFileId].push(row.id);
      return acc;
    }, {});
    // logger.debug({ salesLinesGrouped });

    logger.info('- adding suspense sales lines to sales groups');
    for (const [salesFileId, salesLineIds] of Object.entries(salesLinesGrouped)) {
      await salesGroupHelpers.addSalesLinesBySalesFileId({ salesLineIds, salesFileId, salesGroup });
    }
    // save Sales Group after adding sales lines to ensure total lines on group are updated
    await salesGroup.save();
    logger.info('- added suspense sales lines to sales groups');

    // Turn on suspense feature flag for client before updating sales lines
    await Client.findByIdAndUpdate(clientId, { $set: { 'features.suspense': true } });
    logger.info(`- turned on suspense feature flag for client '${client.name}'`);

    // revalidate and update sales lines with status 'Suspense'
    const lines = await new Promise((resolve, reject) => {
      ValidateSales.multipleLines(suspenseSalesLines, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    logger.info(`- revalidated Suspense sales lines for client '${client.name}'`);

    logger.info(`- updating sales lines with status 'Complete' for client '${client.name}'`);
    await updateSalesWithStatus({ lines, status: 'Complete', bigQuery, clientId, client });
    logger.info(`- updating sales lines with status 'Incomplete' for client '${client.name}'`);
    await updateSalesWithStatus({ lines, status: 'Incomplete', bigQuery, clientId, client });
    logger.info(`- completed updating sales lines with status 'Complete' and 'Incomplete' for client '${client.name}'`);
  } else {
    logger.info(`!! no suspense sales lines for client '${client.name}'`);
  }
}

async function updateSalesWithStatus({ lines, status, bigQuery, clientId, client }) {
  const linesToUpdate = lines.filter((line) => line.status === status).map((line) => line.id);
  console.log('lines to update:', linesToUpdate.length);
  if (linesToUpdate.length) {
    const filter = {
      id: { $in: linesToUpdate },
    };
    const { filter: bqFilter, filterParams } = await salesHelpers.getBigQueryFilter({ filter, bigQuery, clientName: client.name, clientId });
    await salesHelpers.updateSales({ bigQuery, update: { status }, bqFilter, filterParams, clientId });
  }
}

async function migrateClients({ filter }) {
  if (!filter) {
    logger.error('Please provide a filter to migrate clients.');
    process.exit(1);
  }
  const clients = await Client.find({ ...filter, clientType: 'Publisher' }).select({ _id: 1, name: 1, bigQueryDataset: 1, bigQuerySalesTable: 1 }).sort({ name: 1 }).lean();
  if (!clients.length) {
    logger.error(`No clients found with filter: ${JSON.stringify(filter)}`);
    process.exit(1);
  }
  for (const client of clients) {
    console.log(`\n==================\nProcessing client: ${client.name} (${client._id})\n--->`);
    await migrateSuspenseToGroups(client);
  }
  process.exit();
}

if (process.argv[2]) {
  if (process.argv[2] === '--all') {
    logger.info('------ processing ALL clients ------\n');
    migrateClients({ filter: {} });
  } else {
    migrateClients({ filter: { _id: process.argv[2] } });
  }
} else {
  logger.error('Please provide a Client Id, or use --all to migrate Suspense for ALL Publishing Clients');
  process.exit(1);
}
