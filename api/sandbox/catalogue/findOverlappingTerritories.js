/* eslint-disable no-promise-executor-return */
require('dotenv').config();
require('../../models/db');
const _ = require('lodash');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const appRootDir = require('app-root-dir').get();
const async = require('async');
const fs = require('fs');
const path = require('path');

const Client = require('../../models/client');
const Work = require('../../models/work');
const TerritoryGroup = require('../../models/territoryGroup');
const WorkValidation = require('../../libs/work/validation');
const DeliveryPartner = require('../../models/deliveryPartner');

const OUTPUT_PATH = path.join(appRootDir, 'worksWithOverlappingTerritories.csv');

function csvRow(values) {
  return values.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
}

async function main() {
  console.time('findOverlappingTerritories');

  const clients = await Client
    .find(
      { name: { $not: /Cypress Test Client/i }, clientType: 'Publisher' },
      { name: 1, _id: 1 },
    ).lean();
  logger.debug('Clients to check:', clients.length);

  const stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
  await new Promise((resolve, reject) => stream.write(
    `${csvRow(['clientId', 'clientName', 'workId', 'workTitle', 'isDefaultChain', 'overlappingTerritories', 'partnerChainDeliveryPartner'])}\n`,
    (err) => (err ? reject(err) : resolve()),
  ));

  await async.eachLimit(clients, 5, async (client) => {
    logger.debug('Processing Client:', client._id.toString(), client.name);
    try {
      await checkClient(client, stream);
    } catch (err) {
      logger.error('Error processing client:', client._id.toString(), client.name, err);
    }
  });

  await new Promise((resolve, reject) => stream.end((err) => (err ? reject(err) : resolve())));
  logger.debug('Results written to:', OUTPUT_PATH);

  console.timeEnd('findOverlappingTerritories');
  process.exit();
}

async function checkClient(client, stream) {
  const [territoryGroups, deliveryPartners] = await Promise.all([
    TerritoryGroup.find({ clientId: client._id.toString() }, { name: 1, territories: 1 }).lean(),
    DeliveryPartner.find({ clientId: client._id.toString() }, { name: 1 }).lean(),
  ]);
  const territoryGroupsById = _.keyBy(territoryGroups, (tg) => tg._id.toString());
  const deliveryPartnersById = _.keyBy(deliveryPartners, (dp) => dp._id.toString());

  const cursor = Work.find(
    {
      clientId: client._id.toString(),
      $or: [
        {
          $expr: {
            $gt: [
              { $size: { $cond: [{ $isArray: '$rightsChain' }, '$rightsChain', []] } },
              1,
            ],
          },
        },
        {
          $expr: {
            $gt: [
              { $size: { $cond: [{ $isArray: '$partnerRightsChains' }, '$partnerRightsChains', []] } },
              1,
            ],
          },
        },
      ],
    },
    { title: 1, rightsChain: 1, partnerRightsChains: 1 },
  )
    .lean()
    .cursor({ batchSize: 1000 });

  for await (const work of cursor) {
    if (work.rightsChain?.length > 1) {
      const overlappingTerritories = WorkValidation.checkForOverlappingTerritories(work.rightsChain, territoryGroupsById);
      if (overlappingTerritories.length > 0) {
        await new Promise((resolve, reject) => stream.write(
          `${csvRow([
            client._id,
            client.name,
            work._id,
            work.title,
            true,
            overlappingTerritories.join('; '),
          ])}\n`,
          (err) => (err ? reject(err) : resolve()),
        ));
      }
    }
    if (work.partnerRightsChains?.length > 0) {
      for (const partnerChain of work.partnerRightsChains) {
        if (partnerChain.rightsChain?.length > 1) {
          const overlappingTerritories = WorkValidation.checkForOverlappingTerritories(partnerChain.rightsChain, territoryGroupsById);
          if (overlappingTerritories.length > 0) {
            await new Promise((resolve, reject) => stream.write(
              `${csvRow([
                client._id,
                client.name,
                work._id,
                work.title,
                false,
                overlappingTerritories.join('; '),
                deliveryPartnersById[partnerChain.deliveryPartnerId]?.name ?? partnerChain.deliveryPartnerId,
              ])}\n`,
              (err) => (err ? reject(err) : resolve()),
            ));
          }
        }
      }
    }
  }
}

main();
