/*
Description: Updates all Clients to enable the Linked Contracts feature flag
Time To Run: 00:00:12s (Staging)
Ticket No: CUR-3590
Category: Clients
Author: Joe Osborne
*/
require('dotenv').config();
require('../../models/db');
const appRootDir = require('app-root-dir').get();
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const { WriteCsv } = require('@curveroyaltysystems/curve-shared-logic');
const async = require('async');
const border = '********';
const log = (message) => { logger.info(`${border} ${message} ${border}`); }
const logErr = (message) => { logger.error(`${border} ${message} ${border}`); }

const Client = require('../../models/client');
const errors = [];

const updateClientLinkedContractFeatureFlag = async () => {
  const clients = await Client.find({});
  log(`Found ${clients.length} clients`);
  await async.eachLimit(clients, 50, async (client) => {
    try {
      await Client.updateOne(
        { _id: client._id },
        { $set: { "features.enableLinkedContractsInIpChain": true } }
      );
      log(`Updated client ${client.name}`);
    } catch (err) {
      errors.push({ clientId: client._id.toString(), clientName: client.name, err });
      logErr(`Error updating client ${client.name}: ${err}`);
    }
  });
  await writeErrorsReport();
};


const writeErrorsReport = async () => {
  if (!errors.length) {
    log('No errors to report');
    process.exit(0);
  }
  const outputLocation = `${appRootDir}/tmp/errorUpdatingClients.csv`;
  const writer = new WriteCsv({
    headers: ['CLIENT ID', 'CLIENT NAME', 'ERROR'],
    outputLocation,
  });
  const outputData = errors.map((line) => {
    return [line.clientId, line.clientName, line.err];
  });
  writer.addData(outputData, () => {
    writer.write((err, location) => {
      if (err) {
        logErr(`Error writing CSV: ${err}`);
      } else {
        log(`Script Complete: ${location}`);
        process.exit(0);
      }
    });
  });
};

updateClientLinkedContractFeatureFlag();
