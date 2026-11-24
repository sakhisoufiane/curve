/* eslint-disable no-await-in-loop */
require('dotenv').config();
require('../../models/db');
const { logger, BigQuery, databaseUtils } = require('@curveroyaltysystems/platform-shared-utils');
const mongoose = require('@curveroyaltysystems/models/mongoose');
const _ = require('lodash');
const async = require('async');

const UnmappedWork = require('../../models/unmappedWork');
const UnmappedTrack = require('../../models/unmappedTrack');
const UnmappedRelease = require('../../models/unmappedRelease');
const SalesFile = require('../../models/salesFile');
const Client = require('../../models/client');

const force = process.argv.includes('--force') ?? false;

async function main() {
  const clients = await Client.find({});
  const clientIds = clients.map((c) => c._id.toString());
  const batchedClients = _.chunk(clients, 50);
  logger.debug('Fetched all clients:', clients.length);

  const workSalesFileIds = [];
  const releaseSalesFileIds = [];
  const trackSalesFileIds = [];

  for (let i = 0; i < batchedClients.length; i += 1) {
    const clients = batchedClients[i];
    const batchedClientIds = clients.map((c) => c._id.toString());
    logger.debug(`Fetching catalogue Sales File IDs for client batch (${i + 1}/${batchedClients.length})`);

    const works = await getSalesFileIds(UnmappedWork, batchedClientIds);
    works.forEach((work) => workSalesFileIds.push(work));

    const releases = await getSalesFileIds(UnmappedRelease, batchedClientIds);
    releases.forEach((release) => releaseSalesFileIds.push(release));

    const tracks = await getSalesFileIds(UnmappedTrack, batchedClientIds);
    tracks.forEach((track) => trackSalesFileIds.push(track));
  }

  logger.debug({ workSalesFileIds: workSalesFileIds.length });
  logger.debug({ releaseSalesFileIds: releaseSalesFileIds.length });
  logger.debug({ trackSalesFileIds: trackSalesFileIds.length });

  const combined = [...workSalesFileIds, ...releaseSalesFileIds, ...trackSalesFileIds];
  const salesFileIds = [...new Set(combined.filter((id) => mongoose.isValidObjectId(id)))];
  logger.debug('Unique Sales Files found in unmapped catalogue:', salesFileIds.length);

  const existingSalesFiles = await SalesFile
    .find({ _id: { $in: salesFileIds } })
    .select('_id')
    .lean();
  const existingIds = existingSalesFiles.map((sf) => sf._id.toString());

  const notFound = salesFileIds.filter((id) => !existingIds.includes(id));
  logger.debug('Sales Files not found in the DB:', notFound.length);

  if (notFound.length === 0) {
    logger.debug('No missing Sales Files found, nothing to do');
    logger.debug('Finished');
    process.exit();
  }

  const filter = { clientId: { $in: clientIds }, salesFileId: { $in: notFound.map((id) => mongoose.Types.ObjectId(id)) } };

  logger.debug('Removing unmapped DB catalogue with filter:', filter);
  await removeUnmappedCatalogue(UnmappedWork, filter, 'works');
  await removeUnmappedCatalogue(UnmappedRelease, filter, 'releases');
  await removeUnmappedCatalogue(UnmappedTrack, filter, 'tracks');

  for (let i = 0; i < batchedClients.length; i += 1) {
    const clients = batchedClients[i];
    logger.debug(`Checking BigQuery lines for client batch (${i + 1}/${batchedClients.length})`);
    await async.eachLimit(clients, 5, async (client) => {
      if (!client.bigQueryDataset) {
        logger.debug(`No BigQuery credentials for client ${client._id.toString()}, skipping...`);
        return;
      }

      const bq = new BigQuery(databaseUtils.getBigQueryOpts(client));

      const hasBigQueryData = await new Promise((resolve, reject) => {
        bq.datasetExists(bq.datasetName, (err, exists) => {
          if (err) reject(err);
          else resolve(exists);
        });
      });
      if (!hasBigQueryData) {
        logger.debug(`No BigQuery dataset found for client ${client._id.toString()}, skipping...`);
        return;
      }

      const tableExists = await new Promise((resolve, reject) => {
        bq.tableExists(bq.datasetName, bq.inputTable, (err, exists) => {
          if (err) reject(err);
          else resolve(exists);
        });
      });
      if (!tableExists) {
        logger.debug(`No Sales table found in BigQuery for client ${client._id.toString()}, skipping...`);
        return;
      }

      const [{ count }] = await new Promise((resolve, reject) => {
        bq.getCount(bq.inputTable, 'count', { salesFileId: { $in: notFound } }, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      if (!count || count === 0) {
        logger.debug(`No Sales Lines found in BigQuery for client ${client._id.toString()}, skipping...`);
        return;
      }

      logger.debug('Deleting unmapped Sales Lines to delete for client', client._id.toString(), client.name, count);
      await deleteSalesLines(bq, { salesFileId: { $in: notFound } });
    });
  }

  logger.debug('Finished');
  process.exit();
}

async function getSalesFileIds(Model, clientIds) {
  const ids = await Model
    .distinct('salesFileId', { clientId: { $in: clientIds } })
    .lean();
  return ids;
}

async function removeUnmappedCatalogue(Model, filter, name) {
  if (force) {
    console.time(`delete-${name}`);
    await Model.deleteMany(filter);
    console.timeEnd(`delete-${name}`);
  } else {
    logger.debug(`[SAFE MODE] Run with --force to delete ${name} with filter:`, filter);
  }
}

async function deleteSalesLines(bigQuery, filter) {
  if (force) {
    await new Promise((resolve, reject) => {
      bigQuery.deleteData(bigQuery.inputTable, filter, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    logger.debug('[SAFE MODE] Run with --force to delete Sales Lines in BigQuery with filter:', filter);
  }
}

main();
