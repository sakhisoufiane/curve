/*
Description: update all clients to turn on a feature flag
Time To Run: 00:00:20s
Ticket No: CUR-4007
Category: Clients
Author: Joe Osborne
*/
require('dotenv').config();
require('../../models/db');
const { logger } = require('@curveroyaltysystems/platform-shared-utils');
const CLIENTS_LIMIT = 100;
const log = (msg) => logger.info(`******** ${msg} ********`);
const Client = require('../../models/client');

// Get feature flag path and value from command-line args
const [,, featurePath, valueArg] = process.argv;
if (!featurePath || !valueArg) {
  console.error('Usage: node script.js <feature-path> <value>');
  process.exit(1);
}

// Parse value to allow booleans, numbers, etc.
let value;
try {
  value = JSON.parse(valueArg);
} catch {
  value = valueArg;
}

const updateBatch = async (lastId) => {
  let query = { clientType: 'Publisher' };
  if (lastId) query._id = { $gt: lastId };
  const clients = await Client.find(query).limit(CLIENTS_LIMIT).sort({ _id: 1 });
  if (!clients.length) return null;
  await Promise.all(clients.map(client => Client.findByIdAndUpdate(client._id, { $set: { [featurePath]: value } })));
  return clients[clients.length - 1]._id;
};

const run = async () => {
  let lastId = null;
  while (true) {
    const newLastId = await updateBatch(lastId);
    if (!newLastId) break;
    lastId = newLastId;
  }
  log('All clients processed.');
  process.exit(0);
};

run();
